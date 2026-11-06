// Executes repository Vitest-style unit tests with a tiny assertion shim when
// the npm registry is inaccessible. Not a substitute for running real Vitest.
const ts = require("/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript");
const path = require("node:path");
const fs = require("node:fs");
const Module = require("node:module");
const root = path.resolve(__dirname, "..");
const tests = [];
let suite = "";
function expect(actual) {
  return {
    toBe(expected) {
      if (!Object.is(actual, expected))
        throw Error(
          `expected ${JSON.stringify(actual)} to be ${JSON.stringify(expected)}`,
        );
    },
    toEqual(expected) {
      if (JSON.stringify(actual) !== JSON.stringify(expected))
        throw Error("values differ");
    },
    toHaveLength(n) {
      if (actual.length !== n)
        throw Error(`expected length ${n}, received ${actual.length}`);
    },
    toBeGreaterThanOrEqual(n) {
      if (!(actual >= n)) throw Error(`expected ${actual} >= ${n}`);
    },
  };
}
const vitest = {
  describe(name, callback) {
    const old = suite;
    suite = name;
    callback();
    suite = old;
  },
  it(name, callback) {
    tests.push({ name: suite + " :: " + name, callback });
  },
  expect,
};
const cache = new Map();
function load(file) {
  file = path.resolve(file);
  if (cache.has(file)) return cache.get(file).exports;
  const contents = fs.readFileSync(file, "utf8");
  const compiled = ts.transpileModule(contents, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText;
  const mod = { exports: {} };
  cache.set(file, mod);
  const customRequire = (name) =>
    name === "vitest"
      ? vitest
      : name.startsWith(".")
        ? load(path.resolve(path.dirname(file), name) + ".ts")
        : require(name);
  const wrapper = new Function("require", "module", "exports", compiled);
  wrapper(customRequire, mod, mod.exports);
  return mod.exports;
}
function walk(dir) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((e) =>
      e.isDirectory()
        ? walk(path.join(dir, e.name))
        : e.name.endsWith(".test.ts")
          ? [path.join(dir, e.name)]
          : [],
    );
}
for (const file of walk(path.resolve(root, "tests"))) load(file);
let failed = 0;
(async () => {
  for (const t of tests) {
    try {
      await t.callback();
      console.log("PASS", t.name);
    } catch (err) {
      failed++;
      console.error("FAIL", t.name, err.message);
    }
  }
  console.log(
    `Total ${tests.length}; passed ${tests.length - failed}; failed ${failed}`,
  );
  process.exitCode = failed ? 1 : 0;
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
