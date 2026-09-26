//! Helpers for tests that run the real `oxido` binary.
#![allow(dead_code)] // each test file uses a different part

use std::path::Path;
use std::process::{Child, Command, Stdio};
use std::time::{Duration, Instant};

use oxido::launch::Launch;

/// Kills a background `oxido` when the test ends, even if it fails.
pub struct Background(pub Child);

impl Drop for Background {
    fn drop(&mut self) {
        let _ = self.0.kill();
        let _ = self.0.wait();
    }
}

/// Starts `oxido serve` on a free port in `project` (which needs an
/// `oxido.toml`) and waits until it's ready. Returns it with its launch file.
pub fn start_oxido(project: &Path) -> (Background, Launch) {
    let child = Command::new(env!("CARGO_BIN_EXE_oxido"))
        .args(["serve", "--port", "0", "--no-open"])
        .current_dir(project)
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
        .unwrap();
    let background = Background(child);
    let launch = wait_for_launch_file(project);
    (background, launch)
}

/// Waits for the `oxido` running in `project` to write its launch file.
pub fn wait_for_launch_file(project: &Path) -> Launch {
    let file = oxido::launch::path(project);
    let deadline = Instant::now() + Duration::from_secs(10);
    loop {
        if let Some(launch) = Launch::read(&file) {
            return launch;
        }
        assert!(Instant::now() < deadline, "oxido never started");
        std::thread::sleep(Duration::from_millis(50));
    }
}

/// A port that was free a moment ago.
pub fn free_port() -> u16 {
    let listener = std::net::TcpListener::bind(("127.0.0.1", 0)).unwrap();
    listener.local_addr().unwrap().port()
}

/// A new folder with an `oxido.toml`, like the one `oxido init` makes.
pub fn project() -> tempfile::TempDir {
    let dir = tempfile::tempdir().unwrap();
    std::fs::write(dir.path().join("oxido.toml"), "course = \"minisql\"\n").unwrap();
    dir
}
