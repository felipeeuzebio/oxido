+++
title = "Getting started"
video = "OX9HJsJUDxA"
outline = "sha256:b28701bf8493321b9264d12d49120a30911979411f519485e9501e2e85dae077"
setup = true
+++

Your first task is to get the course running on your machine: Rust, an editor that understands Rust, and `oxido`, the small program that serves this course and runs your project's tests.

## Install Rust

Run the command from the book's [Installation](https://doc.rust-lang.org/book/ch01-01-installation.html) page, the one he uses [when he installs Rust](video:2). Then check that Cargo answers:

```console
$ cargo --version
```

If the terminal can't find it, it was opened before the install and still has the old `PATH`, which is what happens to him [when `rustc` isn't found](video:7). Open a new terminal. The page's [Troubleshooting](https://doc.rust-lang.org/book/ch01-01-installation.html#troubleshooting) section covers the rest.

## Set up your editor

Install the [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer) extension, as he does [in VS Code](video:3). Other editors can use it too: its manual says [how to set it up](https://rust-analyzer.github.io/book/other_editors.html).

> **Note:** Since the video, rust-analyzer has become the official Rust extension, so it's the first result when you search for Rust. It also comes with its language server, so VS Code no longer offers to download one.

## Start the course

Install `oxido` with Cargo, then let it create your project:

```console
$ cargo install --locked oxido
$ oxido init
```

`cargo install` builds a program and puts it where your terminal finds it; the book comes back to it in chapter 14. `--locked` builds `oxido` with the exact versions of its dependencies that it was released with. `oxido init` creates a `minisql` folder, the database you'll grow from white belt to black belt, as a git repository. It also asks whether to put the project on GitHub, which is up to you.

Run `oxido` in the `minisql` folder, and it opens the course in your browser. The course now runs from your machine, and this task is done.
