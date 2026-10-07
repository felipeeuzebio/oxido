// shadcn/ui's Alert with our tinted variants added (`<Alert variant="success">`),
// each with a border of its own color at 25%.
import { cva } from "class-variance-authority";
import type { ComponentProps } from "react";
import { Alert as ShadcnAlert } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { isTint, TINTS, type Tint } from "./tints";

export { AlertDescription, AlertTitle } from "@/components/ui/alert";

const tinted = cva("", {
  variants: {
    variant: {
      success: `${TINTS.success} border-success/25`,
      "destructive-muted": `${TINTS["destructive-muted"]} border-destructive/25`,
      info: `${TINTS.info} border-info/25`,
      warning: `${TINTS.warning} border-warning/25`,
      "primary-muted": `${TINTS["primary-muted"]} border-primary/25`,
    } satisfies Record<Tint, string>,
  },
});

type AlertProps = Omit<ComponentProps<typeof ShadcnAlert>, "variant"> & {
  variant?: ComponentProps<typeof ShadcnAlert>["variant"] | Tint;
};

export function Alert({ variant, className, ...props }: AlertProps) {
  if (!isTint(variant)) return <ShadcnAlert variant={variant} className={className} {...props} />;
  return (
    <ShadcnAlert {...props} data-variant={variant} className={cn(tinted({ variant }), className)} />
  );
}
