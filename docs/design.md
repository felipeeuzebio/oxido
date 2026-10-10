# Design

The name and the look come from the same two places. Oxidō is *oxide* (rust) plus *-dō*, "the way," as in judo, aikido and kendo. The look comes from a dojo and a forge: martial arts give the structure (belts, stripes, the quiet of a training hall), and Rust gives the material (iron, oxide, heat).

Write the name with the macron, Oxidō, wherever people read it (UI, docs, the terminal). Identifiers stay plain ASCII: the `oxido` crate and command, `.oxido/`, `oxido:theme`.

The UI is built with [shadcn/ui](https://ui.shadcn.com) on Tailwind CSS v4, themed with these colors. Everything lives in one stylesheet, [`web/app/app.css`](../web/app/app.css): the variables for both themes use shadcn/ui's names, and `@theme inline` turns them into Tailwind classes (`bg-card`, `text-muted-foreground`, `bg-success-muted`, `bg-belt-orange`). Components use those classes and never hard-code colors. Two tests guard this: `tokens.test.ts` (both themes define the same variables, and Tailwind knows every one) and `raw-colors.test.ts` (no hex, `rgb()` or raw Tailwind palette colors in our `.tsx` components).

## Logo

The logo is Ferris the crab in a black ninja hood, headband tails flying: Rust's crab, dressed for the dojo. It's drawn on Karen Rustad Tölva's "cuddly Ferris" from [rustacean.net](https://rustacean.net), which she released into the public domain (CC0); the hood, mask and sleeves were added for Oxidō.

The logo stands alone. There is no wordmark next to it: the name Oxidō is the page title (the browser tab) and appears in text where it's needed. In the app the logo sits at the top left and links home.

| File | What it is | Use |
|---|---|---|
| `docs/brand/logo.svg` | the SVG as delivered, untouched | the source; make every other file from it |
| `web/public/logo.svg` | the same drawing, optimized with SVGO (22 KB), viewBox cropped to the art | the app header, the website, the README, the design canvas |
| `web/public/logo-on-dark.svg` | `logo.svg` with a light rim, sized for about 200px wide | the README in GitHub's dark mode |
| `web/public/favicon.svg` | `logo.svg` that adds a light rim when the browser is in dark mode | the browser tab |
| `web/public/favicon.png` | 64×64, transparent | the tab icon for browsers without SVG icons (older Safari) |
| `web/public/apple-touch-icon.png` | 180×180 on `#f4f1e8` | phone home screens, which don't do transparency |

The optimized SVGs drop the source's 4.17× scale wrapper and use the drawing's own units, which also fixes a leg the source's viewBox clipped on the left. The rim is a `feMorphology` dilate filter, so its width is in drawing units: 9 for README size, 30 for the tab icon. The PNGs are rendered from `logo.svg` in Chromium.

Rules:

- **Give the hood a rim on dark backgrounds.** The hood is nearly black and vanishes into Forge's charcoal. In the app, `BrandMark` adds a 1px `drop-shadow` in `--muted-foreground` under `.dark` (the app's theme can differ from the system's, so an in-SVG media query won't do); outside the app, use `logo-on-dark.svg`. This is the one `dark:` treatment on an image, and it uses a token, not a color.
- **Keep it at 32px tall or more.** The app header shows it at 40px. The 16px tab icon is the only smaller use.
- **Don't recolor, outline, crop, rotate or stretch it**, don't add the name beside it, and don't put it on a photo or a pattern.
- **Alt text:** "Oxidō". The logo is the only thing that names the site on the page, so it isn't decorative.

## Themes

The app has a light theme and a dark theme, and one button switches between them. Until a student presses it, the app follows the operating system, and keeps following it when it changes; that "system" default is internal and has no button of its own. Pressing the toggle switches to the other theme and saves it, and from then on the system setting no longer matters.

`web/app/features/theme/theme.ts` keeps the choice (per browser, key `oxido:theme`) and puts the `dark` class on `<html>`; an inline script in `<head>` (from `web/app/root.tsx`) does the same before first paint. Tailwind's `dark:` variant follows that class. The toggle is `web/app/features/theme/ThemeToggle.tsx`: a toggle button named "Dark theme" with `aria-pressed`, showing a sun in the light theme and a moon in the dark one. Its icons switch on the `dark` class, not on React state, so the first paint is right. `oxido` always uses port 7878 by default so the browser remembers the choice between launches.

