//! The rules behind `oxido doctor`: what each thing it finds on the student's
//! machine means, and what to tell them to do about it.
//!
//! Finding things out (running `rustc --version`, opening the progress
//! database, trying the port) happens in the `oxido` crate. Everything here
//! takes what was found as plain values, so each rule has a plain test.

use std::fmt;

/// How a check went. Only [`Status::Fail`] makes `oxido doctor` exit with an
/// error: warnings are things the course can live without for now.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Status {
    Ok,
    Warn,
    Fail,
}

/// One line of the report.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Check {
    pub name: &'static str,
    pub status: Status,
    /// What was found, in a few words.
    pub found: String,
    /// What to do about it. Set for warnings and failures.
    pub fix: Option<String>,
}

impl Check {
    pub fn ok(name: &'static str, found: impl Into<String>) -> Self {
        Self {
            name,
            status: Status::Ok,
            found: found.into(),
            fix: None,
        }
    }

    pub fn warn(name: &'static str, found: impl Into<String>, fix: impl Into<String>) -> Self {
        Self {
            name,
            status: Status::Warn,
            found: found.into(),
            fix: Some(fix.into()),
        }
    }

    pub fn fail(name: &'static str, found: impl Into<String>, fix: impl Into<String>) -> Self {
        Self {
            name,
            status: Status::Fail,
            found: found.into(),
            fix: Some(fix.into()),
        }
    }
}

/// A Rust release number. Pre-release tags (`-nightly`, `-beta.3`) are dropped.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub struct Version {
    pub major: u32,
    pub minor: u32,
    pub patch: u32,
}

impl Version {
    /// `1.90` or `1.90.1`, as in `rust-version` in `Cargo.toml`.
    pub fn parse(text: &str) -> Option<Self> {
        let mut parts = text.trim().split('.');
        let major = parts.next()?.parse().ok()?;
        let minor = parts.next()?.parse().ok()?;
        let patch = match parts.next() {
            Some(patch) => patch.parse().ok()?,
            None => 0,
        };
        parts.next().is_none().then_some(Self {
            major,
            minor,
            patch,
        })
    }

    /// The version in what `rustc --version` or `cargo --version` prints,
    /// e.g. `rustc 1.95.0 (59807616e 2026-04-14)`.
    pub fn from_tool_output(output: &str) -> Option<Self> {
        Self::parse(release(output)?.split(['-', '+']).next()?)
    }
}

impl fmt::Display for Version {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}.{}.{}", self.major, self.minor, self.patch)
    }
}

/// The second word of a `--version` line, as printed (`1.97.0-nightly`).
fn release(output: &str) -> Option<&str> {
    output.split_whitespace().nth(1)
}

fn first_line(output: &str) -> &str {
    output.lines().next().unwrap_or_default().trim()
}

/// What running a tool (`rustc --version`, say) gave.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Tool {
    /// There's no such command on the PATH.
    Missing,
    /// It's there but failed: the first line of its error output. rustup's
    /// proxies fail like this when no toolchain is set up.
    Failed(String),
    /// It ran: what it printed.
    Ran(String),
}

