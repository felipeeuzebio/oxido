//! `oxido doctor`'s rules: what each finding on the student's machine means,
//! and what to tell them to do about it. The version lines are real output
//! from rustc, cargo, clippy and git.

use oxido_core::doctor::{
    Check, Progress, Server, Status, Tool, Version, clippy, git, passed, progress, render, rust,
    server,
};

const RUSTC: &str = "rustc 1.95.0 (59807616e 2026-04-14)\n";
const CARGO: &str = "cargo 1.95.0 (f2d3ce0bd 2026-03-21)\n";

fn ran(output: &str) -> Tool {
    Tool::Ran(output.into())
}

fn fix(check: &Check) -> &str {
    check.fix.as_deref().unwrap_or_default()
}

#[test]
fn reads_versions_the_way_rust_tools_print_them() {
    let v = |major, minor, patch| {
        Some(Version {
            major,
            minor,
            patch,
        })
    };
    assert_eq!(Version::from_tool_output(RUSTC), v(1, 95, 0));
    assert_eq!(Version::from_tool_output(CARGO), v(1, 95, 0));
    assert_eq!(
        Version::from_tool_output("rustc 1.97.0-nightly (1a2b3c4d5 2026-08-30)"),
        v(1, 97, 0)
    );
    assert_eq!(
        Version::from_tool_output("rustc 1.96.0-beta.3 (0f1e2d3c4 2026-09-01)"),
        v(1, 96, 0)
    );
    assert_eq!(Version::parse("1.90"), v(1, 90, 0));
    assert_eq!(Version::parse("1.90.1"), v(1, 90, 1));
    assert_eq!(Version::from_tool_output("command not found"), None);
    assert_eq!(Version::parse("1.x"), None);
    assert!(Version::parse("1.90").unwrap() < Version::parse("1.100").unwrap());
}

#[test]
fn a_current_rust_passes() {
    let check = rust(&ran(RUSTC), &ran(CARGO), "1.90");
    assert_eq!(check.status, Status::Ok);
    assert_eq!(check.found, "rustc 1.95.0, cargo 1.95.0");
    assert_eq!(check.fix, None);
    assert_eq!(rust(&ran(RUSTC), &ran(CARGO), "1.95").status, Status::Ok);
}

#[test]
fn without_rust_it_points_to_rustup() {
    let check = rust(&Tool::Missing, &Tool::Missing, "1.90");
    assert_eq!(check.status, Status::Fail);
    assert!(fix(&check).contains("https://rustup.rs"), "{check:?}");

    let check = rust(&ran(RUSTC), &Tool::Missing, "1.90");
    assert_eq!(check.status, Status::Fail);
    assert!(check.found.contains("cargo"), "{check:?}");
}

#[test]
fn a_rust_that_is_installed_but_broken_says_why() {
    // What rustup's proxy prints when no default toolchain is set.
    let error = "error: rustup could not choose a version of rustc to run, because one wasn't \
                 specified explicitly, and no default is configured.";
    let check = rust(
        &Tool::Failed(error.into()),
        &Tool::Failed(error.into()),
        "1.90",
    );
    assert_eq!(check.status, Status::Fail);
    assert!(
        check.found.contains("no default is configured"),
        "{check:?}"
    );
    assert!(fix(&check).contains("rustup default stable"), "{check:?}");
    assert!(!check.found.contains("isn't installed"), "{check:?}");
}

#[test]
fn an_old_rust_fails_and_says_to_update() {
    let check = rust(
        &ran("rustc 1.80.1 (3f5fd8dd4 2024-08-06)"),
        &ran("cargo 1.80.1 (376290515 2024-07-16)"),
        "1.90",
    );
    assert_eq!(check.status, Status::Fail);
    assert!(check.found.contains("1.80.1"), "{check:?}");
    assert!(check.found.contains("1.90"), "{check:?}");
    assert!(fix(&check).contains("rustup update"), "{check:?}");
}

#[test]
fn a_rustc_and_cargo_from_different_installs_is_a_warning() {
    // Typically a system package's Rust ahead of rustup's on the PATH.
    let check = rust(
        &ran(RUSTC),
        &ran("cargo 1.91.0 (ea2d97820 2025-10-10)"),
        "1.90",
    );
    assert_eq!(check.status, Status::Warn);
    assert!(fix(&check).contains("rustup"), "{check:?}");
}

#[test]
fn unreadable_versions_are_a_warning_not_a_failure() {
    let check = rust(&ran("rustc ???"), &ran(CARGO), "1.90");
    assert_eq!(check.status, Status::Warn);
    assert!(check.found.contains("rustc ???"), "{check:?}");
}

#[test]
fn clippy_is_optional_but_recommended() {
    let check = clippy(&ran("clippy 0.1.95 (59807616e2 2026-04-14)\n"));
    assert_eq!(
        (check.status, check.found.as_str()),
        (Status::Ok, "clippy 0.1.95")
    );

    let check = clippy(&Tool::Missing);
    assert_eq!(check.status, Status::Warn);
    assert!(
        fix(&check).contains("rustup component add clippy"),
        "{check:?}"
    );

    // rustup's cargo fails `cargo clippy` when the component is missing.
    let error = "error: 'cargo-clippy' is not installed for the toolchain 'stable'.";
    let check = clippy(&Tool::Failed(error.into()));
    assert_eq!(check.status, Status::Warn);
    assert!(
        fix(&check).contains("rustup component add clippy"),
        "{check:?}"
    );
}

