// Conventional Commits for oxido. The scope list is documented in
// docs/conventions.md; keep the two in sync.

/** Platform (the app) */
const platform = [
  "server", //   crates/oxido: the oxido binary, its HTTP API and CLI
  "core", //     crates/oxido-core (pure logic: no I/O)
  "ui", //       shared React components, layout, theming
  "roadmap", //  home screen: belts, phases, "Continue"
  "lesson", //   lesson page: video player + text lesson
  "quiz", //     quiz engine and results page
  "notes", //    video and paragraph notes
  "progress", // progress tracking and export/import
  "storage", //  SQLite store (oxido) and browser storage (website)
  "editor", //   CodeMirror editor and the clippy runner
  "grader", //   build steps: running a belt's provided tests
  "i18n", //     translation checks, language switching, interface text
  "web", //      the hosted website (GitHub Pages) specifics
];

/** Course content */
const content = [
  "compiler", // crates/oxido-content and cargo xtask: the content compiler and its commands
  "content", // lessons, their outlines, quizzes and course.toml
  "minisql", // the Mini SQL project: reference solutions and belt tests
];

/** Repository and tooling */
const repo = ["ci", "release", "deps", "hooks", "agents", "config"];

export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "scope-enum": [2, "always", [...platform, ...content, ...repo]],
    // Scope is optional, e.g. "docs: fix typo in README" is fine.
    "scope-empty": [0],
    "subject-case": [2, "never", ["sentence-case", "start-case", "pascal-case", "upper-case"]],
    "body-max-line-length": [1, "always", 100],
  },
};
