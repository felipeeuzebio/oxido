//! The whole pass: sort the files, parse and check each one, check the
//! references between them, then write the output.

use std::collections::BTreeMap;

use crate::course::{self, CourseFile};
use crate::highlight::Highlighter;
use crate::html::{self, Writer};
use crate::lesson::{self, Parsed};
use crate::outline::{self, Outline};
use crate::text::{fingerprint, is_numbered_slug};
use crate::{
    Belt, CodeBlock, Compiled, Course, Lesson, LessonSummary, Options, Phase, Problem, Quiz,
    Sources, quiz,
};

/// What a path in the content folder is.
enum Kind<'a> {
    Course,
    Lesson { phase: &'a str, slug: &'a str },
    Quiz { id: &'a str },
    Outline { slug: &'a str },
}

fn kind(path: &str) -> Result<Kind<'_>, String> {
    let parts: Vec<&str> = path.split('/').collect();
    match parts.as_slice() {
        ["course.toml"] => Ok(Kind::Course),
        ["outlines", file] => match file.strip_suffix(".md") {
            Some(slug) if is_numbered_slug(slug) => Ok(Kind::Outline { slug }),
            _ => Err("outline files are named <NN>-<slug>.md, like their lesson".into()),
        },
        [language, ..] if *language != "en" && parts.len() == 3 => Err(format!(
            "only en/ is compiled for now; translations ({language}/) come with P9"
        )),
        ["en", "quizzes", file] => match file.strip_suffix(".toml") {
            Some(id) => Ok(Kind::Quiz { id }),
            None => Err("the compiler doesn't know this file".into()),
        },
        ["en", phase, file] => match file.strip_suffix(".md") {
            Some(slug) if is_numbered_slug(slug) => Ok(Kind::Lesson { phase, slug }),
            Some(_) => Err(
                "lesson files are named <NN>-<slug>.md, with the video's position in the playlist"
                    .into(),
            ),
            None => Err("the compiler doesn't know this file".into()),
        },
        _ => Err("the compiler doesn't know this file".into()),
    }
}

fn problem(path: &str, message: impl Into<String>) -> Problem {
    Problem {
        path: path.to_string(),
        line: None,
        message: message.into(),
    }
}

pub fn compile(sources: &Sources, options: &Options) -> Result<Compiled, Vec<Problem>> {
    let mut errors = Vec::new();
    let mut warnings = Vec::new();

    let text = sources.get(course::PATH).ok_or_else(|| {
        vec![problem(
            course::PATH,
            "the content folder has no course.toml",
        )]
    })?;
    let course = course::parse(text).map_err(|problem| vec![problem])?;
    errors.extend(course::check(&course));

    let (lessons, quiz_files, outlines) = read(sources, &course, &mut errors);
    check_lessons(
        &lessons,
        &course,
        &outlines,
        sources,
        &mut errors,
        &mut warnings,
    );

    let mut quizzes = Vec::new();
    for (path, id, text) in quiz_files {
        if !course
            .phases
            .iter()
            .any(|phase| phase.quiz.as_deref() == Some(id))
        {
            errors.push(problem(
                path,
                format!("no phase in course.toml uses quiz {id}"),
            ));
            continue;
        }
        match quiz::parse(path, id, text) {
            Ok(quiz) => quizzes.push(quiz),
            Err(problems) => errors.extend(problems),
        }
    }

    let unwritten = unwritten(&course, &lessons, &quizzes, options.complete, &mut errors);

    let mut rendered = Vec::new();
    if errors.is_empty() {
        let index = html::index(&lessons);
        let mut highlighter = Highlighter::new();
        for lesson in &lessons {
            let (html, problems) =
                Writer::new(lesson, &index, &options.base_path, &mut highlighter).write();
            errors.extend(problems);
            rendered.push(Lesson {
                phase: lesson.phase.clone(),
                slug: lesson.slug.clone(),
                title: lesson.title.clone(),
                video: lesson.video.clone().unwrap_or_default(),
                route: lesson.route(),
                headings: lesson.headings.clone(),
                html,
            });
        }
    }
    if !errors.is_empty() {
        return Err(errors);
    }

    Ok(Compiled {
        course: output(&course, &rendered, &quizzes),
        lessons: rendered,
        quizzes,
        warnings,
        unwritten,
    })
}

type Files<'a> = (
    Vec<Parsed>,
    Vec<(&'a str, &'a str, &'a str)>,
    BTreeMap<&'a str, (&'a str, &'a str)>,
);

/// Sorts the files by kind and parses the lessons.
fn read<'a>(sources: &'a Sources, course: &CourseFile, errors: &mut Vec<Problem>) -> Files<'a> {
    let mut lessons = Vec::new();
    let mut quizzes = Vec::new();
    let mut outlines = BTreeMap::new();
    for (path, text) in sources.iter() {
        match kind(path) {
            Err(message) => errors.push(problem(path, message)),
            Ok(Kind::Course) => {}
            Ok(Kind::Quiz { id }) => quizzes.push((path, id, text)),
            Ok(Kind::Outline { slug }) => {
                outlines.insert(slug, (path, text));
            }
            Ok(Kind::Lesson { phase, .. }) if course.phase(phase).is_none() => {
                errors.push(problem(
                    path,
                    format!("{phase} isn't a phase in course.toml"),
                ));
            }
            Ok(Kind::Lesson { phase, slug }) => match lesson::parse(path, phase, slug, text) {
                Ok(lesson) => lessons.push(lesson),
                Err(problems) => errors.extend(problems),
            },
        }
    }
    (lessons, quizzes, outlines)
}

