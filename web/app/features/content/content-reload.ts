// A Vite plugin for `bun run dev`: restarts the dev server when `cargo xtask
// content` rewrites the compiled course. With ssr: false, React Router's dev
// server serves a lesson's data only for the paths `prerender` listed when it
// started, so a lesson compiled while it runs would 404 until a restart.
import { join, resolve } from "node:path";
import type { Plugin, ViteDevServer } from "vite";

/** One compile emits several events for course.json; they become one restart. */
const SETTLE_MS = 200;

export function contentReload(content: string): Plugin {
  const course = resolve(join(content, "course.json"));
  return {
    name: "oxido:content-reload",
    apply: "serve",
    configureServer(server: ViteDevServer) {
      let timer: ReturnType<typeof setTimeout> | undefined;
      const restart = (file: string) => {
        if (resolve(file) !== course) return;
        clearTimeout(timer);
        timer = setTimeout(() => {
          server.config?.logger.info(
            "Compiled content changed; restarting so new lessons are served.",
          );
          void server.restart();
        }, SETTLE_MS);
      };
      server.watcher.add(content);
      server.watcher.on("add", restart);
      server.watcher.on("change", restart);
    },
  };
}
