//! `oxido doctor`, run as a student would run it. Each test puts fake `rustc`,
//! `cargo` and `git` commands on the PATH, shell scripts that print what the
//! real ones print, so the result doesn't depend on the machine running the
//! tests. Shell scripts make these tests Unix-only.
#![cfg(unix)]

mod common;

use std::os::unix::fs::PermissionsExt;
use std::path::{Path, PathBuf};
use std::process::{Command, Output, Stdio};

use common::{free_port, project, start_oxido};
use oxido::store::{SCHEMA_VERSION, Store};

/// What each fake command prints for `--version`; `None` leaves it out, and
/// a leading `!` makes it print the rest as an error and fail.
struct Tools {
    rustc: Option<&'static str>,
    cargo: Option<&'static str>,
    clippy: Option<&'static str>,
    git: Option<&'static str>,
}

const HEALTHY: Tools = Tools {
    rustc: Some("rustc 1.95.0 (59807616e 2026-04-14)"),
    cargo: Some("cargo 1.95.0 (f2d3ce0bd 2026-03-21)"),
    clippy: Some("clippy 0.1.95 (59807616e2 2026-04-14)"),
    git: Some("git version 2.43.0"),
};

const NOTHING: Tools = Tools {
    rustc: None,
    cargo: None,
    clippy: None,
    git: None,
};

/// The shell command that prints `version`, or fails with it (see [`Tools`]).
fn say(version: &str) -> String {
    let quoted = |text: &str| format!("'{}'", text.replace('\'', r"'\''"));
    match version.strip_prefix('!') {
        Some(error) => format!("echo {} >&2; exit 1", quoted(error)),
        None => format!("echo {}", quoted(version)),
    }
}

fn script(dir: &Path, name: &str, body: &str) {
    let path = dir.join(name);
    std::fs::write(&path, format!("#!/bin/sh\n{body}\n")).unwrap();
    std::fs::set_permissions(&path, std::fs::Permissions::from_mode(0o755)).unwrap();
}

/// A folder of fake commands, to use as the whole PATH.
fn fake_path(tools: &Tools) -> tempfile::TempDir {
    let dir = tempfile::tempdir().unwrap();
    if let Some(version) = tools.rustc {
        script(dir.path(), "rustc", &say(version));
    }
    if let Some(version) = tools.cargo {
        // `cargo clippy --version` fails like rustup's when clippy is missing.
        let clippy = match tools.clippy {
            Some(clippy) => format!("echo '{clippy}'; exit 0"),
            None => "echo \"error: 'cargo-clippy' is not installed\" >&2; exit 1".into(),
        };
        script(
            dir.path(),
            "cargo",
            &format!(
                "if [ \"$1\" = clippy ]; then {clippy}; fi\n{}",
                say(version)
            ),
        );
    }
    if let Some(version) = tools.git {
        script(dir.path(), "git", &say(version));
    }
    dir
}

/// Runs `oxido doctor` in `dir` with only `tools` on the PATH.
fn doctor(dir: &Path, tools: &Tools, args: &[&str]) -> (Output, String) {
    doctor_with_home(dir, tools, args, None)
}

fn doctor_with_home(
    dir: &Path,
    tools: &Tools,
    args: &[&str],
    home: Option<&Path>,
) -> (Output, String) {
    let path = fake_path(tools);
    let mut command = Command::new(env!("CARGO_BIN_EXE_oxido"));
    command
        .arg("doctor")
        .args(args)
        .current_dir(dir)
        .env("PATH", path.path())
        .stdin(Stdio::null());
    if let Some(home) = home {
        command.env("HOME", home);
    }
    let output = command.output().unwrap();
    let stdout = String::from_utf8_lossy(&output.stdout).into_owned();
    (output, stdout)
}

fn files_in(dir: &Path) -> Vec<PathBuf> {
    let mut files: Vec<_> = std::fs::read_dir(dir)
        .unwrap()
        .map(|entry| entry.unwrap().path())
        .collect();
    files.sort();
    files
}

#[test]
fn a_healthy_new_project_passes_and_nothing_is_created() {
    let project = project();
    let port = free_port().to_string();
    let before = files_in(project.path());
    let (output, stdout) = doctor(project.path(), &HEALTHY, &["--port", &port]);
    assert!(output.status.success(), "{stdout}");
    assert!(
        stdout.contains("ok    Rust      rustc 1.95.0, cargo 1.95.0"),
        "{stdout}"
    );
    assert!(stdout.contains("ok    Clippy    clippy 0.1.95"), "{stdout}");
    assert!(
        stdout.contains("ok    Git       git version 2.43.0"),
        "{stdout}"
    );
    let root = project.path().canonicalize().unwrap();
    assert!(
        stdout.contains(&format!("ok    Project   {}", root.display())),
        "{stdout}"
    );
    assert!(stdout.contains("not created yet"), "{stdout}");
    assert!(stdout.contains(&format!("port {port} is free")), "{stdout}");
    assert!(stdout.ends_with("All good.\n"), "{stdout}");
    assert_eq!(files_in(project.path()), before);
}

