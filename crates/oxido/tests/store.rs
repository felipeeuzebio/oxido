//! The progress store: one SQLite file per student project (`.oxido/oxido.db`).

use oxido::store::{Anchor, NewNote, SCHEMA_VERSION, Store, StoreError};

fn store() -> Store {
    Store::open_in_memory().expect("in-memory store")
}

fn video_note(class_id: &str, seconds: u32, body: &str) -> NewNote {
    NewNote {
        class_id: class_id.into(),
        anchor: Anchor::Video { seconds },
        body: body.into(),
    }
}

#[test]
fn a_new_store_is_migrated_to_the_current_schema() {
    assert_eq!(store().schema_version().unwrap(), SCHEMA_VERSION);
}

#[test]
fn a_new_student_has_no_progress() {
    let progress = store().progress().unwrap();
    assert!(progress.classes.is_empty());
    assert!(progress.quizzes.is_empty());
    assert!(progress.stripes.is_empty());
}

#[test]
fn progress_survives_reopening_the_file() {
    let dir = tempfile::tempdir().unwrap();
    let path = dir.path().join("oxido.db");
    {
        let store = Store::open(&path).unwrap();
        store.save_video_position("3.4", 391).unwrap();
    }
    let store = Store::open(&path).unwrap();
    assert_eq!(store.schema_version().unwrap(), SCHEMA_VERSION);
    assert_eq!(store.progress().unwrap().classes["3.4"].video_seconds, 391);
}

#[test]
fn refuses_a_database_written_by_a_newer_oxido() {
    let dir = tempfile::tempdir().unwrap();
    let path = dir.path().join("oxido.db");
    rusqlite::Connection::open(&path)
        .unwrap()
        .pragma_update(None, "user_version", SCHEMA_VERSION + 1)
        .unwrap();

    match Store::open(&path) {
        Err(StoreError::NewerSchema { found, supported }) => {
            assert_eq!(found, SCHEMA_VERSION + 1);
            assert_eq!(supported, SCHEMA_VERSION);
        }
        Err(other) => panic!("expected NewerSchema, got {other}"),
        Ok(_) => panic!("expected NewerSchema, got a store"),
    }
}

#[test]
fn keeps_the_latest_video_position_and_the_watched_flag() {
    let store = store();
    store.save_video_position("3.4", 120).unwrap();
    store.save_video_position("3.4", 391).unwrap();
    store.mark_video_watched("3.4").unwrap();

    let class = &store.progress().unwrap().classes["3.4"];
    assert_eq!(class.video_seconds, 391);
    assert!(class.video_watched);
    assert!(!class.task_marked);
}

#[test]
fn each_value_keeps_the_time_it_last_changed() {
    // An imported file merges value by value, the newer change winning
    // (decision D18), so a row that holds several values keeps a time for each.
    let dir = tempfile::tempdir().unwrap();
    let path = dir.path().join("oxido.db");
    let store = Store::open(&path).unwrap();
    let conn = rusqlite::Connection::open(&path).unwrap();
    let at = |sql: &str| -> Option<String> { conn.query_row(sql, [], |row| row.get(0)).unwrap() };
    let class = |column: &str| {
        at(&format!(
            "SELECT {column} FROM class_progress WHERE class_id = '3.4'"
        ))
    };
    let quiz = |column: &str| {
        at(&format!(
            "SELECT {column} FROM quiz_results WHERE quiz_id = 'quiz-01'"
        ))
    };

    store.save_video_position("3.4", 120).unwrap();
    let position = class("video_seconds_at");
    assert!(position.is_some());
    assert_eq!(class("video_watched_at"), None);
    std::thread::sleep(std::time::Duration::from_millis(5));
    store.mark_video_watched("3.4").unwrap();
    assert_eq!(class("video_seconds_at"), position);
    assert!(class("video_watched_at") > position);

    store.record_quiz("quiz-01", 3, 5).unwrap();
    let attempt = quiz("last_at");
    assert!(attempt.is_some());
    assert_eq!(quiz("done_at"), None);
    std::thread::sleep(std::time::Duration::from_millis(5));
    store.mark_quiz_done("quiz-01").unwrap();
    assert_eq!(quiz("last_at"), attempt);
    assert!(quiz("done_at") > attempt);
}

#[test]
fn the_tables_schema_2_rebuilt_are_strict() {
    // Decision D19: tables created or rebuilt from schema version 2 on are STRICT.
    let dir = tempfile::tempdir().unwrap();
    let path = dir.path().join("oxido.db");
    Store::open(&path).unwrap();
    let conn = rusqlite::Connection::open(&path).unwrap();
    for table in ["class_progress", "quiz_results", "notes"] {
        let strict: bool = conn
            .query_row(
                "SELECT strict FROM pragma_table_list WHERE name = ?1",
                [table],
                |row| row.get(0),
            )
            .unwrap();
        assert!(strict, "{table}");
    }
}

