import type { ReactNode } from "react";
import {
  Links,
  Meta,
  type MetaFunction,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLocation,
  useRouteError,
} from "react-router";
import "./app.css";
import "./fonts";
import { BrandMark } from "@/features/brand/BrandMark";
import { diagnose } from "@/features/errors/diagnostic";
import { ErrorPage } from "@/features/errors/ErrorPage";
import { ThemeToggle } from "@/features/theme/ThemeToggle";
import { PRE_PAINT_SCRIPT } from "@/features/theme/theme";
import { useTheme } from "@/features/theme/use-theme";

const base = import.meta.env.BASE_URL;

// The name is the page title; routes without their own title inherit it. On
// an error, the error page's heading leads ("Page not found · Oxidō").
export const meta: MetaFunction = ({ error, location }) => [
  {
    title: error
      ? `${diagnose(error, location.pathname, import.meta.env.DEV).title} · Oxidō`
      : "Oxidō",
  },
];

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

function Header() {
  const theme = useTheme();
  return (
    <header className="flex items-center justify-between px-4 py-3">
      <BrandMark />
      <ThemeToggle dark={theme.resolved === "dark"} onToggle={theme.toggle} />
    </header>
  );
}

export default function App() {
  return (
    <>
      <Header />
      <Outlet />
    </>
  );
}

// Every error in the app lands here: a missing page, a lesson that isn't
// compiled, a crash. The header stays, so the way home is always there.
export function ErrorBoundary() {
  const error = useRouteError();
  const { pathname } = useLocation();
  return (
    <>
      <Header />
      <ErrorPage
        diagnostic={diagnose(error, pathname, import.meta.env.DEV)}
        onRetry={() => window.location.reload()}
      />
    </>
  );
}
