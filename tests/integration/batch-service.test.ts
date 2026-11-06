import { describe, it, expect } from "vitest";
import { runBatch } from "../../src/application/batch-service";
import { DEFAULTS, ATTACH_KEY } from "../../src/domain/defaults";
function node(id: string) {
  const data: Record<string, string> = {};
  return {
    id,
    name: id,
    type: "RECTANGLE",
    removed: false,
    width: 120,
    height: 80,
    effects: [{ type: "LAYER_BLUR", radius: 4, visible: true }],
    getPluginData(k: string) {
      return data[k] ?? "";
    },
    setPluginData(k: string, v: string) {
      data[k] = v;
    },
    setRelaunchData() {},
  };
}
function environment(nodes: ReturnType<typeof node>[]) {
  (globalThis as any).figma = { currentPage: { selection: nodes } };
}
describe("batch safety", () => {
  it("does not duplicate generated effects on repeated apply", async () => {
    const n = node("one");
    environment([n]);
    await runBatch("apply", DEFAULTS);
    const expected = n.effects.length;
    const second = await runBatch("apply", DEFAULTS);
    expect(second.applied).toBe(1);
    expect(n.effects.length).toBe(expected);
  });
  it("restores baseline on remove with no manual edits", async () => {
    const n = node("two");
    environment([n]);
    await runBatch("apply", DEFAULTS);
    const removed = await runBatch("remove", DEFAULTS);
    expect(removed.applied).toBe(1);
    expect(n.effects).toEqual([
      { type: "LAYER_BLUR", radius: 4, visible: true },
    ]);
    expect(n.getPluginData(ATTACH_KEY)).toBe("");
  });
  it("rejects manual changes with no destructive overwrite", async () => {
    const n = node("three");
    environment([n]);
    await runBatch("apply", DEFAULTS);
    n.effects.push({ type: "LAYER_BLUR", radius: 99, visible: true });
    const before = JSON.stringify(n.effects);
    const removed = await runBatch("remove", DEFAULTS);
    expect(removed.conflicted).toBe(1);
    expect(JSON.stringify(n.effects)).toBe(before);
  });
  it("continues past conflicting nodes safely", async () => {
    const a = node("a"),
      b = node("b");
    environment([a, b]);
    await runBatch("apply", DEFAULTS);
    a.effects.push({ type: "LAYER_BLUR", radius: 42, visible: true });
    const result = await runBatch("apply", DEFAULTS);
    expect(result.conflicted).toBe(1);
    expect(result.applied).toBe(1);
  });
});
