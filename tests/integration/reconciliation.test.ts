import { describe, it, expect } from "vitest";
import {
  fingerprint,
  reconcile,
  nextAppliedEffects,
} from "../../src/domain/effect-reconciliation";
import type { AttachmentV2 } from "../../src/domain/types";
import { baseline } from "../fixtures/effects";
import { DEFAULTS } from "../../src/domain/defaults";
const generated = [{ type: "DROP_SHADOW", radius: 8 }];
const after = nextAppliedEffects(baseline, generated);
const attachment: AttachmentV2 = {
  version: 2,
  params: DEFAULTS,
  baselineEffects: baseline,
  generatedEffects: generated,
  appliedFingerprint: fingerprint(after),
  updatedAt: 1,
};
describe("safe reconciliation", () => {
  it("is clean on identical document state", () =>
    expect(reconcile(after, attachment)).toBe("clean"));
  it("detects manual edits", () =>
    expect(
      reconcile([...after, { type: "LAYER_BLUR", radius: 10 }], attachment),
    ).toBe("conflict"));
  it("never mutates baseline effect snapshots", () => {
    const input = JSON.stringify(baseline);
    nextAppliedEffects(baseline, generated);
    expect(JSON.stringify(baseline)).toBe(input);
  });
});
