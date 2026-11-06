import type { Curve } from "./types";
export function progression(t: number, curve: Curve): number {
  switch (curve) {
    case "linear":
      return t;
    case "ease-out":
      return Math.sqrt(t);
    case "exponential":
      return (Math.exp(3 * t) - 1) / (Math.exp(3) - 1);
    case "ease-in":
    case "legacy":
    default:
      return t * t;
  }
}
export function weights(count: number): number[] {
  const raw = Array.from({ length: count }, (_, i) => 1 / Math.sqrt(i + 1));
  const sum = raw.reduce((a, b) => a + b, 0);
  return raw.map((v) => v / sum);
}
