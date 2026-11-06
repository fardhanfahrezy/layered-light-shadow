# Manual Figma E2E checklist

1. Import `manifest.json` using Figma Desktop > Plugins > Development > Import plugin from manifest.
2. Select rectangle with existing blur; Apply twice. Verify no duplicate shadows and correct baseline.
3. Change original effects manually, then Remove. Verify conflict modal and no destructive overwrite unless explicitly confirmed.
4. Apply to three rectangles and one unsupported node. Verify batch result and no blank overwrite.
5. Toggle Live preview, adjust sliders and Cancel; verify original effects return.
6. Apply, close plugin, reopen, and verify state is reloaded.
7. Export CSS and verify all layers are included.
8. Try the legacy sample attachment on a copy of a design; confirm safe migration.
9. Test undo/redo and switching selections while previewing.
10. Compare CSS rendering with the Figma design manually (differences are expected).

This manual checklist has NOT been executed in the artifact-building environment.
