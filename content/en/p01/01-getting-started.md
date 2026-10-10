+++
title = "Getting started"
video = "OX9HJsJUDxA"
outline = "sha256:fa9e2a097146acb00146e311528157b87c002fed1aaa9c270c605f03779a9af2"
sections = [1, 2, 3, 4, 9]
+++

This series goes through [*The Rust Programming Language*](https://doc.rust-lang.org/book/), known as "the book", one chapter per video. The book is free to read online, and the videos are for those of us who would rather watch than read. This one covers [chapter 1](https://doc.rust-lang.org/book/ch01-00-getting-started.html).

## Install Rust

On the book's [Installation](https://doc.rust-lang.org/book/ch01-01-installation.html) page, copy the command from the Linux and macOS section, paste it into a terminal and press Enter. That's all it takes: when it finishes, it tells you Rust is installed.

Windows has its own steps on the same page, and if anything goes wrong, the page's [Troubleshooting](https://doc.rust-lang.org/book/ch01-01-installation.html#troubleshooting) section is the place to look.

## Set up your editor

We also want a language server, which gives the editor code completion, go to definition and refactoring. The course uses VS Code only because it's what we happen to use. In VS Code, search the Extensions tab for Rust and install [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer). In another editor, follow rust-analyzer's [setup for other editors](https://rust-analyzer.github.io/book/other_editors.html).

## Your first program

Let's start with a single Rust file, without [Cargo](https://doc.rust-lang.org/cargo/) for now. Make a folder called `hello`, move into it in the terminal, open it in your editor and create a file called `main.rs`.

At this point, rust-analyzer may complain that it can't find a workspace. That's only because the folder isn't a Cargo project, so we can ignore it.

Then type this program into `main.rs`:

```rust
fn main() {
    println!("Hello, world!");
}
```

`fn main` is the function that runs when the program starts. Inside it, `println!` prints a line. It's a macro, and a later chapter covers macros. The text can be anything you like, and the line ends with a semicolon.

Save the file. Now let's compile it with `rustc` and run the result.

```sh
rustc main.rs
./main
```

`rustc` produces an executable called `main`, and when we run it, you can see our `Hello, world!`.

With one program written, you could put Rust on your resume and start job hunting, though it may be wise to wait: Rust jobs are still scarce, even if we expect that to change.

## Cargo

A single file is fine for something this small, but real projects have many files and dependencies, and something has to manage them. For Rust, that's Cargo, its build system and package manager. In other low-level languages this is a real pain point; fortunately, Cargo comes with Rust. Let's check that it's installed.

```sh
cargo --version
```

It prints a version number, so we're ready to go.

Now let's create a project. We step back out of `hello` and give `cargo new` a name, and it creates a package in a folder of that name.

```sh
cd ..
cargo new hello_rust
```

Cargo has created our package, so let's open the `hello_rust` folder in the editor and look around.

First there's `Cargo.toml`, the package's configuration. Under `[package]` are its name, version and so on, and below that is a `[dependencies]` section, empty for now, where dependencies would go. If you've done web development, it plays the role of `package.json`.

There's also a `.gitignore`, because Cargo makes the project a git repository. You can pick a different version control system when you create a project, but git is the default.

The code lives in `src`, and `main.rs` is already there with a hello world program.

Inside a Cargo project, we build with Cargo instead of calling `rustc` directly. Let's move into the folder and build it.

```sh
cd hello_rust
cargo build
```

Now you can see two new things. `Cargo.lock` pins the exact versions of our dependencies; since we don't have any yet, there isn't much in it.

There's also a `target` folder, and inside `target/debug` is our executable, `hello_rust`, along with other build files.

Let's run it with Cargo.

```sh
cargo run
```

There's our `Hello, world!` again.

To see everything else Cargo can do, run `cargo help`.

One command worth knowing right away is `cargo check`: it checks the program for errors without producing an executable, so it's a lot faster than running it.

```sh
cargo check
```

That wraps up chapter 1.