### Dojo (light)

| Variable | Hex | Where it comes from |
|---|---|---|
| `--background` | `#f4f1e8` | unbleached gi cotton |
| `--card`, `--popover`, `--sidebar-accent` | `#fffdf8` | washi paper |
| `--secondary`, `--muted`, `--accent`, `--sidebar` | `#e9e3d0` | tatami straw (rail, toggle tracks, hover) |
| `--foreground` | `#1a1916` | sumi ink |
| `--muted-foreground` | `#57534a` | diluted ink |
| `--primary`, `--sidebar-primary` | `#c04218` | iron oxide: the rust itself; also the band along the rail, like the cloth edge of a tatami mat |
| `--sidebar-current` | `#b23301` | the same rust a little darker, for the current page's icon and label on the rail |
| `--primary-muted`, `--primary-muted-foreground` | `#fbddd4`, `#832d11` | the rust as a soft tint, and text on it |
| `--info`, `--ring` | `#243f6b` | aizome indigo, the dye of a judo gi: info callouts, timestamps and focus rings |
| `--success` | `#2f6a3b` | bamboo |
| `--destructive` | `#a11d2e` | hanko seal red, darker than the rust so the two never blur |
| `--warning` | `#7a5200` | brass |

### Forge (dark)

| Variable | Hex | Where it comes from |
|---|---|---|
| `--background` | `#121110` | charcoal |
| `--card`, `--popover`, `--sidebar-accent` | `#1b1a18` | cooled iron |
| `--secondary`, `--muted`, `--accent`, `--sidebar` | `#23211e` | the rail |
| `--foreground` | `#efebe3` | a white gi under low light |
| `--primary`, `--sidebar-primary`, `--sidebar-current` | `#ec6a44` | ember; buttons use dark text on it, and it's the rail's edge and the current page's icon and label |
| `--primary-muted`, `--primary-muted-foreground` | `#3b1d14`, `#feb29c` | ember as a soft tint, and text on it |
| `--info`, `--ring` | `#9db4e0` | moonlit indigo |
| `--success` | `#7cc08a` | new bamboo |
| `--destructive` | `#f2868f` | seal red, lifted for the dark |
| `--warning` | `#e5b45a` | brass in firelight |

Naming follows shadcn/ui: `name` is a surface and `name-foreground` is text on it. Ours adds `--sidebar-current` for the rail's current page, `-muted` tints for soft badges and callouts (`bg-success-muted text-success`, `bg-primary-muted text-primary-muted-foreground`), `--subtle-foreground`, `--border-strong`, the code colors and the belts. shadcn's `--accent` is the hover surface, so the indigo lives in `--info`.

Every text and background pair used in the UI meets WCAG AA (4.5:1). The lowest are `--subtle-foreground` on `--background` (5.05:1 light, 5.82:1 dark) and success text on its tint (5.29:1 light). Focus outlines use `--ring` at full strength rather than shadcn's default 50%, so they stay above 3:1. The rail's rust edge is 4.1:1 against the rail in Dojo and 5.1:1 in Forge: enough for a line (3:1), not for text, so the current page's label uses `--sidebar-current` (4.86:1 in Dojo, 5.13:1 in Forge), which `tokens.test.ts` checks.

The rust is one color in both themes. In OKLCH, Dojo's `#c04218` and Forge's `#ec6a44` share hue 37° (Ferris's own orange, next to the logo's red) and chroma 0.17; only the lightness differs (0.55 and 0.68), because each has to hold its text: white on Dojo's rust at 5.2:1, dark on Forge's at 6.1:1. The tints use the same hue. Keep it that way when a rust value changes: move the lightness, not the hue.

## Components

Build from shadcn/ui components before writing custom markup, and restyle them only through these variables, never with color classes on the component. They live in `web/app/components/ui/` as generated code: add or update them with the CLI, don't hand-edit them (Biome skips that folder). `components.json` is set up (style new-york, Lucide icons, `@/` aliases); don't run `init` again, because it would rewrite `web/app/app.css`.

```sh
bunx --bun shadcn@latest add toggle-group toggle button card badge collapsible alert separator \
  progress tabs resizable sheet tooltip checkbox field scroll-area skeleton breadcrumb item dropdown-menu
```

