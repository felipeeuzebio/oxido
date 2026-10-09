import { fireEvent, render, screen } from "@testing-library/react";
import { StrictMode } from "react";
import { createMemoryRouter, Link, Outlet, RouterProvider } from "react-router";
import { describe, expect, it } from "vitest";
import { useFocusOnNavigate } from "./use-focus-on-navigate";

function Layout() {
  useFocusOnNavigate();
  return (
    <main id="main" tabIndex={-1}>
      <Link to="/b">To B</Link>
      <Link to="/b#later">To later in B</Link>
      <Link to="/c">To C</Link>
      <Link to="/d#control">To a control in D</Link>
      <Outlet />
    </main>
  );
}

function show() {
  const router = createMemoryRouter([
    {
      element: <Layout />,
      children: [
        { path: "/", element: <h1>Page A</h1> },
        {
          path: "/b",
          element: (
            <>
              <h1>Page B</h1>
              <h2 id="later">Later</h2>
            </>
          ),
        },
        { path: "/c", element: <p>No heading here</p> },
        {
          path: "/d",
          element: (
            <>
              <h1>Page D</h1>
              <button type="button" id="control" tabIndex={0}>
                A control
              </button>
            </>
          ),
        },
      ],
    },
  ]);
  // StrictMode runs effects twice on mount, as the app does in development.
  render(
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>,
  );
}

describe("useFocusOnNavigate", () => {
  it("leaves focus alone when the first page loads", () => {
    show();
    expect(document.activeElement).toBe(document.body);
  });

  it("moves focus to the new page's heading, so screen readers announce it", async () => {
    show();
    fireEvent.click(screen.getByRole("link", { name: "To B" }));
    const heading = await screen.findByRole("heading", { name: "Page B" });
    expect(document.activeElement).toBe(heading);
  });

  it("marks the heading it made focusable, so only it loses the focus ring", async () => {
    show();
    fireEvent.click(screen.getByRole("link", { name: "To B" }));
    const heading = await screen.findByRole("heading", { name: "Page B" });
    expect(heading.hasAttribute("data-focus-target")).toBe(true);
  });

  it("leaves a control it lands on as it was, focus ring and all", async () => {
    show();
    fireEvent.click(screen.getByRole("link", { name: "To a control in D" }));
    const control = await screen.findByRole("button", { name: "A control" });
    expect(document.activeElement).toBe(control);
    expect(control.hasAttribute("data-focus-target")).toBe(false);
    expect(control.getAttribute("tabindex")).toBe("0");
  });

  it("moves focus to the part a link names", async () => {
    show();
    fireEvent.click(screen.getByRole("link", { name: "To later in B" }));
    const part = await screen.findByRole("heading", { name: "Later" });
    expect(document.activeElement).toBe(part);
  });

  it("falls back to the main content when the page has no heading", async () => {
    show();
    fireEvent.click(screen.getByRole("link", { name: "To C" }));
    await screen.findByText("No heading here");
    expect(document.activeElement?.id).toBe("main");
  });
});
