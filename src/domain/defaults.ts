import type { ShadowParams } from "./types";
export const TOOL_ID = "36604c2e-ece2-495a-a2e0-9b0706ab9301";
export const ATTACH_KEY = TOOL_ID + ":state";
export const DEFAULTS: ShadowParams = {
  depth: 24,
  softness: 32,
  layers: 6,
  opacity: 28,
  color: { r: 0.04, g: 0.05, b: 0.08, a: 1 },
  light: { x: 15, y: -20 },
  spread: 0,
  curve: "legacy",
};
