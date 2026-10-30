-- Schema version 1 as released. Frozen: migration tests start from it.
CREATE TABLE class_progress (
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
CREATE INDEX notes_by_class ON notes (class_id, id);
PRAGMA user_version = 1;
