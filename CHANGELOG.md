# Changelog

## [2.0.0] — 2026-11-04

- Rebuilt the original single-file plugin into typed domain/application/infrastructure/UI modules.
- Preserved original plugin ID and pluginData key; added conservative v1 migration.
- Added deterministic shadow curves, adjustable spread, six presets, and local custom preset storage.
- Added exact snapshot comparison to prevent silent overwrites of externally edited effects.
- Added cancellable optional live preview, multi-selection per-node processing, and CSS export.
- Added Figma-compatible compiled artifacts, test fixtures, tests and a manual E2E checklist.
- Added optional draggable on-canvas light handle for supported Figma clients (not yet E2E-tested).
- **Verification**: plugin runtime and dependency-based CI were not executed in the packaging environment.
