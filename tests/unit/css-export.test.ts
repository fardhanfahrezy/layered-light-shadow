import { describe, it, expect } from "vitest";
import { shadowToCss } from "../../src/domain/css-export";
import { generateShadowStack } from "../../src/domain/shadow-engine";
import { DEFAULTS } from "../../src/domain/defaults";
import { geometry } from "../fixtures/effects";
describe("css exporter", () => {
  it("renders valid box-shadow declaration", () => {
    const css = shadowToCss(generateShadowStack(DEFAULTS, geometry));
    expect(css.startsWith("box-shadow:")).toBe(true);
    expect(css.includes("rgba(")).toBe(true);
    expect(css.trim().endsWith(";")).toBe(true);
  });
  it("renders no shadow", () =>
    expect(shadowToCss([])).toBe("box-shadow: none;"));
});
