//! Lesson HTML, written from the Markdown tree.
//!
//! Raw HTML in a lesson is escaped, so the page only ever shows what this
//! module writes. Links to other lessons (`02-variables.md#shadowing`) become
//! routes, checked against every lesson's headings.

use std::collections::BTreeMap;

use markdown::mdast::{AlignKind, Node};

use crate::Problem;
use crate::highlight::Highlighter;
use crate::lesson::{Parsed, code_info};
use crate::text::escape;

/// Every lesson by path, with its route and heading IDs, for checking links.
pub type Index = BTreeMap<String, (String, Vec<String>)>;

pub fn index(lessons: &[Parsed]) -> Index {
    lessons
        .iter()
        .map(|lesson| {
            let ids = lesson
                .headings
                .iter()
                .map(|heading| heading.id.clone())
                .collect();
            (lesson.path.clone(), (lesson.route(), ids))
        })
        .collect()
}

pub struct Writer<'a> {
    pub lesson: &'a Parsed,
    pub index: &'a Index,
    pub base_path: &'a str,
    pub highlighter: &'a mut Highlighter,
    pub problems: Vec<Problem>,
    headings: usize,
}

impl<'a> Writer<'a> {
    pub fn new(
        lesson: &'a Parsed,
        index: &'a Index,
        base_path: &'a str,
        highlighter: &'a mut Highlighter,
    ) -> Self {
        Self {
            lesson,
            index,
            base_path,
            highlighter,
            problems: Vec::new(),
            headings: 0,
        }
    }

    pub fn write(mut self) -> (String, Vec<Problem>) {
        let mut html = String::new();
        let root = &self.lesson.root;
        self.blocks(
            root.children().map(Vec::as_slice).unwrap_or_default(),
            &mut html,
        );
        (html, self.problems)
    }

    fn blocks(&mut self, nodes: &[Node], out: &mut String) {
        for node in nodes {
            self.block(node, out);
            out.push('\n');
        }
    }

    fn block(&mut self, node: &Node, out: &mut String) {
        match node {
            Node::Paragraph(p) => self.wrap("p", &p.children, out),
            Node::Heading(heading) => {
                let id = &self.lesson.headings[self.headings].id;
                self.headings += 1;
                out.push_str(&format!("<h{} id=\"{}\">", heading.depth, escape(id)));
                self.inlines(&heading.children, out);
                out.push_str(&format!("</h{}>", heading.depth));
            }
            Node::Code(code) => {
                let (language, _) = code_info(code.lang.as_deref(), code.meta.as_deref());
                let language = if language.is_empty() {
                    "text".to_string()
                } else {
                    language
                };
                let html = match self.highlighter.highlight(&language, &code.value) {
                    Some(Ok(html)) => html,
                    Some(Err(error)) => {
                        self.error(node, &format!("couldn't highlight this block: {error}"));
                        escape(&code.value)
                    }
                    None => escape(&code.value),
                };
                out.push_str(&format!(
                    "<pre class=\"code\" data-lang=\"{}\" translate=\"no\"><code>{html}</code></pre>",
                    escape(&language)
                ));
            }
            Node::Blockquote(quote) => {
                out.push_str("<blockquote>\n");
                self.blocks(&quote.children, out);
                out.push_str("</blockquote>");
            }
            Node::List(list) => {
                let tag = if list.ordered { "ol" } else { "ul" };
                match list.start {
                    Some(start) if list.ordered && start != 1 => {
                        out.push_str(&format!("<ol start=\"{start}\">\n"));
                    }
                    _ => out.push_str(&format!("<{tag}>\n")),
                }
                for item in &list.children {
                    let Node::ListItem(item) = item else { continue };
                    let loose = list.spread || item.spread;
                    out.push_str("<li>");
                    for (i, child) in item.children.iter().enumerate() {
                        if i > 0 {
                            out.push('\n');
                        }
                        match child {
                            Node::Paragraph(p) if !loose => self.inlines(&p.children, out),
                            _ => self.block(child, out),
                        }
                    }
                    out.push_str("</li>\n");
                }
                out.push_str(&format!("</{tag}>"));
            }
            Node::Table(table) => {
                out.push_str("<table>\n");
                for (row_index, row) in table.children.iter().enumerate() {
                    let cell = if row_index == 0 { "th" } else { "td" };
                    if row_index == 0 {
                        out.push_str("<thead>\n");
                    } else if row_index == 1 {
                        out.push_str("<tbody>\n");
                    }
                    out.push_str("<tr>");
                    for (column, node) in row.children().into_iter().flatten().enumerate() {
                        let align = match table.align.get(column) {
                            Some(AlignKind::Left) => " data-align=\"left\"",
                            Some(AlignKind::Center) => " data-align=\"center\"",
                            Some(AlignKind::Right) => " data-align=\"right\"",
                            _ => "",
                        };
                        out.push_str(&format!("<{cell}{align}>"));
                        self.inlines(node.children().map(Vec::as_slice).unwrap_or_default(), out);
                        out.push_str(&format!("</{cell}>"));
                    }
                    out.push_str("</tr>\n");
                    if row_index == 0 {
                        out.push_str("</thead>\n");
                    }
                }
                if table.children.len() > 1 {
                    out.push_str("</tbody>\n");
                }
                out.push_str("</table>");
            }
            Node::ThematicBreak(_) => out.push_str("<hr>"),
            Node::Html(html) => out.push_str(&format!("<p>{}</p>", escape(&html.value))),
            // Everything else is inline, or was already rejected by the parser.
            _ => self.inline(node, out),
        }
    }

