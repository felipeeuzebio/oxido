//! The content compiler's checks: the fixture course compiles, and each kind
//! of invalid content fails with a message that names the file and the fix.

mod common;

use common::{compiled, edit, errors, lines, valid};
use oxido_content::{
    CodeMode, Compiled, Lesson, Options, Stripe, Task, code_blocks, compile, fingerprint,
};

const HELLO: &str = "en/p01/01-hello.md";
const VARIABLES: &str = "en/p01/02-variables.md";
const QUIZ: &str = "en/quizzes/quiz-01.toml";

fn complete() -> Options {
    Options {
        complete: true,
        ..Options::default()
    }
}

fn lesson<'a>(compiled: &'a Compiled, slug: &str) -> &'a Lesson {
    compiled
        .lessons
        .iter()
        .find(|lesson| lesson.slug == slug)
        .expect("the fixture course has this lesson")
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
fn rejects_a_phase_without_a_summary() {
    let mut sources = valid();
    edit(
        &mut sources,
        "course.toml",
        "summary = \"Store rows in a table.\"\n",
        "",
    );
    let errors = errors(&sources, &Options::default());
    assert!(errors.contains("missing field `summary`"), "{errors}");
}

#[test]
fn rejects_a_blank_summary() {
    let mut sources = valid();
    edit(
        &mut sources,
        "course.toml",
        "summary = \"Store rows in a table.\"",
        "summary = \" \"",
    );
    let errors = errors(&sources, &Options::default());
    assert!(
        errors.contains(
            "course.toml: phase p02 has a blank summary; the roadmap shows it on the phase's card"
        ),
        "{errors}"
    );
}

#[test]
fn rejects_an_unmatched_backtick_in_text_the_roadmap_shows() {
    // The roadmap sets code between a pair of backticks, so a lone one would
    // turn the rest of the sentence into code.
    let mut sources = valid();
    edit(
        &mut sources,
        "course.toml",
        "summary = \"Store rows in a table.\"",
        "summary = \"Store `rows in a table.\"",
    );
    edit(
        &mut sources,
        "course.toml",
        "\".exit ends the program\"",
        "\"`.exit ends the program\"",
    );
    let errors = errors(&sources, &Options::default());
    assert!(
        errors.contains(
            "course.toml: phase p02's summary has an unmatched backtick; code goes between a pair of them"
        ),
        "{errors}"
    );
    assert!(
        errors.contains(
            "course.toml: phase p01's stripe 2 has an unmatched backtick; code goes between a pair of them"
        ),
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
            "en/p01/02-variables.md:10: the link to 01-helo.md points to a lesson that doesn't exist"
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
        errors.contains("en/p01/01-hello.md:30: the link to 02-variables.md#shadows points to a heading that doesn't exist (en/p01/02-variables.md has: shadowing)"),
        "{errors}"
    );
}

const OUTLINE: &str = "outlines/01-hello.md";

