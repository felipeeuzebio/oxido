// The tinted variants design.md gives Badge and Alert: a muted background with
// the matching text color. They live here, not in the generated components in
// ui/, which the shadcn CLI owns.

export const TINTS = {
  success: "bg-success-muted text-success",
  "destructive-muted": "bg-destructive-muted text-destructive",
  info: "bg-info-muted text-info",
  warning: "bg-warning-muted text-warning",
  "primary-muted": "bg-primary-muted text-primary-muted-foreground",
} as const;

export type Tint = keyof typeof TINTS;

export const isTint = (variant: unknown): variant is Tint =>
  typeof variant === "string" && Object.hasOwn(TINTS, variant);
