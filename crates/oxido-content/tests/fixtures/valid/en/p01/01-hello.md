+++
title = "Hello, Cargo"
video = "helloVideo1"
outline = "sha256:030f10cc4e0795125116a779910427846e40f0e081af4845bd7916b92a966858"
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
