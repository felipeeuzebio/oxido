//! Course progress and notes, kept in one SQLite file per student project
//! (`.oxido/oxido.db`, git-ignored). Only the server writes to it.
//!
//! The schema version lives in SQLite's `user_version`. Each entry in
//! [`MIGRATIONS`] moves the database up one version; never edit a released
//! migration, add a new one. A database from a newer `oxido` is refused rather
//! than guessed at.
//!
//! Plain SQL through rusqlite, no ORM (decision D19). Rows are read by column
//! name, never by position, so reordering a SELECT can't swap two fields.

use std::collections::BTreeMap;
use std::path::Path;

use rusqlite::{Connection, OptionalExtension, params};
use serde::{Deserialize, Serialize};

/// Migrations, oldest first. `MIGRATIONS[n]` upgrades version `n` to `n + 1`.
const MIGRATIONS: &[&str] = &[
    // 1: classes, quizzes, stripes and notes.
    "CREATE TABLE class_progress (
        class_id      TEXT PRIMARY KEY,
        video_seconds INTEGER NOT NULL DEFAULT 0,
        video_watched INTEGER NOT NULL DEFAULT 0,
        text_read     INTEGER NOT NULL DEFAULT 0,
        updated_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    );
    CREATE TABLE quiz_results (
        quiz_id      TEXT PRIMARY KEY,
        last_correct INTEGER NOT NULL DEFAULT 0,
        best_correct INTEGER NOT NULL DEFAULT 0,
        total        INTEGER NOT NULL DEFAULT 0,
        done         INTEGER NOT NULL DEFAULT 0,
        updated_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    );
    CREATE TABLE stripe_passes (
        stripe_id       TEXT PRIMARY KEY,
        first_passed_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    );
    CREATE TABLE notes (
        id          INTEGER PRIMARY KEY,
        class_id    TEXT NOT NULL,
        anchor_kind TEXT NOT NULL CHECK (anchor_kind IN ('video', 'paragraph')),
        anchor      TEXT NOT NULL,
        body        TEXT NOT NULL,
        created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
        updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    );
    CREATE INDEX notes_by_class ON notes (class_id, id);",
];

/// The schema version this build of `oxido` reads and writes.
pub const SCHEMA_VERSION: u32 = MIGRATIONS.len() as u32;

const MAX_ID_LEN: usize = 64;
const MAX_NOTE_LEN: usize = 10_000;

#[derive(Debug, thiserror::Error)]
pub enum StoreError {
    #[error("database error: {0}")]
    Sqlite(#[from] rusqlite::Error),
    #[error(
        "this progress file was written by a newer oxido (schema {found}, this oxido reads up to \
         {supported}); update oxido with `cargo install --locked oxido`"
    )]
    NewerSchema { found: u32, supported: u32 },
    #[error("note {0} doesn't exist")]
    NoteNotFound(i64),
    #[error("{0}")]
    Invalid(String),
}

#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize)]
pub struct Progress {
    pub classes: BTreeMap<String, ClassProgress>,
    pub quizzes: BTreeMap<String, QuizProgress>,
    /// Stripe id to the time its tests first passed (RFC 3339, UTC).
    pub stripes: BTreeMap<String, String>,
}

#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize)]
pub struct ClassProgress {
    pub video_seconds: u32,
    pub video_watched: bool,
    pub text_read: bool,
}

#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize)]
pub struct QuizProgress {
    pub last_correct: u32,
    pub best_correct: u32,
    pub total: u32,
    pub done: bool,
}

/// Where a note is pinned: a moment in the video or a paragraph of the text lesson.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "lowercase")]
pub enum Anchor {
    Video { seconds: u32 },
    Paragraph { id: String },
}

