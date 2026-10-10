+++
title = "Hello, Cargo"
video = "helloVideo1"
outline = "sha256:dccd19568119a9c648758d964f8dd15024c49c7dae683b7183559f720d2ca7be"
sections = [1, 2, 3]
+++

Cargo builds and runs a project. A tag like <b>this</b> stays plain text.

## Your first program

```rust
fn main() {
    let name = "minisql";
    if name.len() > 3 {
        println!("hello, {name}! {}", 42);
    }
}
```

```rust compile_fail
let count: i32 = "three";
```

```toml
[package]
name = "minisql"
```

Read about [shadowing](02-variables.md#shadowing) next, or the [Rust Book](https://doc.rust-lang.org/book/).

## Your first program

Run it with `cargo run`, then *try* **again**.
