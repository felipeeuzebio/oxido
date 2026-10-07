// @vitest-environment node
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { contentReload } from "./content-reload";

type Handler = (file: string) => void;

// The parts of Vite's dev server the plugin touches.
function fakeServer() {
  const handlers = new Map<string, Handler[]>();
  const server = {
    watcher: {
      add: vi.fn(),
      on: (event: string, handler: Handler) => {
        handlers.set(event, [...(handlers.get(event) ?? []), handler]);
      },
    },
    restart: vi.fn(async () => {}),
  };
  const emit = (event: string, file: string) => {
    for (const handler of handlers.get(event) ?? []) handler(file);
  };
  return { server, emit };
}

function start(content: string) {
  const { server, emit } = fakeServer();
  const plugin = contentReload(content);
  // The plugin's hook is a plain function; the fake server has only what it uses.
  const configure = plugin.configureServer as unknown as (s: typeof server) => void;
  configure(server);
  return { server, emit };
}

describe("restarting the dev server when the compiled content changes", () => {
  const content = "/repo/web/.content";

  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("watches the compiled content folder", () => {
    const { server } = start(content);
    expect(server.watcher.add).toHaveBeenCalledWith(content);
  });

  it("restarts once when a compile rewrites the course", () => {
    // `cargo xtask content` replaces the whole folder, so course.json goes away
    // and comes back; React Router re-reads the lessons to pre-render on restart.
    const { server, emit } = start(content);
    emit("unlink", join(content, "course.json"));
    emit("add", join(content, "course.json"));
    emit("change", join(content, "course.json"));
    vi.runAllTimers();
    expect(server.restart).toHaveBeenCalledTimes(1);
  });

  it("leaves the server alone when other files change", () => {
    const { server, emit } = start(content);
    emit("change", join(content, "lessons", "p01", "01-getting-started.json"));
    emit("change", "/repo/web/app/root.tsx");
    vi.runAllTimers();
    expect(server.restart).not.toHaveBeenCalled();
  });

  it("only runs in the dev server", () => {
    expect(contentReload(content).apply).toBe("serve");
  });
});