#[test]
fn quizzes_keep_the_latest_and_the_best_score() {
    let store = store();
    store.record_quiz("2", 7, 10).unwrap();
    store.record_quiz("2", 5, 10).unwrap();
    store.mark_quiz_done("2").unwrap();

    let quiz = &store.progress().unwrap().quizzes["2"];
    assert_eq!(
        (quiz.last_correct, quiz.best_correct, quiz.total),
        (5, 7, 10)
    );
    assert!(quiz.done);
}

#[test]
fn a_quiz_can_be_marked_done_without_taking_it() {
    let store = store();
    store.mark_quiz_done("5").unwrap();
    let quiz = &store.progress().unwrap().quizzes["5"];
    assert!(quiz.done);
    assert_eq!(quiz.total, 0);
}

#[test]
fn rejects_impossible_quiz_scores() {
    let store = store();
    assert!(matches!(
        store.record_quiz("2", 11, 10),
        Err(StoreError::Invalid(_))
    ));
    assert!(matches!(
        store.record_quiz("2", 0, 0),
        Err(StoreError::Invalid(_))
    ));
}

#[test]
fn the_best_score_starts_over_when_a_quiz_changes_size() {
    let store = store();
    store.record_quiz("2", 9, 10).unwrap();
    store.record_quiz("2", 1, 5).unwrap();
    let quiz = &store.progress().unwrap().quizzes["2"];
    assert_eq!((quiz.best_correct, quiz.total), (1, 5));
}

#[test]
fn ids_cant_look_like_command_line_options() {
    let store = store();
    assert!(matches!(
        store.save_video_position("-rf", 1),
        Err(StoreError::Invalid(_))
    ));
}

#[test]
fn a_video_update_saves_position_and_watched_together() {
    let store = store();
    store.update_video("3.4", Some(391), true).unwrap();
    let class = &store.progress().unwrap().classes["3.4"];
    assert_eq!((class.video_seconds, class.video_watched), (391, true));
}

#[test]
fn a_stripe_remembers_when_it_first_passed() {
    let store = store();
    assert!(store.record_stripe_pass("orange.3").unwrap());
    let first = store.progress().unwrap().stripes["orange.3"].clone();
    assert!(!store.record_stripe_pass("orange.3").unwrap());
    assert_eq!(store.progress().unwrap().stripes["orange.3"], first);
}

#[test]
fn notes_can_be_added_listed_edited_and_deleted() {
    let store = store();
    let first = store
        .add_note(video_note("3.4", 167, "HashMap needs a use line"))
        .unwrap();
    let second = store
        .add_note(video_note("3.4", 240, "get returns an Option"))
        .unwrap();
    store
        .add_note(video_note("1.1", 10, "another class"))
        .unwrap();

    let notes = store.notes("3.4").unwrap();
    assert_eq!(notes.len(), 2);
    assert_eq!(notes[0].id, first.id);
    assert_eq!(notes[1].anchor, Anchor::Video { seconds: 240 });

    let edited = store
        .update_note(second.id, "get returns Option<&V>")
        .unwrap();
    assert_eq!(edited.body, "get returns Option<&V>");

    store.delete_note(first.id).unwrap();
    assert_eq!(store.notes("3.4").unwrap().len(), 1);
}

#[test]
fn editing_or_deleting_a_missing_note_says_so() {
    let store = store();
    assert!(matches!(
        store.update_note(42, "x"),
        Err(StoreError::NoteNotFound(42))
    ));
    assert!(matches!(
        store.delete_note(42),
        Err(StoreError::NoteNotFound(42))
    ));
}

#[test]
fn rejects_empty_notes_and_malformed_ids() {
    let store = store();
    assert!(matches!(
        store.add_note(video_note("3.4", 1, "  ")),
        Err(StoreError::Invalid(_))
    ));
    assert!(matches!(
        store.save_video_position("", 1),
        Err(StoreError::Invalid(_))
    ));
    assert!(matches!(
        store.mark_video_watched("../etc"),
        Err(StoreError::Invalid(_))
    ));
}

// `oxido doctor` looks at the database with `inspect`, which only reads.

#[test]
fn inspecting_reads_the_schema_version_and_never_writes_the_database() {
    let dir = tempfile::tempdir().unwrap();
    let path = dir.path().join("oxido.db");
    Store::open(&path)
        .unwrap()
        .save_video_position("3.4", 391)
        .unwrap();
    let before = std::fs::read(&path).unwrap();
    assert_eq!(oxido::store::inspect(&path).unwrap(), SCHEMA_VERSION);
    assert_eq!(std::fs::read(&path).unwrap(), before);
}