#[derive(Debug, Clone, Deserialize)]
pub struct NewNote {
    pub class_id: String,
    pub anchor: Anchor,
    pub body: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct Note {
    pub id: i64,
    pub class_id: String,
    pub anchor: Anchor,
    pub body: String,
    pub created_at: String,
    pub updated_at: String,
}

pub struct Store {
    conn: Connection,
}

impl Store {
    /// Opens (or creates) the database at `path` and brings it up to date.
    pub fn open(path: &Path) -> Result<Self, StoreError> {
        let conn = Connection::open(path)?;
        conn.pragma_update(None, "journal_mode", "WAL")?;
        Self::init(conn)
    }

    /// A throwaway store, for tests.
    pub fn open_in_memory() -> Result<Self, StoreError> {
        Self::init(Connection::open_in_memory()?)
    }

    fn init(mut conn: Connection) -> Result<Self, StoreError> {
        conn.pragma_update(None, "foreign_keys", true)?;
        conn.busy_timeout(std::time::Duration::from_secs(5))?;
        migrate(&mut conn)?;
        Ok(Self { conn })
    }

    pub fn schema_version(&self) -> Result<u32, StoreError> {
        Ok(self
            .conn
            .pragma_query_value(None, "user_version", |row| row.get(0))?)
    }

    pub fn progress(&self) -> Result<Progress, StoreError> {
        let mut progress = Progress::default();

        let mut classes = self.conn.prepare(
            "SELECT class_id, video_seconds, video_watched, text_read FROM class_progress",
        )?;
        for row in classes.query_map([], |r| {
            Ok((
                r.get::<_, String>("class_id")?,
                ClassProgress {
                    video_seconds: r.get("video_seconds")?,
                    video_watched: r.get("video_watched")?,
                    text_read: r.get("text_read")?,
                },
            ))
        })? {
            let (id, class) = row?;
            progress.classes.insert(id, class);
        }

        let mut quizzes = self
            .conn
            .prepare("SELECT quiz_id, last_correct, best_correct, total, done FROM quiz_results")?;
        for row in quizzes.query_map([], |r| {
            Ok((
                r.get::<_, String>("quiz_id")?,
                QuizProgress {
                    last_correct: r.get("last_correct")?,
                    best_correct: r.get("best_correct")?,
                    total: r.get("total")?,
                    done: r.get("done")?,
                },
            ))
        })? {
            let (id, quiz) = row?;
            progress.quizzes.insert(id, quiz);
        }

        let mut stripes = self
            .conn
            .prepare("SELECT stripe_id, first_passed_at FROM stripe_passes")?;
        for row in
            stripes.query_map([], |r| Ok((r.get("stripe_id")?, r.get("first_passed_at")?)))?
        {
            let (id, at) = row?;
            progress.stripes.insert(id, at);
        }

        Ok(progress)
    }

    pub fn save_video_position(&self, class_id: &str, seconds: u32) -> Result<(), StoreError> {
        check_id("class", class_id)?;
        self.conn.execute(
            "INSERT INTO class_progress (class_id, video_seconds) VALUES (?1, ?2)
             ON CONFLICT (class_id) DO UPDATE SET video_seconds = excluded.video_seconds,
               updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')",
            params![class_id, seconds],
        )?;
        Ok(())
    }

    pub fn mark_video_watched(&self, class_id: &str) -> Result<(), StoreError> {
        check_id("class", class_id)?;
        self.conn.execute(
            "INSERT INTO class_progress (class_id, video_watched) VALUES (?1, 1)
             ON CONFLICT (class_id) DO UPDATE SET video_watched = 1,
               updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')",
            params![class_id],
        )?;
        Ok(())
    }

    /// Saves the position and/or the watched flag in one transaction.
    pub fn update_video(
        &self,
        class_id: &str,
        seconds: Option<u32>,
        watched: bool,
    ) -> Result<(), StoreError> {
        check_id("class", class_id)?;
        if seconds.is_none() && !watched {
            return Err(StoreError::Invalid(
                "send seconds (the video position) and/or watched: true".into(),
            ));
        }
        let tx = self.conn.unchecked_transaction()?;
        if let Some(seconds) = seconds {
            self.save_video_position(class_id, seconds)?;
        }
        if watched {
            self.mark_video_watched(class_id)?;
        }
        tx.commit()?;
        Ok(())
    }

