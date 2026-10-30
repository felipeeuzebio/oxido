//! A class's task (decision D35): stripes of its belt, a drill, or the setup.
//! Stripes are numbered the way their belt numbers them, across its phases, as
//! the roadmap's table and the stripe tests' file names do.

use std::collections::BTreeMap;
use std::collections::btree_map::Entry;

use crate::compile::problem;
use crate::course::{self, BeltFile, CourseFile};
use crate::lesson::Parsed;
use crate::{Problem, Stripe, Task};

/// Each lesson's task, by path. A stripe, and the setup, belong to one class
/// only; for a release (`complete`), every stripe belongs to one.
pub fn tasks(
    lessons: &[Parsed],
    course: &CourseFile,
    complete: bool,
    errors: &mut Vec<Problem>,
) -> BTreeMap<String, Task> {
    let mut tasks = BTreeMap::new();
    let mut taken: BTreeMap<(String, u32), &str> = BTreeMap::new();
    let mut setup: Option<&str> = None;
    for lesson in lessons {
        let path = lesson.path.as_str();
        let task = match task(lesson, course) {
            Ok(task) => task,
            Err(messages) => {
                errors.extend(messages.into_iter().map(|message| problem(path, message)));
                continue;
            }
        };
        match &task {
            Task::Stripes { belt, stripes } => {
                for stripe in stripes {
                    match taken.entry((belt.clone(), stripe.number)) {
                        Entry::Occupied(other) => errors.push(problem(
                            path,
                            format!(
                                "the {belt} belt's stripe {} is already the task of {}",
                                stripe.number,
                                other.get()
                            ),
                        )),
                        Entry::Vacant(free) => {
                            free.insert(path);
                        }
                    }
                }
            }
            Task::Setup => match setup {
                Some(other) => errors.push(problem(
                    path,
                    format!("the setup is already the task of {other}"),
                )),
                None => setup = Some(path),
            },
            Task::Drill { .. } => {}
        }
        tasks.insert(lesson.path.clone(), task);
    }
    if complete {
        for belt in &course.belts {
            let titles = belt
                .phases
                .iter()
                .filter_map(|id| course.phase(id))
                .flat_map(|phase| &phase.stripes);
            for (number, title) in (1..).zip(titles) {
                if !taken.contains_key(&(belt.id.clone(), number)) {
                    let message = format!(
                        "the {} belt's stripe {number} ({title}) isn't the task of any class",
                        belt.id
                    );
                    errors.push(problem(course::PATH, message));
                }
            }
        }
    }
    tasks
}

/// The one task a lesson's front matter sets.
fn task(lesson: &Parsed, course: &CourseFile) -> Result<Task, Vec<String>> {
    let set = [
        lesson.stripes.is_some(),
        lesson.drill.is_some(),
        lesson.setup,
    ];
    match set.iter().filter(|&&set| set).count() {
        0 => {
            return Err(vec![
                "the front matter has no task: set stripes = [1, 2] (stripes of its belt), drill = \"name\" or setup = true".into(),
            ]);
        }
        1 => {}
        _ => {
            return Err(vec![
                "the front matter sets more than one task: keep one of stripes, drill and setup"
                    .into(),
            ]);
        }
    }
    if lesson.setup {
        return Ok(Task::Setup);
    }
    if let Some(name) = &lesson.drill {
        return if is_drill_name(name) {
            Ok(Task::Drill { name: name.clone() })
        } else {
            Err(vec![format!(
                "drill = {name:?} isn't a drill name: use lowercase letters, digits and -"
            )])
        };
    }
    stripes(
        lesson.stripes.as_deref().unwrap_or_default(),
        &lesson.phase,
        course,
    )
}

fn stripes(numbers: &[u32], phase: &str, course: &CourseFile) -> Result<Task, Vec<String>> {
    if numbers.is_empty() {
        return Err(vec![
            "stripes is empty: list the stripes of its belt the class adds, as stripes = [1, 2]"
                .into(),
        ]);
    }
    let Some((belt, before)) = place(course, phase) else {
        return Err(vec![format!(
            "phase {phase} isn't on a belt in course.toml, so its classes have no stripes"
        )]);
    };
    let titles = course
        .phase(phase)
        .map(|phase| phase.stripes.as_slice())
        .unwrap_or_default();
    let last = before + titles.len() as u32;
    let mut problems = Vec::new();
    let mut stripes = Vec::new();
    for (index, &number) in numbers.iter().enumerate() {
        if numbers[..index].contains(&number) {
            problems.push(format!("stripes lists stripe {number} twice"));
            continue;
        }
        let title = number
            .checked_sub(before + 1)
            .and_then(|index| titles.get(index as usize));
        match title {
            Some(title) => stripes.push(Stripe {
                number,
                title: title.clone(),
            }),
            None if titles.is_empty() => problems.push(format!(
                "stripe {number} isn't one of phase {phase}'s: it has no stripes in course.toml"
            )),
            None => problems.push(format!(
                "stripe {number} isn't one of phase {phase}'s: they're the {} belt's stripes {} to {last}",
                belt.id,
                before + 1
            )),
        }
    }
    if problems.is_empty() {
        Ok(Task::Stripes {
            belt: belt.id.clone(),
            stripes,
        })
    } else {
        Err(problems)
    }
}

/// The belt a phase is on, and how many of the belt's stripes come before it.
fn place<'a>(course: &'a CourseFile, phase: &str) -> Option<(&'a BeltFile, u32)> {
    let belt = course
        .belts
        .iter()
        .find(|belt| belt.phases.iter().any(|id| id == phase))?;
    let before = belt
        .phases
        .iter()
        .take_while(|id| *id != phase)
        .filter_map(|id| course.phase(id))
        .map(|earlier| earlier.stripes.len() as u32)
        .sum();
    Some((belt, before))
}

/// A drill's folder name in `course/drills/`: lowercase letters, digits and
/// `-`, starting with a letter.
fn is_drill_name(name: &str) -> bool {
    name.starts_with(|c: char| c.is_ascii_lowercase())
        && name
            .chars()
            .all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == '-')
}
