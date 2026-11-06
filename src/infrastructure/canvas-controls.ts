import type { ShadowParams } from "../domain/types";

type PointValue = { x: number; y: number };

type CanvasControlLike = {
  remove(): void;
  removed: boolean;
  on(event: "change", callback: (value: PointValue) => void): void;
};

type CanvasControlHost = SceneNode & {
  createCanvasControl?: (options: {
    key: string;
    type: "POINT";
    name: string;
    unit: "%";
    value: PointValue;
  }) => CanvasControlLike;
};

// Optional Figma canvas control. The UI sliders remain usable in clients without this API.
export class LightCanvasControl {
  private currentId: string | null = null;
  private controls: CanvasControlLike[] = [];
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
    onChange: (light: PointValue) => void,
  ) {
    if (this.currentId === node.id && this.controls.length) return;
    this.clear();
    const maker = (node as CanvasControlHost).createCanvasControl;
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
      control.on("change", (value: PointValue) => onChange(value));
    } catch {
      this.clear();
    }
  }
}
