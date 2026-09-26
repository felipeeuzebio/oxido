//! `oxido doctor`: looks at what the course needs on this machine and in this
//! project, and says how to fix what's missing. It only looks: it never
//! creates `.oxido/`, writes to the progress database or starts a server.
//!
//! This module finds things out; the rules for what they mean live in
//! [`oxido_core::doctor`].

use std::io::ErrorKind;
use std::net::TcpListener;
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};

use oxido_core::doctor::{self, Check, Progress, Server, Tool};

use crate::launch::{self, Launch};
use crate::project::{self, ProjectError};
use crate::store::{self, StoreError};

/// The oldest Rust the course supports: `rust-version` in `Cargo.toml`.
pub const MINIMUM_RUST: &str = env!("CARGO_PKG_RUST_VERSION");

const VERSION: &str = env!("CARGO_PKG_VERSION");

/// Runs every check. `start` is where to look for the project, `port` the
/// port `oxido` would start on.
pub fn run(start: &Path, port: u16) -> Vec<Check> {
    let project = project::find(start);
    // Ask the tools from inside the project, so a rust-toolchain.toml there
    // counts, the way it will when oxido runs the student's tests.
    let dir = project.as_deref().ok();
    let rustc = tool("rustc", &["--version"], dir);
    let cargo = tool("cargo", &["--version"], dir);
    let mut checks = vec![doctor::rust(&rustc, &cargo, MINIMUM_RUST)];
    if matches!(cargo, Tool::Ran(_)) {
        checks.push(doctor::clippy(&tool(
            "cargo",
            &["clippy", "--version"],
            dir,
        )));
    }
    checks.push(doctor::git(&tool("git", &["--version"], dir)));
    match project {
        Ok(root) => {
            checks.push(Check::ok("Project", shown(&root)));
            checks.push(doctor::progress(progress(&root)));
            checks.push(doctor::server(server(&root, port), VERSION));
        }
        // Without a project there's no telling whether an oxido on the port
        // is the student's own, so there's no server check.
        Err(ProjectError::NotAProject(dir)) => checks.push(Check::fail(
            "Project",
            format!(
                "no {} in {} or any folder above",
                project::MARKER,
                shown(&dir)
            ),
            project::HOW_TO_START,
        )),
        Err(ProjectError::Missing(dir)) => checks.push(Check::fail(
            "Project",
            format!("can't find the folder {}", dir.display()),
            "Check the folder name given to --project.",
        )),
    }
    checks
}

/// Runs `program args` and keeps what it printed, or why it didn't run.
fn tool(program: &str, args: &[&str], dir: Option<&Path>) -> Tool {
    let mut command = Command::new(program);
    command.args(args).stdin(Stdio::null());
    if let Some(dir) = dir {
        command.current_dir(dir);
    }
    match command.output() {
        Ok(output) if output.status.success() => {
            Tool::Ran(String::from_utf8_lossy(&output.stdout).into_owned())
        }
        Ok(output) => {
            // rustup prints `info:` lines (and a backtrace) around its error.
            let stderr = String::from_utf8_lossy(&output.stderr);
            let mut lines = stderr
                .lines()
                .map(str::trim)
                .filter(|line| !line.is_empty());
            let error = lines
                .clone()
                .find(|line| line.starts_with("error"))
                .or_else(|| lines.next());
            Tool::Failed(
                error.map_or_else(|| format!("{program} {}", output.status), str::to_owned),
            )
        }
        Err(error) if error.kind() == ErrorKind::NotFound => Tool::Missing,
        Err(error) => Tool::Failed(error.to_string()),
    }
}

fn progress(root: &Path) -> Progress {
    let path = root.join(".oxido").join("oxido.db");
    if !path.exists() {
        return Progress::NotCreated;
    }
    match store::inspect(&path) {
        Ok(found) => Progress::Schema {
            found,
            supported: store::SCHEMA_VERSION,
        },
        Err(StoreError::Damaged(detail)) => Progress::Damaged(detail),
        Err(error) => Progress::Unreadable(error.to_string()),
    }
}

fn server(root: &Path, port: u16) -> Server {
    if let Some(running) = Launch::read(&launch::path(root))
        && let Some(health) = launch::health(running.port)
        && health.instance == running.instance
    {
        // Only the port: the report may be pasted into an issue, and the
        // launch link signs you in.
        return Server::Running {
            port: running.port,
            version: health.version,
        };
    }
    match TcpListener::bind(("127.0.0.1", port)) {
        Ok(_) => Server::Free { port },
        Err(error) if error.kind() == ErrorKind::AddrInUse => {
            if launch::health(port).is_some() {
                Server::PortTakenByOxido { port }
            } else {
                Server::PortTaken { port }
            }
        }
        Err(error) => Server::PortUnavailable {
            port,
            reason: error.to_string(),
        },
    }
}

/// A path the way the student would write it: `~/minisql` for a folder in
/// their home (the report may be pasted somewhere public), and on Windows
/// without the `\\?\` prefix that canonicalizing adds.
fn shown(path: &Path) -> String {
    let path = plain(path);
    let home = std::env::home_dir()
        .and_then(|home| home.canonicalize().ok())
        .map(|home| plain(&home));
    match home
        .as_deref()
        .and_then(|home| path.strip_prefix(home).ok())
    {
        Some(inside) if inside.as_os_str().is_empty() => "~".into(),
        Some(inside) => Path::new("~").join(inside).display().to_string(),
        None => path.display().to_string(),
    }
}

/// `path` without Windows' `\\?\` prefix for long paths (kept for network
/// paths, `\\?\UNC\...`).
fn plain(path: &Path) -> PathBuf {
    match path.to_string_lossy().strip_prefix(r"\\?\") {
        Some(rest) if !rest.starts_with(r"UNC\") => PathBuf::from(rest),
        _ => path.to_path_buf(),
    }
}
