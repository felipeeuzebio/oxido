//! Quiz files, `en/quizzes/<id>.toml`: questions shaped like mdbook-quiz's
//! kinds, flattened the way the app reads them.

use std::collections::BTreeSet;

use serde::Deserialize;

use crate::text::parse_toml;
use crate::{Problem, Question, Quiz, TracingAnswer};

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
struct QuizFile {
    questions: Vec<QuestionFile>,
}

#[derive(Debug, Deserialize)]
#[serde(tag = "type", deny_unknown_fields)]
enum QuestionFile {
    MultipleChoice {
        id: String,
        prompt: String,
        explanation: Option<String>,
        choices: Vec<String>,
        answer: usize,
    },
    ShortAnswer {
        id: String,
        prompt: String,
        explanation: Option<String>,
        answer: String,
        #[serde(default)]
        alternatives: Vec<String>,
    },
    Tracing {
        id: String,
        prompt: String,
        explanation: Option<String>,
        program: String,
        does_compile: bool,
        stdout: Option<String>,
    },
}

pub fn parse(path: &str, id: &str, text: &str) -> Result<Quiz, Vec<Problem>> {
    let file: QuizFile = parse_toml(path, text, 1).map_err(|problem| vec![problem])?;
    let mut problems = Vec::new();
    let mut error = |message: String| {
        problems.push(Problem {
            path: path.to_string(),
            line: None,
            message,
        })
    };
    if file.questions.is_empty() {
        error("a quiz needs at least one [[questions]]".into());
    }

    let mut ids = BTreeSet::new();
    let mut questions = Vec::new();
    for question in file.questions {
        let question = match question {
            QuestionFile::MultipleChoice {
                id,
                prompt,
                explanation,
                choices,
                answer,
            } => {
                if choices.len() < 2 {
                    error(format!("question {id} needs at least two choices"));
                } else if answer >= choices.len() {
                    error(format!(
                        "question {id} has answer {answer}, but its choices are numbered 0 to {}",
                        choices.len() - 1
                    ));
                }
                Question::MultipleChoice {
                    id,
                    prompt,
                    explanation,
                    choices,
                    answer,
                }
            }
            QuestionFile::ShortAnswer {
                id,
                prompt,
                explanation,
                answer,
                alternatives,
            } => Question::ShortAnswer {
                id,
                prompt,
                explanation,
                answer,
                alternatives,
            },
            QuestionFile::Tracing {
                id,
                prompt,
                explanation,
                program,
                does_compile,
                stdout,
            } => {
                match (does_compile, &stdout) {
                    (true, None) => error(format!(
                        "question {id} compiles, so it needs stdout (what the program prints)"
                    )),
                    (false, Some(_)) => error(format!(
                        "question {id} doesn't compile, so it can't have stdout"
                    )),
                    _ => {}
                }
                Question::Tracing {
                    id,
                    prompt,
                    explanation,
                    program,
                    answer: TracingAnswer {
                        does_compile,
                        stdout,
                    },
                }
            }
        };
        let question_id = match &question {
            Question::MultipleChoice { id, .. }
            | Question::ShortAnswer { id, .. }
            | Question::Tracing { id, .. } => id.clone(),
        };
        if !ids.insert(question_id.clone()) {
            error(format!("question {question_id} appears twice"));
        }
        questions.push(question);
    }

    if problems.is_empty() {
        Ok(Quiz {
            id: id.to_string(),
            questions,
        })
    } else {
        Err(problems)
    }
}