/// The chapters in the fixture outline's front matter.
const CHAPTERS: &str = "chapters = [
  { point = 1, title = \"Hello, Cargo\" },
  { point = 2, title = \"Your first program\" },
  { point = 3, title = \"Your first program\" },
]
";

#[test]
fn takes_the_chapters_from_the_outline() {
    let compiled = compiled(&valid());
    let hello = lesson(&compiled, "01-hello");
    assert_eq!(hello.duration, 928);
    let chapters: Vec<_> = hello
        .chapters
        .iter()
        .map(|chapter| (chapter.title.as_str(), chapter.start))
        .collect();
    assert_eq!(
        chapters,
        [
            ("Hello, Cargo", 10),
            ("Your first program", 90),
            ("Your first program", 160),
        ]
    );
}

#[test]
fn rejects_an_outline_without_chapters() {
    let mut sources = valid();
    edit(&mut sources, OUTLINE, CHAPTERS, "");
    let errors = errors(&sources, &Options::default());
    assert!(
        errors.contains(
            "outlines/01-hello.md: the front matter has no chapters: name each chapter and the point it starts at, as chapters = [{ point = 1, title = \"…\" }]"
        ),
        "{errors}"
    );
}

#[test]
fn rejects_chapters_that_dont_start_at_the_first_point() {
    let mut sources = valid();
    edit(
        &mut sources,
        OUTLINE,
        "  { point = 1, title = \"Hello, Cargo\" },\n",
        "",
    );
    let errors = errors(&sources, &Options::default());
    assert!(
        errors.contains(
            "outlines/01-hello.md:5: the first chapter starts at point 2: start it at point 1, so the chapters cover the whole video"
        ),
        "{errors}"
    );
}

#[test]
fn rejects_a_chapter_at_a_point_the_outline_doesnt_have() {
    let mut sources = valid();
    edit(&mut sources, OUTLINE, "point = 3", "point = 9");
    let errors = errors(&sources, &Options::default());
    assert!(
        errors.contains(
            "outlines/01-hello.md:5: chapter “Your first program” starts at point 9, but the outline has points 1 to 3"
        ),
        "{errors}"
    );
}

#[test]
fn rejects_chapters_out_of_the_videos_order() {
    let mut sources = valid();
    edit(&mut sources, OUTLINE, "point = 2", "point = 4");
    edit(&mut sources, OUTLINE, "point = 3", "point = 2");
    edit(&mut sources, OUTLINE, "point = 4", "point = 3");
    let errors = errors(&sources, &Options::default());
    assert!(
        errors.contains(
            "outlines/01-hello.md:5: chapter “Your first program” starts at point 2, but the chapter before it starts at point 3: chapters follow the video"
        ),
        "{errors}"
    );
}

#[test]
fn gives_each_lesson_its_task() {
    let compiled = compiled(&valid());
    assert_eq!(
        lesson(&compiled, "01-hello").task,
        Task::Stripes {
            belt: "white".into(),
            stripes: vec![
                Stripe {
                    number: 1,
                    title: "a prompt that reads lines".into(),
                },
                Stripe {
                    number: 2,
                    title: ".exit ends the program".into(),
                },
            ],
        }
    );
    assert_eq!(
        lesson(&compiled, "02-variables").task,
        Task::Drill {
            name: "shadowing".into(),
        }
    );
}

#[test]
fn gives_class_1_the_setup_as_its_task() {
    let mut sources = valid();
    edit(&mut sources, HELLO, "stripes = [1, 2]", "setup = true");
    assert_eq!(lesson(&compiled(&sources), "01-hello").task, Task::Setup);
}

#[test]
fn numbers_stripes_as_their_belt_does() {
    // Purple, brown and black each span two phases, so a phase's stripes go on
    // from the earlier phase's on the same belt, as in the stripe tests' names.
    let mut sources = valid();
    edit(
        &mut sources,
        "course.toml",
        "[[belts]]\nid = \"yellow\"\nphases = [\"p02\"]\n\n",
        "",
    );
    edit(
        &mut sources,
        "course.toml",
        "phases = [\"p01\"]",
        "phases = [\"p02\", \"p01\"]",
    );
    let errors = errors(&sources, &Options::default());
    assert!(
        errors.contains(
            "en/p01/01-hello.md: stripe 1 isn't one of phase p01's: they're the white belt's stripes 2 to 3"
        ),
        "{errors}"
    );

    edit(&mut sources, HELLO, "stripes = [1, 2]", "stripes = [2, 3]");
    let compiled = compiled(&sources);
    let Task::Stripes { stripes, .. } = &lesson(&compiled, "01-hello").task else {
        panic!("expected stripes");
    };
    let numbers: Vec<_> = stripes.iter().map(|stripe| stripe.number).collect();
    assert_eq!(numbers, [2, 3]);
}

#[test]
fn rejects_a_lesson_without_a_task() {
    let mut sources = valid();
    edit(&mut sources, HELLO, "stripes = [1, 2]\n", "");
    let errors = errors(&sources, &Options::default());
    assert!(
        errors.contains(
            "en/p01/01-hello.md: the front matter has no task: set stripes = [1, 2] (stripes of its belt), drill = \"name\" or setup = true"
        ),
        "{errors}"
    );
}

#[test]
fn rejects_a_lesson_with_more_than_one_task() {
    let mut sources = valid();
    edit(
        &mut sources,
        HELLO,
        "stripes = [1, 2]\n",
        "stripes = [1, 2]\nsetup = true\n",
    );
    let errors = errors(&sources, &Options::default());
    assert!(
        errors.contains(
            "en/p01/01-hello.md: the front matter sets more than one task: keep one of stripes, drill and setup"
        ),
        "{errors}"
    );
}

#[test]
fn rejects_a_stripe_its_phase_doesnt_have() {
    let mut sources = valid();
    edit(&mut sources, HELLO, "stripes = [1, 2]", "stripes = [1, 3]");
    let errors = errors(&sources, &Options::default());
    assert!(
        errors.contains(
            "en/p01/01-hello.md: stripe 3 isn't one of phase p01's: they're the white belt's stripes 1 to 2"
        ),
        "{errors}"
    );
}

#[test]
fn rejects_a_stripe_given_to_two_lessons() {
    let mut sources = valid();
    edit(
        &mut sources,
        VARIABLES,
        "drill = \"shadowing\"",
        "stripes = [2]",
    );
    let errors = errors(&sources, &Options::default());
    assert!(
        errors.contains(
            "en/p01/02-variables.md: the white belt's stripe 2 is already the task of en/p01/01-hello.md"
        ),
        "{errors}"
    );
}

#[test]
fn rejects_a_drill_name_that_isnt_one() {
    let mut sources = valid();
    edit(
        &mut sources,
        VARIABLES,
        "drill = \"shadowing\"",
        "drill = \"Shadow ing\"",
    );
    let errors = errors(&sources, &Options::default());
    assert!(
        errors.contains(
            "en/p01/02-variables.md: drill = \"Shadow ing\" isn't a drill name: use lowercase letters, digits and -"
        ),
        "{errors}"
    );
}

#[test]
fn rejects_the_setup_in_two_lessons() {
    let mut sources = valid();
    edit(&mut sources, HELLO, "stripes = [1, 2]", "setup = true");
    edit(
        &mut sources,
        VARIABLES,
        "drill = \"shadowing\"",
        "setup = true",
    );
    let errors = errors(&sources, &Options::default());
    assert!(
        errors.contains(
            "en/p01/02-variables.md: the setup is already the task of en/p01/01-hello.md"
        ),
        "{errors}"
    );
}

#[test]
fn fails_on_a_stripe_no_class_sets_when_the_course_must_be_complete() {
    let errors = errors(&valid(), &complete());
    assert!(
        errors
            .contains("course.toml: the yellow belt's stripe 1 (rows) isn't the task of any class"),
        "{errors}"
    );
}

#[test]
fn rejects_a_time_written_by_hand() {
    let mut sources = valid();
    edit(
        &mut sources,
        HELLO,
        "then *try*",
        "then [at 0:42](#t=0:42) *try*",
    );
    let errors = errors(&sources, &Options::default());
    assert!(
        errors.contains(
            "lessons don't write times: link a moment in the video by its outline point, as [text](video:4)"
        ),
        "{errors}"
    );
}

#[test]
fn rejects_a_hint_to_a_point_the_outline_doesnt_have() {
    let mut sources = valid();
    edit(&mut sources, HELLO, "(video:2)", "(video:9)");
    let missing = errors(&sources, &Options::default());
    assert!(
        missing.contains(
            "en/p01/01-hello.md:8: video:9 links point 9, but outlines/01-hello.md has points 1 to 3"
        ),
        "{missing}"
    );

    edit(&mut sources, HELLO, "(video:9)", "(video:two)");
    let malformed = errors(&sources, &Options::default());
    assert!(
        malformed.contains(
            "en/p01/01-hello.md:8: video:two isn't a point: link one by its number, as video:4"
        ),
        "{malformed}"
    );
}

#[test]
fn rejects_an_outline_without_the_videos_length() {
    let mut sources = valid();
    edit(&mut sources, OUTLINE, "duration = \"15:28\"\n", "");
    let errors = errors(&sources, &Options::default());
    assert!(errors.contains("missing field `duration`"), "{errors}");
}

#[test]
fn rejects_an_outline_point_without_a_time() {
    let mut sources = valid();
    edit(&mut sources, OUTLINE, "2. [01:30] Demo", "2. Demo");
    let errors = errors(&sources, &Options::default());
    assert!(
        errors.contains(
            "outlines/01-hello.md:13: point 2 has no time: start it with [m:ss], when he makes it in the video"
        ),
        "{errors}"
    );
}

#[test]
fn rejects_outline_points_out_of_the_videos_order() {
    let mut sources = valid();
    edit(&mut sources, OUTLINE, "2. [01:30]", "2. [00:05]");
    let errors = errors(&sources, &Options::default());
    assert!(
        errors.contains(
            "outlines/01-hello.md:13: point 2 starts at 00:05, before point 1 (00:10): the points follow the video"
        ),
        "{errors}"
    );
}

#[test]
fn rejects_an_outline_point_after_the_video_ends() {
    let mut sources = valid();
    edit(&mut sources, OUTLINE, "3. [02:40]", "3. [16:00]");
    let errors = errors(&sources, &Options::default());
    assert!(
        errors.contains(
            "outlines/01-hello.md:14: point 3 starts at 16:00, after the video ends (15:28)"
        ),
        "{errors}"
    );
}

#[test]
fn rejects_outline_points_numbered_out_of_order() {
    let mut sources = valid();
    edit(&mut sources, OUTLINE, "2. [01:30]", "4. [01:30]");
    let errors = errors(&sources, &Options::default());
    assert!(
        errors.contains("outlines/01-hello.md:13: point 4 comes after point 1: number the points 1, 2, 3 in order"),
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
    assert!(errors.contains("en/p01/01-hello.md:2: unknown field `tittle`, expected one of `title`, `video`, `outline`, `stripes`, `drill`, `setup`"), "{errors}");
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
    assert!(errors.contains("en/p01/02-variables.md:8: use ## and below for sections; the title comes from the front matter"), "{errors}");
}

#[test]
fn rejects_code_in_a_language_it_cant_highlight() {
    let mut sources = valid();
    edit(&mut sources, VARIABLES, "```console", "```cobol");
    let errors = errors(&sources, &Options::default());
    assert!(
        errors.contains("en/p01/02-variables.md:30: code blocks can be rust, toml, bash, sh, console or text, not cobol"),
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
        errors.contains("en/p01/02-variables.md:12: images aren't supported in lessons yet"),
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
            (HELLO, 12, CodeMode::Compile),
            (HELLO, 21, CodeMode::CompileFail),
            (VARIABLES, 26, CodeMode::Ignore),
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
