//! The content compiler's checks: the fixture course compiles, and each kind
//! of invalid content fails with a message that names the file and the fix.

mod common;

use common::{compiled, edit, errors, lines, valid};
use oxido_content::{CodeMode, Options, code_blocks, compile, fingerprint};

const HELLO: &str = "en/p01/01-hello.md";
const VARIABLES: &str = "en/p01/02-variables.md";
const QUIZ: &str = "en/quizzes/quiz-01.toml";

fn complete() -> Options {
    Options {
        complete: true,
        ..Options::default()
    }
}

#[test]
fn compiles_the_fixture_course() {
    let compiled = compiled(&valid());

    let p01 = &compiled.course.phases[1];
    assert_eq!(p01.id, "p01");
    let slugs: Vec<_> = p01
        .lessons
        .iter()
        .map(|lesson| lesson.slug.as_str())
        .collect();
    assert_eq!(slugs, ["01-hello", "02-variables"]);
    assert_eq!(p01.lessons[0].route, "/lesson/p01/01-hello");
    assert_eq!(compiled.lessons.len(), 2);
    assert_eq!(compiled.quizzes.len(), 1);
    assert_eq!(compiled.course.quizzes, ["quiz-01"]);
    assert!(
        compiled.warnings.is_empty(),
        "{}",
        lines(&compiled.warnings)
    );
}

#[test]
fn lists_what_isnt_written_yet_without_failing() {
    let compiled = compiled(&valid());
    assert_eq!(
        compiled.unwritten,
        [
            "phase p02: the lesson for video ownerVideo3",
            "phase p02: quiz quiz-02 (en/quizzes/quiz-02.toml)",
        ]
    );
}

#[test]
fn fails_on_what_isnt_written_yet_when_the_course_must_be_complete() {
    let errors = errors(&valid(), &complete());
    assert!(
        errors.contains(
            "course.toml: phase p02 names quiz quiz-02, but en/quizzes/quiz-02.toml doesn't exist"
        ),
        "{errors}"
    );
    assert!(
        errors.contains(
            "course.toml: phase p02 lists video ownerVideo3, but no lesson in en/p02/ uses it"
        ),
        "{errors}"
    );
}

#[test]
fn rejects_a_lesson_in_an_unknown_phase() {
    let mut sources = valid();
    let lesson = sources.get(HELLO).unwrap().to_string();
    sources.insert("en/p99/01-hello.md".into(), lesson);
    let errors = errors(&sources, &Options::default());
    assert!(
        errors.contains("en/p99/01-hello.md: p99 isn't a phase in course.toml"),
        "{errors}"
    );
}

#[test]
fn rejects_a_belt_with_an_unknown_phase() {
    let mut sources = valid();
    edit(
        &mut sources,
        "course.toml",
        r#"phases = ["p02"]"#,
        r#"phases = ["p02", "p07"]"#,
    );
    let errors = errors(&sources, &Options::default());
    assert!(
        errors
            .contains("course.toml: belt yellow lists phase p07, which course.toml doesn't define"),
        "{errors}"
    );
}

#[test]
fn rejects_a_quiz_file_that_no_phase_uses() {
    // Usually a typo: the file is quiz-1.toml, course.toml says quiz-01.
    let mut sources = valid();
    let quiz = sources.remove(QUIZ).unwrap();
    sources.insert("en/quizzes/quiz-1.toml".into(), quiz);
    let errors = errors(&sources, &Options::default());
    assert!(
        errors.contains("en/quizzes/quiz-1.toml: no phase in course.toml uses quiz quiz-1"),
        "{errors}"
    );
}

#[test]
fn rejects_an_answer_index_out_of_range() {
    let mut sources = valid();
    edit(&mut sources, QUIZ, "answer = 1", "answer = 3");
    let errors = errors(&sources, &Options::default());
    assert!(
        errors.contains("en/quizzes/quiz-01.toml: question cargo-run has answer 3, but its choices are numbered 0 to 2"),
        "{errors}"
    );
}

#[test]
fn rejects_a_tracing_answer_that_contradicts_itself() {
    let mut sources = valid();
    edit(
        &mut sources,
        QUIZ,
        "does_compile = false",
        "does_compile = false\nstdout = \"5\"",
    );
    let errors = errors(&sources, &Options::default());
    assert!(
        errors.contains("en/quizzes/quiz-01.toml: question mutate-immutable doesn't compile, so it can't have stdout"),
        "{errors}"
    );
}

