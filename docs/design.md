# Design

The name and the look come from the same two places. Oxidō is *oxide* (rust) plus *-dō*, "the way," as in judo, aikido and kendo. The look comes from a dojo and a forge: martial arts give the structure (belts, stripes, the quiet of a training hall), and Rust gives the material (iron, oxide, heat).

Write the name with the macron, Oxidō, wherever people read it (UI, docs, the terminal). Identifiers stay plain ASCII: the `oxido` crate and command, `.oxido/`, `oxido:theme`.

The UI is built with [shadcn/ui](https://ui.shadcn.com) on Tailwind CSS v4, themed with these colors. Everything lives in one stylesheet, [`src/app.css`](../src/app.css): the variables for both themes use shadcn/ui's names, and `@theme inline` turns them into Tailwind classes (`bg-card`, `text-muted-foreground`, `bg-success-muted`, `bg-belt-orange`). Components use those classes and never hard-code colors. Two tests guard this: `tokens.test.ts` (both themes define the same variables, and Tailwind knows every one) and `raw-colors.test.ts` (no hex, `rgb()` or raw Tailwind palette colors in our `.tsx` components).

## Logo

The logo is Ferris the crab in a black ninja hood, headband tails flying: Rust's crab, dressed for the dojo. It's drawn on Karen Rustad Tölva's "cuddly Ferris" from [rustacean.net](https://rustacean.net), which she released into the public domain (CC0); the hood, mask and sleeves were added for Oxidō.

The logo stands alone. There is no wordmark next to it: the name Oxidō is the page title (the browser tab) and appears in text where it's needed. In the app the logo sits at the top left and links home.

| File | What it is | Use |
|---|---|---|
| `docs/brand/logo.svg` | the SVG as delivered, untouched | the source; make every other file from it |
| `public/logo.svg` | the same drawing, optimized with SVGO (22 KB), viewBox cropped to the art | the app header, the website, the README, the design canvas |
| `public/logo-on-dark.svg` | `logo.svg` with a light rim, sized for about 200px wide | the README in GitHub's dark mode |
| `public/favicon.svg` | `logo.svg` that adds a light rim when the browser is in dark mode | the browser tab |
| `public/favicon.png` | 64×64, transparent | the tab icon for browsers without SVG icons (older Safari) |
| `public/apple-touch-icon.png` | 180×180 on `#f4f1e8` | phone home screens, which don't do transparency |

The optimized SVGs drop the source's 4.17× scale wrapper and use the drawing's own units, which also fixes a leg the source's viewBox clipped on the left. The rim is a `feMorphology` dilate filter, so its width is in drawing units: 9 for README size, 30 for the tab icon. The PNGs are rendered from `logo.svg` in Chromium.

Rules:

- **Give the hood a rim on dark backgrounds.** The hood is nearly black and vanishes into Forge's charcoal. In the app, `BrandMark` adds a 1px `drop-shadow` in `--muted-foreground` under `.dark` (the app's theme can differ from the system's, so an in-SVG media query won't do); outside the app, use `logo-on-dark.svg`. This is the one `dark:` treatment on an image, and it uses a token, not a color.
- **Keep it at 32px tall or more.** The app header shows it at 40px. The 16px tab icon is the only smaller use.
- **Don't recolor, outline, crop, rotate or stretch it**, don't add the name beside it, and don't put it on a photo or a pattern.
- **Alt text:** "Oxidō". The logo is the only thing that names the site in the header, so it isn't decorative.

## Themes

The app has a light theme and a dark theme, and one button switches between them. Until a student presses it, the app follows the operating system, and keeps following it when it changes; that "system" default is internal and has no button of its own. Pressing the toggle switches to the other theme and saves it, and from then on the system setting no longer matters.

`src/lib/theme/theme.ts` keeps the choice (per browser, key `oxido:theme`) and puts the `dark` class on `<html>`; an inline script in `<head>` (from `src/root.tsx`) does the same before first paint. Tailwind's `dark:` variant follows that class. The toggle is `src/lib/theme/ThemeToggle.tsx`: a toggle button named "Dark theme" with `aria-pressed`, showing a sun in the light theme and a moon in the dark one. Its icons switch on the `dark` class, not on React state, so the first paint is right. `oxido` always uses port 7878 by default so the browser remembers the choice between launches.

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

Build from shadcn/ui components before writing custom markup, and restyle them only through these variables, never with color classes on the component. They live in `src/components/ui/` as generated code: add or update them with the CLI, don't hand-edit them (Biome skips that folder). `components.json` is set up (style new-york, Lucide icons, `@/` aliases); don't run `init` again, because it would rewrite `src/app.css`.

```sh
bunx --bun shadcn@latest add toggle-group toggle button card badge collapsible alert separator \
  progress tabs resizable sheet tooltip checkbox field scroll-area skeleton breadcrumb item dropdown-menu
```

The workspace where Claude runs can't reach the shadcn/ui registry, so run `add` from a machine that can. If `add` writes `:root` or `.dark` color variables into `src/app.css`, delete them: the colors are already there. Until then, the two existing components (the theme toggle and quiz results) are plain markup shaped like the components they become, with a comment naming them.

