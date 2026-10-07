import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { railItems } from "./items";
import { Rail, TabBar } from "./Rail";

const items = railItems("/lesson/p01/01-getting-started");

function show(ui: React.ReactNode, path: string) {
  render(<MemoryRouter initialEntries={[path]}>{ui}</MemoryRouter>);
  return screen.getByRole("navigation", { name: "Main" });
}

describe.each([
  ["Rail", (path: string) => <Rail items={items} pathname={path} />],
  ["TabBar", (path: string) => <TabBar items={items} pathname={path} />],
])("%s", (_, make) => {
  it("links to each page, icon over label", () => {
    const nav = show(make("/"), "/");
    const links = within(nav)
      .getAllByRole("link")
      .filter((link) => link.textContent !== "");
    expect(links.map((link) => [link.textContent, link.getAttribute("href")])).toEqual([
      ["Roadmap", "/"],
      ["Lesson", "/lesson/p01/01-getting-started"],
    ]);
  });

  it("marks the current page, and only that one", () => {
    const nav = show(make("/lesson/p02/04-structs"), "/lesson/p02/04-structs");
    const current = within(nav)
      .getAllByRole("link")
      .filter((link) => link.getAttribute("aria-current") === "page");
    expect(current.map((link) => link.textContent)).toEqual(["Lesson"]);
  });
});

describe("Rail", () => {
  it("opens with the logo, linking home, and keeps what it's given at its foot", () => {
    const nav = show(
      <Rail items={items} pathname="/" foot={<button type="button">Dark theme</button>} />,
      "/",
    );
    expect(within(nav).getByRole("img", { name: "Oxidō" })).toBeTruthy();
    expect(within(nav).getByRole("button", { name: "Dark theme" })).toBeTruthy();
  });
});
