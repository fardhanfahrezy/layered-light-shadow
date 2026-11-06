// Recovery builder for restricted/offline environments. Normal builds use esbuild.config.mjs.
const fs = require("node:fs"),
  path = require("node:path");
const ts = require("/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript");
const root = path.resolve(__dirname, "..");
function bundle(entry) {
  const modules = new Map();
  function collect(file) {
    file = path.resolve(file);
    if (modules.has(file)) return;
    const tsSource = fs.readFileSync(file, "utf8");
    const js = ts.transpileModule(tsSource, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
      },
    }).outputText;
    modules.set(file, js);
    for (const match of js.matchAll(/require\(["'](\.[^"']+)["']\)/g)) {
      collect(path.resolve(path.dirname(file), match[1] + ".ts"));
    }
  }
  collect(path.resolve(root, entry));
  const entries = [...modules.entries()];
  const lookup = new Map(entries.map(([f], i) => [f, i]));
  const factories = entries.map(([f, s]) => {
    let rewritten = s.replace(
      /require\(["'](\.[^"']+)["']\)/g,
      (_m, loc) =>
        `__req(${lookup.get(path.resolve(path.dirname(f), loc + ".ts"))})`,
    );
    return `function(module,exports,__req){\n${rewritten}\n}`;
  });
  return `(function(){'use strict';const modules=[${factories.join(",\n")}];const cache={};function __req(id){if(cache[id])return cache[id].exports;const mod={exports:{}};cache[id]=mod;modules[id](mod,mod.exports,__req);return mod.exports;}__req(${lookup.get(path.resolve(root, entry))});})();`;
}
fs.mkdirSync(path.resolve(root, "dist"), { recursive: true });
fs.writeFileSync(path.resolve(root, "dist/code.js"), bundle("src/main.ts"));
const template = fs.readFileSync(
  path.resolve(root, "src/ui/index.html"),
  "utf8",
);
const css = fs.readFileSync(path.resolve(root, "src/ui/styles.css"), "utf8");
const js = bundle("src/ui/main.ts").replace(/<\/script/gi, "<\\/script");
fs.writeFileSync(
  path.resolve(root, "dist/ui.html"),
  template.replace("/*__STYLE__*/", css).replace("/*__SCRIPT__*/", js),
);
console.log("Offline build generated dist/code.js and dist/ui.html");
