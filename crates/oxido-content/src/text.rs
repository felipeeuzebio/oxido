//! Small text helpers: front matter, fingerprints, slugs, HTML escaping, and
//! TOML errors turned into [`Problem`]s with a line number.

use serde::de::DeserializeOwned;
use sha2::{Digest, Sha256};

use crate::Problem;

/// A file split into its TOML front matter and the Markdown after it.
pub struct Document<'a> {
    pub front_matter: &'a str,
    pub body: &'a str,
    /// Lines before the body, so body line 1 is file line `offset + 1`.
    pub offset: usize,
}

/// Splits `+++`-fenced TOML front matter off the top of a file.
pub fn split(text: &str) -> Option<Document<'_>> {
    let rest = text.strip_prefix("+++\n")?;
    let end = rest
        .find("\n+++\n")
        .or_else(|| rest.strip_suffix("\n+++").map(str::len))?;
    let front_matter = &rest[..end];
    let body = rest.get(end + "\n+++\n".len()..).unwrap_or_default();
    let offset = front_matter.lines().count() + 2;
    Some(Document {
        front_matter,
        body,
        offset,
    })
}

/// Parses TOML, reporting an error at its line in the file (`first_line` is
/// the file line the TOML starts on).
pub fn parse_toml<T: DeserializeOwned>(
    path: &str,
    toml_text: &str,
    first_line: usize,
) -> Result<T, Problem> {
    toml::from_str(toml_text).map_err(|error| {
        let line = error
            .span()
            .map(|span| toml_text[..span.start].matches('\n').count() + first_line);
        Problem {
            path: path.to_string(),
            line,
            message: error.message().trim_end().to_string(),
        }
    })
}

/// `sha256:` and the text's SHA-256 in hex, as `sha256sum` prints it.
pub fn fingerprint(text: &str) -> String {
    let digest = Sha256::digest(text.as_bytes());
    let hex: String = digest.iter().map(|byte| format!("{byte:02x}")).collect();
    format!("sha256:{hex}")
}

/// A heading's text as an `id`: lower case, words joined by `-`.
pub fn slug(text: &str) -> String {
    let mut slug = String::new();
    for c in text.chars().flat_map(char::to_lowercase) {
        if c.is_alphanumeric() {
            slug.push(c);
        } else if !slug.is_empty() && !slug.ends_with('-') && (c.is_whitespace() || c == '-') {
            slug.push('-');
        }
    }
    slug.trim_end_matches('-').to_string()
}

/// Escapes text for HTML content and attribute values.
pub fn escape(text: &str) -> String {
    let mut escaped = String::with_capacity(text.len());
    for c in text.chars() {
        match c {
            '&' => escaped.push_str("&amp;"),
            '<' => escaped.push_str("&lt;"),
            '>' => escaped.push_str("&gt;"),
            '"' => escaped.push_str("&quot;"),
            '\'' => escaped.push_str("&#39;"),
            _ => escaped.push(c),
        }
    }
    escaped
}

/// A YouTube video ID: 11 letters, digits, `-` or `_`.
pub fn is_video_id(id: &str) -> bool {
    id.len() == 11
        && id
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_')
}

/// `01-hello`: two digits, a dash, then lower-case words joined by dashes.
pub fn is_numbered_slug(stem: &str) -> bool {
    let Some((number, slug)) = stem.split_once('-') else {
        return false;
    };
    number.len() == 2
        && number.chars().all(|c| c.is_ascii_digit())
        && !slug.is_empty()
        && slug.split('-').all(|word| {
            !word.is_empty()
                && word
                    .chars()
                    .all(|c| c.is_ascii_lowercase() || c.is_ascii_digit())
        })
}

/// A time in a video, written `m:ss` or `h:mm:ss`, in seconds.
pub fn video_time(text: &str) -> Option<u32> {
    let number = |part: &str| {
        let digits = !part.is_empty() && part.bytes().all(|byte| byte.is_ascii_digit());
        digits.then(|| part.parse::<u32>().ok()).flatten()
    };
    // Minutes after hours, and seconds, are two digits under 60.
    let two = |part: &str| {
        (part.len() == 2)
            .then(|| number(part))
            .flatten()
            .filter(|n| *n < 60)
    };
    match text.split(':').collect::<Vec<_>>().as_slice() {
        [minutes, seconds] => Some(number(minutes)? * 60 + two(seconds)?),
        [hours, minutes, seconds] => {
            Some(number(hours)? * 3600 + two(minutes)? * 60 + two(seconds)?)
        }
        _ => None,
    }
}

/// Seconds as the app writes a time: `01:30`, or `1:02:05` past an hour.
pub fn format_time(seconds: u32) -> String {
    let (hours, minutes, rest) = (seconds / 3600, seconds % 3600 / 60, seconds % 60);
    if hours > 0 {
        format!("{hours}:{minutes:02}:{rest:02}")
    } else {
        format!("{minutes:02}:{rest:02}")
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn splits_front_matter_and_counts_its_lines() {
        let doc = split("+++\ntitle = \"x\"\n+++\n\nBody\n").expect("front matter");
        assert_eq!(doc.front_matter, "title = \"x\"");
        assert_eq!(doc.body, "\nBody\n");
        assert_eq!(doc.offset, 3);
        assert!(split("---\ntitle = \"x\"\n---\n").is_none());
    }

    #[test]
    fn slugs_headings_like_github_does() {
        assert_eq!(slug("Your first program"), "your-first-program");
        assert_eq!(slug("What `cargo run` does!"), "what-cargo-run-does");
        assert_eq!(slug("Ownership — moves"), "ownership-moves");
    }

    #[test]
    fn knows_a_video_id_and_a_lesson_file_name() {
        assert!(is_video_id("OX9HJsJUDxA"));
        assert!(!is_video_id("https://youtu.be/OX9HJsJUDxA"));
        assert!(is_numbered_slug("01-hello"));
        assert!(is_numbered_slug("12-lifetimes-explained"));
        assert!(!is_numbered_slug("hello"));
        assert!(!is_numbered_slug("1-hello"));
        assert!(!is_numbered_slug("01-Hello"));
    }

    #[test]
    fn reads_video_times_written_as_minutes_or_hours() {
        for (text, seconds) in [
            ("0:42", 42),
            ("2:47", 167),
            ("15:28", 928),
            ("1:02:05", 3725),
        ] {
            assert_eq!(video_time(text), Some(seconds), "{text}");
        }
    }

    #[test]
    fn refuses_what_isnt_a_video_time() {
        for text in [
            "",
            "42",
            "0:4",
            "2:60",
            "1:2:05",
            "1:02:60",
            "a:bc",
            "-1:00",
            "1:00:00:00",
        ] {
            assert_eq!(video_time(text), None, "{text}");
        }
    }

    #[test]
    fn writes_times_the_way_the_app_shows_them() {
        for (seconds, text) in [
            (0, "00:00"),
            (90, "01:30"),
            (928, "15:28"),
            (3725, "1:02:05"),
        ] {
            assert_eq!(format_time(seconds), text);
        }
    }
}