#[test]
fn without_rust_it_fails_and_says_where_to_get_it() {
    let project = project();
    let (output, stdout) = doctor(project.path(), &NOTHING, &["--port", "0"]);
    assert_eq!(output.status.code(), Some(1), "{stdout}");
    assert!(stdout.contains("fail  Rust"), "{stdout}");
    assert!(stdout.contains("https://rustup.rs"), "{stdout}");
    // Without cargo there's no clippy to ask about.
    assert!(!stdout.contains("Clippy"), "{stdout}");
}

#[test]
fn a_rust_that_is_installed_but_broken_says_why() {
    let project = project();
    let broken = Tools {
        rustc: Some(
            "!error: rustup could not choose a version of rustc to run, because one wasn't specified explicitly, and no default is configured.",
        ),
        cargo: Some(
            "!error: rustup could not choose a version of cargo to run, because one wasn't specified explicitly, and no default is configured.",
        ),
        ..HEALTHY
    };
    let (output, stdout) = doctor(project.path(), &broken, &["--port", "0"]);
    assert_eq!(output.status.code(), Some(1), "{stdout}");
    assert!(stdout.contains("no default is configured"), "{stdout}");
    assert!(stdout.contains("rustup default stable"), "{stdout}");
    assert!(!stdout.contains("isn't installed"), "{stdout}");
}

#[test]
fn picks_the_error_out_of_rustups_output() {
    // A project's rust-toolchain.toml asks for a toolchain rustup can't fetch.
    let project = project();
    let offline = "!info: syncing channel updates for stable-x86_64-unknown-linux-gnu\n\
                   error: could not download file from 'https://static.rust-lang.org/dist/channel-rust-stable.toml.sha256'\n\
                   \n\
                   Caused by:\n    0: error downloading file";
    let tools = Tools {
        rustc: Some(offline),
        ..HEALTHY
    };
    let (output, stdout) = doctor(project.path(), &tools, &["--port", "0"]);
    assert_eq!(output.status.code(), Some(1), "{stdout}");
    assert!(
        stdout.contains("doesn't run: error: could not download file"),
        "{stdout}"
    );
}

#[test]
fn an_old_rust_fails_and_says_to_update() {
    let project = project();
    let old = Tools {
        rustc: Some("rustc 1.80.1 (3f5fd8dd4 2024-08-06)"),
        cargo: Some("cargo 1.80.1 (376290515 2024-07-16)"),
        ..HEALTHY
    };
    let (output, stdout) = doctor(project.path(), &old, &["--port", "0"]);
    assert_eq!(output.status.code(), Some(1), "{stdout}");
    assert!(stdout.contains("rustc 1.80.1 is older than"), "{stdout}");
    assert!(stdout.contains("rustup update"), "{stdout}");
}

#[test]
fn missing_clippy_and_git_are_warnings() {
    let project = project();
    let tools = Tools {
        clippy: None,
        git: None,
        ..HEALTHY
    };
    let (output, stdout) = doctor(project.path(), &tools, &["--port", "0"]);
    assert!(output.status.success(), "{stdout}");
    assert!(stdout.contains("rustup component add clippy"), "{stdout}");
    assert!(stdout.contains("https://git-scm.com"), "{stdout}");
    assert!(
        stdout.ends_with("2 warnings. Nothing here stops the course.\n"),
        "{stdout}"
    );
}

#[test]
fn outside_a_project_it_fails_and_creates_nothing() {
    let dir = tempfile::tempdir().unwrap();
    let (output, stdout) = doctor(dir.path(), &HEALTHY, &["--port", "0"]);
    assert_eq!(output.status.code(), Some(1), "{stdout}");
    assert!(stdout.contains("fail  Project"), "{stdout}");
    assert!(stdout.contains("oxido init"), "{stdout}");
    // Whatever oxido holds the port, it can't be this project's.
    assert!(!stdout.contains("Server"), "{stdout}");
    assert!(files_in(dir.path()).is_empty());
}

