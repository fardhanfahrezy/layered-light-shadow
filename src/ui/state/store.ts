import type {
  ShadowParams,
  SelectionSummary,
  Preset,
} from "../../domain/types";
import { DEFAULTS } from "../../domain/defaults";
export const state: {
  params: ShadowParams;
  selection: SelectionSummary;
  presets: Preset[];
  previewing: boolean;
  currentPreset: string;
  pendingConflict: "apply" | "remove" | null;
} = {
  params: DEFAULTS,
  selection: {
    key: "",
    total: 0,
    eligible: 0,
    bound: 0,
    conflicted: 0,
    unsupported: 0,
    name: "No selection",
  },
  presets: [],
  previewing: false,
  currentPreset: "",
  pendingConflict: null,
};
