//! The content compiler's logic: `course.toml`, lessons, quizzes and outlines
//! in; the JSON and lesson HTML the frontend loads out.
//!
//! Like `oxido-core`, it does no I/O: it takes the content folder as text in
//! memory ([`Sources`]) and returns plain values. `cargo xtask content` reads
//! and writes the files. It's a crate of its own so the student's `oxido`
//! never compiles markdown-rs or arborium's tree-sitter grammars (decision D26).

use std::collections::BTreeMap;
use std::fmt;

use serde::Serialize;

mod compile;
mod course;
mod highlight;
mod html;
mod lesson;
mod outline;
mod quiz;
mod text;

pub use compile::{code_blocks, compile};
pub use text::fingerprint;

/// The content folder, as paths relative to it (`en/p01/01-hello.md`, with
/// forward slashes) mapped to each file's text.
#[derive(Debug, Clone, Default)]
pub struct Sources(BTreeMap<String, String>);

impl Sources {
    pub fn insert(&mut self, path: String, text: String) {
        self.0.insert(path, text);
    }

    pub fn remove(&mut self, path: &str) -> Option<String> {
        self.0.remove(path)
    }

    pub fn get(&self, path: &str) -> Option<&str> {
        self.0.get(path).map(String::as_str)
    }

    pub fn iter(&self) -> impl Iterator<Item = (&str, &str)> {
        self.0
            .iter()
            .map(|(path, text)| (path.as_str(), text.as_str()))
    }
}

impl FromIterator<(String, String)> for Sources {
    fn from_iter<I: IntoIterator<Item = (String, String)>>(iter: I) -> Self {
        Self(iter.into_iter().collect())
    }
}

#[derive(Debug, Clone, Default)]
pub struct Options {
    /// Where the site is served from, like `/oxido` on GitHub Pages; empty for
    /// `oxido`. Links between lessons in the HTML include it.
    pub base_path: String,
    /// Fail on lessons and quizzes that `course.toml` plans but that aren't
    /// written yet, instead of listing them (for a release).
    pub complete: bool,
}

/// An error or a warning, tied to a file and, when it helps, a line.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Problem {
    pub path: String,
    pub line: Option<usize>,
    pub message: String,
}

impl fmt::Display for Problem {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self.line {
            Some(line) => write!(f, "{}:{line}: {}", self.path, self.message),
            None => write!(f, "{}: {}", self.path, self.message),
        }
    }
}

/// Everything the frontend needs, plus what the maintainer should know.
#[derive(Debug, Clone)]
pub struct Compiled {
    pub course: Course,
    pub lessons: Vec<Lesson>,
    pub quizzes: Vec<Quiz>,
    pub warnings: Vec<Problem>,
    /// Lessons and quizzes `course.toml` plans that aren't written yet.
    pub unwritten: Vec<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Course {
    pub title: String,
    pub project: String,
    pub playlist: String,
    pub languages: Vec<String>,
    pub belts: Vec<Belt>,
    pub phases: Vec<Phase>,
    /// The quizzes that are written, by ID.
    pub quizzes: Vec<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct Belt {
    pub id: String,
    pub phases: Vec<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Phase {
    pub id: String,
    pub title: String,
    pub chapters: Vec<u32>,
    pub build: String,
    pub summary: String,
    pub stripes: Vec<String>,
    pub quiz: Option<String>,
    pub student_tdd: bool,
    pub videos: Vec<String>,
    pub lessons: Vec<LessonSummary>,
}

#[derive(Debug, Clone, Serialize)]
pub struct LessonSummary {
    pub slug: String,
    pub title: String,
    pub video: String,
    pub route: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct Lesson {
    pub phase: String,
    pub slug: String,
    pub title: String,
    pub video: String,
    /// The app's route, without the base path: `/lesson/p01/01-hello`.
    pub route: String,
    pub headings: Vec<Heading>,
    pub html: String,
    /// The video's length in seconds, from its outline.
    pub duration: u32,
    /// Where each part of the lesson starts in the video (decision D34).
    pub chapters: Vec<Chapter>,
}

/// A part of the lesson and its moment in the video: the opening text (no
/// heading, so no ID, and the lesson's title), then each `##` section.
#[derive(Debug, Clone, Serialize)]
pub struct Chapter {
    pub title: String,
    pub id: Option<String>,
    /// Seconds into the video.
    pub start: u32,
}

#[derive(Debug, Clone, Serialize)]
pub struct Heading {
    pub depth: u8,
    pub id: String,
    pub text: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct Quiz {
    pub id: String,
    pub questions: Vec<Question>,
}

/// Shaped like `Question` in `web/app/features/quiz/types.ts`.
#[derive(Debug, Clone, Serialize)]
#[serde(tag = "type")]
pub enum Question {
    MultipleChoice {
        id: String,
        prompt: String,
        #[serde(skip_serializing_if = "Option::is_none")]
        explanation: Option<String>,
        choices: Vec<String>,
        answer: usize,
    },
    ShortAnswer {
        id: String,
        prompt: String,
        #[serde(skip_serializing_if = "Option::is_none")]
        explanation: Option<String>,
        answer: String,
        #[serde(skip_serializing_if = "Vec::is_empty")]
        alternatives: Vec<String>,
    },
    Tracing {
        id: String,
        prompt: String,
        #[serde(skip_serializing_if = "Option::is_none")]
        explanation: Option<String>,
        program: String,
        answer: TracingAnswer,
    },
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TracingAnswer {
    pub does_compile: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub stdout: Option<String>,
}

/// How `cargo xtask check-code` treats a `rust` block.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CodeMode {
    Compile,
    CompileFail,
    Ignore,
}

/// A `rust` block in a lesson, with the line its opening fence is on.
#[derive(Debug, Clone)]
pub struct CodeBlock {
    pub path: String,
    pub line: usize,
    pub mode: CodeMode,
    pub code: String,
}
