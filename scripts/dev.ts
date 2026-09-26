// `bun run dev:all`: the whole app for development, in one terminal.
//
// - oxido runs on the sandbox project (dev/sandbox) with --dev, so it accepts
//   writes from Vite's origin. Open the link it prints once: that starts the
//   session (the cookie is shared across ports on 127.0.0.1).
// - Vite serves the UI with hot reload on http://127.0.0.1:5173 and proxies
//   /api to oxido. Work there.
//
// Ctrl+C stops both, and if either one exits, the other is stopped too.
import { type ChildProcess, spawn } from "node:child_process";

const commands: [string, string[]][] = [
  [
    "cargo",
    ["run", "-p", "oxido", "--", "serve", "--dev", "--no-open", "--project", "dev/sandbox"],
  ],
  ["bun", ["run", "dev"]],
];

const children: ChildProcess[] = commands.map(([command, args]) =>
  spawn(command, args, { stdio: "inherit" }),
);

console.log(
  "\nStarting oxido and Vite. Open the link oxido prints once, then use http://127.0.0.1:5173.\n",
);

let stopping = false;
function stopAll(code: number) {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    if (child.exitCode === null) child.kill("SIGINT");
  }
  process.exitCode = code;
}

for (const child of children) {
  child.on("exit", (code) => stopAll(code ?? 1));
  child.on("error", (error) => {
    console.error(error.message);
    stopAll(1);
  });
}
process.on("SIGINT", () => stopAll(0));
process.on("SIGTERM", () => stopAll(0));