    pub fn set_text_read(&self, class_id: &str, read: bool) -> Result<(), StoreError> {
        check_id("class", class_id)?;
        self.conn.execute(
            "INSERT INTO class_progress (class_id, text_read) VALUES (?1, ?2)
             ON CONFLICT (class_id) DO UPDATE SET text_read = excluded.text_read,
               updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')",
            params![class_id, read],
        )?;
        Ok(())
    }

    /// Records an attempt. Keeps the latest score and the best one; if the quiz
    /// changed size since the best score, that score no longer counts.
    pub fn record_quiz(&self, quiz_id: &str, correct: u32, total: u32) -> Result<(), StoreError> {
        check_id("quiz", quiz_id)?;
        if total == 0 || correct > total {
            return Err(StoreError::Invalid(format!(
                "a quiz score must be between 0 and a positive total (got {correct} of {total})"
            )));
        }
        self.conn.execute(
            "INSERT INTO quiz_results (quiz_id, last_correct, best_correct, total)
             VALUES (?1, ?2, ?2, ?3)
             ON CONFLICT (quiz_id) DO UPDATE SET
               last_correct = excluded.last_correct,
               best_correct = CASE WHEN total = excluded.total
                 THEN max(best_correct, excluded.last_correct)
                 ELSE excluded.last_correct END,
               total = excluded.total,
               updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')",
            params![quiz_id, correct, total],
        )?;
        Ok(())
    }

    /// Quizzes never block: a student can mark one done without taking it.
    pub fn mark_quiz_done(&self, quiz_id: &str) -> Result<(), StoreError> {
        check_id("quiz", quiz_id)?;
        self.conn.execute(
            "INSERT INTO quiz_results (quiz_id, done) VALUES (?1, 1)
             ON CONFLICT (quiz_id) DO UPDATE SET done = 1,
               updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')",
            params![quiz_id],
        )?;
        Ok(())
    }

    /// Records a score and/or marks the quiz done, in one transaction.
    pub fn update_quiz(
        &self,
        quiz_id: &str,
        score: Option<(u32, u32)>,
        done: bool,
    ) -> Result<(), StoreError> {
        check_id("quiz", quiz_id)?;
        if score.is_none() && !done {
            return Err(StoreError::Invalid(
                "send both correct and total for a quiz score, and/or done: true".into(),
            ));
        }
        let tx = self.conn.unchecked_transaction()?;
        if let Some((correct, total)) = score {
            self.record_quiz(quiz_id, correct, total)?;
        }
        if done {
            self.mark_quiz_done(quiz_id)?;
        }
        tx.commit()?;
        Ok(())
    }

    /// Called when a stripe's tests pass. Returns `true` the first time only;
    /// the first time is the one that's kept.
    pub fn record_stripe_pass(&self, stripe_id: &str) -> Result<bool, StoreError> {
        check_id("stripe", stripe_id)?;
        let inserted = self.conn.execute(
            "INSERT INTO stripe_passes (stripe_id) VALUES (?1) ON CONFLICT DO NOTHING",
            params![stripe_id],
        )?;
        Ok(inserted == 1)
    }

    pub fn notes(&self, class_id: &str) -> Result<Vec<Note>, StoreError> {
        check_id("class", class_id)?;
        let mut statement = self.conn.prepare(
            "SELECT id, class_id, anchor_kind, anchor, body, created_at, updated_at
             FROM notes WHERE class_id = ?1 ORDER BY id",
        )?;
        let notes = statement
            .query_map(params![class_id], note_from_row)?
            .collect::<Result<Vec<_>, _>>()?;
        Ok(notes)
    }

