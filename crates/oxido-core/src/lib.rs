//! Platform logic for oxido that doesn't depend on Tauri.
//!
//! Keeping this crate free of UI and Tauri types means it can be tested with a
//! plain `cargo test` on any machine, and reused by the desktop app, build
//! scripts and CI tools.

pub mod diagnostics;
