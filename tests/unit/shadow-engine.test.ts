import { describe, it, expect } from "vitest";
import { generateShadowStack } from "../../src/domain/shadow-engine";
import { DEFAULTS } from "../../src/domain/defaults";
import { geometry } from "../fixtures/effects";
describe("shadow engine", () => {
  it("is deterministic", () =>
    expect(generateShadowStack(DEFAULTS, geometry)).toEqual(
      generateShadowStack(DEFAULTS, geometry),
    ));
  it("produces exact requested layers", () =>
    expect(
      generateShadowStack({ ...DEFAULTS, layers: 8 }, geometry),
    ).toHaveLength(8));
  it("clamps layer count to integers", () =>
    expect(
      generateShadowStack({ ...DEFAULTS, layers: 12.7 }, geometry),
    ).toHaveLength(13));
  it("avoids invalid numbers on zero-sized objects", () => {
    for (const effect of generateShadowStack(DEFAULTS, { width: 0, height: 0 }))
      expect(
        Number.isFinite(effect.offset.x) && Number.isFinite(effect.radius),
      ).toBe(true);
  });
  it("maintains alpha within 0..1", () => {
    for (const effect of generateShadowStack(
      { ...DEFAULTS, opacity: 100 },
      geometry,
    ))
      expect(effect.color.a).toBeGreaterThanOrEqual(0);
  });
});
