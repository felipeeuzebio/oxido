//! `cargo xtask` run the way the maintainer runs it, on a copy of the
//! content compiler's fixture course.

use std::fs;
use std::path::{Path, PathBuf};
use std::process::{Command, Output};

use tempfile::TempDir;

/// A scratch folder with the fixture course in `content/`.
struct Workspace {
    dir: TempDir,
}

impl Workspace {
    fn new() -> Self {
        let dir = TempDir::new().expect("temp dir");
        let fixture =
            Path::new(env!("CARGO_MANIFEST_DIR")).join("../oxido-content/tests/fixtures/valid");
        copy(&fixture, &dir.path().join("content"));
        Self { dir }
    }

    fn path(&self, relative: &str) -> PathBuf {
        self.dir.path().join(relative)
    }

    fn edit(&self, relative: &str, from: &str, to: &str) {
        let path = self.path(relative);
        let text = fs::read_to_string(&path).expect("file");
        assert!(text.contains(from), "{relative} doesn't contain {from:?}");
        fs::write(path, text.replacen(from, to, 1)).expect("write");
    }

    fn xtask(&self, args: &[&str]) -> Output {
        Command::new(env!("CARGO_BIN_EXE_xtask"))
            .args(args)
            .current_dir(self.dir.path())
            .env_remove("OXIDO_CONTENT")
            .env_remove("BASE_PATH")
            .output()
            .expect("xtask runs")
    }
}

fn copy(from: &Path, to: &Path) {
    fs::create_dir_all(to).expect("folder");
    for entry in fs::read_dir(from).expect("fixture").flatten() {
        let target = to.join(entry.file_name());
        if entry.path().is_dir() {
            copy(&entry.path(), &target);
        } else {
            fs::copy(entry.path(), target).expect("copy");
        }
    }
}

fn text(bytes: &[u8]) -> String {
    String::from_utf8_lossy(bytes).into_owned()
}

#[test]
fn content_writes_the_json_the_frontend_reads() {
    let ws = Workspace::new();
    let output = ws.xtask(&["content", "--content", "content", "--out", "out"]);
    assert!(output.status.success(), "{}", text(&output.stderr));

    let course: serde_json::Value =
        serde_json::from_str(&fs::read_to_string(ws.path("out/course.json")).unwrap()).unwrap();
    assert_eq!(
        course["phases"][1]["lessons"][0]["route"],
        "/lesson/p01/01-hello"
    );
    assert!(ws.path("out/lessons/p01/01-hello.json").is_file());
    assert!(ws.path("out/lessons/p01/02-variables.json").is_file());
    assert!(ws.path("out/quizzes/quiz-01.json").is_file());
    let stdout = text(&output.stdout);
    assert!(stdout.contains("Compiled 2 lessons and 1 quiz"), "{stdout}");
    assert!(
        stdout.contains("Not written yet: 1 lesson and 1 quiz"),
        "{stdout}"
    );
}

#[test]
fn content_puts_the_base_path_in_links_between_lessons() {
    let ws = Workspace::new();
    let output = Command::new(env!("CARGO_BIN_EXE_xtask"))
        .args(["content", "--content", "content", "--out", "out"])
        .current_dir(ws.dir.path())
        .env("BASE_PATH", "/oxido/")
        .output()
        .expect("xtask runs");
    assert!(output.status.success(), "{}", text(&output.stderr));
    let lesson = fs::read_to_string(ws.path("out/lessons/p01/01-hello.json")).unwrap();
    assert!(
        lesson.contains(r#"href=\"/oxido/lesson/p01/02-variables#shadowing\""#),
        "{lesson}"
    );
}

#[test]
fn content_fails_with_every_problem_and_writes_nothing() {
    let ws = Workspace::new();
    ws.edit(
        "content/en/p01/02-variables.md",
        "(01-hello.md)",
        "(01-helo.md)",
    );
    let output = ws.xtask(&["content", "--content", "content", "--out", "out"]);
    assert_eq!(output.status.code(), Some(1));
    let stderr = text(&output.stderr);
    assert!(
        stderr.contains(
            "en/p01/02-variables.md:9: the link to 01-helo.md points to a lesson that doesn't exist"
        ),
        "{stderr}"
    );
    assert!(!ws.path("out").exists());
}

#[test]
fn content_replaces_its_last_output_but_wont_empty_another_folder() {
    let ws = Workspace::new();
    fs::create_dir_all(ws.path("out/lessons/p09")).unwrap();
    fs::write(ws.path("out/course.json"), "{}").unwrap();
    fs::write(ws.path("out/lessons/p09/stale.json"), "{}").unwrap();
    let output = ws.xtask(&["content", "--content", "content", "--out", "out"]);
    assert!(output.status.success(), "{}", text(&output.stderr));
    assert!(
        !ws.path("out/lessons/p09").exists(),
        "old output is removed"
    );

    fs::create_dir_all(ws.path("notes")).unwrap();
    fs::write(ws.path("notes/todo.txt"), "keep me").unwrap();
    let output = ws.xtask(&["content", "--content", "content", "--out", "notes"]);
    assert_eq!(output.status.code(), Some(1));
    assert!(text(&output.stderr).contains("isn't empty and doesn't hold compiled content"));
    assert!(ws.path("notes/todo.txt").is_file());
}

#[test]
fn content_fails_on_unwritten_lessons_when_the_course_must_be_complete() {
    let ws = Workspace::new();
    let output = ws.xtask(&[
        "content",
        "--content",
        "content",
        "--out",
        "out",
        "--complete",
    ]);
    assert_eq!(output.status.code(), Some(1));
    assert!(text(&output.stderr).contains("phase p02 names quiz quiz-02"));
}

#[test]
fn check_code_compiles_every_rust_block() {
    let ws = Workspace::new();
    let output = ws.xtask(&["check-code", "--content", "content"]);
    assert!(output.status.success(), "{}", text(&output.stderr));
    let stdout = text(&output.stdout);
    assert!(
        stdout.contains("2 rust blocks behave as marked (1 ignored)"),
        "{stdout}"
    );
}

#[test]
fn check_code_fails_on_a_block_that_doesnt_compile() {
    let ws = Workspace::new();
    ws.edit(
        "content/en/p01/01-hello.md",
        "let name = \"minisql\";",
        "let name = minisql;",
    );
    let output = ws.xtask(&["check-code", "--content", "content"]);
    assert_eq!(output.status.code(), Some(1));
    let stderr = text(&output.stderr);
    assert!(
        stderr.contains("en/p01/01-hello.md:11: this block doesn't compile"),
        "{stderr}"
    );
    assert!(stderr.contains("cannot find value `minisql`"), "{stderr}");
}

#[test]
fn check_code_fails_on_a_compile_fail_block_that_compiles() {
    let ws = Workspace::new();
    ws.edit(
        "content/en/p01/01-hello.md",
        "let count: i32 = \"three\";",
        "let count: i32 = 3;",
    );
    let output = ws.xtask(&["check-code", "--content", "content"]);
    assert_eq!(output.status.code(), Some(1));
    let stderr = text(&output.stderr);
    assert!(
        stderr
            .contains("en/p01/01-hello.md:20: this block is marked compile_fail, but it compiles"),
        "{stderr}"
    );
}
