import { useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import type { PaletteEntry, PaletteGroup } from "./entries";

export interface PaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groups: PaletteGroup[];
  onToggleTheme: () => void;
}

/**
 * The command palette's dialog. CommandPalette loads this module the first
 * time the palette opens, so cmdk stays out of the first page load.
 *
 * It's built from Dialog and Command rather than shadcn's CommandDialog, which
 * puts the dialog's title outside its content, where Radix doesn't find it.
 */
export default function Palette({ open, onOpenChange, groups, onToggleTheme }: PaletteProps) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  // Set when an entry leads to another page: focus then goes to that page's
  // heading (useFocusOnNavigate), not back to what opened the palette.
  const leaving = useRef(false);
  const [search, setSearch] = useState("");
  // Each opening starts with an empty search, whichever way it was closed.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setSearch("");
  }

  const run = (entry: PaletteEntry) => {
    onOpenChange(false);
    if ("to" in entry) {
      leaving.current = entry.to !== pathname;
      navigate(entry.to);
    } else {
      onToggleTheme();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="overflow-hidden p-0"
        showCloseButton={false}
        onCloseAutoFocus={(event) => {
          if (leaving.current) event.preventDefault();
          leaving.current = false;
        }}
      >
        <DialogTitle className="sr-only">Search the course</DialogTitle>
        <DialogDescription className="sr-only">
          Type part of a lesson's or a page's name, then press Enter to open it.
        </DialogDescription>
        <Command
          loop
          className="**:data-[slot=command-input-wrapper]:h-12 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]]:px-2 [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5"
        >
          <CommandInput
            placeholder="Search lessons and pages"
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>Nothing matches.</CommandEmpty>
            {/* cmdk ranks matches only within a group, so a search shows them
                all in one group, best match first, each with its own group's
                name beside it. */}
            {search ? (
              <CommandGroup>
                {groups.flatMap((group) =>
                  group.entries.map((entry) => (
                    <Entry key={id(entry)} entry={entry} group={group.heading} onRun={run} />
                  )),
                )}
              </CommandGroup>
            ) : (
              groups.map((group) => (
                <CommandGroup key={group.heading} heading={group.heading}>
                  {group.entries.map((entry) => (
                    <Entry key={id(entry)} entry={entry} onRun={run} />
                  ))}
                </CommandGroup>
              ))
            )}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}

const id = (entry: PaletteEntry) => ("to" in entry ? entry.to : entry.action);

function Entry({
  entry,
  group,
  onRun,
}: {
  entry: PaletteEntry;
  group?: string;
  onRun: (entry: PaletteEntry) => void;
}) {
  return (
    <CommandItem
      // cmdk needs values to be unique; the label leads so it ranks first.
      value={`${entry.label} ${id(entry)}`}
      keywords={entry.keywords}
      onSelect={() => onRun(entry)}
    >
      <entry.icon aria-hidden="true" strokeWidth={1.8} />
      {entry.label}
      {group && <span className="ml-auto text-xs text-muted-foreground">{group}</span>}
    </CommandItem>
  );
}
