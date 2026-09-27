//! The web UI's files. Release builds embed `web/build/client` (the output of
//! `bun run build`) into the binary; debug builds read it from disk, so a
//! rebuilt frontend shows up without recompiling Rust.

use std::borrow::Cow;
use std::collections::HashMap;

pub struct Asset {
    pub bytes: Cow<'static, [u8]>,
    pub mime: String,
}

/// Where the server gets UI files from. Tests use [`MemoryAssets`].
pub trait AssetSource: Send + Sync + 'static {
    /// `path` is relative to the build root, without a leading slash.
    fn get(&self, path: &str) -> Option<Asset>;
}

#[derive(rust_embed::Embed)]
#[folder = "../../web/build/client"]
#[allow_missing = true]
struct Built;

/// The frontend build, embedded at compile time.
pub struct EmbeddedAssets;

impl EmbeddedAssets {
    /// True when `bun run build` hadn't run before this binary was compiled.
    pub fn is_empty() -> bool {
        Built::iter().next().is_none()
    }
}

impl AssetSource for EmbeddedAssets {
    fn get(&self, path: &str) -> Option<Asset> {
        Built::get(path).map(|file| Asset {
            mime: file.metadata.mimetype().to_string(),
            bytes: file.data,
        })
    }
}

/// In-memory files, for tests.
#[derive(Default, Clone)]
pub struct MemoryAssets {
    files: HashMap<String, (String, Vec<u8>)>,
}

impl MemoryAssets {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn with(mut self, path: &str, mime: &str, content: impl Into<Vec<u8>>) -> Self {
        self.files
            .insert(path.to_string(), (mime.to_string(), content.into()));
        self
    }
}

impl AssetSource for MemoryAssets {
    fn get(&self, path: &str) -> Option<Asset> {
        self.files.get(path).map(|(mime, bytes)| Asset {
            bytes: Cow::Owned(bytes.clone()),
            mime: mime.clone(),
        })
    }
}
