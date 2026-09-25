import type { ReactNode } from "react";
import { Links, Meta, Outlet, Scripts, ScrollRestoration } from "react-router";
import "./app.css";
import { BrandMark } from "@/lib/brand/BrandMark";
import { ThemeToggle } from "@/lib/theme/ThemeToggle";
import { PRE_PAINT_SCRIPT } from "@/lib/theme/theme";
import { useTheme } from "@/lib/theme/use-theme";

const base = import.meta.env.BASE_URL;

// The name is the page title; routes without their own title inherit it.
export const meta = () => [{ title: "Oxidō" }];

// The SVG tab icon comes last so browsers that support it pick it over the
// PNG; Safari falls back to the PNG. The SVG adds a light rim in dark mode.
export const links = () => [
  { rel: "icon", type: "image/png", sizes: "64x64", href: `${base}favicon.png` },
  { rel: "icon", type: "image/svg+xml", sizes: "any", href: `${base}favicon.svg` },
  { rel: "apple-touch-icon", href: `${base}apple-touch-icon.png` },
];

export function Layout({ children }: { children: ReactNode }) {
  return (
    // The pre-paint script sets the theme class on <html> before React loads.
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="color-scheme" content="light dark" />
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: a fixed script built from constants in theme.ts */}
        <script dangerouslySetInnerHTML={{ __html: PRE_PAINT_SCRIPT }} />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  const theme = useTheme();
  return (
    <>
      <header className="flex items-center justify-between px-4 py-3">
        <BrandMark />
        <ThemeToggle dark={theme.resolved === "dark"} onToggle={theme.toggle} />
      </header>
      <Outlet />
    </>
  );
}
