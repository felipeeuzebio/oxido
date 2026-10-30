+++
title = "Hello, Cargo"
video = "helloVideo1"
outline = "sha256:36612c1e11fa2ac4ac56f9eb43bd06fb97e043c30ee0b9f5b621177e33ed8ef1"
stripes = [1, 2]
+++

Cargo builds and runs a project. A tag like <b>this</b> stays plain text. Watch [the demo](video:2) first.

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
