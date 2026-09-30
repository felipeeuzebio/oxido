//! `course.toml`: the phases, belts, videos and quizzes the course plans.

use std::collections::BTreeMap;

use serde::Deserialize;

use crate::Problem;
use crate::text::{is_video_id, parse_toml};

pub const PATH: &str = "course.toml";

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct CourseFile {
    pub course: Meta,
    #[serde(default)]
    pub belts: Vec<BeltFile>,
    #[serde(default)]
    pub phases: Vec<PhaseFile>,
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Meta {
    pub title: String,
    pub project: String,
    pub playlist: String,
    pub languages: Vec<String>,
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct BeltFile {
    pub id: String,
    pub phases: Vec<String>,
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct PhaseFile {
    pub id: String,
    pub title: String,
    pub chapters: Vec<u32>,
    pub build: String,
    #[serde(default)]
    pub stripes: Vec<String>,
    pub quiz: Option<String>,
    #[serde(default)]
    pub student_tdd: bool,
    #[serde(default)]
    pub videos: Vec<String>,
}

impl CourseFile {
    pub fn phase(&self, id: &str) -> Option<&PhaseFile> {
        self.phases.iter().find(|phase| phase.id == id)
    }
}

pub fn parse(text: &str) -> Result<CourseFile, Problem> {
    parse_toml(PATH, text, 1)
}

/// References inside `course.toml` itself: belts name real phases, IDs are
/// unique, and each video is a real ID listed once.
pub fn check(course: &CourseFile) -> Vec<Problem> {
    let mut problems = Vec::new();
    let mut error = |message: String| {
        problems.push(Problem {
            path: PATH.to_string(),
            line: None,
            message,
        })
    };

    let mut phases = BTreeMap::new();
    for phase in &course.phases {
        if phases.insert(phase.id.as_str(), ()).is_some() {
            error(format!("phase {} is defined twice", phase.id));
        }
    }
    let mut belt_of = BTreeMap::new();
    for belt in &course.belts {
        for phase in &belt.phases {
            if !phases.contains_key(phase.as_str()) {
                error(format!(
                    "belt {} lists phase {phase}, which course.toml doesn't define",
                    belt.id
                ));
            } else if let Some(other) = belt_of.insert(phase.as_str(), belt.id.as_str()) {
                error(format!(
                    "phase {phase} is in both belt {other} and belt {}",
                    belt.id
                ));
            }
        }
    }

    let mut quiz_of = BTreeMap::new();
    let mut phase_of = BTreeMap::new();
    for phase in &course.phases {
        if let Some(quiz) = &phase.quiz
            && let Some(other) = quiz_of.insert(quiz.as_str(), phase.id.as_str())
        {
            error(format!(
                "quiz {quiz} is named by both {other} and {}",
                phase.id
            ));
        }
        for video in &phase.videos {
            if !is_video_id(video) {
                error(format!(
                    "phase {} lists {video:?}, which isn't a YouTube video ID (11 letters, digits, - or _)",
                    phase.id
                ));
            } else if let Some(other) = phase_of.insert(video.as_str(), phase.id.as_str()) {
                if other == phase.id {
                    error(format!("video {video} is listed twice in {other}"));
                } else {
                    error(format!(
                        "video {video} is listed in both {other} and {}",
                        phase.id
                    ));
                }
            }
        }
    }
    problems
}
