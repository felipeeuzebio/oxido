//! What the compiler emits: lesson HTML (snapshots in `snapshots/`) and the
//! JSON the frontend reads (golden files in `golden/`).

mod common;

use std::fs;
use std::path::Path;

use common::{compiled, valid};
use oxido_content::{Options, compile};

fn html(slug: &str) -> String {
    let compiled = compiled(&valid());
    let lesson = compiled
        .lessons
        .iter()
        .find(|lesson| lesson.slug == slug)
        .expect("lesson");
    lesson.html.clone()
}

#[test]
fn renders_the_first_lesson() {
    insta::assert_snapshot!(html("01-hello"));
}

#[test]
fn renders_the_second_lesson() {
    insta::assert_snapshot!(html("02-variables"));
}

#[test]
fn gives_every_heading_a_unique_id() {
    let compiled = compiled(&valid());
    let ids: Vec<_> = compiled.lessons[0]
        .headings
        .iter()
        .map(|heading| heading.id.as_str())
        .collect();
    assert_eq!(ids, ["your-first-program", "your-first-program-2"]);
    assert!(html("01-hello").contains(r#"<h2 id="your-first-program-2">"#));
}

#[test]
fn colors_rust_the_way_rust_analyzer_does_in_vs_code() {
    // arborium tags every Rust keyword as a plain keyword and numbers as
    // constants; decision D21 wants control flow and numbers in their own colors.
    let html = html("01-hello");
    assert!(html.contains("<a-k>let</a-k>"), "{html}");
    assert!(html.contains("<a-kc>if</a-kc>"), "{html}");
    assert!(html.contains("<a-n>42</a-n>"), "{html}");
    assert!(html.contains("<a-m>println!</a-m>"), "{html}");
}

#[test]
fn keeps_raw_html_as_text() {
    assert!(html("01-hello").contains("A tag like &lt;b&gt;this&lt;/b&gt; stays plain text."));
}

#[test]
fn rewrites_links_between_lessons_to_routes_under_the_base_path() {
    let options = Options {
        base_path: "/oxido".into(),
        ..Options::default()
    };
    let compiled = compile(&valid(), &options).expect("compiles");
    let html = &compiled.lessons[0].html;
    assert!(
        html.contains(r#"<a href="/oxido/lesson/p01/02-variables#shadowing">shadowing</a>"#),
        "{html}"
    );
    // The route in the JSON stays relative to the app, for the router.
    assert_eq!(compiled.lessons[0].route, "/lesson/p01/01-hello");
}

#[test]
fn opens_links_that_leave_the_course_in_a_new_tab() {
    // A link out of the course shouldn't take the student off the lesson, and
    // screen readers announce the new tab. Links within the course, to another
    // lesson or a heading, stay in the same tab.
    let compiled = compile(&valid(), &Options::default()).expect("compiles");
    let html = &compiled.lessons[0].html;
    assert!(
        html.contains(concat!(
            r#"<a href="https://doc.rust-lang.org/book/" target="_blank" rel="noopener noreferrer">"#,
            r#"Rust Book<span class="new-tab"> (opens in a new tab)</span></a>"#
        )),
        "{html}"
    );
    assert!(
        html.contains(r#"<a href="/lesson/p01/02-variables#shadowing">shadowing</a>"#),
        "{html}"
    );
}

#[test]
fn puts_each_sections_time_in_the_video_beside_its_heading() {
    let html = html("01-hello");
    assert!(
        html.contains(concat!(
            r#"<div class="section-head"><h2 id="your-first-program">Your first program</h2>"#,
            r##"<a class="section-time" href="#t=90" data-seek="90" "##,
            r#"aria-label="Watch “Your first program” in the video, from 01:30">01:30</a></div>"#
        )),
        "{html}"
    );
}

#[test]
fn marks_code_so_page_translation_leaves_it_alone() {
    let html = html("01-hello");
    assert!(
        html.contains(r#"<pre class="code" data-lang="rust" translate="no"><code>"#),
        "{html}"
    );
    assert!(
        html.contains(r#"<code translate="no">cargo run</code>"#),
        "{html}"
    );
}

#[test]
fn matches_the_golden_json_the_frontend_is_typed_against() {
    // web/app/features/content/contract.test.ts imports these files, so a change
    // to the JSON's shape fails `bun run check` until the TypeScript types follow.
    // After a deliberate change, run with UPDATE_GOLDEN=1 and review the diff.
    let compiled = compiled(&valid());
    let golden = Path::new(env!("CARGO_MANIFEST_DIR")).join("tests/golden");
    let files = [
        (
            "course.json",
            serde_json::to_string_pretty(&compiled.course),
        ),
        (
            "lesson.json",
            serde_json::to_string_pretty(&compiled.lessons[0]),
        ),
        (
            "quiz.json",
            serde_json::to_string_pretty(&compiled.quizzes[0]),
        ),
    ];
    for (name, json) in files {
        let json = json.expect("serializes") + "\n";
        let path = golden.join(name);
        if std::env::var_os("UPDATE_GOLDEN").is_some() {
            fs::create_dir_all(&golden).expect("golden folder");
            fs::write(&path, &json).expect("golden file");
        }
        let expected = fs::read_to_string(&path).unwrap_or_default();
        assert_eq!(
            json, expected,
            "{name} changed; run with UPDATE_GOLDEN=1 if that's intended"
        );
    }
}
