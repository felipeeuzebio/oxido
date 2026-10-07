import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Alert } from "./alert";
import { Badge } from "./badge";
import { isTint } from "./tints";

const classes = (element: HTMLElement) => [...element.classList];

describe("Badge", () => {
  it("takes a tinted variant: a muted background with the matching text color", () => {
    render(<Badge variant="success">Passed</Badge>);
    const badge = screen.getByText("Passed");
    expect(badge.dataset.variant).toBe("success");
    expect(classes(badge)).toEqual(expect.arrayContaining(["bg-success-muted", "text-success"]));
    expect(classes(badge)).not.toContain("bg-primary");
  });

  it.each([
    ["destructive-muted", "bg-destructive-muted", "text-destructive"],
    ["info", "bg-info-muted", "text-info"],
    ["warning", "bg-warning-muted", "text-warning"],
    ["primary-muted", "bg-primary-muted", "text-primary-muted-foreground"],
  ] as const)("has the %s tint", (variant, background, text) => {
    render(<Badge variant={variant}>Tinted</Badge>);
    expect(classes(screen.getByText("Tinted"))).toEqual(expect.arrayContaining([background, text]));
  });

  it("keeps shadcn's own variants", () => {
    render(<Badge variant="outline">Plain</Badge>);
    const badge = screen.getByText("Plain");
    expect(badge.dataset.variant).toBe("outline");
    expect(classes(badge)).toContain("border-border");
  });
});

describe("Alert", () => {
  it("takes a tinted variant, with a border of the same color", () => {
    render(<Alert variant="success">Correct</Alert>);
    const alert = screen.getByRole("alert");
    expect(classes(alert)).toEqual(
      expect.arrayContaining(["bg-success-muted", "text-success", "border-success/25"]),
    );
    expect(classes(alert)).not.toContain("bg-card");
  });

  it("keeps shadcn's own variants", () => {
    render(<Alert variant="destructive">Wrong</Alert>);
    expect(classes(screen.getByRole("alert"))).toEqual(
      expect.arrayContaining(["bg-card", "text-destructive"]),
    );
  });
});

describe("isTint", () => {
  it("knows the tints, and not names every object inherits", () => {
    expect(isTint("success")).toBe(true);
    expect(isTint("outline")).toBe(false);
    expect(isTint("toString")).toBe(false);
  });
});