/// The Rust toolchain, from running `rustc --version` and `cargo --version`.
/// `minimum` is the oldest Rust the course supports, like `1.90`.
pub fn rust(rustc: &Tool, cargo: &Tool, minimum: &str) -> Check {
    const NAME: &str = "Rust";
    let (rustc_out, cargo_out) = match (rustc, cargo) {
        (Tool::Ran(rustc), Tool::Ran(cargo)) => (rustc.as_str(), cargo.as_str()),
        (Tool::Failed(error), _) | (_, Tool::Failed(error)) => {
            let what = if matches!(rustc, Tool::Failed(_)) {
                "rustc"
            } else {
                "cargo"
            };
            return Check::fail(
                NAME,
                format!("{what} is installed but doesn't run: {error}"),
                "If rustup has no toolchain yet, run `rustup default stable`. If Rust didn't come \
                 from rustup, install it from https://rustup.rs.",
            );
        }
        _ => {
            let what = match (rustc, cargo) {
                (Tool::Missing, Tool::Missing) => "Rust",
                (Tool::Missing, _) => "rustc",
                _ => "cargo",
            };
            return Check::fail(
                NAME,
                format!("{what} isn't installed, or isn't on your PATH"),
                "Install Rust from https://rustup.rs, then open a new terminal.",
            );
        }
    };
    let unreadable = |output: &str| {
        Check::warn(
            NAME,
            format!("can't read the version in \"{}\"", first_line(output)),
            "Check that `rustc --version` and `cargo --version` work in this terminal.",
        )
    };
    let Some(rustc_version) = Version::from_tool_output(rustc_out) else {
        return unreadable(rustc_out);
    };
    let Some(cargo_version) = Version::from_tool_output(cargo_out) else {
        return unreadable(cargo_out);
    };
    let rustc_release = release(rustc_out).unwrap_or_default();
    let cargo_release = release(cargo_out).unwrap_or_default();
    if let Some(minimum_version) = Version::parse(minimum)
        && rustc_version < minimum_version
    {
        return Check::fail(
            NAME,
            format!(
                "rustc {rustc_release} is older than {minimum}, the oldest the course supports"
            ),
            "Run `rustup update`.",
        );
    }
    if rustc_version != cargo_version {
        return Check::warn(
            NAME,
            format!(
                "rustc {rustc_release} and cargo {cargo_release} come from different Rust installs"
            ),
            "Keep only the one from rustup: uninstall the other (often a system package), \
             or put rustup's folder (~/.cargo/bin) first on your PATH.",
        );
    }
    Check::ok(
        NAME,
        format!("rustc {rustc_release}, cargo {cargo_release}"),
    )
}

/// clippy, from running `cargo clippy --version`. With rustup, that fails
/// when the clippy component isn't installed.
pub fn clippy(tool: &Tool) -> Check {
    match tool {
        Tool::Ran(output) => {
            let line = first_line(output);
            Check::ok("Clippy", line.split(" (").next().unwrap_or(line))
        }
        Tool::Missing | Tool::Failed(_) => Check::warn(
            "Clippy",
            "not installed",
            "Run `rustup component add clippy`. Quiz code checks and the Problems tab use it.",
        ),
    }
}

/// Git, from running `git --version`.
pub fn git(tool: &Tool) -> Check {
    const INSTALL: &str = "Install it from https://git-scm.com/downloads. The course keeps your minisql history in git.";
    match tool {
        Tool::Ran(output) => Check::ok("Git", first_line(output)),
        Tool::Missing => Check::warn("Git", "not installed", INSTALL),
        Tool::Failed(error) => Check::warn(
            "Git",
            format!("installed but doesn't run: {error}"),
            INSTALL,
        ),
    }
}

/// What's in the project's progress database, `.oxido/oxido.db`.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Progress {
    NotCreated,
    /// Its schema version, and the newest one this `oxido` knows.
    Schema {
        found: u32,
        supported: u32,
    },
    /// SQLite can't open it: usually file permissions.
    Unreadable(String),
    /// SQLite opened it and found it damaged, or not a database at all.
    Damaged(String),
}

pub fn progress(state: Progress) -> Check {
    const NAME: &str = "Progress";
    match state {
        Progress::NotCreated => {
            Check::ok(NAME, "not created yet; `oxido` creates it on its first run")
        }
        Progress::Schema { found, supported } if found > supported => Check::fail(
            NAME,
            format!(
                ".oxido/oxido.db was written by a newer oxido (schema {found}; this one reads up to \
                 {supported})"
            ),
            "Update oxido: `cargo install --locked oxido`.",
        ),
        Progress::Schema { found, supported } if found < supported => Check::ok(
            NAME,
            format!(".oxido/oxido.db, schema {found}; the next run will upgrade it to {supported}"),
        ),
        Progress::Schema { found, .. } => {
            Check::ok(NAME, format!(".oxido/oxido.db, schema {found} (current)"))
        }
        Progress::Unreadable(detail) => Check::fail(
            NAME,
            format!("can't open .oxido/oxido.db: {detail}"),
            "Check that your user owns the .oxido folder and the files in it. Running oxido \
             with sudo can leave them owned by the administrator.",
        ),
        Progress::Damaged(detail) => Check::fail(
            NAME,
            format!("can't read .oxido/oxido.db: {detail}"),
            "Move .oxido/oxido.db out of the folder and run `oxido` again to start with fresh \
             progress. Your minisql code isn't affected.",
        ),
    }
}

