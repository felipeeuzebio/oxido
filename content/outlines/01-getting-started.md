+++
video = "OX9HJsJUDxA"
title = "ULTIMATE Rust Lang Tutorial! - Getting Started"
+++

1. [00:28] This series goes through *The Rust Programming Language*, "the book", one chapter per video. The book is free online, and the videos go with it for people who learn better from video. This video is chapter 1.
   - Aside: he counts himself among those people; he'd rather watch than read.
2. [00:52] Install Rust by running the command from the Linux and macOS section of the book's installation page in a terminal. It ends with a message saying Rust is installed. Windows has its own steps on the same page.
   - Aside: he makes it sound effortless: paste it, press Enter, done.
3. [01:23] A language server gives the editor code completion, go to definition and refactoring. He uses VS Code, and says that's just what he happens to use. There, search the Extensions tab for Rust and install rust-analyzer, the second result, since the first one, the official Rust extension, is about to be deprecated.
   - Note: out of date. rust-analyzer is the official extension now and the first result, so the lesson just says to install rust-analyzer.
4. [01:57] Demo: a program without Cargo. He makes a folder, moves into it in the terminal, opens it in VS Code and creates `main.rs` in it.
5. [02:17] VS Code may offer to download the language server; accept. rust-analyzer may then complain that it can't find a workspace. That's only because the folder isn't a Cargo project; ignore it.
   - Note: out of date. The rust-analyzer extension now includes its language server, so VS Code no longer offers to download it. The lesson leaves the offer out and keeps the workspace complaint.
6. [02:41] `fn main` is the function that runs when the program starts. Inside it, `println!` prints a line. It's a macro, which a later chapter covers. The text can be anything (he prints the channel's name), and the line ends with a semicolon. He saves the file.
7. [03:08] `rustc main.rs` compiles the file. Demo: it fails the first time because the terminal can't find `rustc`. The terminal was open before the install, so its PATH is stale; a new terminal fixes it.
   - Note: the lesson leaves this failure out, since few students will hit it; the book's installation page, which the lesson links, covers it under Troubleshooting.
8. [03:36] Compiling produces an executable called `main`, and running it prints the text.
   - Aside: a quick "great" when it works, then a joke: with one program written, you can put Rust on your resume and go job hunting. He takes it back right away, since Rust jobs are scarce for now, though he expects that to change.
9. [03:54] One file is fine for a tiny program, but real projects have many files and dependencies, and something has to manage that. Rust comes with Cargo, its build system and package manager. In other low-level languages this is a pain point; Rust has it built in.
   - Aside: he sounds relieved about it: lucky us, it comes with Rust.
10. [04:20] `cargo --version` checks that Cargo is installed.
   - Aside: a quick "great" when the version shows up.
11. [04:34] `cargo new` with a name creates a new package in a folder of that name.
   - Aside: another "great" when Cargo makes it, and he opens it in VS Code to look around.
12. [04:54] `Cargo.toml` is the package's configuration: name, version and so on, then a dependencies section, empty for now, where dependencies would be listed. For web developers, it's `package.json`.
13. [05:17] There's a `.gitignore` because Cargo makes the project a git repository. A different version control system can be set when creating the project, but git is the default.
14. [05:34] The `src` folder holds the code, with a `main.rs` that already has the hello world program.
15. [05:44] Demo: inside the project, `cargo build` replaces `rustc`. It creates `Cargo.lock`, which pins the exact dependencies (sparse for now, with none), and a `target` folder whose `debug` folder has the executable and other build files.
16. [06:16] `cargo run` runs the program and prints hello world.
17. [06:23] `cargo help` lists the other commands. `cargo check` checks the program for errors without producing an executable, which is a lot faster than running it.
   - Aside: he wraps up by calling chapter 1 done.

## Introduces

- rust-analyzer
- `fn main`
- `println!` with a line of text
- `rustc`
- `cargo --version`, `cargo new`, `cargo build`, `cargo run`, `cargo help` and `cargo check`
- `Cargo.toml` with `[package]` and `[dependencies]`
- `Cargo.lock`
- `src/main.rs` and `target/debug/`
