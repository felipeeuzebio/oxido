import { SearchIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { preloadPalette } from "./CommandPalette";

/**
 * Opens the command palette, for touch screens where there's no Ctrl+K, and
 * shows keyboard users the shortcut exists. Like the theme toggle, its icon is
 * 22px at stroke 1.8 to match the rail (docs/design.md).
 */
export function SearchButton({ onClick }: { onClick: () => void }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-lg"
      aria-label="Search"
      aria-keyshortcuts="Control+K Meta+K"
      title="Search (Ctrl+K)"
      onClick={onClick}
      onPointerEnter={preloadPalette}
      onFocus={preloadPalette}
    >
      <SearchIcon aria-hidden="true" strokeWidth={1.8} className="size-5.5" />
    </Button>
  );
}