#[test]
fn inspecting_after_a_crash_leaves_the_unsaved_journal_alone() {
    // A crashed oxido leaves recent writes in oxido.db-wal, not yet merged
    // into oxido.db. The next oxido run merges them; doctor must not.
    let live = tempfile::tempdir().unwrap();
    let store = Store::open(&live.path().join("oxido.db")).unwrap();
    store.save_video_position("3.4", 391).unwrap();
    let crashed = tempfile::tempdir().unwrap();
    for name in ["oxido.db", "oxido.db-wal"] {
        std::fs::copy(live.path().join(name), crashed.path().join(name)).unwrap();
    }
    let path = crashed.path().join("oxido.db");
    let (db, wal) = (
        std::fs::read(&path).unwrap(),
        std::fs::read(crashed.path().join("oxido.db-wal")).unwrap(),
    );
    assert!(
        !wal.is_empty(),
        "the journal should hold the unmerged writes"
    );

    assert_eq!(oxido::store::inspect(&path).unwrap(), SCHEMA_VERSION);
    assert_eq!(std::fs::read(&path).unwrap(), db);
    assert_eq!(
        std::fs::read(crashed.path().join("oxido.db-wal")).unwrap(),
        wal
    );
    drop(store);
}

#[test]
fn inspecting_works_while_oxido_has_the_database_open() {
    let dir = tempfile::tempdir().unwrap();
    let path = dir.path().join("oxido.db");
    let store = Store::open(&path).unwrap();
    store.save_video_position("3.4", 391).unwrap();
    assert_eq!(oxido::store::inspect(&path).unwrap(), SCHEMA_VERSION);
    store.save_video_position("3.4", 400).unwrap();
}

#[test]
fn inspecting_reports_a_newer_schema_instead_of_refusing_it() {
    let dir = tempfile::tempdir().unwrap();
    let path = dir.path().join("oxido.db");
    rusqlite::Connection::open(&path)
        .unwrap()
        .pragma_update(None, "user_version", SCHEMA_VERSION + 1)
        .unwrap();
    assert_eq!(oxido::store::inspect(&path).unwrap(), SCHEMA_VERSION + 1);
}

#[test]
fn a_file_that_isnt_a_database_is_damaged() {
    let dir = tempfile::tempdir().unwrap();
    let path = dir.path().join("oxido.db");
    std::fs::write(&path, "these are my notes, not a database".repeat(100)).unwrap();
    match oxido::store::inspect(&path) {
        Err(error @ StoreError::Damaged(_)) => {
            assert!(error.to_string().contains("not a database"), "{error}");
        }
        other => panic!("expected Damaged, got {other:?}"),
    }
}

#[test]
fn a_database_with_wrecked_pages_is_damaged() {
    let dir = tempfile::tempdir().unwrap();
    let path = dir.path().join("oxido.db");
    {
        let store = Store::open(&path).unwrap();
        for class in 0..200 {
            store.save_video_position(&format!("c{class}"), 1).unwrap();
        }
    }
    // Wreck everything after the first page (the header stays readable).
    let mut bytes = std::fs::read(&path).unwrap();
    let page_size = u16::from_be_bytes([bytes[16], bytes[17]]) as usize;
    for byte in &mut bytes[page_size..] {
        *byte = 0xAB;
    }
    std::fs::write(&path, bytes).unwrap();
    assert!(matches!(
        oxido::store::inspect(&path),
        Err(StoreError::Damaged(_))
    ));
}

#[test]
fn a_database_that_cant_be_opened_is_not_called_damaged() {
    // Advice for a damaged file is to start fresh; for a file the student
    // can't open (a folder here, usually permissions), that would be wrong.
    let dir = tempfile::tempdir().unwrap();
    let path = dir.path().join("oxido.db");
    std::fs::create_dir(&path).unwrap();
    match oxido::store::inspect(&path) {
        Err(StoreError::Damaged(detail)) => panic!("called damaged: {detail}"),
        Err(_) => {}
        Ok(version) => panic!("opened a folder as schema {version}"),
    }
}

#[test]
fn inspecting_never_creates_a_database() {
    let dir = tempfile::tempdir().unwrap();
    let path = dir.path().join("oxido.db");
    assert!(oxido::store::inspect(&path).is_err());
    assert!(!path.exists());
}

