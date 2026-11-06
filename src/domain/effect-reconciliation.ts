import type { AttachmentV2, SerializedEffect } from "./types";
// Fingerprint is an exact structural comparison; ordering and manual edits are significant.
export const canonical = (value: unknown): string =>
  JSON.stringify(sortKeys(value));
function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => [k, sortKeys(v)]),
    );
  return value;
}
export const snapshot = <T>(value: T): T =>
  JSON.parse(JSON.stringify(value)) as T;
export function fingerprint(effects: readonly SerializedEffect[]): string {
  return canonical(effects);
}
export function reconcile(
  current: readonly SerializedEffect[],
  attachment: AttachmentV2 | null,
): "unbound" | "clean" | "conflict" {
  if (!attachment) return "unbound";
  return fingerprint(current) === attachment.appliedFingerprint
    ? "clean"
    : "conflict";
}
export function nextAppliedEffects(
  baseline: readonly SerializedEffect[],
  generated: readonly SerializedEffect[],
): SerializedEffect[] {
  return [...snapshot(baseline), ...snapshot(generated)];
}