    fn wrap(&mut self, tag: &str, children: &[Node], out: &mut String) {
        out.push_str(&format!("<{tag}>"));
        self.inlines(children, out);
        out.push_str(&format!("</{tag}>"));
    }

    fn inlines(&mut self, nodes: &[Node], out: &mut String) {
        for node in nodes {
            self.inline(node, out);
        }
    }

    fn inline(&mut self, node: &Node, out: &mut String) {
        match node {
            Node::Text(text) => out.push_str(&escape(&text.value)),
            Node::Html(html) => out.push_str(&escape(&html.value)),
            Node::InlineCode(code) => {
                out.push_str(&format!(
                    "<code translate=\"no\">{}</code>",
                    escape(&code.value)
                ));
            }
            Node::Emphasis(e) => self.wrap("em", &e.children, out),
            Node::Strong(s) => self.wrap("strong", &s.children, out),
            Node::Delete(d) => self.wrap("del", &d.children, out),
            Node::Break(_) => out.push_str("<br>"),
            Node::Link(link) => {
                let href = self.href(node, &link.url);
                // A link out of the course opens in a new tab, so the student
                // keeps the lesson, and screen readers hear that it will.
                // Links within the course (lessons, headings) stay in the tab.
                let leaves = is_web_address(&href);
                if leaves {
                    out.push_str(&format!(
                        "<a href=\"{}\" target=\"_blank\" rel=\"noopener noreferrer\">",
                        escape(&href)
                    ));
                } else {
                    out.push_str(&format!("<a href=\"{}\">", escape(&href)));
                }
                self.inlines(&link.children, out);
                if leaves {
                    out.push_str(r#"<span class="new-tab"> (opens in a new tab)</span>"#);
                }
                out.push_str("</a>");
            }
            _ => {}
        }
    }

    /// Where a link goes: web addresses as they are, lessons as routes.
    fn href(&mut self, node: &Node, url: &str) -> String {
        if is_web_address(url) || url.starts_with("mailto:") {
            return url.to_string();
        }
        let (path, fragment) = url
            .split_once('#')
            .map_or((url, None), |(p, f)| (p, Some(f)));
        if path.is_empty() {
            let own = self
                .index
                .get(&self.lesson.path)
                .map(|(_, ids)| ids.as_slice());
            self.check_fragment(node, url, &self.lesson.path.clone(), fragment, own);
            return url.to_string();
        }
        if !path.ends_with(".md") {
            self.error(
                node,
                &format!("the link to {url} isn't to a lesson (.md) or a web address"),
            );
            return url.to_string();
        }
        let target = resolve(&self.lesson.path, path);
        let Some((route, ids)) = self.index.get(&target).cloned() else {
            self.error(
                node,
                &format!("the link to {url} points to a lesson that doesn't exist"),
            );
            return url.to_string();
        };
        self.check_fragment(node, url, &target, fragment, Some(&ids));
        match fragment {
            Some(fragment) => format!("{}{route}#{fragment}", self.base_path),
            None => format!("{}{route}", self.base_path),
        }
    }

    fn check_fragment(
        &mut self,
        node: &Node,
        url: &str,
        target: &str,
        fragment: Option<&str>,
        ids: Option<&[String]>,
    ) {
        let (Some(fragment), Some(ids)) = (fragment, ids) else {
            return;
        };
        if !ids.iter().any(|id| id == fragment) {
            let message = format!(
                "the link to {url} points to a heading that doesn't exist ({target} has: {})",
                ids.join(", ")
            );
            self.error(node, &message);
        }
    }

    fn error(&mut self, node: &Node, message: &str) {
        self.problems.push(Problem {
            path: self.lesson.path.clone(),
            line: self.lesson.line(node),
            message: message.to_string(),
        });
    }
}

/// An address on the web, which leaves the course. A link to one opens in a
/// new tab, and `href` passes it through as it is.
fn is_web_address(url: &str) -> bool {
    url.starts_with("https://") || url.starts_with("http://")
}

/// `path` relative to the folder `from` is in, with `.` and `..` resolved.
fn resolve(from: &str, path: &str) -> String {
    let mut parts: Vec<&str> = from.split('/').collect();
    parts.pop();
    for part in path.split('/') {
        match part {
            "." | "" => {}
            ".." => {
                parts.pop();
            }
            part => parts.push(part),
        }
    }
    parts.join("/")
}

#[cfg(test)]
mod tests {
    use super::resolve;

    #[test]
    fn resolves_links_relative_to_the_lesson() {
        assert_eq!(
            resolve("en/p01/01-hello.md", "02-variables.md"),
            "en/p01/02-variables.md"
        );
        assert_eq!(
            resolve("en/p01/01-hello.md", "../p02/04-owner.md"),
            "en/p02/04-owner.md"
        );
        assert_eq!(
            resolve("en/p01/01-hello.md", "./02-variables.md"),
            "en/p01/02-variables.md"
        );
    }
}
