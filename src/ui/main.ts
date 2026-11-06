import type { UIToPlugin, PluginToUI } from "../shared/messages";
import type { Color } from "../domain/types";
import { normalizeParams } from "../shared/validation";
import { DEFAULTS } from "../domain/defaults";
import { state } from "./state/store";
import { renderPreview } from "./components/preview";
const byId = <T extends HTMLElement = HTMLElement>(id: string): T =>
  document.getElementById(id) as T;
const send = (msg: UIToPlugin) =>
  parent.postMessage({ pluginMessage: msg }, "*");
const nums = [
  "depth",
  "softness",
  "layers",
  "opacity",
  "spread",
  "lightX",
  "lightY",
] as const;
const hex = (color: Color): string =>
  "#" +
  [color.r, color.g, color.b]
    .map((c) =>
      Math.round(c * 255)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("");
const fromHex = (value: string): Color => {
  const n = parseInt(value.slice(1), 16);
  return {
    r: ((n >> 16) & 255) / 255,
    g: ((n >> 8) & 255) / 255,
    b: (n & 255) / 255,
    a: 1,
  };
};
function controlsFromState() {
  const p = state.params;
  for (const k of nums) {
    const value =
      k === "lightX" ? p.light.x : k === "lightY" ? p.light.y : p[k];
    byId<HTMLInputElement>(k).value = String(value);
    byId(k + "Value").textContent =
      String(value) +
      (k === "opacity" || k.startsWith("light")
        ? "%"
        : k === "layers"
          ? ""
          : " px");
  }
  byId<HTMLInputElement>("color").value = hex(p.color);
  byId<HTMLSelectElement>("curve").value = p.curve;
  renderPreview(byId("visual"), p);
}
function readControls() {
  state.params = normalizeParams({
    ...state.params,
    depth: Number(byId<HTMLInputElement>("depth").value),
    softness: Number(byId<HTMLInputElement>("softness").value),
    layers: Number(byId<HTMLInputElement>("layers").value),
    opacity: Number(byId<HTMLInputElement>("opacity").value),
    spread: Number(byId<HTMLInputElement>("spread").value),
    light: {
      x: Number(byId<HTMLInputElement>("lightX").value),
      y: Number(byId<HTMLInputElement>("lightY").value),
    },
    color: fromHex(byId<HTMLInputElement>("color").value),
    curve: byId<HTMLSelectElement>("curve").value,
  });
  state.currentPreset = "";
  byId<HTMLSelectElement>("preset").value = "";
  controlsFromState();
  schedulePreview();
}
let debounce: number | undefined;
function schedulePreview() {
  if (!byId<HTMLInputElement>("live").checked) return;
  clearTimeout(debounce);
  debounce = window.setTimeout(
    () => send({ type: "preview", params: state.params }),
    130,
  );
}
function setStatus() {
  const s = state.selection;
  byId("selection").textContent = s.total
    ? `${s.name} • ${s.eligible} eligible, ${s.bound} managed`
    : "No selection";
  byId("status").textContent = s.total
    ? `${s.eligible} of ${s.total} selected layer(s) support effects.${s.conflicted ? " Conflicts detected: " + s.conflicted + "." : ""}`
    : "Select one or more layers in Figma.";
  for (const id of ["apply", "remove", "live"])
    byId<HTMLInputElement>(id).disabled = !s.eligible;
  byId<HTMLButtonElement>("remove").disabled = !s.bound;
  byId<HTMLButtonElement>("cancel").disabled = !state.previewing;
}
function updatePresetList() {
  const el = byId<HTMLSelectElement>("preset");
  const value = state.currentPreset;
  el.replaceChildren(new Option("Custom settings", ""));
  for (const p of state.presets)
    el.add(new Option(`${p.category === "custom" ? "★ " : ""}${p.name}`, p.id));
  el.value = value;
  byId("customDelete").hidden = !state.presets.some(
    (p) => p.id === value && p.category === "custom",
  );
}
for (const id of nums) {
  byId(id).addEventListener("input", readControls);
}
byId("curve").addEventListener("change", readControls);
byId("color").addEventListener("input", readControls);
byId("live").addEventListener("change", () => {
  if (byId<HTMLInputElement>("live").checked) schedulePreview();
  else send({ type: "cancel-preview" });
});
byId("preset").addEventListener("change", () => {
  const id = byId<HTMLSelectElement>("preset").value;
  const preset = state.presets.find((p) => p.id === id);
  if (!preset) return;
  state.currentPreset = id;
  state.params = normalizeParams(preset.params);
  controlsFromState();
  schedulePreview();
  updatePresetList();
});
byId("reset").addEventListener("click", () => {
  state.params = normalizeParams(DEFAULTS);
  state.currentPreset = "";
  controlsFromState();
  updatePresetList();
  schedulePreview();
});
byId("apply").addEventListener("click", () =>
  send({ type: "apply", params: state.params }),
);
byId("remove").addEventListener("click", () => send({ type: "remove" }));
byId("cancel").addEventListener("click", () => {
  clearTimeout(debounce);
  send({ type: "cancel-preview" });
});
byId("export").addEventListener("click", () =>
  send({ type: "export-css", params: state.params }),
);
byId("copy").addEventListener("click", async () => {
  const text = byId<HTMLTextAreaElement>("css").value;
  try {
    await navigator.clipboard.writeText(text);
    byId("status").textContent = "CSS copied to clipboard.";
  } catch {
    byId<HTMLTextAreaElement>("css").select();
    document.execCommand("copy");
  }
});
byId("savePreset").addEventListener("click", () => {
  const name = prompt("Name your preset (max 60 characters):")?.trim();
  if (name) send({ type: "save-preset", name, params: state.params });
});
byId("deletePreset").addEventListener("click", () => {
  if (state.currentPreset)
    send({ type: "delete-preset", id: state.currentPreset });
  state.currentPreset = "";
});
byId("conflictCancel").addEventListener("click", () => {
  byId("conflictDialog").hidden = true;
  state.pendingConflict = null;
});
byId("conflictForce").addEventListener("click", () => {
  if (state.pendingConflict)
    send(
      state.pendingConflict === "apply"
        ? { type: "apply", params: state.params, force: true }
        : { type: "remove", force: true },
    );
  byId("conflictDialog").hidden = true;
  state.pendingConflict = null;
});
window.addEventListener(
  "message",
  (event: MessageEvent<{ pluginMessage: PluginToUI }>) => {
    const msg = event.data?.pluginMessage;
    if (!msg) return;
    if (msg.type === "state") {
      const wasSelection = state.selection.key;
      const newSelection = msg.selection.key;
      state.selection = msg.selection;
      state.presets = msg.presets;
      state.previewing = msg.previewing;
      if (wasSelection !== newSelection) {
        state.params = normalizeParams(msg.params);
        state.currentPreset = "";
        controlsFromState();
      }
      updatePresetList();
      setStatus();
      return;
    }
    if (msg.type === "result") {
      const r = msg.result;
      byId("status").textContent =
        `${msg.action}: ${r.applied} succeeded, ${r.conflicted} conflicts, ${r.failed} errors, ${r.skipped} skipped.`;
      return;
    }
    if (msg.type === "conflict") {
      state.pendingConflict = msg.action;
      byId("conflictText").textContent =
        `${msg.count} layer(s) have changed effects. Forcing this operation will restore the stored baseline and can discard manual effects edits.`;
      byId("conflictDialog").hidden = false;
      return;
    }
    if (msg.type === "css") {
      byId<HTMLTextAreaElement>("css").value = msg.css;
      return;
    }
    if (msg.type === "error") {
      byId("error").textContent = msg.message;
      byId("error").hidden = false;
      return;
    }
    if (msg.type === "notification") {
      byId("status").textContent = msg.message;
    }
  },
);
controlsFromState();
setStatus();