/// Whether this project's `oxido` is running, and if not, who has the port.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Server {
    /// This project's `oxido` answers on `port`; `version` is what it reports.
    Running { port: u16, version: String },
    /// Not running, and the port is free.
    Free { port: u16 },
    /// Not running, and an `oxido` for another project has the port.
    PortTakenByOxido { port: u16 },
    /// Not running, and some other program has the port.
    PortTaken { port: u16 },
    /// Not running, and the system won't let `oxido` use the port (ports
    /// below 1024 on Linux, reserved ranges on Windows).
    PortUnavailable { port: u16, reason: String },
}

/// `this_version` is the version of the `oxido` running the check.
pub fn server(state: Server, this_version: &str) -> Check {
    const NAME: &str = "Server";
    let another_port = |port: u16| port.checked_add(1).unwrap_or(port - 1);
    match state {
        Server::Running { port, version } if version == this_version => Check::ok(
            NAME,
            format!("running on port {port}; `oxido` opens it in your browser"),
        ),
        Server::Running { port, version } => Check::warn(
            NAME,
            format!("oxido {version} is running on port {port}, and this is {this_version}"),
            "Stop it with Ctrl+C in its terminal, then start `oxido` again.",
        ),
        Server::Free { port: 0 } => Check::ok(NAME, "not running; it will pick a free port"),
        Server::Free { port } => Check::ok(NAME, format!("not running; port {port} is free")),
        Server::PortTakenByOxido { port } => Check::warn(
            NAME,
            format!("not running here; oxido for another project has port {port}"),
            format!(
                "Stop that one with Ctrl+C in its terminal, or use another port: \
                 `oxido serve --port {}`.",
                another_port(port)
            ),
        ),
        Server::PortTaken { port } => Check::warn(
            NAME,
            format!("not running; another program has port {port}"),
            format!(
                "Close that program, or use another port: `oxido serve --port {}`.",
                another_port(port)
            ),
        ),
        Server::PortUnavailable { port, reason } => Check::warn(
            NAME,
            format!("not running; port {port} can't be used: {reason}"),
            format!(
                "Use another port: `oxido serve --port {}`.",
                another_port(port)
            ),
        ),
    }
}

/// Whether nothing failed. Warnings don't count.
pub fn passed(checks: &[Check]) -> bool {
    checks.iter().all(|check| check.status != Status::Fail)
}

/// The report: one aligned line per check, each fix under its problem, and a
/// summary line.
pub fn render(checks: &[Check]) -> String {
    let width = checks
        .iter()
        .map(|check| check.name.len())
        .max()
        .unwrap_or(0)
        + 2;
    let mut out = String::new();
    for check in checks {
        let status = match check.status {
            Status::Ok => "ok",
            Status::Warn => "warn",
            Status::Fail => "fail",
        };
        out += &format!("{status:<6}{:<width$}{}\n", check.name, check.found);
        if let Some(fix) = &check.fix {
            out += &format!("{:indent$}{fix}\n", "", indent = 6 + width);
        }
    }
    let count = |status| checks.iter().filter(|check| check.status == status).count();
    let plural = |n: usize, word: &str| format!("{n} {word}{}", if n == 1 { "" } else { "s" });
    let (fails, warns) = (count(Status::Fail), count(Status::Warn));
    out += "\n";
    out += &match (fails, warns) {
        (0, 0) => "All good.".to_string(),
        (0, warns) => format!(
            "{}. Nothing here stops the course.",
            plural(warns, "warning")
        ),
        (fails, 0) => format!("{} to fix.", plural(fails, "problem")),
        (fails, warns) => format!(
            "{} to fix, {}.",
            plural(fails, "problem"),
            plural(warns, "warning")
        ),
    };
    out += "\n";
    out
}