/// Each lesson's video is planned for its phase, and it has an outline for
/// the same video that hasn't changed since the lesson was written.
fn check_lessons(
    lessons: &[Parsed],
    course: &CourseFile,
    outlines: &BTreeMap<&str, (&str, &str)>,
    sources: &Sources,
    errors: &mut Vec<Problem>,
    warnings: &mut Vec<Problem>,
) {
    let mut lesson_of = BTreeMap::new();
    let mut parsed_outlines: BTreeMap<&str, Outline> = BTreeMap::new();
    for (slug, (path, text)) in outlines {
        match outline::parse(path, text) {
            Ok(outline) => {
                parsed_outlines.insert(slug, outline);
            }
            Err(problem) => errors.push(problem),
        }
    }

    for lesson in lessons {
        let path = lesson.path.as_str();
        let Some(video) = &lesson.video else {
            errors.push(problem(
                path,
                "the front matter has no video (the YouTube ID of the lesson's video)",
            ));
            continue;
        };
        let planned = course
            .phase(&lesson.phase)
            .is_some_and(|phase| phase.videos.contains(video));
        if !planned {
            let message = format!(
                "video {video} isn't in phase {}'s videos in course.toml",
                lesson.phase
            );
            errors.push(problem(path, message));
        }
        if let Some(other) = lesson_of.insert(video.as_str(), path) {
            errors.push(problem(
                path,
                format!("video {video} already has a lesson: {other}"),
            ));
        }

        let outline_path = format!("outlines/{}.md", lesson.slug);
        let Some(outline) = parsed_outlines.get(lesson.slug.as_str()) else {
            if !outlines.contains_key(lesson.slug.as_str()) {
                let message = format!(
                    "its outline, {outline_path}, doesn't exist (lessons are written from an outline: see the lesson skill)"
                );
                errors.push(problem(path, message));
            }
            continue;
        };
        if &outline.video != video {
            let message = format!(
                "its outline is for video {}, but the lesson is for {video}",
                outline.video
            );
            errors.push(problem(path, message));
        }
        let now = fingerprint(sources.get(&outline_path).unwrap_or_default());
        match &lesson.outline {
            None => errors.push(problem(
                path,
                format!("the front matter has no outline (set outline = \"{now}\" once the lesson follows {outline_path})"),
            )),
            Some(recorded) if *recorded != now => warnings.push(problem(
                path,
                format!(
                    "{outline_path} changed since this lesson was written. Check the lesson against it, then set outline = \"{now}\""
                ),
            )),
            Some(_) => {}
        }
    }
}

/// Lessons and quizzes `course.toml` plans that don't exist yet: listed while
/// the course is being written, errors when it must be complete.
fn unwritten(
    course: &CourseFile,
    lessons: &[Parsed],
    quizzes: &[Quiz],
    complete: bool,
    errors: &mut Vec<Problem>,
) -> Vec<String> {
    let mut missing = Vec::new();
    for phase in &course.phases {
        for video in &phase.videos {
            let written = lessons
                .iter()
                .any(|lesson| lesson.phase == phase.id && lesson.video.as_ref() == Some(video));
            if written {
                continue;
            }
            if complete {
                let message = format!(
                    "phase {} lists video {video}, but no lesson in en/{}/ uses it",
                    phase.id, phase.id
                );
                errors.push(problem(course::PATH, message));
            }
            missing.push(format!("phase {}: the lesson for video {video}", phase.id));
        }
        if let Some(id) = &phase.quiz
            && !quizzes.iter().any(|quiz| &quiz.id == id)
        {
            if complete {
                let message = format!(
                    "phase {} names quiz {id}, but en/quizzes/{id}.toml doesn't exist",
                    phase.id
                );
                errors.push(problem(course::PATH, message));
            }
            missing.push(format!(
                "phase {}: quiz {id} (en/quizzes/{id}.toml)",
                phase.id
            ));
        }
    }
    missing
}

fn output(course: &CourseFile, lessons: &[Lesson], quizzes: &[Quiz]) -> Course {
    let phases = course
        .phases
        .iter()
        .map(|phase| Phase {
            id: phase.id.clone(),
            title: phase.title.clone(),
            chapters: phase.chapters.clone(),
            build: phase.build.clone(),
            summary: phase.summary.clone(),
            stripes: phase.stripes.clone(),
            quiz: phase.quiz.clone(),
            student_tdd: phase.student_tdd,
            videos: phase.videos.clone(),
            lessons: lessons
                .iter()
                .filter(|lesson| lesson.phase == phase.id)
                .map(|lesson| LessonSummary {
                    slug: lesson.slug.clone(),
                    title: lesson.title.clone(),
                    video: lesson.video.clone(),
                    route: lesson.route.clone(),
                })
                .collect(),
        })
        .collect();
    let mut written: Vec<String> = quizzes.iter().map(|quiz| quiz.id.clone()).collect();
    written.sort();
    Course {
        title: course.course.title.clone(),
        project: course.course.project.clone(),
        playlist: course.course.playlist.clone(),
        languages: course.course.languages.clone(),
        belts: course
            .belts
            .iter()
            .map(|belt| Belt {
                id: belt.id.clone(),
                phases: belt.phases.clone(),
            })
            .collect(),
        phases,
        quizzes: written,
    }
}

/// The `rust` blocks in every lesson, for `cargo xtask check-code`.
pub fn code_blocks(sources: &Sources) -> Result<Vec<CodeBlock>, Vec<Problem>> {
    let mut blocks = Vec::new();
    let mut errors = Vec::new();
    for (path, text) in sources.iter() {
        if let Ok(Kind::Lesson { phase, slug }) = kind(path) {
            match lesson::parse(path, phase, slug, text) {
                Ok(lesson) => blocks.extend(lesson.code),
                Err(problems) => errors.extend(problems),
            }
        }
    }
    if errors.is_empty() {
        Ok(blocks)
    } else {
        Err(errors)
    }
}
