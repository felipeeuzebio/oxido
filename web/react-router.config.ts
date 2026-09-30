import type { Config } from "@react-router/dev/config";
import { lessonRoutes } from "./app/features/content/content.server";

// A static single-page app: nothing renders on a server at runtime. Pages are
// pre-rendered to HTML at build time, then React takes over in the browser.
//
// Every lesson in the compiled content (web/.content, written by `bun run
// content`) is pre-rendered too.
//
// The same build is served two ways: by the local `oxido` server at "/", and by
// GitHub Pages at "/<repo>/" (the Pages workflow sets BASE_PATH).
const basename = `${(process.env.BASE_PATH ?? "").replace(/\/+$/, "")}/`;

export default {
  ssr: false,
  basename,
  prerender: () => ["/", ...lessonRoutes()],
} satisfies Config;
