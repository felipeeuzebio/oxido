# minisql: the students' project

A small SQL database that students build across the whole course, one belt at a time. The phase-by-phase plan is in [docs/roadmap-course.md](../../docs/roadmap-course.md).

This folder is filled in during platform phase P8. Planned layout:

```
course/minisql/
├── oxido.toml       copied into every student project; marks it for oxido
├── belts/
│   ├── 01-white/
│   │   ├── starter/     code the student starts this belt from
│   │   ├── solution/    reference solution
│   │   └── tests/       the belt test suite, one file per stripe
│   ├── 02-yellow/
│   └── ...
└── README.md
```

Rules:

- Each belt's solution uses only what the videos have taught up to that phase.
- Each belt's solution passes its belt tests, and its starter fails them. CI checks both.
- The starter of belt N+1 is the solution of belt N.