After `add`, give `Badge` and `Alert` our tinted variants with `cva` in their own files (shadcn's "add a variant" route, not class overrides at the call site): `success` (`bg-success-muted text-success`), `destructive-muted` (`bg-destructive-muted text-destructive`), `info` (`bg-info-muted text-info`), `warning` (`bg-warning-muted text-warning`) and `primary-muted` (`bg-primary-muted text-primary-muted-foreground`); on `Alert`, add a `border-*/25` of the same color.

| Screen part | Component | Keeps |
|---|---|---|
| Theme toggle | `Button` (`variant="ghost"`, `size="icon-lg"`) with `aria-pressed`, a sun or a moon | one quiet icon at the foot of the rail |
| Language picker | `Button` (`variant="ghost"`, `size="icon-lg"`) with lucide's `Languages` icon, named "Language: English" (the current language), opening a `DropdownMenu` of languages | a second quiet icon under the theme toggle |
| Page headers | `Breadcrumb` above the `h1` for where you are (Roadmap › Phase 3 › Class 3.4) | the serif page title |
| Quiz results | `Card` for the score (the score is its title, the actions sit in `CardAction`), a `Card` of `Item` rows for the questions with a `Badge` verdict each, `Collapsible` with a `Button variant="link"` to reveal the answer, an `Alert` (`success`) for it | bamboo and seal-red verdicts, the answer on a bamboo tint |
| Lesson | YouTube's own player behind a facade (no player library, decision D16), with a strip under it for the saved position (`Progress`) and note markers; nothing is drawn over the player. `ToggleGroup` (`variant="outline"`, joined) for Video / Both / Text, `Resizable` for the panels, `Card` for the video notes and the text lesson, `Sheet` for all notes, `Button` with a `Badge` count for Notes | video left, text right |
| Build step | `Card` + `Field` checkboxes for the tasks, `Alert` (`info`) for the chapter note, a status line (watching the folder, when tests and clippy last ran), a `Card` with `Tabs` for Tests / Problems / Output (counts as `Badge`s), `Badge` for pass / fail, and file links (`src/table.rs:24`) that open VS Code at that line. Students write minisql in their own editor, so there's no in-app editor and no reset button; the page shows results live | clippy snippets in the code colors, output in VS Code's terminal colors (see Code) |
| Quiz code question | CodeMirror 6 (lazy-loaded) in a `Card`, `Button` to check, `Alert` for clippy's messages | VS Code's colors (see Code) |
| Roadmap | `Card` for the continue card (title, description, actions, then `Progress` bars) and phases, `Badge` for status | the progress view is one long belt (see Belts); belt strips, stripes and seals stay custom |

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

The navigation stays a custom rail (icon over label, 92px, the rust tatami edge) rather than shadcn's `Sidebar`, whose collapsed mode is icon-only; it was chosen over a syllabus sidebar or a class outline (decision D20). It uses the `--sidebar-*` colors: the rail is `--sidebar` (tatami) and its 4px edge is `--sidebar-primary` (rust), one plain line from top to bottom. Rail items are links styled with semantic classes, with no tile or background behind them. The current page's icon and label turn `--sidebar-current` and bold (the icon's stroke goes from 1.8 to 2.2), while the others stay `--muted-foreground`; `aria-current="page"` carries the meaning for screen readers. `--sidebar-current` is the edge's rust made readable as text on the rail: the same value in Forge, a little darker in Dojo (`#b23301`, with the same hue), because the edge's `#c04218` is only 4.1:1 on the rail. Nothing is added to the edge beside the current page: a notch, the edge growing into a tab there, was tried in several shapes and set aside for this (decision D20). Hover darkens the label to `--foreground`; keyboard focus gets the usual `--ring` outline around the item. The theme toggle (a sun or a moon) and the language picker (lucide's `Languages` icon) sit at the rail's foot as ghost icon buttons, 40px (`icon-lg`) with 22px icons at stroke 1.8, the same as the rail's links. That's a deliberate exception to Button's default 16px icons, so these two icons carry a `size-5.5` class. The design canvas's "Options: menu items" board keeps the three looks that weren't chosen, and "Options: current menu item" keeps A1, the ink label with the notch.

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

The Roadmap shows progress as one long belt (option P2 on the design canvas, decision D20): the eight belts joined end to end in one strip, each as wide as its stripe count, so the path shows its own proportions. Under each belt sit its stripe bars, its name and "2 of 5"; above it, the seal once it's earned, or "You are here" in `--primary-muted-foreground` over the current belt, whose next stripe bar is `--primary`. It's an ordered list with one item per belt, and each item's accessible name says it all ("Orange belt: 2 of 5 stripes, you are here"); the colored strip and the bars are hidden from screen readers.

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

## Type

| Tailwind | Family | Use |
|---|---|---|
| `font-serif` | Shippori Mincho B1 | headings, lesson titles (`h1`–`h3` by default) |
| `font-sans` | Zen Kaku Gothic New | UI and lesson text (the default) |
| `font-mono` | JetBrains Mono | code, timestamps |

Both text faces come from Japanese type design and have full Latin sets, which gives the dojo feel without brush-script clichés. The fonts are self-hosted in platform phase P2 (no font requests to Google from the local app); until then the stacks fall back to system fonts.

## Motifs, sparingly

- The rust band on the edge of the navigation rail (tatami edge), and the current page's icon and label in the same rust.
- Stripes as bars, belts as colored strips with their name.
- The seal on earned belts.

No gradients, no emoji, no brush fonts, no cards with a colored left border.

## Preview

The design canvas "Oxidō Preview" shows every screen in both themes, plus a theme sheet with the colors.