    pub fn add_note(&self, new: NewNote) -> Result<Note, StoreError> {
        check_id("class", &new.class_id)?;
        let body = check_body(&new.body)?;
        let (kind, anchor) = match &new.anchor {
            Anchor::Video { seconds } => ("video", seconds.to_string()),
            Anchor::Paragraph { id } => {
                check_id("paragraph", id)?;
                ("paragraph", id.clone())
            }
        };
        self.conn.execute(
            "INSERT INTO notes (class_id, anchor_kind, anchor, body) VALUES (?1, ?2, ?3, ?4)",
            params![new.class_id, kind, anchor, body],
        )?;
        self.note(self.conn.last_insert_rowid())
    }

    pub fn update_note(&self, id: i64, body: &str) -> Result<Note, StoreError> {
        let body = check_body(body)?;
        let changed = self.conn.execute(
            "UPDATE notes SET body = ?2, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
             WHERE id = ?1",
            params![id, body],
        )?;
        if changed == 0 {
            return Err(StoreError::NoteNotFound(id));
        }
        self.note(id)
    }

    pub fn delete_note(&self, id: i64) -> Result<(), StoreError> {
        let changed = self
            .conn
            .execute("DELETE FROM notes WHERE id = ?1", params![id])?;
        if changed == 0 {
            return Err(StoreError::NoteNotFound(id));
        }
        Ok(())
    }

    fn note(&self, id: i64) -> Result<Note, StoreError> {
        self.conn
            .query_row(
                "SELECT id, class_id, anchor_kind, anchor, body, created_at, updated_at
                 FROM notes WHERE id = ?1",
                params![id],
                note_from_row,
            )
            .optional()?
            .ok_or(StoreError::NoteNotFound(id))
    }
}

fn migrate(conn: &mut Connection) -> Result<(), StoreError> {
    let found: u32 = conn.pragma_query_value(None, "user_version", |row| row.get(0))?;
    if found > SCHEMA_VERSION {
        return Err(StoreError::NewerSchema {
            found,
            supported: SCHEMA_VERSION,
        });
    }
    for (index, sql) in MIGRATIONS.iter().enumerate().skip(found as usize) {
        let tx = conn.transaction()?;
        tx.execute_batch(sql)?;
        tx.pragma_update(None, "user_version", index as u32 + 1)?;
        tx.commit()?;
    }
    Ok(())
}

fn note_from_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<Note> {
    let kind: String = row.get("anchor_kind")?;
    let anchor: String = row.get("anchor")?;
    let anchor = match kind.as_str() {
        "video" => Anchor::Video {
            seconds: anchor.parse().unwrap_or(0),
        },
        _ => Anchor::Paragraph { id: anchor },
    };
    Ok(Note {
        id: row.get("id")?,
        class_id: row.get("class_id")?,
        anchor,
        body: row.get("body")?,
        created_at: row.get("created_at")?,
        updated_at: row.get("updated_at")?,
    })
}

/// Ids come from course content (`3.4`, `orange.3`, `p-get`): short, and made of
/// letters, digits, dots, dashes and underscores. They can't start with a dot
/// (no `..`) or a dash (they may end up as command-line arguments in P8).
fn check_id(what: &str, id: &str) -> Result<(), StoreError> {
    let valid = !id.is_empty()
        && id.len() <= MAX_ID_LEN
        && !id.starts_with(['.', '-'])
        && id
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || matches!(c, '.' | '-' | '_'));
    if valid {
        Ok(())
    } else {
        Err(StoreError::Invalid(format!(
            "not a valid {what} id: {id:?}"
        )))
    }
}

fn check_body(body: &str) -> Result<&str, StoreError> {
    let body = body.trim();
    if body.is_empty() {
        return Err(StoreError::Invalid("a note can't be empty".into()));
    }
    if body.chars().count() > MAX_NOTE_LEN {
        return Err(StoreError::Invalid(format!(
            "a note can be at most {MAX_NOTE_LEN} characters"
        )));
    }
    Ok(body)
}
