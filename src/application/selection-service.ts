import type { SelectionSummary } from "../domain/types";
import { readNodeAttachment } from "../infrastructure/plugin-storage";
import { supportsEffects, readEffects } from "../infrastructure/figma-effects";
import { reconcile } from "../domain/effect-reconciliation";
export function selectedTargets(): SceneNode[] {
  return figma.currentPage.selection.filter(
    (s) => !s.removed && supportsEffects(s),
  );
}
export function summarizeSelection(): SelectionSummary {
  const nodes = [...figma.currentPage.selection];
  let bound = 0,
    conflicted = 0;
  for (const n of nodes) {
    if (!supportsEffects(n)) continue;
    const record = readNodeAttachment(n);
    if (record.status === "corrupt") {
      conflicted++;
      continue;
    }
    if (record.attachment) {
      bound++;
      if (reconcile(readEffects(n), record.attachment) === "conflict")
        conflicted++;
    }
  }
  return {
    key: nodes
      .map((n) => n.id)
      .sort()
      .join("|"),
    total: nodes.length,
    eligible: nodes.filter(supportsEffects).length,
    bound,
    conflicted,
    unsupported: nodes.length - nodes.filter(supportsEffects).length,
    name: nodes.length === 1 ? nodes[0].name : `${nodes.length} layers`,
  };
}