#[test]
fn git_is_optional_but_recommended() {
    let check = git(&ran("git version 2.43.0\n"));
    assert_eq!(
        (check.status, check.found.as_str()),
        (Status::Ok, "git version 2.43.0")
    );

    let check = git(&Tool::Missing);
    assert_eq!(check.status, Status::Warn);
    assert!(fix(&check).contains("https://git-scm.com"), "{check:?}");

    // macOS ships a git stub that fails until the developer tools are installed.
    let error = "xcrun: error: invalid active developer path (/Library/Developer/CommandLineTools)";
    let check = git(&Tool::Failed(error.into()));
    assert_eq!(check.status, Status::Warn);
    assert!(
        check.found.contains("invalid active developer path"),
        "{check:?}"
    );
}

#[test]
fn progress_is_fine_until_a_newer_oxido_wrote_it_or_it_is_damaged() {
    assert_eq!(progress(Progress::NotCreated).status, Status::Ok);
    let current = progress(Progress::Schema {
        found: 2,
        supported: 2,
    });
    assert_eq!(current.status, Status::Ok);
    let older = progress(Progress::Schema {
        found: 1,
        supported: 2,
    });
    assert_eq!(older.status, Status::Ok);
    assert!(older.found.contains("upgrade"), "{older:?}");

    let newer = progress(Progress::Schema {
        found: 3,
        supported: 2,
    });
    assert_eq!(newer.status, Status::Fail);
    assert!(
        fix(&newer).contains("cargo install --locked oxido"),
        "{newer:?}"
    );

    let locked_out = progress(Progress::Unreadable("unable to open database file".into()));
    assert_eq!(locked_out.status, Status::Fail);
    assert!(
        locked_out.found.contains("unable to open"),
        "{locked_out:?}"
    );
    assert!(fix(&locked_out).contains("owns"), "{locked_out:?}");
    assert!(!fix(&locked_out).contains("fresh"), "{locked_out:?}");

    let damaged = progress(Progress::Damaged("file is not a database".into()));
    assert_eq!(damaged.status, Status::Fail);
    assert!(
        damaged.found.contains("file is not a database"),
        "{damaged:?}"
    );
    assert!(fix(&damaged).contains(".oxido/oxido.db"), "{damaged:?}");
}

#[test]
fn the_server_check_knows_who_holds_the_port() {
    let running = server(
        Server::Running {
            port: 7878,
            version: "0.2.0".into(),
        },
        "0.2.0",
    );
    assert_eq!(running.status, Status::Ok);
    assert!(running.found.contains("7878"), "{running:?}");

    let stale = server(
        Server::Running {
            port: 7878,
            version: "0.1.0".into(),
        },
        "0.2.0",
    );
    assert_eq!(stale.status, Status::Warn);
    assert!(stale.found.contains("0.1.0"), "{stale:?}");

    assert_eq!(
        server(Server::Free { port: 7878 }, "0.2.0").status,
        Status::Ok
    );

    let other_oxido = server(Server::PortTakenByOxido { port: 7878 }, "0.2.0");
    assert_eq!(other_oxido.status, Status::Warn);
    assert!(
        other_oxido.found.contains("another project"),
        "{other_oxido:?}"
    );
    assert!(fix(&other_oxido).contains("--port 7879"), "{other_oxido:?}");

    let other_program = server(Server::PortTaken { port: 7878 }, "0.2.0");
    assert_eq!(other_program.status, Status::Warn);
    assert!(
        fix(&other_program).contains("--port 7879"),
        "{other_program:?}"
    );

    // Ports below 1024 on Linux, or Windows' reserved ranges: nobody to close.
    let refused = server(
        Server::PortUnavailable {
            port: 80,
            reason: "Permission denied (os error 13)".into(),
        },
        "0.2.0",
    );
    assert_eq!(refused.status, Status::Warn);
    assert!(refused.found.contains("Permission denied"), "{refused:?}");
    assert!(!fix(&refused).contains("Close"), "{refused:?}");
    assert!(fix(&refused).contains("--port 81"), "{refused:?}");

    let any = server(Server::Free { port: 0 }, "0.2.0");
    assert_eq!(any.status, Status::Ok);
    assert!(!any.found.contains("port 0"), "{any:?}");
}

#[test]
fn only_failures_fail_the_run() {
    let ok = Check::ok("Rust", "rustc 1.95.0, cargo 1.95.0");
    let warn = Check::warn("Git", "not installed", "Install it.");
    let fail = Check::fail("Project", "no oxido.toml", "Run `oxido init`.");
    assert!(passed(&[ok.clone(), warn.clone()]));
    assert!(!passed(&[ok, warn, fail]));
}

#[test]
fn the_report_lines_up_and_puts_each_fix_under_its_problem() {
    let report = render(&[
        Check::ok("Rust", "rustc 1.95.0, cargo 1.95.0"),
        Check::warn(
            "Clippy",
            "not installed",
            "Run `rustup component add clippy`.",
        ),
        Check::fail("Project", "no oxido.toml here", "Run `oxido init`."),
    ]);
    assert_eq!(
        report,
        "\
ok    Rust     rustc 1.95.0, cargo 1.95.0
warn  Clippy   not installed
               Run `rustup component add clippy`.
fail  Project  no oxido.toml here
               Run `oxido init`.

1 problem to fix, 1 warning.
"
    );
    assert!(render(&[Check::ok("Rust", "rustc 1.95.0, cargo 1.95.0")]).ends_with("\nAll good.\n"));
    assert!(
        render(&[
            Check::warn("Git", "not installed", "Install it."),
            Check::warn("Clippy", "not installed", "Add it."),
        ])
        .ends_with("\n2 warnings. Nothing here stops the course.\n")
    );
}
