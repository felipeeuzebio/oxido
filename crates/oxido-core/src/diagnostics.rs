//! Diagnostics for the built-in editor.
//!
//! The desktop app runs `cargo clippy --message-format=json` on the student's
//! scratch crate. Cargo prints one JSON object per line; only the
//! `compiler-message` lines matter here, and only the ones that point at the
//! file shown in the editor.

use serde::{Deserialize, Serialize};

/// How serious a diagnostic is. Mirrors rustc's `level` field.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum Severity {
    Error,
    Warning,
    Note,
    Help,
}

/// A 1-based line/column range, the way rustc reports it.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
pub struct Span {
    pub line_start: u32,
    pub column_start: u32,
    pub line_end: u32,
    pub column_end: u32,
}

/// A machine-applicable suggestion, offered as a quick fix in the editor.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct Fix {
    pub replacement: String,
    pub span: Span,
}

/// One problem to underline in the editor.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct Diagnostic {
    pub severity: Severity,
    /// Lint or error code, e.g. `clippy::len_zero` or `E0308`.
    pub code: Option<String>,
    pub message: String,
    pub span: Span,
    pub fix: Option<Fix>,
}

/// Parses cargo's JSON message stream and returns the diagnostics that point
/// at `file_name` (relative to the crate root, e.g. `src/main.rs`), sorted by
/// position. Lines that aren't JSON, and messages without a primary span in
/// that file, are skipped.
pub fn parse_cargo_messages(output: &str, file_name: &str) -> Vec<Diagnostic> {
    let mut diagnostics: Vec<Diagnostic> = output
        .lines()
        .filter_map(|line| serde_json::from_str::<CargoLine>(line).ok())
        .filter(|line| line.reason == "compiler-message")
        .filter_map(|line| line.message)
        .filter_map(|message| to_diagnostic(message, file_name))
        .collect();

    diagnostics.sort_by_key(|d| (d.span.line_start, d.span.column_start));
    diagnostics
}

fn to_diagnostic(message: RustcMessage, file_name: &str) -> Option<Diagnostic> {
    let severity = match message.level.as_str() {
        "error" => Severity::Error,
        "warning" => Severity::Warning,
        "note" => Severity::Note,
        "help" => Severity::Help,
        _ => return None, // "failure-note" and friends carry no code position
    };

    let primary = message
        .spans
        .iter()
        .find(|s| s.is_primary && s.file_name == file_name)?;
    let span = primary.to_span();

    let fix = message
        .children
        .iter()
        .flat_map(|child| child.spans.iter())
        .find(|s| s.file_name == file_name && s.suggested_replacement.is_some())
        .map(|s| Fix {
            replacement: s.suggested_replacement.clone().unwrap_or_default(),
            span: s.to_span(),
        });

    Some(Diagnostic {
        severity,
        code: message.code.map(|c| c.code),
        message: message.message,
        span,
        fix,
    })
}

// Subset of cargo's JSON format that we read.
// https://doc.rust-lang.org/cargo/reference/external-tools.html#json-messages

#[derive(Deserialize)]
struct CargoLine {
    reason: String,
    message: Option<RustcMessage>,
}

#[derive(Deserialize)]
struct RustcMessage {
    message: String,
    level: String,
    code: Option<RustcCode>,
    #[serde(default)]
    spans: Vec<RustcSpan>,
    #[serde(default)]
    children: Vec<RustcMessage>,
}

#[derive(Deserialize)]
struct RustcCode {
    code: String,
}

#[derive(Deserialize)]
struct RustcSpan {
    file_name: String,
    line_start: u32,
    line_end: u32,
    column_start: u32,
    column_end: u32,
    is_primary: bool,
    suggested_replacement: Option<String>,
}

impl RustcSpan {
    fn to_span(&self) -> Span {
        Span {
            line_start: self.line_start,
            column_start: self.column_start,
            line_end: self.line_end,
            column_end: self.column_end,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn drops_messages_without_spans() {
        let line = r#"{"reason":"compiler-message","message":{"message":"aborting due to 1 previous error","level":"error","code":null,"spans":[],"children":[]}}"#;
        assert!(parse_cargo_messages(line, "src/main.rs").is_empty());
    }

    #[test]
    fn unknown_levels_are_skipped() {
        let line = r#"{"reason":"compiler-message","message":{"message":"x","level":"failure-note","code":null,"spans":[{"file_name":"src/main.rs","line_start":1,"line_end":1,"column_start":1,"column_end":2,"is_primary":true,"suggested_replacement":null}],"children":[]}}"#;
        assert!(parse_cargo_messages(line, "src/main.rs").is_empty());
    }
}
