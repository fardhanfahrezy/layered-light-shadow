import type { Preset, ShadowParams } from "./types";
import { DEFAULTS } from "./defaults";
export const BUILTIN_PRESETS: Preset[] = [
  { id: "floating", name: "Floating", category: "ui", params: { ...DEFAULTS } },
  {
    id: "soft-ambient",
    name: "Soft Ambient",
    category: "ui",
    params: {
      ...DEFAULTS,
      depth: 12,
      softness: 52,
      layers: 8,
      opacity: 18,
      light: { x: 50, y: 28 },
    },
  },
  {
    id: "subtle",
    name: "Subtle",
    category: "ui",
    params: {
      ...DEFAULTS,
      depth: 5,
      softness: 14,
      layers: 4,
      opacity: 14,
      light: { x: 50, y: 20 },
    },
  },
  {
    id: "material",
    name: "Material Elevation",
    category: "ui",
    params: {
      ...DEFAULTS,
      depth: 20,
      softness: 28,
      layers: 6,
      opacity: 23,
      light: { x: 50, y: 12 },
    },
  },
  {
    id: "dramatic",
    name: "Dramatic",
    category: "creative",
    params: {
      ...DEFAULTS,
      depth: 78,
      softness: 52,
      layers: 12,
      opacity: 42,
      light: { x: -20, y: -20 },
      curve: "ease-out",
    },
  },
  {
    id: "warm",
    name: "Warm Glow",
    category: "creative",
    params: {
      ...DEFAULTS,
      depth: 17,
      softness: 64,
      layers: 10,
      opacity: 25,
      color: { r: 0.6, g: 0.26, b: 0.1, a: 1 },
      light: { x: 40, y: -15 },
    },
  },
];
export function findPreset(id: string): ShadowParams | undefined {
  return BUILTIN_PRESETS.find((p) => p.id === id)?.params;
}
