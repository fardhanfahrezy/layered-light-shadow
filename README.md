# Layered Light Shadow v2.0 (Figma development plugin)

An offline-first Figma Design plugin that builds deterministic, layered drop shadows with presets, editable controls, non-destructive attachment metadata, live-preview cancellation, multi-selection support and CSS export.

## Quick start (Windows / macOS / Linux)

1. Install Node.js 20+ and npm.
2. Open this directory in VS Code / terminal.
3. Run `npm install` to install and resolve dependencies. The included package-lock.json is a **bootstrap stub** because the original packaging environment had no access to the npm registry; `npm install` regenerates it with complete integrity hashes.
4. Run `npm run check` (TypeScript, ESLint, Vitest, esbuild).
5. Open Figma Desktop > Plugins > Development > Import plugin from manifest; select `manifest.json` in this root.
6. Select one or more shapes, run Layered light shadow, adjust properties and click **Apply shadow**.

`dist/code.js` and `dist/ui.html` have already been generated through an offline fallback builder and are included for immediate import. The normal build uses esbuild after dependencies are installed.

## Features

- Legacy-compatible shadow curve and optional linear/ease-in/ease-out/exponential progression.
- Six built-in presets and 30 user-defined presets (local client storage).
- Multi-selection with per-node results. Unsupported nodes are skipped.
- Live preview: optional, changes the actual selected layer effects temporarily. Click **Cancel preview** or disable preview to restore effects when no external edits have occurred.
- Conflict guard: manual changes to effects since last Apply trigger a warning. **Restore and continue** is destructive and must be used only when users accept losing subsequent manual edits.
- Remove restores the stored baseline effects only when the document state matches the last plugin-applied stack, or with an explicit destructive confirmation.
- CSS output for generated shadow stack (does not guarantee pixel-perfect matching with Figma).

## Important limitations

- **Not verified inside Figma Desktop**: static typecheck and local smoke tests cannot replace an actual plugin runtime / E2E test. Follow `tests/e2e/README.md` before distribution.
- On-canvas light handle is enabled on one clean, plugin-managed selection **when Figma exposes `createCanvasControl`**. It requires direct Figma Desktop testing; the Light X/Y sliders are the fallback.
- Preview is not a fully transactional undo mechanism. If other edits occur while preview is active, the plugin intentionally avoids overwriting mismatched current effects.
- Legacy v1 attachments are accepted for migration only if their current effect stack exactly matches the predicted v1 effects. Ambiguous legacy attachments are blocked rather than overwritten.
- Geometry and effect changes that occurred since the last Apply can raise a conflict; this is an intentional safety constraint.
- Spread is downgraded to 0 for nodes not known to support it.
- Batch processing is per-node best effort, **not** atomic across the full selection.
- Custom preset storage is local to the user/client; it is not synced or exportable in this version.
- No network requests are used by the plugin.

## Development commands

```bash
npm install
npm run build
npm run typecheck
npm run test
npm run lint
npm run check
```

## Compatibility and safety policy

The original plugin ID and attachment key are retained. Versioned metadata is stored in `node.getPluginData` under the original key. Legacy metadata is not silently overwritten when its effects cannot be verified. For safety, use a duplicate Figma file when evaluating migration from the original plugin.

## Architecture

- `src/domain`: pure shadow calculation, presets, effect comparison, CSS serialization.
- `src/application`: command dispatch, preview lifecycle, selection and batch processing.
- `src/infrastructure`: Figma effect adapter, plugin-data migration, local presets.
- `src/ui`: framework-free HTML/CSS/TypeScript interface.
- `src/shared`: message contracts, validation, typed errors.
- `tests`: unit, regression, reconciliation integration and manual E2E checklist.

## Why fingerprint checks?

Figma effects have no stable plugin-owned identifier per element. This project compares the entire applied effect array against a saved snapshot. If its state differs, the plugin refuses automatic removal or replacement, preventing destructive best guesses. Explicit force commands are available with a confirmation dialog.

## Verification scope at delivery

- Included precompiled `dist/` bundle created with `scripts/offline-build.cjs`.
- Local TypeScript strict compile checked with globally installed `tsc`.
- Offline smoke tests recorded in `docs/verification.md`.
- npm registry downloads, esbuild/Vitest/ESLint runs, and Figma Desktop interaction could not be completed in the packaging environment.

## Sources

- https://developers.figma.com/docs/plugins/api/Effect/
- https://developers.figma.com/docs/plugins/api/api-reference/
