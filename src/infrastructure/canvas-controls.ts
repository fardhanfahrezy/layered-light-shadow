import type { ShadowParams } from "../domain/types";
// Optional Figma canvas control. The UI sliders remain usable in clients without this API.
export class LightCanvasControl {
  private currentId: string | null = null;
  private controls: Array<{ remove(): void; removed: boolean }> = [];
  clear() {
    for (const control of this.controls) {
      try {
        if (!control.removed) control.remove();
      } catch {}
    }
    this.controls = [];
    this.currentId = null;
  }
  attach(
    node: SceneNode,
    params: ShadowParams,
    onChange: (light: { x: number; y: number }) => void,
  ) {
    if (this.currentId === node.id && this.controls.length) return;
    this.clear();
    const maker = (
      node as SceneNode & { createCanvasControl?: (options: unknown) => any }
    ).createCanvasControl;
    if (typeof maker !== "function") return;
    try {
      const control = maker.call(node, {
        key: "param:light",
        type: "POINT",
        name: "Light source",
        unit: "%",
        value: params.light,
      });
      this.controls.push(control);
      this.currentId = node.id;
      control.on("change", (value: { x: number; y: number }) =>
        onChange(value),
      );
    } catch {
      this.clear();
    }
  }
}
