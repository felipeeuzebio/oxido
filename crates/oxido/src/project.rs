//! The student's course project: the folder with an `oxido.toml`, which
//! `oxido init` writes. `oxido` looks for it from the folder it starts in and
//! up through the folders above, the way cargo finds `Cargo.toml`, so running
//! it in `minisql/src` works and running it in a home folder doesn't quietly
//! start a new course there.

use std::path::{Path, PathBuf};

/// The file that marks a course project's root folder.
pub const MARKER: &str = "oxido.toml";

#[derive(Debug, thiserror::Error)]
pub enum ProjectError {
    #[error("can't find the folder {0}")]
    Missing(PathBuf),
    #[error(
        "{0} isn't inside an Oxidō project: there's no {MARKER} in it or in any folder above.\n\
         Go to your minisql folder first (cd minisql), or create a project with `oxido init`."
    )]
    NotAProject(PathBuf),
}

/// The project folder that `start` is in: `start` itself or the nearest folder
/// above it that holds `oxido.toml`.
pub fn find(start: &Path) -> Result<PathBuf, ProjectError> {
    let start = start
        .canonicalize()
        .map_err(|_| ProjectError::Missing(start.to_path_buf()))?;
    start
        .ancestors()
        .find(|dir| dir.join(MARKER).is_file())
        .map(Path::to_path_buf)
        .ok_or(ProjectError::NotAProject(start))
}
