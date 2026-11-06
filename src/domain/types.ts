export type Point = { x: number; y: number };
export type Color = { r: number; g: number; b: number; a: number };
export type Curve =
  | "legacy"
  | "linear"
  | "ease-in"
  | "ease-out"
  | "exponential";
export interface ShadowParams {
  depth: number;
  softness: number;
  layers: number;
  opacity: number;
  color: Color;
  light: Point;
  spread: number;
  curve: Curve;
}
export interface Geometry {
  width: number;
  height: number;
}
export interface DropShadow {
  type: "DROP_SHADOW";
  color: Color;
  offset: Point;
  radius: number;
  spread?: number;
  visible: true;
  blendMode: "NORMAL";
}
export type SerializedEffect = Record<string, unknown>;
export interface AttachmentV2 {
  version: 2;
  params: ShadowParams;
  baselineEffects: SerializedEffect[];
  generatedEffects: SerializedEffect[];
  appliedFingerprint: string;
  updatedAt: number;
}
export interface SelectionSummary {
  key: string;
  total: number;
  eligible: number;
  bound: number;
  conflicted: number;
  unsupported: number;
  name: string;
}
export interface BatchResult {
  total: number;
  applied: number;
  skipped: number;
  conflicted: number;
  failed: number;
  errors: string[];
}
export interface Preset {
  id: string;
  name: string;
  category: "ui" | "creative" | "custom";
  params: ShadowParams;
}
