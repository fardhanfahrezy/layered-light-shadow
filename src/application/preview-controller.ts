import type { ShadowParams, SerializedEffect } from "../domain/types";
import { selectedTargets } from "./selection-service";
import { readNodeAttachment } from "../infrastructure/plugin-storage";
import {
  assignEffects,
  readEffects,
  effectParamsForNode,
} from "../infrastructure/figma-effects";
import { generateShadowStack } from "../domain/shadow-engine";
import {
  fingerprint,
  nextAppliedEffects,
  reconcile,
} from "../domain/effect-reconciliation";
interface PreviewEntry {
  node: SceneNode;
  original: SerializedEffect[];
  lastFingerprint: string;
  selectionKey: string;
}
export class PreviewController {
  private entries: PreviewEntry[] = [];
  private revision = 0;
  get active() {
    return this.entries.length > 0;
  }
  private bumpRevision(revision?: number): number {
    if (typeof revision === "number") {
      if (revision < this.revision) return this.revision;
      this.revision = revision;
      return this.revision;
    }
    this.revision += 1;
    return this.revision;
  }
  cancel(revision?: number): void {
    if (typeof revision === "number" && revision < this.revision) return;
    const token = this.bumpRevision(revision);
    for (const item of this.entries) {
      try {
        if (
          !item.node.removed &&
          fingerprint(readEffects(item.node)) === item.lastFingerprint
        )
          assignEffects(item.node, item.original);
      } catch {}
    }
    if (token === this.revision) this.entries = [];
  }
  preview(params: ShadowParams, revision?: number): void {
    if (typeof revision === "number" && revision < this.revision) return;
    const token = this.bumpRevision(revision);
    const targets = selectedTargets();
    const ids = targets
      .map((n) => n.id)
      .sort()
      .join("|");
    if (this.entries.length && this.entries[0].selectionKey !== ids)
      this.cancel(token);
    if (!this.entries.length) {
      for (const node of targets) {
        const original = readEffects(node);
        const read = readNodeAttachment(node);
        if (
          read.status === "corrupt" ||
          reconcile(original, read.attachment) === "conflict"
        )
          continue;
        this.entries.push({
          node,
          original,
          lastFingerprint: fingerprint(original),
          selectionKey: ids,
        });
      }
    }
    for (const e of this.entries) {
      try {
        if (
          e.node.removed ||
          fingerprint(readEffects(e.node)) !== e.lastFingerprint ||
          token !== this.revision
        )
          continue;
        const old = readNodeAttachment(e.node).attachment;
        const baseline = old ? old.baselineEffects : e.original;
        const generated = generateShadowStack(
          effectParamsForNode(e.node, params),
          { width: e.node.width, height: e.node.height },
        ) as unknown as SerializedEffect[];
        const applied = nextAppliedEffects(baseline, generated);
        assignEffects(e.node, applied);
        e.lastFingerprint = fingerprint(applied);
      } catch {}
    }
  }
}
