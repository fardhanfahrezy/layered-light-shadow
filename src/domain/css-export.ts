import type { DropShadow } from "./types";
const n = (value: number) => Number(value.toFixed(3)).toString();
const channel = (v: number) => Math.round(Math.max(0, Math.min(1, v)) * 255);
export function shadowToCss(shadows: readonly DropShadow[]): string {
  if (!shadows.length) return "box-shadow: none;";
  return (
    "box-shadow:\n  " +
    shadows
      .map(
        (s) =>
          `${n(s.offset.x)}px ${n(s.offset.y)}px ${n(s.radius)}px ${n(s.spread ?? 0)}px rgba(${channel(s.color.r)}, ${channel(s.color.g)}, ${channel(s.color.b)}, ${n(s.color.a)})`,
      )
      .join(",\n  ") +
    ";"
  );
}
