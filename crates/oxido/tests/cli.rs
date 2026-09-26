//! The `oxido` binary itself, run as a student would run it.

mod common;

use std::process::{Command, Output, Stdio};
use std::time::{Duration, Instant};

use common::{project, start_oxido};

/// Runs `oxido` with `args` in `dir`, failing the test if it hasn't exited
/// within a few seconds (a server that started would keep running).
fn run(dir: &std::path::Path, args: &[&str]) -> Output {
    let mut child = Command::new(env!("CARGO_BIN_EXE_oxido"))
        .args(args)
        .current_dir(dir)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .unwrap();
    let deadline = Instant::now() + Duration::from_secs(10);
    while child.try_wait().unwrap().is_none() {
        if Instant::now() > deadline {
            child.kill().unwrap();
            panic!("oxido kept running in {}", dir.display());
        }
        std::thread::sleep(Duration::from_millis(50));
    }
    child.wait_with_output().unwrap()
}

#[test]
fn outside_a_project_it_explains_and_creates_nothing() {
    let dir = tempfile::tempdir().unwrap();
    let output = run(dir.path(), &["serve", "--port", "0", "--no-open"]);
    assert!(!output.status.success());
    let stderr = String::from_utf8_lossy(&output.stderr);
    assert!(stderr.contains("oxido.toml"), "{stderr}");
    assert!(stderr.contains("oxido init"), "{stderr}");
    assert!(!dir.path().join(".oxido").exists());
}

#[test]
fn a_second_run_in_the_same_project_opens_the_running_one() {
    let dir = project();
    let (_first, launch) = start_oxido(dir.path());
    let link = launch.url();

    let output = run(dir.path(), &["serve", "--port", "0", "--no-open"]);
    assert!(output.status.success(), "{output:?}");
    let stdout = String::from_utf8_lossy(&output.stdout);
    assert!(stdout.contains("already running"), "{stdout}");
    assert!(stdout.contains(&link), "{stdout}");
}

/// Both ways a terminal or a process manager stops oxido end it cleanly.
#[cfg(unix)]
#[test]
fn stopping_oxido_removes_its_launch_file() {
    for signal in ["-INT", "-TERM"] {
        let dir = project();
        let mut child = Command::new(env!("CARGO_BIN_EXE_oxido"))
            .args(["serve", "--port", "0", "--no-open"])
            .current_dir(dir.path())
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .spawn()
            .unwrap();
        common::wait_for_launch_file(dir.path());
        let launch_file = oxido::launch::path(dir.path());
        Command::new("kill")
            .args([signal, &child.id().to_string()])
            .status()
            .unwrap();
        let deadline = Instant::now() + Duration::from_secs(10);
        while child.try_wait().unwrap().is_none() {
            if Instant::now() > deadline {
                child.kill().unwrap();
                panic!("oxido ignored kill {signal}");
            }
            std::thread::sleep(Duration::from_millis(50));
        }
        assert!(!launch_file.exists(), "kill {signal} left the launch file");
    }
}