#[test]
fn a_missing_project_folder_says_so() {
    let dir = tempfile::tempdir().unwrap();
    let missing = dir.path().join("minisq");
    let (output, stdout) = doctor(
        dir.path(),
        &HEALTHY,
        &["--project", missing.to_str().unwrap()],
    );
    assert_eq!(output.status.code(), Some(1), "{stdout}");
    assert!(stdout.contains("can't find the folder"), "{stdout}");
    assert!(stdout.contains("--project"), "{stdout}");
}

#[test]
fn a_project_in_the_home_folder_is_shown_from_there() {
    // The report may be pasted into an issue; the home folder names the user.
    let home = tempfile::tempdir().unwrap();
    let project = home.path().join("minisql");
    std::fs::create_dir(&project).unwrap();
    std::fs::write(project.join("oxido.toml"), "course = \"minisql\"\n").unwrap();
    let (output, stdout) =
        doctor_with_home(&project, &HEALTHY, &["--port", "0"], Some(home.path()));
    assert!(output.status.success(), "{stdout}");
    assert!(stdout.contains("Project   ~/minisql\n"), "{stdout}");
}

#[test]
fn finds_the_project_from_a_folder_inside_it() {
    let project = project();
    let src = project.path().join("src");
    std::fs::create_dir(&src).unwrap();
    let (output, stdout) = doctor(&src, &HEALTHY, &["--port", "0"]);
    assert!(output.status.success(), "{stdout}");
    let root = project.path().canonicalize().unwrap();
    assert!(
        stdout.contains(&format!("Project   {}\n", root.display())),
        "{stdout}"
    );
}

#[test]
fn reports_the_schema_of_existing_progress() {
    let project = project();
    std::fs::create_dir(project.path().join(".oxido")).unwrap();
    drop(Store::open(&project.path().join(".oxido/oxido.db")).unwrap());
    let (output, stdout) = doctor(project.path(), &HEALTHY, &["--port", "0"]);
    assert!(output.status.success(), "{stdout}");
    assert!(
        stdout.contains(&format!("schema {SCHEMA_VERSION} (current)")),
        "{stdout}"
    );
}

#[test]
fn progress_from_a_newer_oxido_fails_and_says_to_update() {
    let project = project();
    std::fs::create_dir(project.path().join(".oxido")).unwrap();
    rusqlite::Connection::open(project.path().join(".oxido/oxido.db"))
        .unwrap()
        .pragma_update(None, "user_version", SCHEMA_VERSION + 1)
        .unwrap();
    let (output, stdout) = doctor(project.path(), &HEALTHY, &["--port", "0"]);
    assert_eq!(output.status.code(), Some(1), "{stdout}");
    assert!(stdout.contains("newer oxido"), "{stdout}");
    assert!(stdout.contains("cargo install --locked oxido"), "{stdout}");
}

#[test]
fn damaged_progress_fails() {
    let project = project();
    std::fs::create_dir(project.path().join(".oxido")).unwrap();
    std::fs::write(project.path().join(".oxido/oxido.db"), "x".repeat(4096)).unwrap();
    let (output, stdout) = doctor(project.path(), &HEALTHY, &["--port", "0"]);
    assert_eq!(output.status.code(), Some(1), "{stdout}");
    assert!(stdout.contains("can't read .oxido/oxido.db"), "{stdout}");
}

#[test]
fn finds_the_running_oxido_and_keeps_its_link_private() {
    let project = project();
    let (_oxido, launch) = start_oxido(project.path());
    let (output, stdout) = doctor(project.path(), &HEALTHY, &[]);
    assert!(output.status.success(), "{stdout}");
    assert!(
        stdout.contains(&format!("running on port {}", launch.port)),
        "{stdout}"
    );
    // The report may be pasted into an issue; the launch token signs you in.
    assert!(!stdout.contains(&launch.token), "{stdout}");
}

#[test]
fn a_port_held_by_another_program_is_a_warning() {
    let project = project();
    let listener = std::net::TcpListener::bind(("127.0.0.1", 0)).unwrap();
    let port = listener.local_addr().unwrap().port();
    let (output, stdout) = doctor(project.path(), &HEALTHY, &["--port", &port.to_string()]);
    assert!(output.status.success(), "{stdout}");
    assert!(
        stdout.contains(&format!("another program has port {port}")),
        "{stdout}"
    );
    assert!(stdout.contains("oxido serve --port"), "{stdout}");
    drop(listener);
}

#[test]
fn a_port_held_by_another_projects_oxido_says_so() {
    let other = project();
    let (_oxido, launch) = start_oxido(other.path());
    let project = project();
    let port = launch.port.to_string();
    let (output, stdout) = doctor(project.path(), &HEALTHY, &["--port", &port]);
    assert!(output.status.success(), "{stdout}");
    assert!(
        stdout.contains("oxido for another project has port"),
        "{stdout}"
    );
}
