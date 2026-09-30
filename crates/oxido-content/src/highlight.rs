//! Code highlighting with arborium, in the colors decision D21 picked.
//!
//! arborium writes custom elements (`<a-k>` for keywords, `<a-f>` for
//! functions, …) that `web/app/app.css` maps onto the `--code-*` variables.
//! Its Rust grammar tags every keyword `<a-k>` and every number `<a-co>`, while
//! rust-analyzer in VS Code gives control flow and numbers their own colors, so
//! those get arborium's more specific tags here.

use crate::text::escape;

/// The languages a code block may name, in the order the error lists them.
pub const LANGUAGES: [&str; 6] = ["rust", "toml", "bash", "sh", "console", "text"];

/// Control-flow keywords, by arborium's tag for them: conditional, repeat, return.
const CONTROL: [(&str, &[&str]); 3] = [
    ("kc", &["if", "else", "match"]),
    ("kr", &["loop", "while", "for", "in", "break", "continue"]),
    ("kt", &["return", "await"]),
];

pub struct Highlighter(arborium::Highlighter);

impl Highlighter {
    pub fn new() -> Self {
        Self(arborium::Highlighter::new())
    }

    /// The code as HTML, or `None` for a language it doesn't know. Console
    /// sessions and plain text are escaped but not colored.
    pub fn highlight(&mut self, language: &str, code: &str) -> Option<Result<String, String>> {
        let grammar = match language {
            "rust" => "rust",
            "toml" => "toml",
            "bash" | "sh" => "bash",
            "console" | "text" | "" => return Some(Ok(escape(code))),
            _ => return None,
        };
        let html = match self.0.highlight(grammar, code) {
            Ok(html) => html,
            Err(error) => return Some(Err(error.to_string())),
        };
        Some(Ok(if grammar == "rust" {
            retag(&html)
        } else {
            html
        }))
    }
}

fn retag(html: &str) -> String {
    let mut html = html.replace("<a-v>self</a-v>", "<a-k>self</a-k>");
    for (tag, words) in CONTROL {
        for word in words {
            html = html.replace(
                &format!("<a-k>{word}</a-k>"),
                &format!("<a-{tag}>{word}</a-{tag}>"),
            );
        }
    }
    numbers(&html)
}

/// `<a-co>42</a-co>` becomes `<a-n>42</a-n>`; `<a-co>true</a-co>` stays.
fn numbers(html: &str) -> String {
    let (open, close) = ("<a-co>", "</a-co>");
    let mut out = String::with_capacity(html.len());
    let mut rest = html;
    while let Some(start) = rest.find(open) {
        let inner_start = start + open.len();
        let Some(length) = rest[inner_start..].find(close) else {
            break;
        };
        let inner = &rest[inner_start..inner_start + length];
        out.push_str(&rest[..start]);
        if inner.starts_with(|c: char| c.is_ascii_digit()) {
            out.push_str(&format!("<a-n>{inner}</a-n>"));
        } else {
            out.push_str(&format!("{open}{inner}{close}"));
        }
        rest = &rest[inner_start + length + close.len()..];
    }
    out.push_str(rest);
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn gives_control_flow_and_numbers_their_own_tags() {
        let mut highlighter = Highlighter::new();
        let html = highlighter
            .highlight("rust", "for i in 0..3 { if self.ok { return; } }")
            .expect("known language")
            .expect("highlights");
        assert!(html.contains("<a-kr>for</a-kr>"), "{html}");
        assert!(html.contains("<a-kr>in</a-kr>"), "{html}");
        assert!(html.contains("<a-kc>if</a-kc>"), "{html}");
        assert!(html.contains("<a-kt>return</a-kt>"), "{html}");
        assert!(html.contains("<a-n>0</a-n>"), "{html}");
        assert!(html.contains("<a-k>self</a-k>"), "{html}");
    }

    #[test]
    fn escapes_console_sessions_without_coloring_them() {
        let mut highlighter = Highlighter::new();
        let html = highlighter
            .highlight("console", "db > .exit")
            .expect("known")
            .expect("ok");
        assert_eq!(html, "db &gt; .exit");
        assert!(highlighter.highlight("cobol", "x").is_none());
    }
}
