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
  useRouteLoaderData,
} from "react-router";
import "./app.css";
import "./fonts";
import { BrandMark } from "@/features/brand/BrandMark";
import { lessonRoutes } from "@/features/content/content.server";
import { diagnose } from "@/features/errors/diagnostic";
import { ErrorPage } from "@/features/errors/ErrorPage";
import { railItems } from "@/features/rail/items";
import { Rail, TabBar } from "@/features/rail/Rail";
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

// Runs once, when the pages are pre-rendered: the rail's Lesson item opens the
// first compiled lesson.
export function loader() {
  return { firstLesson: lessonRoutes()[0] ?? null };
}

/**
 * The rail beside every page on wide screens. On phones the logo and the theme
 * toggle sit above the page, and the rail's items in a tab bar below it
 * (decision D30); the tab bar's height is padded off the page's foot.
 */
function Shell({ children }: { children: ReactNode }) {
  const theme = useTheme();
  const { pathname } = useLocation();
  const items = railItems(useRouteLoaderData<typeof loader>("root")?.firstLesson ?? null);
  const toggle = <ThemeToggle dark={theme.resolved === "dark"} onToggle={theme.toggle} />;
  return (
    <div className="md:flex">
      <Rail items={items} pathname={pathname} foot={toggle} />
      <div className="min-w-0 flex-1 pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-0">
        <header className="flex items-center justify-between px-4 py-3 md:hidden">
          <BrandMark />
          {toggle}
        </header>
        {children}
      </div>
      <TabBar items={items} pathname={pathname} />
    </div>
  );
}

export default function App() {
  return (
    <Shell>
      <Outlet />
    </Shell>
  );
}

// Every error in the app lands here: a missing page, a lesson that isn't
// compiled, a crash. The rail stays, so the way home is always there.
export function ErrorBoundary() {
  const error = useRouteError();
  const { pathname } = useLocation();
  return (
    <Shell>
      <ErrorPage
        diagnostic={diagnose(error, pathname, import.meta.env.DEV)}
        onRetry={() => window.location.reload()}
      />
    </Shell>
  );
}
