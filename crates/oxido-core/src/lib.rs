//! Platform logic for oxido that does no I/O: no files, processes or network.
//!
//! Everything here takes plain values and returns plain values, so it's tested
//! with a plain `cargo test` on any machine and reused by `oxido`, build
//! scripts and CI tools.

pub mod diagnostics;
pub mod doctor;
