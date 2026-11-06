import { build } from "esbuild";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
const watch = process.argv.includes("--watch");
await mkdir("dist", { recursive: true });
const compile = async () => {
  const uiTs = await build({
    entryPoints: ["src/ui/main.ts"],
    bundle: true,
    platform: "browser",
    target: "es2020",
    format: "iife",
    write: false,
    minify: false,
  });
  const html = await readFile("src/ui/index.html", "utf8");
  const css = await readFile("src/ui/styles.css", "utf8");
  // Escape closing script/style sequences when embedding compiled assets.
  const js = new TextDecoder()
    .decode(uiTs.outputFiles[0].contents)
    .replace(/<\/script/gi, "<\\/script");
  await writeFile(
    "dist/ui.html",
    html.replace("/*__STYLE__*/", css).replace("/*__SCRIPT__*/", js),
  );
};
if (watch) {
  const { context } = await import("esbuild");
  const ctx = await context({
    entryPoints: ["src/main.ts"],
    bundle: true,
    platform: "browser",
    target: "es2020",
    format: "iife",
    outfile: "dist/code.js",
  });
  await ctx.watch();
  await compile();
  console.log("Watching plugin code. Re-run build after editing UI assets.");
} else {
  await build({
    entryPoints: ["src/main.ts"],
    bundle: true,
    platform: "browser",
    target: "es2020",
    format: "iife",
    outfile: "dist/code.js",
  });
  await compile();
  console.log("Built dist/code.js and dist/ui.html");
}
