import type { AttachmentV2, SerializedEffect } from "../domain/types";
import { normalizeParams, isLegacyParams } from "../shared/validation";
import { fingerprint, snapshot } from "../domain/effect-reconciliation";
import { generateShadowStack } from "../domain/shadow-engine";
import { canonical } from "../domain/effect-reconciliation";
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
    if (
      data?.version === 2 &&
      Array.isArray(data.baselineEffects) &&
      Array.isArray(data.generatedEffects) &&
      typeof data.appliedFingerprint === "string" &&
      data.params
    ) {
      const attachment: AttachmentV2 = {
        version: 2,
        params: normalizeParams(data.params),
        baselineEffects: snapshot(data.baselineEffects),
        generatedEffects: snapshot(data.generatedEffects),
        appliedFingerprint: data.appliedFingerprint,
        updatedAt: Number(data.updatedAt) || 0,
      };
      return { attachment, status: "valid" };
    }
    if (
      data?.version === 1 &&
      isLegacyParams(data.params) &&
      Array.isArray(data.state?.originalEffects)
    ) {
      const params = normalizeParams(data.params);
      const baseline = snapshot(
        data.state.originalEffects,
      ) as SerializedEffect[];
      const predicted = generateShadowStack(
        params,
        geometry,
      ) as unknown as SerializedEffect[];
      // Legacy metadata can safely migrate ONLY if full stack matches expected legacy output.
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
