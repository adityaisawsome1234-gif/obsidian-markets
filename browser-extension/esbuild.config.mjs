import esbuild from "esbuild";
import { cpSync, mkdirSync } from "fs";

const watch = process.argv.includes("--watch");

const shared = {
  bundle: true,
  minify: !watch,
  sourcemap: watch ? "inline" : false,
  target: "chrome120",
  format: "esm",
};

async function build() {
  mkdirSync("dist", { recursive: true });

  // Copy static files
  cpSync("manifest.json", "dist/manifest.json");
  cpSync("popup/popup.html", "dist/popup.html");
  cpSync("sidepanel/sidepanel.html", "dist/sidepanel.html");
  cpSync("content/styles.css", "dist/content.css");
  cpSync("icons", "dist/icons", { recursive: true });

  const configs = [
    { entryPoints: ["background.ts"], outfile: "dist/background.js", ...shared },
    { entryPoints: ["content/ticker-detector.ts"], outfile: "dist/content.js", ...shared, format: "iife" },
    { entryPoints: ["content/floating-panel.ts"], outfile: "dist/floating-panel.js", ...shared, format: "iife" },
    { entryPoints: ["popup/popup.ts"], outfile: "dist/popup.js", ...shared },
    { entryPoints: ["sidepanel/sidepanel.ts"], outfile: "dist/sidepanel.js", ...shared },
  ];

  if (watch) {
    const contexts = await Promise.all(configs.map((c) => esbuild.context(c)));
    await Promise.all(contexts.map((c) => c.watch()));
    console.log("Watching for changes...");
  } else {
    await Promise.all(configs.map((c) => esbuild.build(c)));
    console.log("Build complete → dist/");
  }
}

build().catch((e) => { console.error(e); process.exit(1); });
