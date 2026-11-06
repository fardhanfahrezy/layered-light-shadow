import type {
  AttachmentV2,
  BatchResult,
  ShadowParams,
  SerializedEffect,
} from "../domain/types";
import { generateShadowStack } from "../domain/shadow-engine";
import {
  reconcile,
  fingerprint,
  nextAppliedEffects,
} from "../domain/effect-reconciliation";
import { selectedTargets } from "./selection-service";
import {
  readEffects,
  assignEffects,
  effectParamsForNode,
} from "../infrastructure/figma-effects";
import {
  readNodeAttachment,
  storeNodeAttachment,
  clearNodeAttachment,
} from "../infrastructure/plugin-storage";
import { PluginError, errorMessage } from "../shared/errors";
export type BatchAction = "apply" | "remove";
export async function runBatch(
  action: BatchAction,
  params: ShadowParams,
  force = false,
): Promise<BatchResult> {
  const targets = selectedTargets();
  const result: BatchResult = {
    total: figma.currentPage.selection.length,
    applied: 0,
    skipped: 0,
    conflicted: 0,
    failed: 0,
    errors: [],
  };
  for (const node of targets) {
    const before = readEffects(node),
      rawBefore = node.getPluginData(
        "36604c2e-ece2-495a-a2e0-9b0706ab9301:state",
      );
    try {
      const read = readNodeAttachment(node);
      if (read.status === "corrupt")
        throw new PluginError(
          "CONFLICT",
          `Ambiguous old/corrupted plugin metadata: ${node.name}.`,
        );
      const old = read.attachment;
      const state = reconcile(before, old);
      if (state === "conflict" && !force)
        throw new PluginError(
          "CONFLICT",
          `Effects were edited outside plugin: ${node.name}.`,
        );
      if (action === "remove") {
        if (!old) {
          result.skipped++;
          continue;
        }
        // Explicit force restores baseline and therefore discards intervening manual edits.
        assignEffects(node, old.baselineEffects);
        clearNodeAttachment(node);
        node.setRelaunchData({});
        result.applied++;
        continue;
      }
      const localParams = effectParamsForNode(node, params);
      const generated = generateShadowStack(localParams, {
        width: node.width,
        height: node.height,
      }) as unknown as SerializedEffect[];
      const baseline = old ? old.baselineEffects : before;
      const effects = nextAppliedEffects(baseline, generated);
      const meta: AttachmentV2 = {
        version: 2,
        params: localParams,
        baselineEffects: baseline,
        generatedEffects: generated,
        appliedFingerprint: fingerprint(effects),
        updatedAt: Date.now(),
      };
      // Preflight serialization before mutating the Figma document.
      if (JSON.stringify(meta).length > 90000)
        throw new PluginError("STORAGE", "Attachment exceeds safe size limit.");
      assignEffects(node, effects);
      try {
        storeNodeAttachment(node, meta);
        node.setRelaunchData({
          "36604c2e-ece2-495a-a2e0-9b0706ab9301": "Layered Light Shadow",
        });
      } catch (err) {
        assignEffects(node, before);
        node.setPluginData(
          "36604c2e-ece2-495a-a2e0-9b0706ab9301:state",
          rawBefore,
        );
        throw err;
      }
      result.applied++;
    } catch (err) {
      if (err instanceof PluginError && err.code === "CONFLICT")
        result.conflicted++;
      else result.failed++;
      result.errors.push(errorMessage(err));
      // Best-effort restore only if operation was partially written. No blind overwrite on conflict.
    }
  }
  result.skipped += result.total - targets.length;
  return result;
}
