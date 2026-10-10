//! Lesson files, `en/<phase>/<NN>-<slug>.md`: TOML front matter, then
//! CommonMark with GitHub's tables and strikethrough.

use markdown::mdast::Node;
use markdown::{ParseOptions, to_mdast};
use serde::Deserialize;

use crate::highlight::LANGUAGES;
use crate::text::{parse_toml, slug, split};
use crate::{CodeBlock, CodeMode, Heading, Problem};

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
struct Front {
    title: String,
    video: Option<String>,
    outline: Option<String>,
    /// The outline point each part starts at: the opening text, then each `##` section.
    sections: Option<Vec<u32>>,
}

/// A lesson, parsed and checked on its own (links are checked when rendering,
/// once every lesson's headings are known).
pub struct Parsed {
    pub path: String,
    pub phase: String,
    pub slug: String,
    pub title: String,
    pub video: Option<String>,
    pub outline: Option<String>,
    pub sections: Option<Vec<u32>>,
    /// Whether text comes before the first `##` section.
    pub has_opening: bool,
    pub root: Node,
    /// Lines before the Markdown body, to report file line numbers.
    pub offset: usize,
    pub headings: Vec<Heading>,
    pub code: Vec<CodeBlock>,
}

impl Parsed {
    pub fn route(&self) -> String {
        format!("/lesson/{}/{}", self.phase, self.slug)
    }

    pub fn line(&self, node: &Node) -> Option<usize> {
        node.position()
            .map(|position| position.start.line + self.offset)
    }
}

pub fn parse(path: &str, phase: &str, slug: &str, text: &str) -> Result<Parsed, Vec<Problem>> {
    let problem = |line, message: &str| Problem {
        path: path.to_string(),
        line,
        message: message.to_string(),
    };
    let doc = split(text).ok_or_else(|| {
        vec![problem(
            None,
            "a lesson starts with TOML front matter between +++ lines",
        )]
    })?;
    let front: Front = parse_toml(path, doc.front_matter, 2).map_err(|problem| vec![problem])?;
    let root = to_mdast(doc.body, &ParseOptions::gfm())
        .map_err(|message| vec![problem(None, &message.to_string())])?;

    let mut walker = Walker {
        path,
        offset: doc.offset,
        headings: Vec::new(),
        code: Vec::new(),
        problems: Vec::new(),
    };
    walker.walk(&root);
    let has_opening = root
        .children()
        .and_then(|children| children.first())
        .is_some_and(|first| !matches!(first, Node::Heading(heading) if heading.depth == 2));
    if !walker.problems.is_empty() {
        return Err(walker.problems);
    }
    Ok(Parsed {
        path: path.to_string(),
        phase: phase.to_string(),
        slug: slug.to_string(),
        title: front.title,
        video: front.video,
        outline: front.outline,
        sections: front.sections,
        has_opening,
        root,
        offset: doc.offset,
        headings: walker.headings,
        code: walker.code,
    })
}

/// Collects headings and `rust` blocks, and reports what lessons can't use.
struct Walker<'a> {
    path: &'a str,
    offset: usize,
    headings: Vec<Heading>,
    code: Vec<CodeBlock>,
    problems: Vec<Problem>,
}

impl Walker<'_> {
    fn error(&mut self, node: &Node, message: &str) {
        self.problems.push(Problem {
            path: self.path.to_string(),
            line: node
                .position()
                .map(|position| position.start.line + self.offset),
            message: message.to_string(),
        });
    }

    fn walk(&mut self, node: &Node) {
        match node {
            Node::Heading(heading) if heading.depth == 1 => self.error(
                node,
                "use ## and below for sections; the title comes from the front matter",
            ),
            Node::Heading(heading) => {
                let text = plain_text(node);
                let id = self.unique_id(&slug(&text));
                self.headings.push(Heading {
                    depth: heading.depth,
                    id,
                    text,
                });
            }
            Node::Code(code) => self.code_block(node, code),
            Node::Image(_) | Node::ImageReference(_) => {
                self.error(node, "images aren't supported in lessons yet");
            }
            Node::LinkReference(_) | Node::Definition(_) => {
                self.error(
                    node,
                    "reference-style links aren't supported; write [text](url)",
                );
            }
            Node::FootnoteDefinition(_) | Node::FootnoteReference(_) => {
                self.error(node, "footnotes aren't supported in lessons");
            }
            Node::ListItem(item) if item.checked.is_some() => {
                self.error(node, "task lists aren't supported in lessons");
            }
            Node::Math(_) | Node::InlineMath(_) => {
                self.error(node, "math isn't supported in lessons")
            }
            _ => {}
        }
        for child in node.children().into_iter().flatten() {
            self.walk(child);
        }
    }

    /// `base`, or `base-2`, `base-3`… when an earlier heading has it.
    fn unique_id(&self, base: &str) -> String {
        let taken = |id: &str| self.headings.iter().any(|heading| heading.id == id);
        if !taken(base) {
            return base.to_string();
        }
        (2..)
            .map(|n| format!("{base}-{n}"))
            .find(|id| !taken(id))
            .unwrap_or_default()
    }

    fn code_block(&mut self, node: &Node, code: &markdown::mdast::Code) {
        let (language, flags) = code_info(code.lang.as_deref(), code.meta.as_deref());
        if !language.is_empty() && !LANGUAGES.contains(&language.as_str()) {
            let message =
                format!("code blocks can be rust, toml, bash, sh, console or text, not {language}");
            return self.error(node, &message);
        }
        if language != "rust" {
            return;
        }
        match rust_mode(&flags) {
            Ok(mode) => self.code.push(CodeBlock {
                path: self.path.to_string(),
                line: node
                    .position()
                    .map_or(0, |position| position.start.line + self.offset),
                mode,
                code: code.value.clone(),
            }),
            Err(flag) => {
                let message =
                    format!("rust blocks can be marked ignore or compile_fail, not {flag}");
                self.error(node, &message);
            }
        }
    }
}

/// A fence's language and flags: ```` ```rust compile_fail ```` or
/// ```` ```rust,ignore ````.
pub fn code_info(lang: Option<&str>, meta: Option<&str>) -> (String, Vec<String>) {
    let info = format!("{} {}", lang.unwrap_or_default(), meta.unwrap_or_default());
    let mut words = info.split([',', ' ', '\t']).filter(|word| !word.is_empty());
    let language = words.next().unwrap_or_default().to_string();
    (language, words.map(str::to_string).collect())
}

fn rust_mode(flags: &[String]) -> Result<CodeMode, String> {
    match flags {
        [] => Ok(CodeMode::Compile),
        [flag] if flag == "ignore" => Ok(CodeMode::Ignore),
        [flag] if flag == "compile_fail" => Ok(CodeMode::CompileFail),
        [flag] => Err(flag.clone()),
        flags => Err(flags.join(",")),
    }
}

/// The text a reader sees in a node, without Markdown syntax.
pub fn plain_text(node: &Node) -> String {
    match node {
        Node::Text(text) => text.value.clone(),
        Node::InlineCode(code) => code.value.clone(),
        _ => node
            .children()
            .map(|children| children.iter().map(plain_text).collect())
            .unwrap_or_default(),
    }
}
