import type { AttachmentV2, SerializedEffect } from "../domain/types";
import { normalizeParams, isLegacyParams } from "../shared/validation";
import { fingerprint, snapshot } from "../domain/effect-reconciliation";
import { generateShadowStack } from "../domain/shadow-engine";
import { canonical } from "../domain/effect-reconciliation";

const MAX_ATTACHMENT_BYTES = 90000;
const CURVES = ["legacy", "linear", "ease-in", "ease-out", "exponential"];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const isSerializedEffect = (value: unknown): value is SerializedEffect => {
  if (!isRecord(value)) return false;
  const entry = value as Record<string, unknown>;
  if (typeof entry.type !== "string") return false;
  if ("visible" in entry && typeof entry.visible !== "boolean") return false;
  if ("blendMode" in entry && typeof entry.blendMode !== "string") return false;
  if ("radius" in entry && !isFiniteNumber(entry.radius)) return false;
  if ("spread" in entry && !isFiniteNumber(entry.spread)) return false;
  if ("opacity" in entry && !isFiniteNumber(entry.opacity)) return false;
  if ("x" in entry && !isFiniteNumber(entry.x)) return false;
  if ("y" in entry && !isFiniteNumber(entry.y)) return false;
  if ("offset" in entry) {
    const offset = entry.offset;
    if (!isRecord(offset)) return false;
    if (!isFiniteNumber((offset as Record<string, unknown>).x)) return false;
    if (!isFiniteNumber((offset as Record<string, unknown>).y)) return false;
  }
  if ("color" in entry && !isRecord(entry.color)) return false;
  return true;
};

const isSerializedEffectsArray = (value: unknown): value is SerializedEffect[] =>
  Array.isArray(value) && value.length <= 64 && value.every(isSerializedEffect);

const isShadowParams = (value: unknown): value is AttachmentV2["params"] => {
  if (!isRecord(value)) return false;
  const p = value as Record<string, unknown>;
  if (!isFiniteNumber(p.depth) || !isFiniteNumber(p.softness)) return false;
  if (!isFiniteNumber(p.layers) || !isFiniteNumber(p.opacity)) return false;
  if (!isFiniteNumber(p.spread) || typeof p.curve !== "string") return false;
  if (!CURVES.includes(p.curve as string)) return false;
  if (!isRecord(p.color)) return false;
  const color = p.color as Record<string, unknown>;
  if (
    !["r", "g", "b", "a"].every((key) => isFiniteNumber(color[key]))
  ) {
    return false;
  }
  if (!isRecord(p.light)) return false;
  const light = p.light as Record<string, unknown>;
  return isFiniteNumber(light.x) && isFiniteNumber(light.y);
};

export type ReadResult = {
  attachment: AttachmentV2 | null;
  status: "empty" | "valid" | "legacy" | "corrupt";
};

export function parseAttachment(
  raw: string,
  current: SerializedEffect[],
  geometry: { width: number; height: number },
): ReadResult {
  if (!raw) return { attachment: null, status: "empty" };
  try {
    const data = JSON.parse(raw);
    if (typeof data !== "object" || data === null) {
      return { attachment: null, status: "corrupt" };
    }

    if (data.version === 2) {
      const rawBudget = JSON.stringify(data).length;
      if (
        rawBudget > MAX_ATTACHMENT_BYTES ||
        !isShadowParams(data.params) ||
        !isSerializedEffectsArray(data.baselineEffects) ||
        !isSerializedEffectsArray(data.generatedEffects) ||
        typeof data.appliedFingerprint !== "string" ||
        typeof data.updatedAt !== "number"
      ) {
        return { attachment: null, status: "corrupt" };
      }
      const attachment: AttachmentV2 = {
        version: 2,
        params: normalizeParams(data.params),
        baselineEffects: snapshot(data.baselineEffects),
        generatedEffects: snapshot(data.generatedEffects),
        appliedFingerprint: data.appliedFingerprint,
        updatedAt: data.updatedAt,
      };
      if (
        attachment.appliedFingerprint !==
        fingerprint([...attachment.baselineEffects, ...attachment.generatedEffects])
      ) {
        return { attachment: null, status: "corrupt" };
      }
      return { attachment, status: "valid" };
    }

    if (
      data.version === 1 &&
      isLegacyParams(data.params) &&
      isRecord(data.state) &&
      isSerializedEffectsArray(data.state.originalEffects)
    ) {
      const params = normalizeParams(data.params);
      const baseline = snapshot(data.state.originalEffects) as SerializedEffect[];
      const predicted = generateShadowStack(
        params,
        geometry,
      ) as unknown as SerializedEffect[];
      if (!Array.isArray(predicted) || !predicted.every(isSerializedEffect)) {
        return { attachment: null, status: "corrupt" };
      }
      const isMatch =
        canonical(current) === canonical([...baseline, ...predicted]);
      if (!isMatch) return { attachment: null, status: "corrupt" };
      return {
        attachment: {
          version: 2,
          params,
          baselineEffects: baseline,
          generatedEffects: predicted,
          appliedFingerprint: fingerprint(current),
          updatedAt: Date.now(),
        },
        status: "legacy",
      };
    }
  } catch {}
  return { attachment: null, status: "corrupt" };
}
