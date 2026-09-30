//! Loads the fixture course the way `cargo xtask content` loads `content/`.
//! Each test file uses some of these helpers, so the rest look unused to it.
#![allow(dead_code)]

use std::fs;
use std::path::Path;

use oxido_content::{Compiled, Options, Sources, compile};

/// The fixture course in `tests/fixtures/valid`, as the compiler sees it.
pub fn valid() -> Sources {
    let root = Path::new(env!("CARGO_MANIFEST_DIR")).join("tests/fixtures/valid");
    let mut sources = Sources::default();
    read(&root, &root, &mut sources);
    sources
}

fn read(root: &Path, dir: &Path, sources: &mut Sources) {
    let mut entries: Vec<_> = fs::read_dir(dir)
        .expect("fixture folder")
        .flatten()
        .collect();
    entries.sort_by_key(|entry| entry.path());
    for entry in entries {
        let path = entry.path();
        if path.is_dir() {
            read(root, &path, sources);
        } else {
            let relative = path.strip_prefix(root).expect("inside the fixture");
            let text = fs::read_to_string(&path).expect("fixture file");
            sources.insert(relative.to_string_lossy().replace('\\', "/"), text);
        }
    }
}

pub fn compiled(sources: &Sources) -> Compiled {
    match compile(sources, &Options::default()) {
        Ok(compiled) => compiled,
        Err(problems) => panic!("expected the course to compile, got:\n{}", lines(&problems)),
    }
}

/// The errors, one "path: message" line each.
pub fn errors(sources: &Sources, options: &Options) -> String {
    match compile(sources, options) {
        Ok(_) => panic!("expected errors, but the course compiled"),
        Err(problems) => lines(&problems),
    }
}

pub fn lines(problems: &[oxido_content::Problem]) -> String {
    problems
        .iter()
        .map(ToString::to_string)
        .collect::<Vec<_>>()
        .join("\n")
}

/// `text` with `from` replaced by `to`, failing if `from` isn't there.
pub fn edit(sources: &mut Sources, path: &str, from: &str, to: &str) {
    let text = sources.get(path).expect("fixture file").to_string();
    assert!(text.contains(from), "{path} doesn't contain {from:?}");
    sources.insert(path.to_string(), text.replacen(from, to, 1));
}
