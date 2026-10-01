//! `cargo xtask check-code`: compiles every `rust` block in the lessons, so a
//! lesson never shows code that doesn't build (or builds when it shouldn't).

use std::fs;
use std::path::Path;
use std::process::{Command, ExitCode};

use anyhow::{Context, Result};
use oxido_content::{CodeBlock, CodeMode, code_blocks};

use crate::content::{count, read, report};

pub fn run(content: &Path) -> Result<ExitCode> {
    let blocks = match code_blocks(&read(content)?) {
        Ok(blocks) => blocks,
        Err(problems) => {
            report(&problems, "error");
            return Ok(ExitCode::FAILURE);
        }
    };
    let scratch = tempfile::tempdir().context("couldn't make a scratch folder for rustc")?;
    let mut failures = 0;
    let mut ignored = 0;
    for (n, block) in blocks.iter().enumerate() {
        let failure = match block.mode {
            CodeMode::Ignore => {
                ignored += 1;
                None
            }
            CodeMode::Compile => rustc(block, &scratch.path().join(format!("block{n}")))?
                .err()
                .map(|stderr| format!("this block doesn't compile:\n{stderr}")),
            CodeMode::CompileFail => rustc(block, &scratch.path().join(format!("block{n}")))?
                .ok()
                .map(|()| "this block is marked compile_fail, but it compiles".to_string()),
        };
        if let Some(message) = failure {
            eprintln!("error: {}:{}: {message}", block.path, block.line);
            failures += 1;
        }
    }

    let checked = blocks.len() - ignored;
    if failures > 0 {
        eprintln!(
            "{} of {checked} rust blocks don't behave as marked",
            failures
        );
        return Ok(ExitCode::FAILURE);
    }
    println!(
        "{} behave as marked ({ignored} ignored)",
        count(checked, "rust block")
    );
    Ok(ExitCode::SUCCESS)
}

/// Type-checks the block with rustc, wrapped in `fn main` when it has none
/// (as rustdoc does). `Err` holds rustc's messages.
fn rustc(block: &CodeBlock, dir: &Path) -> Result<Result<(), String>> {
    fs::create_dir_all(dir)?;
    let source = if block.code.contains("fn main") {
        block.code.clone()
    } else {
        format!("fn main() {{\n{}\n}}\n", block.code)
    };
    let file = dir.join("block.rs");
    fs::write(&file, source)?;
    let output = Command::new("rustc")
        .args([
            "--edition",
            "2024",
            "--crate-type",
            "bin",
            "--crate-name",
            "block",
        ])
        .args(["--emit=metadata", "--cap-lints", "allow", "--out-dir"])
        .arg(dir)
        .arg(&file)
        .output()
        .context("couldn't run rustc; is Rust installed?")?;
    Ok(if output.status.success() {
        Ok(())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).into_owned())
    })
}
