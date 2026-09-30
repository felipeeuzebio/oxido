//! `cargo xtask <command>`: the repository's maintainer commands (decision
//! D26). The rules live in `oxido-content`; this binary reads and
//! writes the files and runs the tools.

use std::path::{Path, PathBuf};
use std::process::ExitCode;

use clap::{Parser, Subcommand};

mod check_code;
mod content;

#[derive(Parser)]
#[command(name = "cargo xtask", about = "Maintainer commands for Oxidō")]
struct Cli {
    #[command(subcommand)]
    command: Command,
}

#[derive(Subcommand)]
enum Command {
    /// Compile content/ into the JSON and lesson HTML the frontend reads.
    Content {
        /// The content folder [default: content/ in the repository].
        #[arg(long, env = "OXIDO_CONTENT")]
        content: Option<PathBuf>,
        /// Where to write the output; replaced on every run [default: web/.content].
        #[arg(long)]
        out: Option<PathBuf>,
        /// Fail on lessons and quizzes course.toml plans that aren't written yet.
        #[arg(long)]
        complete: bool,
    },
    /// Compile every `rust` block in the lessons with rustc.
    CheckCode {
        /// The content folder [default: content/ in the repository].
        #[arg(long, env = "OXIDO_CONTENT")]
        content: Option<PathBuf>,
    },
}

/// The repository root, for default paths.
pub fn repo() -> PathBuf {
    let repo = Path::new(env!("CARGO_MANIFEST_DIR")).join("../..");
    repo.canonicalize().unwrap_or(repo)
}

fn main() -> ExitCode {
    let cli = Cli::parse();
    let default =
        |path: Option<PathBuf>, relative: &str| path.unwrap_or_else(|| repo().join(relative));
    let result = match cli.command {
        Command::Content {
            content,
            out,
            complete,
        } => content::run(
            &default(content, "content"),
            &default(out, "web/.content"),
            complete,
        ),
        Command::CheckCode { content } => check_code::run(&default(content, "content")),
    };
    match result {
        Ok(code) => code,
        Err(error) => {
            eprintln!("error: {error:#}");
            ExitCode::FAILURE
        }
    }
}
