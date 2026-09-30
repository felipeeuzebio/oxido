//! Outlines, `outlines/<NN>-<slug>.md`: the points of a video in new words,
//! which its lesson is written from and checked against (decision D24). They
//! aren't published; only their front matter is read here.

use serde::Deserialize;

use crate::Problem;
use crate::text::{parse_toml, split};

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Outline {
    pub video: String,
    #[expect(
        dead_code,
        reason = "for people; parsed so a typo in the field names fails"
    )]
    pub title: String,
}

pub fn parse(path: &str, text: &str) -> Result<Outline, Problem> {
    let doc = split(text).ok_or_else(|| Problem {
        path: path.to_string(),
        line: None,
        message: "an outline starts with TOML front matter between +++ lines".into(),
    })?;
    parse_toml(path, doc.front_matter, 2)
}
