//! The `oxido` binary itself, run as a student would run it.

use std::process::{Command, Output, Stdio};
use std::time::{Duration, Instant};

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
