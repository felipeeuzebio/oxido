// shadcn/ui's Badge with our tinted variants added (`<Badge variant="success">`).
import { cva } from "class-variance-authority";
import type { ComponentProps } from "react";
import { Badge as ShadcnBadge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { isTint, TINTS, type Tint } from "./tints";

const tinted = cva("border-transparent", { variants: { variant: TINTS } });

type BadgeProps = Omit<ComponentProps<typeof ShadcnBadge>, "variant"> & {
  variant?: ComponentProps<typeof ShadcnBadge>["variant"] | Tint;
};

export function Badge({ variant, className, ...props }: BadgeProps) {
  if (!isTint(variant)) return <ShadcnBadge variant={variant} className={className} {...props} />;
  // The ghost variant brings no colors of its own, so only the tint's apply.
  return (
    <ShadcnBadge
      {...props}
      variant="ghost"
      data-variant={variant}
      className={cn(tinted({ variant }), className)}
    />
  );
}
