import type { DropShadow, Geometry, ShadowParams } from "./types";
import { normalizeParams } from "../shared/validation";
import { progression, weights } from "./shadow-distribution";
export function generateShadowStack(
  raw: ShadowParams,
  geometry: Geometry,
): DropShadow[] {
  const p = normalizeParams(raw);
  const scale = Math.max(1, Math.min(geometry.width, geometry.height));
  const dx = ((50 - p.light.x) / 100) * (geometry.width / scale) * p.depth;
  const dy = ((50 - p.light.y) / 100) * (geometry.height / scale) * p.depth;
  const alpha = Math.min(0.99, (p.opacity / 100) * p.color.a),
    w = weights(p.layers);
  return w.map((weight, i) => {
    const q = progression((i + 1) / p.layers, p.curve);
    return {
      type: "DROP_SHADOW",
      color: {
        r: p.color.r,
        g: p.color.g,
        b: p.color.b,
        a: 1 - Math.pow(1 - alpha, weight),
      },
      offset: { x: dx * q, y: dy * q },
      radius: p.softness * q,
      spread: p.spread * q,
      visible: true,
      blendMode: "NORMAL",
    };
  });
}
