import type { SerializedEffect, ShadowParams } from "../domain/types";
import { PluginError } from "../shared/errors";
// Restrict spread to node categories documented by the Plugin API.
export function supportsEffects(
  node: SceneNode,
): node is SceneNode & { effects: readonly Effect[] } {
  return !node.removed && "effects" in node;
}
export function supportsSpread(node: SceneNode): boolean {
  if (node.type === "RECTANGLE" || node.type === "ELLIPSE") return true;
  if (
    node.type === "FRAME" ||
    node.type === "COMPONENT" ||
    node.type === "INSTANCE"
  ) {
    const target = node as FrameNode;
    return (
      Boolean(target.clipsContent) &&
      "fills" in target &&
      Array.isArray(target.fills) &&
      target.fills.some((p) => p.visible !== false && p.opacity !== 0)
    );
  }
  return false;
}
export const readEffects = (node: SceneNode): SerializedEffect[] =>
  supportsEffects(node) ? JSON.parse(JSON.stringify(node.effects)) : [];
export function assignEffects(
  node: SceneNode,
  effects: SerializedEffect[],
): void {
  if (!supportsEffects(node))
    throw new PluginError("UNSUPPORTED", "Layer cannot receive effects.");
  node.effects = effects as unknown as Effect[];
}
export function effectParamsForNode(
  node: SceneNode,
  params: ShadowParams,
): ShadowParams {
  return !supportsSpread(node) && params.spread !== 0
    ? { ...params, spread: 0 }
    : params;
}
