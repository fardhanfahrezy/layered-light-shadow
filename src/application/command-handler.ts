import type { UIToPlugin, PluginToUI } from "../shared/messages";
import { DEFAULTS } from "../domain/defaults";
import { normalizeParams } from "../shared/validation";
import { BUILTIN_PRESETS } from "../domain/presets";
import { shadowToCss } from "../domain/css-export";
import { generateShadowStack } from "../domain/shadow-engine";
import { selectedTargets, summarizeSelection } from "./selection-service";
import { runBatch } from "./batch-service";
import { PreviewController } from "./preview-controller";
import {
  getCustomPresets,
  setCustomPresets,
} from "../infrastructure/plugin-storage";
import { errorMessage } from "../shared/errors";
import type { Preset, ShadowParams } from "../domain/types";
import { LightCanvasControl } from "../infrastructure/canvas-controls";
import { readNodeAttachment } from "../infrastructure/plugin-storage";
import { reconcile } from "../domain/effect-reconciliation";
import { readEffects } from "../infrastructure/figma-effects";
const send = (message: PluginToUI) => figma.ui.postMessage(message);
export class CommandHandler {
  private preview = new PreviewController();
  private previewRevision = 0;
  private activeBatchOperation = 0;
  private params: ShadowParams = DEFAULTS;
  private custom: Preset[] = [];
  private lightControl = new LightCanvasControl();
  async initialize() {
    this.custom = await getCustomPresets();
    this.refresh();
  }
  refresh() {
    const nodes = selectedTargets();
    if (!this.preview.active && nodes.length === 1) {
      try {
        const record = requireAttachment(nodes[0]);
        if (record) this.params = record;
      } catch {}
    }
    this.refreshCanvasControl(nodes);
    send({
      type: "state",
      selection: summarizeSelection(),
      params: this.params,
      presets: [...BUILTIN_PRESETS, ...this.custom],
      previewing: this.preview.active,
    });
  }
  private refreshCanvasControl(nodes: SceneNode[]) {
    if (this.preview.active || nodes.length !== 1) {
      this.lightControl.clear();
      return;
    }
    const node = nodes[0],
      record = readNodeAttachment(node);
    if (
      !record.attachment ||
      reconcile(readEffects(node), record.attachment) !== "clean"
    ) {
      this.lightControl.clear();
      return;
    }
    this.lightControl.attach(node, this.params, (light) => {
      this.params = normalizeParams({ ...this.params, light });
      void runBatch("apply", this.params)
        .then(() => this.refresh())
        .catch((error) =>
          send({ type: "error", message: errorMessage(error) }),
        );
    });
  }
  onSelectionChange() {
    this.lightControl.clear();
    this.activeBatchOperation = 0;
    this.previewRevision += 1;
    this.preview.cancel(this.previewRevision);
    this.params = DEFAULTS;
    this.refresh();
  }
  async handle(msg: UIToPlugin) {
    try {
      if (this.activeBatchOperation && (msg.type === "preview" || msg.type === "cancel-preview" || msg.type === "reset")) {
        return;
      }
      if (msg.type === "preview") {
        this.params = normalizeParams(msg.params);
        this.previewRevision += 1;
        this.preview.preview(this.params, this.previewRevision);
        this.refresh();
        return;
      }
      if (msg.type === "cancel-preview" || msg.type === "reset") {
        this.previewRevision += 1;
        this.preview.cancel(this.previewRevision);
        this.params = DEFAULTS;
        this.refresh();
        return;
      }
      if (msg.type === "apply" || msg.type === "remove") {
        this.previewRevision += 1;
        this.activeBatchOperation = this.previewRevision;
        this.preview.cancel(this.previewRevision);
        if (msg.type === "apply") this.params = normalizeParams(msg.params);
        const token = this.activeBatchOperation;
        try {
          const result = await runBatch(
            msg.type,
            this.params,
            Boolean(msg.force),
          );
          if (token !== this.activeBatchOperation) return;
          send({ type: "result", action: msg.type, result });
          if (result.conflicted && !msg.force)
            send({
              type: "conflict",
              action: msg.type,
              count: result.conflicted,
            });
          this.refresh();
        } finally {
          if (token === this.activeBatchOperation) this.activeBatchOperation = 0;
        }
        return;
      }
      if (msg.type === "export-css") {
        const node = selectedTargets()[0];
        const size = node
          ? { width: node.width, height: node.height }
          : { width: 100, height: 100 };
        const generated = generateShadowStack(
          normalizeParams(msg.params),
          size,
        );
        send({ type: "css", css: shadowToCss(generated) });
        return;
      }
      if (msg.type === "save-preset") {
        const name = msg.name.trim().slice(0, 60);
        if (!name) return;
        const id = `custom-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
        this.custom = [
          ...this.custom,
          {
            id,
            name,
            category: "custom" as const,
            params: normalizeParams(msg.params),
          },
        ].slice(-30);
        await setCustomPresets(this.custom);
        this.refresh();
        return;
      }
      if (msg.type === "delete-preset") {
        this.custom = this.custom.filter((p) => p.id !== msg.id);
        await setCustomPresets(this.custom);
        this.refresh();
        return;
      }
    } catch (error) {
      send({ type: "error", message: errorMessage(error) });
    }
  }
  cancel() {
    this.activeBatchOperation = 0;
    this.previewRevision += 1;
    this.preview.cancel(this.previewRevision);
    this.lightControl.clear();
  }
}
function requireAttachment(node: SceneNode): ShadowParams | null {
  // Deferred import kept outside UI runtime; only plugin main accesses this helper.
  const raw = node.getPluginData("36604c2e-ece2-495a-a2e0-9b0706ab9301:state");
  if (!raw) return null;
  try {
    const data = JSON.parse(raw);
    return data?.params ? normalizeParams(data.params) : null;
  } catch {
    return null;
  }
}