Run `add` in `web/`, where `components.json` is. If it writes `:root` or `.dark` color variables into `web/app/app.css`, delete them: the colors are already there. The CLI can leave a package it imports uninstalled (it skipped `class-variance-authority` once), so run `bun run check` after it. Generated components import `cn` from shadcn's `cn` package, which `@/lib/utils` re-exports for our own code. `Tooltip` needs a `TooltipProvider` at the root, added with the first tooltip. Quiz results are still plain markup shaped like the components they become, with a comment naming them, until the quiz page moves them over.

`Badge` and `Alert` get our tinted variants, with `cva`, in their own files, `web/app/components/badge.tsx` and `alert.tsx`, which wrap the generated components (shadcn's "add a variant" route, without touching the generated code). Import them from there, not from `ui/`: `success` (`bg-success-muted text-success`), `destructive-muted` (`bg-destructive-muted text-destructive`), `info` (`bg-info-muted text-info`), `warning` (`bg-warning-muted text-warning`) and `primary-muted` (`bg-primary-muted text-primary-muted-foreground`); on `Alert`, a `border-*/25` of the same color.

| Screen part | Component | Keeps |
|---|---|---|
| Search | `Button` (`variant="ghost"`, `size="icon-lg"`) with lucide's `Search` icon, named "Search", with `aria-keyshortcuts` for Ctrl+K and ⌘K | the first quiet icon at the foot of the rail, opening the command palette |
| Theme toggle | `Button` (`variant="ghost"`, `size="icon-lg"`) with `aria-pressed`, a sun or a moon | a quiet icon under Search at the foot of the rail |
| Command palette | `Dialog` holding `Command` (cmdk), loaded the first time it opens; groups for pages, each phase's lessons and the theme | shadcn's look in our colors; not shadcn's `CommandDialog`, whose title sits outside the dialog |
| Language picker | `Button` (`variant="ghost"`, `size="icon-lg"`) with lucide's `Languages` icon, named "Language: English" (the current language), opening a `DropdownMenu` of languages | a second quiet icon under the theme toggle |
| Page headers | `Breadcrumb` above the `h1` for where you are (Roadmap › Phase 3 › Class 3.4) | the serif page title |
| Quiz results | `Card` for the score (the score is its title, the actions sit in `CardAction`), a `Card` of `Item` rows for the questions with a `Badge` verdict each, `Collapsible` with a `Button variant="link"` to reveal the answer, an `Alert` (`success`) for it | bamboo and seal-red verdicts, the answer on a bamboo tint |
| Lesson | YouTube's own player behind a facade (no player library, decision D16), with a strip under it for the saved position (`Progress`) and note markers; nothing is drawn over the player. `ToggleGroup` (`variant="outline"`, joined) for Video / Both / Text, remembered in `oxido:view`, over one two-column grid rather than `Resizable` panels (decision D33), `Breadcrumb` for Roadmap › Phase › Class, `Card` for the video notes and the text lesson, `Sheet` for all notes, `Button` with a `Badge` count for Notes | video left, text right; below `lg`, video above text, pinned to the top once it plays |
| Build step | `Card` + `Field` checkboxes for the tasks, `Alert` (`info`) for the chapter note, a status line (watching the folder, when tests and clippy last ran), a `Card` with `Tabs` for Tests / Problems / Output (counts as `Badge`s), `Badge` for pass / fail, and file links (`src/table.rs:24`) that open VS Code at that line. Students write minisql in their own editor, so there's no in-app editor and no reset button; the page shows results live | clippy snippets in the code colors, output in VS Code's terminal colors (see Code) |
| Quiz code question | CodeMirror 6 (lazy-loaded) in a `Card`, `Button` to check, `Alert` for clippy's messages | VS Code's colors (see Code) |
| Roadmap | `Card` for the continue card (title, description, actions, and the next stripe; the video and text `Progress` bars come with progress tracking) and the phases, `Badge` for status | the progress view is one long belt (see Belts); belt strips, stripes and seals stay custom |

### Sizes and shapes

The canvas draws components at shadcn/ui's own sizes, so building them changes nothing. With `--radius: 0.75rem`:

| Part | Size | Radius |
|---|---|---|
| `Button`, `Toggle` | 36px tall (`default`); 40px for `lg` and `icon-lg`; 32px for `sm`. Labels 14px, medium weight | `rounded-md`, 10px |
| `Badge` | 12px, medium weight, 2px × 8px padding | pill |
| `Item`, `Popover` | 16px padding (`Item size="sm"`: 12px × 16px) | `rounded-md`, 10px |
| `Alert`, `TabsList` | 12px × 16px padding, 16px icon | `rounded-lg`, 12px |
| `Card` | 24px padding and 24px between header, content and footer; `shadow-sm` | `rounded-xl`, 16px |
| `Progress` | 8px tall, the track is `--primary` at 20% | pill |

Labels and button text are medium weight (500), never bold; bold is for headings and names. `CardTitle` is semibold serif: shadcn's `CardTitle` is a `div`, so one rule in `app.css` on `[data-slot="card-title"]` gives it the heading face and no component carries a typography class. Page context goes in a `Breadcrumb`, not in a tracked ALL-CAPS label above the title, and metadata is written as a sentence ("Phase 3, Organize and Persist, book chapter 8"), not joined with "·".

The navigation stays a custom rail (icon over label, 92px, the rust tatami edge) rather than shadcn's `Sidebar`, whose collapsed mode is icon-only; it was chosen over a syllabus sidebar or a class outline (decision D20). It uses the `--sidebar-*` colors: the rail is `--sidebar` (tatami) and its 4px edge is `--sidebar-primary` (rust), one plain line from top to bottom. Rail items are links styled with semantic classes, with no tile or background behind them. The current page's icon and label turn `--sidebar-current` and bold (the icon's stroke goes from 1.8 to 2.2), while the others stay `--muted-foreground`; `aria-current="page"` carries the meaning for screen readers. `--sidebar-current` is the edge's rust made readable as text on the rail: the same value in Forge, a little darker in Dojo (`#b23301`, with the same hue), because the edge's `#c04218` is only 4.1:1 on the rail. Nothing is added to the edge beside the current page: a notch, the edge growing into a tab there, was tried in several shapes and set aside for this (decision D20). Hover darkens the label to `--foreground`; keyboard focus gets the usual `--ring` outline around the item. Search (lucide's `Search` icon), the theme toggle (a sun or a moon) and the language picker (lucide's `Languages` icon) sit at the rail's foot as ghost icon buttons, 40px (`icon-lg`) with 22px icons at stroke 1.8, the same as the rail's links. That's a deliberate exception to Button's default 16px icons, so these icons carry a `size-5.5` class. The design canvas's "Options: menu items" board keeps the three looks that weren't chosen, and "Options: current menu item" keeps A1, the ink label with the notch.

The rail lists one item per page that exists, in the canvas's order (Kickoff, Roadmap, Lesson, Build, Quizzes). For now that's Roadmap (lucide's `Map`) and Lesson (`TvMinimalPlay`), which opens the first lesson until progress tracking can open the current one. Kickoff (`Flag`), Build (`CodeXml`) and Quizzes (`ListChecks`) join when their pages land, and the language picker joins the theme toggle with translations. On phones, below Tailwind's `md` breakpoint, the rail becomes a tab bar along the bottom (decision D30): the same items, icon over label, with the rust edge along its top, and the logo, Search and the theme toggle sit in a bar above the page. The code is in `web/app/features/rail/`.

Rules from the shadcn/ui guide that apply everywhere:

- Option sets of 2 to 7 choices use `ToggleGroup`; related checkboxes use `FieldSet` + `FieldLegend`.
- Full `Card` composition (`CardHeader`, `CardTitle`, `CardDescription`, `CardAction`, `CardContent`, `CardFooter`).
- Lists of rows use `ItemGroup` + `Item`, with `ItemSeparator` between them.
- `Badge` for status labels and counts, `Alert` for callouts, `Separator` for dividers, `Skeleton` for loading, `Progress` for progress bars, `Breadcrumb` for page context.
- Links that act like buttons use `Button` (`asChild` around the `<a>`); a reveal or "show more" uses `variant="link"`.
- `Dialog` and `Sheet` always have a title (visually hidden if needed).
- Layout with `flex` / `grid` and `gap-*`, never `space-x-*` / `space-y-*`; `size-*` when width and height match; `cn()` for conditional classes.
- Icons from `lucide-react`; inside buttons they get `data-icon="inline-start"` or `"inline-end"` and no size classes.
- No manual `dark:` color overrides and no `z-index` on overlays.

## Belts

Belt colors are variables too (`--belt-white` ... `--belt-black`, classes `bg-belt-*`), slightly lifted in the dark theme so green, blue, purple and brown stay visible on charcoal. A belt always appears with its name, never as color alone.

Stripes are drawn as short bars under the belt, filled with `--foreground` when earned. An earned belt shows a small square "seal" in `--destructive` red, the way a certificate gets stamped.

The Roadmap shows progress as one long belt (option P2 on the design canvas, decision D20): the eight belts joined end to end in one strip, each as wide as its stripe count, so the path shows its own proportions. Under each belt sit its stripe bars, its name and "2 of 5"; above it, the seal once it's earned, or "You are here" in `--primary-muted-foreground` over the current belt, whose next stripe bar is `--primary`. It's an ordered list with one item per belt, and each item reads as one sentence to screen readers ("Orange belt: 2 of 5 stripes, you are here"); the colored strip and the bars are hidden from them. Below `lg`, on phones and tablets, the belt stands up and reads top down (decision D31): each belt is as tall as its stripe count, with its name, count, mark and stripe bars beside it. From `lg` on, each belt's count sits under its name. The code is in `web/app/features/roadmap/`.

Under the belt, one card per phase gives its number and chapters, its title, the `summary` from `course.toml`, its belt and stripe count, and a status `Badge`: "Done" (`success`), "Up next" or "In progress" for the phase with the next stripe (`primary-muted`, the card outlined in `--primary`), or "Not started". The Continue card above the belt opens the first lesson of that phase and names the next stripe; once progress tracking lands, it opens the lesson the student last had open.

## Code

Code looks like it does in VS Code, the editor most students use, so a lesson's code reads like the code in their own editor (decision D21). The colors are VS Code's Light Modern in Dojo and Dark Modern in Forge, as rust-analyzer colors Rust; they don't follow the Dojo and Forge palette. The font stays JetBrains Mono. Lesson code blocks, the quiz code editor (CodeMirror) and test output all use these variables, which the content compiler's highlighting classes (arborium, P1) and the CodeMirror theme (P7) map onto.

| Variable | Dojo | Forge | Colors |
|---|---|---|---|
| `--code` | `#ffffff` | `#1f1f1f` | the code surface |
| `--code-foreground` | `#3b3b3b` | `#cccccc` | plain code, punctuation |
| `--code-border` | `#e5e5e5` | `#2b2b2b` | the block's edge, tab and panel dividers |
| `--code-panel` | `#f8f8f8` | `#181818` | terminal and test output |
| `--code-muted-foreground` | `#616161` | `#9d9d9d` | panel labels, inactive tabs |
| `--code-gutter` | `#6e7681` | `#6e7681` | line numbers (decorative) |
| `--code-keyword` | `#0000ff` | `#569cd6` | `fn`, `let`, `pub`, `mut`, `self`, `use` |
| `--code-control` | `#af00db` | `#c586c0` | `if`, `for`, `in`, `match`, `return` |
| `--code-type` | `#267f99` | `#4ec9b0` | types, traits, primitives, paths like `std::collections` |
| `--code-function` | `#795e26` | `#dcdcaa` | functions, methods, macros (`println!`) |
| `--code-variable` | `#001080` | `#9cdcfe` | variables, parameters, fields |
| `--code-constant` | `#0070c1` | `#4fc1ff` | enum variants (`Some`, `None`), constants |
| `--code-string` | `#a31515` | `#ce9178` | strings (a `{name}` inside a format string is a variable) |
| `--code-number` | `#098658` | `#b5cea8` | numbers |
| `--code-comment` | `#008000` | `#6a9955` | comments and doc comments |
| `--code-pass`, `--code-fail` | `#008000`, `#cd3131` | `#0dbc79`, `#f14c4c` | test results and errors in output |
| `--code-warning` | `#bf8803` | `#cca700` | clippy's wavy underline |

Syntax colors go on `--code` only: on `--code-panel` the Dojo type and number colors fall just under 4.5:1. Everything else passes WCAG AA where it's used (the lowest are Dojo's type and number colors, at 4.59:1 and 4.60:1), and a test in `tokens.test.ts` checks it. Blocks have a 1px `--code-border` and the usual 12px corners. Quiz code in CodeMirror has line numbers, and clippy's findings show as wavy `--code-warning` underlines with the message in an `Alert` below.

Inline code in a lesson (`Cargo.toml`, `[dependencies]`, a name in a sentence) isn't syntax: it takes shadcn's inline-code recipe, the mono face at `text-sm` on a `--muted` chip with 4px corners, through one rule in `app.css` on `.lesson :not(pre) > code`. Lesson HTML comes from the content compiler and can't carry components, so compiled markup that needs a shadcn look (inline code, notes, tables) gets a `.lesson` rule in `app.css`, with semantic tokens only, never a component.

## Type

| Tailwind | Family | Use |
|---|---|---|
| `font-serif` | Shippori Mincho B1 | headings, lesson titles (`h1`–`h3` by default) |
| `font-sans` | Zen Kaku Gothic New | UI and lesson text (the default) |
| `font-mono` | JetBrains Mono | code, timestamps |

Both text faces come from Japanese type design and have full Latin sets, which gives the dojo feel without brush-script clichés. The fonts are self-hosted from Fontsource in `web/app/fonts.ts`, so no font request leaves the page's own server. It loads only the weights in use (text 400, 500 and 700; headings 400, 600 and 700; code 400 and 600) and only the Latin subsets, and a page downloads just the files its characters need: about 45 KB on the home page and 105 KB on a lesson, once. Add a weight there before using it in a class. Vite never inlines font files (`vite.config.ts`), so they stay out of the stylesheet.

## Links

A link that leaves the course opens in a new tab, so the student keeps their place: `target="_blank"` with `rel="noopener noreferrer"`, and "(opens in a new tab)" in an `sr-only` span for screen readers. The content compiler does this for every `http` and `https` link in a lesson; a component that links out does the same. Links within the course (another lesson, a heading, home, the roadmap) stay in the same tab, where the app keeps its state.

Each `##` section of a lesson shows its time in the video on the right of its heading, in `font-mono` and `--info`, the way timestamps look everywhere. It's a link named "Watch “Install Rust” in the video, from 00:52" that plays the video from there, starting it if needed and bringing it back from Text view. The strip under the player marks the same moments as chapters: a short tick per part of the lesson, a 24px target named "Chapter: Install Rust, 00:52", with a `Tooltip` naming it on hover and focus. The video's length comes from the outline, so the strip shows it and its chapters before the student presses play (decision D34).

## Keyboard

Everything works from the keyboard (decision D32). The first Tab on every page reaches "Skip to content", hidden until it has focus, which jumps past the rail to the page's `<main>`. After an in-app navigation, focus moves to the new page's `h1`, or to the element a link's hash names, so screen readers announce where the student landed and Tab carries on from there. The skip link's target and those headings get no focus ring, since they aren't controls. The code is in `web/app/features/navigation/`.

Ctrl+K, or ⌘K, opens the command palette from any page; the Search button opens it on touch screens. It lists the Roadmap, every written lesson under its phase ("Phase 1: First Steps"), and the switch to the other theme. Typing filters by name and by phase. While there's a search, the matches show as one list, best first, each with its group's name beside it, because cmdk ranks matches only within a group. Enter opens the selected entry. Quizzes and build steps join it with their pages. The code is in `web/app/features/palette/`.

There are no single-key shortcuts: they would fire while a student types a note or code, and WCAG asks for a way to turn them off or remap them.

## Motifs, sparingly

- The rust band on the edge of the navigation rail (tatami edge), and the current page's icon and label in the same rust.
- Stripes as bars, belts as colored strips with their name.
- The seal on earned belts.

No gradients, no emoji, no brush fonts, no cards with a colored left border.

## Errors

Every error in the app lands on one page, the root `ErrorBoundary` (`web/app/features/errors/`), with the rail kept so the way home is always there. Ferris panicking, the Rust Book's `panics.svg`, sits beside the error, which is printed the way rustc prints a diagnostic, in a `pre.code` panel with the code colors: `error[404]` or `error` in `--code-fail`, the `-->`, `|` and `=` gutter in `--code-constant`, then the place and any `help:` or `note:` lines.

- A missing page, or a lesson that was never compiled, is "Page not found" (`error[404]: no page at this address`) and leads with "Go to the roadmap". A lesson path adds `help: lessons live at /lesson/<phase>/<slug>`.
- A crash is "Something went wrong" (`error: this page panicked`, with the error's message as the `note:`) and leads with "Try again". In development only, its stack follows as a Rust-style backtrace of up to 12 frames, ending with how many it leaves out, and ` -->` points at its first frame; the published site never shows a stack.
- The tab title is the heading: "Page not found · Oxidō".

The actions are shadcn's `Button` at the `lg` size, primary then `outline`. When the rail arrives in P2, the same content can move into a `Card` next to it.

## Preview

The design canvas "Oxidō Preview" shows every screen in both themes, plus a theme sheet with the colors.