#[test]
fn migration_2_keeps_progress_and_video_notes_with_the_time_of_each_value() {
    let dir = tempfile::tempdir().unwrap();
    let path = dir.path().join("oxido.db");
    // A database as a schema-1 oxido left it.
    {
        let conn = rusqlite::Connection::open(&path).unwrap();
        conn.execute_batch(include_str!("fixtures/schema-1.sql"))
            .unwrap();
        conn.execute_batch(
            "INSERT INTO class_progress (class_id, video_seconds, video_watched, text_read, updated_at)
             VALUES ('3.4', 391, 1, 1, '2026-09-20T10:00:00.000Z'),
                    ('3.5', 0, 0, 1, '2026-09-21T10:00:00.000Z');
             INSERT INTO quiz_results (quiz_id, last_correct, best_correct, total, done, updated_at)
             VALUES ('quiz-01', 3, 4, 5, 1, '2026-09-22T10:00:00.000Z');
             INSERT INTO stripe_passes (stripe_id, first_passed_at)
             VALUES ('white.1', '2026-09-23T10:00:00.000Z');
             INSERT INTO notes (class_id, anchor_kind, anchor, body)
             VALUES ('3.4', 'video', '42', 'moves, not copies'),
                    ('3.4', 'paragraph', 'p-borrow', 'one &mut at a time');",
        )
        .unwrap();
    }

    let store = Store::open(&path).unwrap();
    assert_eq!(store.schema_version().unwrap(), 2);
    let progress = store.progress().unwrap();
    // The read flag went with the text lessons (decision D35), and so did a
    // class it was all there was to.
    assert_eq!(progress.classes.keys().collect::<Vec<_>>(), ["3.4"]);
    let class = &progress.classes["3.4"];
    assert_eq!(
        (class.video_seconds, class.video_watched, class.task_marked),
        (391, true, false)
    );
    let quiz = &progress.quizzes["quiz-01"];
    assert_eq!(
        (quiz.last_correct, quiz.best_correct, quiz.total, quiz.done),
        (3, 4, 5, true)
    );
    assert_eq!(progress.stripes["white.1"], "2026-09-23T10:00:00.000Z");

    // Notes on the text lessons' paragraphs went with them too.
    let notes = store.notes("3.4").unwrap();
    let bodies: Vec<_> = notes.iter().map(|n| n.body.as_str()).collect();
    assert_eq!(bodies, ["moves, not copies"]);
    assert_eq!(notes[0].anchor, Anchor::Video { seconds: 42 });

    // Schema 1 kept one time per row; each value it held takes that time.
    let conn = rusqlite::Connection::open(&path).unwrap();
    let times: [Option<String>; 4] = conn
        .query_row(
            "SELECT c.video_seconds_at, c.video_watched_at, q.last_at, q.done_at
             FROM class_progress c, quiz_results q WHERE c.class_id = '3.4'",
            [],
            |row| Ok([row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?]),
        )
        .unwrap();
    assert_eq!(
        times,
        [
            Some("2026-09-20T10:00:00.000Z".to_string()),
            Some("2026-09-20T10:00:00.000Z".to_string()),
            Some("2026-09-22T10:00:00.000Z".to_string()),
            Some("2026-09-22T10:00:00.000Z".to_string()),
        ]
    );
    let uid: String = conn
        .query_row("SELECT uid FROM notes", [], |row| row.get(0))
        .unwrap();
    assert_eq!(uid.len(), 32);
}

#[test]
fn every_note_gets_its_own_global_id() {
    // Notes from two machines are told apart by this ID when a file is imported.
    let dir = tempfile::tempdir().unwrap();
    let path = dir.path().join("oxido.db");
    let store = Store::open(&path).unwrap();
    store.add_note(video_note("3.4", 1, "one")).unwrap();
    store.add_note(video_note("3.4", 2, "two")).unwrap();
    let conn = rusqlite::Connection::open(&path).unwrap();
    let uids: Vec<String> = conn
        .prepare("SELECT uid FROM notes ORDER BY id")
        .unwrap()
        .query_map([], |row| row.get(0))
        .unwrap()
        .collect::<Result<_, _>>()
        .unwrap();
    assert_eq!(uids.len(), 2);
    assert_ne!(uids[0], uids[1]);
    assert!(uids.iter().all(|uid| uid.len() == 32));
}

#[test]
fn a_deleted_note_leaves_a_marker_without_its_text() {
    let dir = tempfile::tempdir().unwrap();
    let path = dir.path().join("oxido.db");
    let store = Store::open(&path).unwrap();
    let note = store.add_note(video_note("3.4", 42, "secret")).unwrap();
    store.delete_note(note.id).unwrap();

    assert!(store.notes("3.4").unwrap().is_empty());
    assert!(matches!(
        store.delete_note(note.id),
        Err(StoreError::NoteNotFound(_))
    ));
    let conn = rusqlite::Connection::open(&path).unwrap();
    let (body, deleted): (String, Option<String>) = conn
        .query_row(
            "SELECT body, deleted_at FROM notes WHERE id = ?1",
            [note.id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .unwrap();
    assert_eq!(body, "");
    assert!(deleted.is_some());
}
