import { MoonIcon, SunIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

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
 * The icons keep their size-5.5 class (22px, stroke 1.8), which wins over
 * Button's default 16px: they match the rail's other icons, a deliberate
 * exception (docs/design.md).
 */
export function ThemeToggle({ dark, onToggle }: ThemeToggleProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-lg"
      aria-label="Dark theme"
      aria-pressed={dark}
      onClick={onToggle}
    >
      <SunIcon aria-hidden="true" strokeWidth={1.8} className="size-5.5 dark:hidden" />
      <MoonIcon aria-hidden="true" strokeWidth={1.8} className="hidden size-5.5 dark:block" />
    </Button>
  );
}
