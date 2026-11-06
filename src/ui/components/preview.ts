import type { ShadowParams } from "../../domain/types";
import { generateShadowStack } from "../../domain/shadow-engine";
import { shadowToCss } from "../../domain/css-export";
export function renderPreview(el: HTMLElement, params: ShadowParams): void {
  let card = el.querySelector<HTMLDivElement>(".preview-card");
  if (!card) {
    card = document.createElement("div");
    card.className = "preview-card";
    card.textContent = "Shadow preview";
    el.appendChild(card);
  }
  const effects = generateShadowStack(params, { width: 126, height: 64 });
  card.style.boxShadow = shadowToCss(effects)
    .replace(/^box-shadow:\s*/, "")
    .replace(/;\s*$/, "");
}
