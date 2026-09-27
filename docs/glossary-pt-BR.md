# Portuguese glossary (pt-BR)

The words Oxidō uses in Brazilian Portuguese, so every lesson says the same thing the same way. Claude reads this file before drafting a translation (decision D23). When a translation needs a new term, add it here in the same PR.

## Rules

- Anything that appears in code stays exactly as it is written in code, as inline code: keywords (`match`, `impl`), types and traits (`String`, `Vec<T>`, `Iterator`), macros (`println!`), and crate and command names (`cargo`, `clippy`).
- Translate what Bogdan means, in his order. Don't translate word for word, and don't add or drop points.
- Code comments may be translated. Identifiers, string literals and program output never are, even when they're English words (`db > `, `Executed.`).

## Terms

| English | pt-BR | Notes |
|---|---|---|
| belt | faixa | white, yellow, orange, green, blue, purple, brown, black: faixa branca, amarela, laranja, verde, azul, roxa, marrom, preta |

## To decide before the first translated lesson

These are suggestions for the maintainer to confirm or change. Move each one into the table above once it's decided.

| English | Suggestion | Why, and the alternatives |
|---|---|---|
| addressing the student | você | informal but not slangy, like the English text |
| stripe | grau | what Brazilian jiu-jitsu calls the stripes on a belt ("faixa azul, dois graus"); *listra* is the literal word |
| lesson, class | aula | |
| build step | etapa do projeto | the step where minisql gains a feature |
| quiz | quiz | common in Brazilian Portuguese; *questionário* is more formal |
| ownership | ownership | Rust material in Portuguese often keeps it; *posse* is the literal word |
| borrowing, to borrow | empréstimo, pegar emprestado | |
| borrow checker | borrow checker | |
| lifetime | lifetime | *tempo de vida* is the literal translation |
| reference | referência | |
| trait, crate, closure, slice, thread | kept in English | no common translation; *fatia* (slice) and *fechamento* (closure) are rare |
| smart pointer | ponteiro inteligente | |
| pattern matching | pattern matching | *correspondência de padrões* is the literal translation |
