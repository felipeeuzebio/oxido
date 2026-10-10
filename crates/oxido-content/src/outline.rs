//! Outlines, `outlines/<NN>-<slug>.md`: the points of a video in new words,
//! which its lesson is written from and checked against (decision D24). They
//! aren't published. The compiler reads their front matter and the time each
//! numbered point starts at, which the lesson's sections take (decision D34).

use serde::Deserialize;

use crate::Problem;
use crate::text::{format_time, parse_toml, split, video_time};

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
struct Front {
    video: String,
    #[expect(
        dead_code,
        reason = "for people; parsed so a typo in the field names fails"
    )]
    title: String,
    /// The video's length, `m:ss` or `h:mm:ss`, from the transcript.
    duration: String,
}

pub struct Outline {
    pub video: String,
    /// The video's length in seconds.
    pub duration: u32,
    /// When each point starts, in seconds: point 1 first.
    pub starts: Vec<u32>,
}

pub fn parse(path: &str, text: &str) -> Result<Outline, Vec<Problem>> {
    let problem = |line: Option<usize>, message: String| Problem {
        path: path.to_string(),
        line,
        message,
    };
    let doc = split(text).ok_or_else(|| {
        vec![problem(
            None,
            "an outline starts with TOML front matter between +++ lines".into(),
        )]
    })?;
    let front: Front = parse_toml(path, doc.front_matter, 2).map_err(|problem| vec![problem])?;
    let duration_line = doc
        .front_matter
        .lines()
        .position(|line| line.trim_start().starts_with("duration"))
        .map(|index| index + 2);
    let duration = video_time(&front.duration).ok_or_else(|| {
        vec![problem(
            duration_line,
            format!(
                "duration = \"{}\" isn't a length: write it as m:ss or h:mm:ss, from the transcript",
                front.duration
            ),
        )]
    })?;

    let mut problems = Vec::new();
    let mut starts: Vec<u32> = Vec::new();
    for (index, text) in doc.body.lines().enumerate() {
        let line = Some(doc.offset + index + 1);
        let Some((number, rest)) = numbered(text) else {
            continue;
        };
        let previous = starts.len() as u32;
        if number != previous + 1 {
            let message = if previous == 0 {
                format!("the first point is {number}: number the points 1, 2, 3 in order")
            } else {
                format!(
                    "point {number} comes after point {previous}: number the points 1, 2, 3 in order"
                )
            };
            problems.push(problem(line, message));
        }
        let Some(start) = point_time(rest) else {
            problems.push(problem(
                line,
                format!("point {number} has no time: start it with [m:ss], when he makes it in the video"),
            ));
            starts.push(starts.last().copied().unwrap_or(0));
            continue;
        };
        if let Some(&before) = starts.last()
            && start < before
        {
            problems.push(problem(
                line,
                format!(
                    "point {number} starts at {}, before point {previous} ({}): the points follow the video",
                    format_time(start),
                    format_time(before)
                ),
            ));
        }
        if start > duration {
            problems.push(problem(
                line,
                format!(
                    "point {number} starts at {}, after the video ends ({})",
                    format_time(start),
                    format_time(duration)
                ),
            ));
        }
        starts.push(start);
    }
    if !problems.is_empty() {
        return Err(problems);
    }
    Ok(Outline {
        video: front.video,
        duration,
        starts,
    })
}

/// A numbered point, `12. …` at the start of a line: its number and the rest.
fn numbered(line: &str) -> Option<(u32, &str)> {
    let digits = line.bytes().take_while(u8::is_ascii_digit).count();
    let rest = line[digits..].strip_prefix(". ")?;
    Some((line[..digits].parse().ok()?, rest))
}

/// The `[m:ss]` a point starts with.
fn point_time(rest: &str) -> Option<u32> {
    let (time, _) = rest.strip_prefix('[')?.split_once(']')?;
    video_time(time)
}
