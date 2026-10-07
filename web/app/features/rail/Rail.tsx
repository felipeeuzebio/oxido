import type { ReactNode } from "react";
import { Link } from "react-router";
import { BrandMark } from "@/features/brand/BrandMark";
import { cn } from "@/lib/utils";
import { currentItem, type RailItem } from "./items";

interface NavProps {
  items: RailItem[];
  pathname: string;
}

/** An icon over its label. The current page's turns rust and bold (decision D20). */
function ItemLink({
  item,
  current,
  className,
}: {
  item: RailItem;
  current: boolean;
  className: string;
}) {
  const Icon = item.icon;
  return (
    <Link
      to={item.to}
      aria-current={current ? "page" : undefined}
      className={cn(
        "flex flex-col items-center gap-[5px] rounded-md text-[13px] font-medium text-muted-foreground hover:text-sidebar-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        current && "font-bold text-sidebar-current hover:text-sidebar-current",
        className,
      )}
    >
      <Icon aria-hidden="true" strokeWidth={current ? 2.2 : 1.8} className="size-5.5" />
      {item.label}
    </Link>
  );
}

/**
 * The tatami rail, from wide screens up: the logo, the items, and at its foot
 * whatever it's given (the theme toggle). The rust edge runs down its right
 * side (docs/design.md, "Components").
 */
export function Rail({ items, pathname, foot }: NavProps & { foot?: ReactNode }) {
  const current = currentItem(items, pathname);
  return (
    <nav
      aria-label="Main"
      className="sticky top-0 hidden h-svh w-[92px] shrink-0 flex-col gap-1.5 border-r-4 border-sidebar-primary bg-sidebar py-5 pl-2 md:flex"
    >
      <div className="flex justify-center pt-0.5 pr-2 pb-3.5">
        <BrandMark />
      </div>
      {items.map((item) => (
        <ItemLink key={item.to} item={item} current={item === current} className="py-2.5 pr-2" />
      ))}
      <div className="grow" />
      <div className="flex flex-col items-center gap-1 pr-2">{foot}</div>
    </nav>
  );
}

/** The same items as a tab bar along the bottom, on phones (decision D30). */
export function TabBar({ items, pathname }: NavProps) {
  const current = currentItem(items, pathname);
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-10 flex border-t-4 border-sidebar-primary bg-sidebar pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      {items.map((item) => (
        <ItemLink key={item.to} item={item} current={item === current} className="flex-1 py-2" />
      ))}
    </nav>
  );
}
