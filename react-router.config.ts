import type { Config } from "@react-router/dev/config";

// A static single-page app: nothing renders on a server at runtime. Pages are
// pre-rendered to HTML at build time, then React takes over in the browser.
//
// The same build is served two ways: by the local `oxido` server at "/", and by
// GitHub Pages at "/<repo>/" (the Pages workflow sets BASE_PATH).
const basename = `${(process.env.BASE_PATH ?? "").replace(/\/+$/, "")}/`;

export default {
  appDirectory: "src",
  ssr: false,
  basename,
  prerender: ["/"],
} satisfies Config;