#[test]
fn rejects_a_link_to_a_lesson_that_doesnt_exist() {
    let mut sources = valid();
    edit(&mut sources, VARIABLES, "(01-hello.md)", "(01-helo.md)");
    let errors = errors(&sources, &Options::default());
    assert!(
        errors.contains(
            "en/p01/02-variables.md:9: the link to 01-helo.md points to a lesson that doesn't exist"
        ),
        "{errors}"
    );
}

#[test]
fn rejects_a_link_to_a_heading_that_doesnt_exist() {
    let mut sources = valid();
    edit(
        &mut sources,
        HELLO,
        "02-variables.md#shadowing",
        "02-variables.md#shadows",
    );
    let errors = errors(&sources, &Options::default());
    assert!(
        errors.contains("en/p01/01-hello.md:29: the link to 02-variables.md#shadows points to a heading that doesn't exist (en/p01/02-variables.md has: shadowing)"),
        "{errors}"
    );
}

#[test]
fn rejects_a_lesson_without_a_video_id() {
    let mut sources = valid();
    edit(&mut sources, HELLO, "video = \"helloVideo1\"\n", "");
    let errors = errors(&sources, &Options::default());
    assert!(errors.contains("en/p01/01-hello.md: the front matter has no video (the YouTube ID of the lesson's video)"), "{errors}");
}

#[test]
fn rejects_a_video_the_phase_doesnt_list() {
    let mut sources = valid();
    edit(
        &mut sources,
        HELLO,
        "video = \"helloVideo1\"",
        "video = \"ownerVideo3\"",
    );
    let errors = errors(&sources, &Options::default());
    assert!(
        errors.contains(
            "en/p01/01-hello.md: video ownerVideo3 isn't in phase p01's videos in course.toml"
        ),
        "{errors}"
    );
}

#[test]
fn rejects_a_video_listed_in_two_phases() {
    let mut sources = valid();
    edit(
        &mut sources,
        "course.toml",
        r#"videos = ["ownerVideo3"]"#,
        r#"videos = ["ownerVideo3", "helloVideo1"]"#,
    );
    let errors = errors(&sources, &Options::default());
    assert!(
        errors.contains("course.toml: video helloVideo1 is listed in both p01 and p02"),
        "{errors}"
    );
}

#[test]
fn rejects_a_video_id_that_isnt_one() {
    let mut sources = valid();
    edit(
        &mut sources,
        "course.toml",
        "\"ownerVideo3\"",
        "\"https://youtu.be/ownerVideo3\"",
    );
    let errors = errors(&sources, &Options::default());
    assert!(
        errors.contains("course.toml: phase p02 lists \"https://youtu.be/ownerVideo3\", which isn't a YouTube video ID (11 letters, digits, - or _)"),
        "{errors}"
    );
}

#[test]
fn rejects_malformed_front_matter() {
    let mut sources = valid();
    edit(&mut sources, HELLO, "+++\ntitle", "---\ntitle");
    let errors = errors(&sources, &Options::default());
    assert!(
        errors.contains(
            "en/p01/01-hello.md: a lesson starts with TOML front matter between +++ lines"
        ),
        "{errors}"
    );
}

#[test]
fn rejects_unknown_front_matter_fields() {
    let mut sources = valid();
    edit(&mut sources, HELLO, "title = ", "tittle = \"x\"\ntitle = ");
    let errors = errors(&sources, &Options::default());
    assert!(errors.contains("en/p01/01-hello.md:2: unknown field `tittle`, expected one of `title`, `video`, `outline`"), "{errors}");
}

#[test]
fn reports_toml_syntax_errors_with_their_line() {
    let mut sources = valid();
    edit(
        &mut sources,
        "course.toml",
        "title = \"Fixture Course\"",
        "title = \"Fixture Course",
    );
    let errors = errors(&sources, &Options::default());
    assert!(errors.starts_with("course.toml:5: "), "{errors}");
}

#[test]
fn rejects_a_lesson_without_an_outline() {
    let mut sources = valid();
    sources.remove("outlines/02-variables.md");
    let errors = errors(&sources, &Options::default());
    assert!(
        errors.contains("en/p01/02-variables.md: its outline, outlines/02-variables.md, doesn't exist (lessons are written from an outline: see the lesson skill)"),
        "{errors}"
    );
}

