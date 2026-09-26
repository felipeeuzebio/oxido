# Releases

## Versioning

Versions follow SemVer and come from Conventional Commits through release-please:

- `fix:` → patch (0.1.0 → 0.1.1)
- `feat:` → minor (0.1.0 → 0.2.0); before 1.0, breaking changes also bump the minor version
- `feat!:` or a `BREAKING CHANGE:` footer → major, once past 1.0

The version lives in `package.json` and `crates/oxido/Cargo.toml` (the `oxido` package students install); release-please updates both. `oxido-core` stays at `0.0.0` because it isn't published on its own.

## Flow today

1. Merge PRs into `main` as usual.
2. release-please opens or updates a PR named `chore(release): release x.y.z` with the changelog (the title pattern is set in `release-please-config.json`, because its default scope, `main`, isn't one of ours).
3. Merge that PR when you want to ship. release-please tags `vX.Y.Z` and creates the GitHub Release.

## Minimum Rust

`rust-version` in the root `Cargo.toml` (1.90) is the oldest Rust that `oxido` builds with; with an older one, `cargo install` stops with a message naming the version it needs. Three things keep that promise true:

- CI's `Rust minimum version` job runs `cargo check` on the whole workspace with exactly that version. Dependabot doesn't know our minimum, so this job is what stops an update that needs a newer Rust.
- clippy's `incompatible_msrv` lint, on in every clippy run, flags standard library functions newer than `rust-version`.
- Cargo's resolver picks dependency versions that support `rust-version` when it updates `Cargo.lock`. Today the most demanding dependencies need 1.85.

`oxido doctor` holds the student's own Rust to the same number, so the course and `oxido` never disagree about the minimum. Raise it on purpose, in its own PR, when there's a reason to.

## How students will install `oxido` (P11)

| Path | Command | Notes |
|---|---|---|
| Main | `cargo install --locked oxido` | compiles on the student's machine with the toolchain they installed in class 1; the first build takes a minute or two |
| Fast | `cargo binstall oxido` | downloads a prebuilt binary from the GitHub Release |

Every `cargo install` instruction says `--locked`. With it, cargo builds with the exact dependency versions in the `Cargo.lock` that CI tested, which `cargo publish` puts in the crate. Without it, cargo picks the newest compatible version of every dependency on the day the student installs, so a dependency's release can break or change `oxido` after we shipped it.

To get there:

- **crates.io.** `oxido` embeds the frontend at compile time, so the published crate must contain the built UI. The release job runs `bun run build`, copies `build/client` into the crate, points the `rust-embed` folder at it and checks that the packaged crate lists `Cargo.lock` (`cargo package --list`), and runs `cargo publish`. Needs a `CARGO_REGISTRY_TOKEN` secret.
- **Release settings.** Our `[profile.release]` (size-optimized, LTO, one codegen unit, abort on panic, stripped) lives in the workspace's root `Cargo.toml`, and Cargo doesn't publish it: a published package only keeps profiles from its own manifest, and `cargo install` then builds with Rust's defaults. A copy in `crates/oxido/Cargo.toml` would survive publishing but makes every local build warn that it's ignored, so the release job copies the section into the crate's manifest just before `cargo publish`, and checks the packaged manifest for it. Measured on a clean 2-core build: our settings take 92 s and give a 3.6 MB binary; the defaults take 102 s for 7.3 MB. cargo-dist builds from the repository, so its binaries already use our settings.
- **Prebuilt binaries.** cargo-dist (`dist init`) generates the workflow that builds `oxido` for Windows, macOS (Apple Silicon and Intel) and Linux (x64 and ARM64) and attaches the archives to each release, with the metadata `cargo binstall` looks for.

Building on the student's machine with `cargo install` also avoids operating system warnings about unsigned downloads. Tools like `cargo binstall` usually don't trigger them either, unlike binaries downloaded through a browser.
