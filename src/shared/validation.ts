import type { ShadowParams, Color, Point, Curve } from "../domain/types";
import { DEFAULTS } from "../domain/defaults";
export const finite = (v: unknown, fallback: number): number =>
  typeof v === "number" && Number.isFinite(v) ? v : fallback;
export const clamp = (v: number, min: number, max: number) =>
  Math.max(min, Math.min(max, v));
export const point = (raw: unknown, fallback: Point): Point => {
  const v = asRecord(raw);
  return {
    x: clamp(finite(v.x, fallback.x), -200, 200),
    y: clamp(finite(v.y, fallback.y), -200, 200),
  };
};
export const asRecord = (raw: unknown): Record<string, unknown> =>
  raw !== null && typeof raw === "object" && !Array.isArray(raw)
    ? (raw as Record<string, unknown>)
    : {};
export const color = (raw: unknown, fallback: Color): Color => {
  const v = asRecord(raw);
  return {
    r: clamp(finite(v.r, fallback.r), 0, 1),
    g: clamp(finite(v.g, fallback.g), 0, 1),
    b: clamp(finite(v.b, fallback.b), 0, 1),
    a: clamp(finite(v.a, fallback.a), 0, 1),
  };
};
const curves: Curve[] = [
  "legacy",
  "linear",
  "ease-in",
  "ease-out",
  "exponential",
];
export function normalizeParams(
  raw: unknown,
  defaults: ShadowParams = DEFAULTS,
): ShadowParams {
  const v = asRecord(raw);
  return {
    depth: clamp(finite(v.depth, defaults.depth), 0, 200),
    softness: clamp(finite(v.softness, defaults.softness), 0, 200),
    layers: Math.round(clamp(finite(v.layers, defaults.layers), 2, 16)),
    opacity: clamp(finite(v.opacity, defaults.opacity), 0, 100),
    color: color(v.color, defaults.color),
    light: point(v.light, defaults.light),
    spread: clamp(finite(v.spread, defaults.spread), -50, 50),
    curve:
      typeof v.curve === "string" && curves.includes(v.curve as Curve)
        ? (v.curve as Curve)
        : defaults.curve,
  };
}
export function isLegacyParams(raw: unknown): boolean {
  const v = asRecord(raw);
  return (
    ["depth", "softness", "layers", "opacity"].every(
      (k) => typeof v[k] === "number" && Number.isFinite(v[k]),
    ) &&
    Object.keys(asRecord(v.color)).length >= 4 &&
    Object.keys(asRecord(v.light)).length >= 2
  );
}