#[test]
fn rejects_an_outline_for_another_video() {
    let mut sources = valid();
    edit(
        &mut sources,
        "outlines/02-variables.md",
        "shadowVid02",
        "helloVideo1",
    );
    let errors = errors(&sources, &Options::default());
    assert!(
        errors.contains("en/p01/02-variables.md: its outline is for video helloVideo1, but the lesson is for shadowVid02"),
        "{errors}"
    );
}

#[test]
fn warns_when_the_outline_changed_after_the_lesson() {
    let mut sources = valid();
    edit(
        &mut sources,
        "outlines/02-variables.md",
        "(shadowing)",
        "(shadowing), even with a new type",
    );
    let compiled = compiled(&sources);
    let warnings = lines(&compiled.warnings);
    let now = fingerprint(sources.get("outlines/02-variables.md").unwrap());
    assert!(
        warnings.contains(&format!(
            "en/p01/02-variables.md: outlines/02-variables.md changed since this lesson was written. Check the lesson against it, then set outline = \"{now}\""
        )),
        "{warnings}"
    );
}

#[test]
fn rejects_a_level_one_heading_in_a_lesson() {
    let mut sources = valid();
    edit(&mut sources, VARIABLES, "## Shadowing", "# Shadowing");
    let errors = errors(&sources, &Options::default());
    assert!(errors.contains("en/p01/02-variables.md:7: use ## and below for sections; the title comes from the front matter"), "{errors}");
}

#[test]
fn rejects_code_in_a_language_it_cant_highlight() {
    let mut sources = valid();
    edit(&mut sources, VARIABLES, "```console", "```cobol");
    let errors = errors(&sources, &Options::default());
    assert!(
        errors.contains("en/p01/02-variables.md:29: code blocks can be rust, toml, bash, sh, console or text, not cobol"),
        "{errors}"
    );
}

#[test]
fn rejects_markdown_it_doesnt_render() {
    let mut sources = valid();
    edit(
        &mut sources,
        VARIABLES,
        "- one",
        "- ![a diagram](diagram.png)",
    );
    let errors = errors(&sources, &Options::default());
    assert!(
        errors.contains("en/p01/02-variables.md:11: images aren't supported in lessons yet"),
        "{errors}"
    );
}

#[test]
fn rejects_files_it_doesnt_expect() {
    let mut sources = valid();
    sources.insert("en/quizes/quiz-01.toml".into(), String::new());
    sources.insert("en/p01/hello.md".into(), String::new());
    let errors = errors(&sources, &Options::default());
    assert!(
        errors.contains("en/quizes/quiz-01.toml: the compiler doesn't know this file"),
        "{errors}"
    );
    assert!(
        errors.contains("en/p01/hello.md: lesson files are named <NN>-<slug>.md, with the video's position in the playlist"),
        "{errors}"
    );
}

#[test]
fn lists_the_rust_blocks_to_compile() {
    let blocks = code_blocks(&valid()).expect("the fixture parses");
    let found: Vec<_> = blocks
        .iter()
        .map(|block| (block.path.as_str(), block.line, block.mode))
        .collect();
    assert_eq!(
        found,
        [
            (HELLO, 11, CodeMode::Compile),
            (HELLO, 20, CodeMode::CompileFail),
            (VARIABLES, 25, CodeMode::Ignore),
        ]
    );
    assert!(blocks[1].code.contains("let count: i32"));
}

#[test]
fn fingerprints_match_sha256sum() {
    // `sha256sum` of a file with "hello\n" in it.
    assert_eq!(
        fingerprint("hello\n"),
        "sha256:5891b5b522d5df086d0ff0b110fbd9d21bb4fc7163af34d08286a2e846f6be03"
    );
}

#[test]
fn compiles_a_course_with_nothing_written_yet() {
    // Today's content/: course.toml and nothing else.
    let course = valid().get("course.toml").unwrap().to_string();
    let only_course = [("course.toml".to_string(), course)].into_iter().collect();
    let compiled = compile(&only_course, &Options::default()).expect("compiles");
    assert!(compiled.lessons.is_empty());
    assert_eq!(compiled.unwritten.len(), 5);
}
