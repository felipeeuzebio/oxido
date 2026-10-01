import { index, type RouteConfig, route } from "@react-router/dev/routes";
import { lessonRoutes } from "./features/content/content.server";

// With ssr: false, a route with a loader must have pages to pre-render, so the
// lesson route exists once the compiled content (web/.content) has lessons.
const lessons =
  lessonRoutes().length > 0 ? [route("lesson/:phase/:slug", "routes/lesson.tsx")] : [];

export default [index("routes/home.tsx"), ...lessons] satisfies RouteConfig;
