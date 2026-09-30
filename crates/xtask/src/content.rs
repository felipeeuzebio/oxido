//! `cargo xtask content`: compiles the content folder and writes the output
//! the frontend build reads (`web/.content` by default).

use std::fs;
use std::path::Path;
use std::process::ExitCode;

use anyhow::{Context, Result, bail};
use oxido_content::{Compiled, Options, Problem, Sources, compile};

pub fn run(content: &Path, out: &Path, complete: bool) -> Result<ExitCode> {
    let sources = read(content)?;
    let options = Options {
        base_path: std::env::var("BASE_PATH")
            .unwrap_or_default()
            .trim_end_matches('/')
            .to_string(),
        complete,
    };
    let compiled = match compile(&sources, &options) {
        Ok(compiled) => compiled,
        Err(problems) => {
            report(&problems, "error");
            eprintln!(
                "{} in {}",
                count(problems.len(), "problem"),
                content.display()
            );
            return Ok(ExitCode::FAILURE);
        }
    };
    report(&compiled.warnings, "warning");
    write(&compiled, out)?;

    println!(
        "Compiled {} and {} into {}.",
        count(compiled.lessons.len(), "lesson"),
        count(compiled.quizzes.len(), "quiz"),
        out.display()
    );
    if !compiled.unwritten.is_empty() {
        let lessons = compiled
            .unwritten
            .iter()
            .filter(|item| item.contains("the lesson for"))
            .count();
        let quizzes = compiled.unwritten.len() - lessons;
        println!(
            "Not written yet: {} and {} (--complete lists them).",
            count(lessons, "lesson"),
            count(quizzes, "quiz")
        );
    }
    Ok(ExitCode::SUCCESS)
}

/// Every file under `dir`, by path relative to it, skipping hidden files.
pub fn read(dir: &Path) -> Result<Sources> {
    let mut sources = Sources::default();
    add(dir, dir, &mut sources)
        .with_context(|| format!("couldn't read the content folder {}", dir.display()))?;
    Ok(sources)
}

fn add(root: &Path, dir: &Path, sources: &mut Sources) -> Result<()> {
    for entry in fs::read_dir(dir)? {
        let path = entry?.path();
        let hidden = path
            .file_name()
            .is_some_and(|name| name.to_string_lossy().starts_with('.'));
        if hidden {
            continue;
        }
        if path.is_dir() {
            add(root, &path, sources)?;
        } else {
            let text = fs::read_to_string(&path)
                .with_context(|| format!("{} isn't UTF-8 text", path.display()))?;
            let relative = path
                .strip_prefix(root)?
                .to_string_lossy()
                .replace('\\', "/");
            sources.insert(relative, text);
        }
    }
    Ok(())
}

pub fn report(problems: &[Problem], label: &str) {
    for problem in problems {
        eprintln!("{label}: {problem}");
    }
}

pub fn count(n: usize, noun: &str) -> String {
    match (n, noun) {
        (1, _) => format!("1 {noun}"),
        (_, "quiz") => format!("{n} quizzes"),
        _ => format!("{n} {noun}s"),
    }
}

/// Replaces `out` with the compiled course. A folder that isn't empty is
/// only replaced if it holds a `course.json`, so a mistyped --out can't
/// delete anything else.
fn write(compiled: &Compiled, out: &Path) -> Result<()> {
    if out.exists() {
        let empty = fs::read_dir(out)?.next().is_none();
        if !empty && !out.join("course.json").is_file() {
            bail!(
                "{} isn't empty and doesn't hold compiled content; pick another --out",
                out.display()
            );
        }
        fs::remove_dir_all(out)?;
    }
    fs::create_dir_all(out)?;
    fs::write(out.join("course.json"), json(&compiled.course)?)?;
    for lesson in &compiled.lessons {
        let dir = out.join("lessons").join(&lesson.phase);
        fs::create_dir_all(&dir)?;
        fs::write(dir.join(format!("{}.json", lesson.slug)), json(lesson)?)?;
    }
    for quiz in &compiled.quizzes {
        let dir = out.join("quizzes");
        fs::create_dir_all(&dir)?;
        fs::write(dir.join(format!("{}.json", quiz.id)), json(quiz)?)?;
    }
    Ok(())
}

/// Pretty JSON with a final newline.
fn json(value: &impl serde::Serialize) -> Result<String> {
    Ok(serde_json::to_string_pretty(value)? + "\n")
}
