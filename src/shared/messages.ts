import type {
  ShadowParams,
  SelectionSummary,
  BatchResult,
  Preset,
} from "../domain/types";
export type UIToPlugin =
  | { type: "apply"; params: ShadowParams; force?: boolean }
  | { type: "remove"; force?: boolean }
  | { type: "preview"; params: ShadowParams }
  | { type: "cancel-preview" }
  | { type: "export-css"; params: ShadowParams }
  | { type: "save-preset"; name: string; params: ShadowParams }
  | { type: "delete-preset"; id: string }
  | { type: "reset" };
export type PluginToUI =
  | {
      type: "state";
      selection: SelectionSummary;
      params: ShadowParams;
      presets: Preset[];
      previewing: boolean;
    }
  | { type: "result"; action: string; result: BatchResult }
  | { type: "conflict"; action: "apply" | "remove"; count: number }
  | { type: "css"; css: string }
  | { type: "error"; message: string }
  | { type: "notification"; message: string };
