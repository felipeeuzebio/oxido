//! `oxido`: the Oxidō course app. A small local server that serves the
//! course UI in the student's browser, keeps their progress in SQLite, and
//! (from platform phase P8) runs their minisql stripe tests.
//!
//! Pure logic that doesn't touch files or the network lives in `oxido-core`.

pub mod launch;
pub mod project;
pub mod server;
pub mod store;
pub mod ui;

/// A random 128-bit token, hex-encoded, for the launch link.
pub fn random_token() -> anyhow::Result<String> {
    let mut bytes = [0u8; 16];
    getrandom::fill(&mut bytes).map_err(|e| anyhow::anyhow!("no randomness available: {e}"))?;
    Ok(bytes.iter().map(|b| format!("{b:02x}")).collect())
}
