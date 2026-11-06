import type { AttachmentV2, Preset } from "../domain/types";
import { ATTACH_KEY } from "../domain/defaults";
import { parseAttachment } from "./attachment-migration";
import { readEffects } from "./figma-effects";
import { PluginError } from "../shared/errors";
export function readNodeAttachment(node: SceneNode) {
  return parseAttachment(node.getPluginData(ATTACH_KEY), readEffects(node), {
    width: node.width,
    height: node.height,
  });
}
export function storeNodeAttachment(node: SceneNode, data: AttachmentV2): void {
  const raw = JSON.stringify(data);
  if (raw.length > 90000)
    throw new PluginError(
      "STORAGE",
      "Effect snapshot is too large for plugin data.",
    );
  node.setPluginData(ATTACH_KEY, raw);
}
export function clearNodeAttachment(node: SceneNode): void {
  node.setPluginData(ATTACH_KEY, "");
}
const PRESET_STORAGE = "layered-light-shadow:custom-presets-v2";
export async function getCustomPresets(): Promise<Preset[]> {
  try {
    const v = await figma.clientStorage.getAsync(PRESET_STORAGE);
    return Array.isArray(v)
      ? v
          .filter(
            (p) => p && p.category === "custom" && typeof p.name === "string",
          )
          .slice(0, 30)
      : [];
  } catch {
    return [];
  }
}
export async function setCustomPresets(value: Preset[]): Promise<void> {
  await figma.clientStorage.setAsync(PRESET_STORAGE, value.slice(0, 30));
}
