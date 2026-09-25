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
    assert!(!class.text_read);
}

#[test]
fn text_lessons_can_be_marked_read_and_unread() {
    let store = store();
    store.set_text_read("1.1", true).unwrap();
    assert!(store.progress().unwrap().classes["1.1"].text_read);
    store.set_text_read("1.1", false).unwrap();
    assert!(!store.progress().unwrap().classes["1.1"].text_read);
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
        .add_note(NewNote {
            class_id: "3.4".into(),
            anchor: Anchor::Paragraph { id: "p-get".into() },
            body: "get returns an Option".into(),
        })
        .unwrap();
    store
        .add_note(video_note("1.1", 10, "another class"))
        .unwrap();

    let notes = store.notes("3.4").unwrap();
    assert_eq!(notes.len(), 2);
    assert_eq!(notes[0].id, first.id);
    assert_eq!(notes[1].anchor, Anchor::Paragraph { id: "p-get".into() });

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
        store.set_text_read("../etc", true),
        Err(StoreError::Invalid(_))
    ));
}
