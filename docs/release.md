# Releases

## Versioning

Versions follow SemVer and come from Conventional Commits through release-please:

- `fix:` → patch (0.1.0 → 0.1.1)
- `feat:` → minor (0.1.0 → 0.2.0); before 1.0, breaking changes also bump the minor version
- `feat!:` or a `BREAKING CHANGE:` footer → major, once past 1.0

The version lives in `package.json` and `crates/oxido/Cargo.toml` (the `oxido` package students install); release-please updates both. `oxido-core` stays at `0.0.0` because it isn't published on its own.

## Flow today

1. Merge PRs into `main` as usual.
2. release-please opens or updates a PR named `chore(main): release x.y.z` with the changelog.
3. Merge that PR when you want to ship. release-please tags `vX.Y.Z` and creates the GitHub Release.

## How students will install `oxido` (P11)

| Path | Command | Notes |
|---|---|---|
| Main | `cargo install oxido` | compiles on the student's machine with the toolchain they installed in class 1; the first build takes a minute or two |
| Fast | `cargo binstall oxido` | downloads a prebuilt binary from the GitHub Release |

To get there:

- **crates.io.** `oxido` embeds the frontend at compile time, so the published crate must contain the built UI. The release job runs `bun run build`, copies `build/client` into the crate, points the `rust-embed` folder at it and runs `cargo publish`. Needs a `CARGO_REGISTRY_TOKEN` secret.
- **Release settings.** Our `[profile.release]` (size-optimized, LTO, one codegen unit, abort on panic, stripped) lives in the workspace's root `Cargo.toml`, and Cargo doesn't publish it: a published package only keeps profiles from its own manifest, and `cargo install` then builds with Rust's defaults. A copy in `crates/oxido/Cargo.toml` would survive publishing but makes every local build warn that it's ignored, so the release job copies the section into the crate's manifest just before `cargo publish`, and checks the packaged manifest for it. Measured on a clean 2-core build: our settings take 92 s and give a 3.6 MB binary; the defaults take 102 s for 7.3 MB. cargo-dist builds from the repository, so its binaries already use our settings.
- **Prebuilt binaries.** cargo-dist (`dist init`) generates the workflow that builds `oxido` for Windows, macOS (Apple Silicon and Intel) and Linux (x64 and ARM64) and attaches the archives to each release, with the metadata `cargo binstall` looks for.

Building on the student's machine with `cargo install` also avoids operating system warnings about unsigned downloads. Tools like `cargo binstall` usually don't trigger them either, unlike binaries downloaded through a browser.
