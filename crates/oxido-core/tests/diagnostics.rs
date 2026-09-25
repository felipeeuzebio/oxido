//! Acceptance tests for turning `cargo clippy --message-format=json` output
//! into editor diagnostics. The fixtures are real clippy output captured from
//! a small exercise crate (paths normalized to /workspace).

use oxido_core::diagnostics::{Diagnostic, Fix, Severity, Span, parse_cargo_messages};

const LINTS: &str = include_str!("fixtures/clippy_lints.jsonl");
const ERROR: &str = include_str!("fixtures/clippy_error.jsonl");

fn find<'a>(diagnostics: &'a [Diagnostic], code: &str) -> &'a Diagnostic {
    diagnostics
        .iter()
        .find(|d| d.code.as_deref() == Some(code))
        .unwrap_or_else(|| panic!("no diagnostic with code {code}"))
}

#[test]
fn keeps_only_compiler_messages_that_point_at_code() {
    let diagnostics = parse_cargo_messages(LINTS, "src/main.rs");
    assert_eq!(diagnostics.len(), 3);
}

#[test]
fn maps_a_clippy_lint_with_position_and_fix() {
    let diagnostics = parse_cargo_messages(LINTS, "src/main.rs");
    let len_zero = find(&diagnostics, "clippy::len_zero");

    assert_eq!(len_zero.severity, Severity::Warning);
    assert_eq!(len_zero.message, "length comparison to zero");
    assert_eq!(
        len_zero.span,
        Span {
            line_start: 3,
            column_start: 8,
            line_end: 3,
            column_end: 23
        }
    );
    assert_eq!(
        len_zero.fix,
        Some(Fix {
            replacement: "rows.is_empty()".to_string(),
            span: len_zero.span,
        })
    );
}

#[test]
fn maps_a_compile_error_to_error_severity_at_the_primary_span() {
    let diagnostics = parse_cargo_messages(ERROR, "src/main.rs");

    // The "For more information about this error" note has no span and is dropped.
    assert_eq!(diagnostics.len(), 1);
    let mismatch = find(&diagnostics, "E0308");
    assert_eq!(mismatch.severity, Severity::Error);
    assert_eq!(mismatch.span.line_start, 2);
    assert_eq!(mismatch.span.column_start, 19);
}

#[test]
fn ignores_lines_that_are_not_json() {
    let noisy = format!("   Compiling exercise v0.1.0\n{LINTS}\nnot json at all\n");
    assert_eq!(parse_cargo_messages(&noisy, "src/main.rs").len(), 3);
}

#[test]
fn ignores_diagnostics_from_other_files() {
    assert!(parse_cargo_messages(LINTS, "src/lib.rs").is_empty());
}

#[test]
fn diagnostics_are_sorted_by_position() {
    let diagnostics = parse_cargo_messages(LINTS, "src/main.rs");
    let lines: Vec<u32> = diagnostics.iter().map(|d| d.span.line_start).collect();
    assert_eq!(lines, vec![2, 3, 6]);
}
