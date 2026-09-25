import { MoonIcon, SunIcon } from "lucide-react";

interface ThemeToggleProps {
  /** Whether the dark theme is showing. */
  dark: boolean;
  onToggle: () => void;
}

/**
 * One button that switches between the light and dark themes. Until someone
 * presses it, the app follows the system (theme.ts). It's a toggle button: the
 * name stays "Dark theme" and `aria-pressed` says whether it's on.
 *
 * The icons key off the `dark` class rather than the `dark` prop, so the first
 * paint shows the right one before React knows the theme.
 *
 * Plain markup until shadcn/ui's Button is added (`bunx --bun shadcn@latest add
 * button`; the registry isn't reachable from Claude's workspace). Then this
 * becomes `<Button variant="ghost" size="icon-lg" aria-label="Dark theme"
 * aria-pressed={dark} onClick={onToggle}>` around the same two icons. The
 * icons keep their size-5.5 class (22px, stroke 1.8): they match the rail's
 * other icons instead of Button's default 16px, a deliberate exception
 * (docs/design.md).
 */
export function ThemeToggle({ dark, onToggle }: ThemeToggleProps) {
  return (
    <button
      type="button"
      aria-label="Dark theme"
      aria-pressed={dark}
      onClick={onToggle}
      className="inline-flex size-10 cursor-pointer items-center justify-center rounded-md text-foreground hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2"
    >
      <SunIcon aria-hidden="true" strokeWidth={1.8} className="size-5.5 dark:hidden" />
      <MoonIcon aria-hidden="true" strokeWidth={1.8} className="hidden size-5.5 dark:block" />
    </button>
  );
}
