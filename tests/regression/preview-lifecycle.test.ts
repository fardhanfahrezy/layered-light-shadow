import { describe, it, expect } from "vitest";
import { PreviewController } from "../../src/application/preview-controller";
import { CommandHandler } from "../../src/application/command-handler";
import { DEFAULTS, ATTACH_KEY } from "../../src/domain/defaults";
import { invalidatePendingPreview } from "../../src/ui/preview-timer";

function node(id: string) {
  const data: Record<string, string> = {};
  return {
    id,
    name: id,
    type: "RECTANGLE",
    removed: false,
    width: 120,
    height: 80,
    effects: [] as Array<Record<string, unknown>>,
    getPluginData(key: string) {
      return data[key] ?? "";
    },
    setPluginData(key: string, value: string) {
      data[key] = value;
    },
    setRelaunchData() {},
  };
}

function environment(nodes: ReturnType<typeof node>[]) {
  (globalThis as any).figma = {
    currentPage: { selection: nodes },
    ui: { postMessage: () => undefined },
    notify: () => undefined,
    on: () => undefined,
    showUI: () => undefined,
  };
}

describe("preview lifecycle", () => {
  it("stale cancel revision 8 must not cancel active preview revision 10", () => {
    const target = node("cancel-stale");
    environment([target]);
    const preview = new PreviewController();

    preview.preview(DEFAULTS, 10);
    expect(target.effects.length).toBeGreaterThanOrEqual(1);

    preview.cancel(8);
    expect(target.effects.length).toBeGreaterThanOrEqual(1);
    if (target.effects.length <= 0) {
      throw new Error("stale cancel should not clear the active preview");
    }
  });

  it("valid cancel revision 11 cancels preview revision 10", () => {
    const target = node("cancel-valid");
    environment([target]);
    const preview = new PreviewController();

    preview.preview(DEFAULTS, 10);
    expect(target.effects.length).toBeGreaterThanOrEqual(1);

    preview.cancel(11);
    expect(target.effects).toEqual([]);
  });

  it("invalidates pending preview timers", () => {
    const state = { request: 4, timeout: 42 as number | undefined };
    const calls: number[] = [];
    const original = globalThis.clearTimeout.bind(globalThis);
    (globalThis as any).clearTimeout = (value: number) => {
      calls.push(value);
      original(value);
    };

    invalidatePendingPreview(state);

    expect(state.request).toBe(5);
    if (state.timeout !== undefined) {
      throw new Error("pending timer should be invalidated");
    }
    expect(calls).toEqual([42]);
    (globalThis as any).clearTimeout = original;
  });

  it("ignores stale preview revisions after cancellation", () => {
    const target = node("preview");
    environment([target]);
    const preview = new PreviewController();

    preview.preview(DEFAULTS, 1);
    expect(target.effects.length).toBeGreaterThanOrEqual(1);

    preview.cancel(2);
    expect(target.effects).toEqual([]);

    preview.preview(DEFAULTS, 1);
    expect(target.effects).toEqual([]);

    expect(target.getPluginData(ATTACH_KEY)).toBe("");
  });

  it("ignores stale previews from a previous selection", () => {
    const first = node("a");
    const second = node("b");
    environment([first]);
    const preview = new PreviewController();

    preview.preview(DEFAULTS, 11);
    expect(first.effects.length).toBeGreaterThanOrEqual(1);

    environment([second]);
    preview.preview(DEFAULTS, 12);
    expect(first.effects).toEqual([]);
    expect(second.effects.length).toBeGreaterThanOrEqual(1);

    preview.preview(DEFAULTS, 11);
    expect(second.effects.length).toBeGreaterThanOrEqual(1);
  });

  it("never overwrites external manual edits during preview", () => {
    const target = node("manual-edit");
    environment([target]);
    const preview = new PreviewController();

    preview.preview(DEFAULTS, 21);
    const manual = { type: "LAYER_BLUR", radius: 999, visible: true };
    target.effects.push(manual);

    preview.preview(DEFAULTS, 22);
    expect(target.effects[target.effects.length - 1]).toEqual(manual);
  });

  it("ignores preview commands while a batch action is active", async () => {
    const target = node("batch-active");
    environment([target]);
    const handler = new CommandHandler();
    (handler as any).activeBatchOperation = 1;

    await handler.handle({ type: "preview", params: DEFAULTS });

    expect(target.effects).toEqual([]);
  });
});
