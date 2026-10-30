//! Outlines, `outlines/<NN>-<slug>.md`: the points of a video in new words,
//! which its class is written from and checked against (decision D24). They
//! aren't published. The compiler reads their front matter, with the video's
//! chapters, and the time each numbered point starts at, which the chapters
//! and the lesson's `video:N` hints take (decisions D34 and D35).

use serde::Deserialize;

use crate::text::{format_time, parse_toml, split, video_time};
use crate::{Chapter, Problem};

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
    /// The video's chapters: the point each one starts at, and its title.
    chapters: Option<Vec<ChapterFile>>,
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
struct ChapterFile {
    point: u32,
    title: String,
}

pub struct Outline {
    pub video: String,
    /// The video's length in seconds.
    pub duration: u32,
    /// When each point starts, in seconds: point 1 first.
    pub starts: Vec<u32>,
    /// The video's chapters, each starting at its point's time.
    pub chapters: Vec<Chapter>,
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
    let duration = video_time(&front.duration).ok_or_else(|| {
        vec![problem(
            line_of(doc.front_matter, "duration"),
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
    let line = line_of(doc.front_matter, "chapters");
    let chapters = chapters(front.chapters, &starts).map_err(|messages| {
        messages
            .into_iter()
            .map(|message| problem(line, message))
            .collect::<Vec<_>>()
    })?;
    Ok(Outline {
        video: front.video,
        duration,
        starts,
        chapters,
    })
}

/// The chapters, checked against the points: the first starts at point 1, so
/// the strip covers the whole video, and the rest follow the video.
fn chapters(
    chapters: Option<Vec<ChapterFile>>,
    starts: &[u32],
) -> Result<Vec<Chapter>, Vec<String>> {
    let chapters = chapters.unwrap_or_default();
    let Some(first) = chapters.first() else {
        return Err(vec![
            "the front matter has no chapters: name each chapter and the point it starts at, as chapters = [{ point = 1, title = \"…\" }]".into(),
        ]);
    };
    let mut problems = Vec::new();
    if first.point != 1 {
        problems.push(format!(
            "the first chapter starts at point {}: start it at point 1, so the chapters cover the whole video",
            first.point
        ));
    }
    let mut out = Vec::new();
    for (index, chapter) in chapters.iter().enumerate() {
        let ChapterFile { point, title } = chapter;
        if index > 0 && *point <= chapters[index - 1].point {
            problems.push(format!(
                "chapter “{title}” starts at point {point}, but the chapter before it starts at point {}: chapters follow the video",
                chapters[index - 1].point
            ));
        }
        match (*point as usize).checked_sub(1).and_then(|i| starts.get(i)) {
            Some(&start) => out.push(Chapter {
                title: title.clone(),
                start,
            }),
            None => problems.push(format!(
                "chapter “{title}” starts at point {point}, but the outline has points 1 to {}",
                starts.len()
            )),
        }
    }
    if problems.is_empty() {
        Ok(out)
    } else {
        Err(problems)
    }
}

/// The file line a front matter key is on (the front matter starts on line 2).
fn line_of(front_matter: &str, key: &str) -> Option<usize> {
    front_matter
        .lines()
        .position(|line| line.trim_start().starts_with(key))
        .map(|index| index + 2)
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
