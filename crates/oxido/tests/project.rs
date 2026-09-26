//! Finding the course project: `oxido` only runs inside a folder with an
//! `oxido.toml` (written by `oxido init`), looked up the way cargo finds
//! `Cargo.toml`, so it never scatters `.oxido/` folders around the disk.

use std::fs;
use std::path::Path;

use oxido::project::{MARKER, find};

fn mark(dir: &Path) {
    fs::write(dir.join(MARKER), "course = \"minisql\"\n").unwrap();
}

#[test]
fn finds_the_project_it_starts_in() {
    let dir = tempfile::tempdir().unwrap();
    mark(dir.path());
    assert_eq!(
        find(dir.path()).unwrap(),
        dir.path().canonicalize().unwrap()
    );
}

#[test]
fn finds_the_project_from_a_folder_inside_it() {
    let dir = tempfile::tempdir().unwrap();
    mark(dir.path());
    let nested = dir.path().join("src").join("storage");
    fs::create_dir_all(&nested).unwrap();
    assert_eq!(find(&nested).unwrap(), dir.path().canonicalize().unwrap());
}

#[test]
fn the_nearest_project_wins() {
    let outer = tempfile::tempdir().unwrap();
    mark(outer.path());
    let inner = outer.path().join("minisql");
    fs::create_dir_all(&inner).unwrap();
    mark(&inner);
    assert_eq!(find(&inner).unwrap(), inner.canonicalize().unwrap());
}

#[test]
fn refuses_a_folder_outside_any_project_and_says_what_to_do() {
    let dir = tempfile::tempdir().unwrap();
    let error = find(dir.path()).unwrap_err().to_string();
    assert!(error.contains(MARKER), "{error}");
    assert!(error.contains("oxido init"), "{error}");
    // Nothing was created in the folder.
    assert_eq!(fs::read_dir(dir.path()).unwrap().count(), 0);
}

#[test]
fn a_missing_folder_is_an_error() {
    let dir = tempfile::tempdir().unwrap();
    let error = find(&dir.path().join("nope")).unwrap_err().to_string();
    assert!(error.contains("nope"), "{error}");
}
