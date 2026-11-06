(function () {
  "use strict";
  const modules = [
    function (module, exports, __req) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      const command_handler_1 = __req(1);
      const handler = new command_handler_1.CommandHandler();
      figma.showUI(__html__, { width: 360, height: 640, themeColors: true });
      figma.on("selectionchange", () => handler.onSelectionChange());
      figma.on("close", () => handler.cancel());
      // Serial execution avoids overlapping Figma writes from consecutive UI messages.
      let queue = Promise.resolve();
      figma.ui.onmessage = (msg) => {
        queue = queue
          .then(() => handler.handle(msg))
          .catch((error) => figma.notify(String(error), { error: true }));
      };
      void handler.initialize();
    },
    function (module, exports, __req) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.CommandHandler = void 0;
      const defaults_1 = __req(2);
      const validation_1 = __req(3);
      const presets_1 = __req(4);
      const css_export_1 = __req(5);
      const shadow_engine_1 = __req(6);
      const selection_service_1 = __req(8);
      const batch_service_1 = __req(14);
      const preview_controller_1 = __req(15);
      const plugin_storage_1 = __req(9);
      const errors_1 = __req(13);
      const canvas_controls_1 = __req(16);
      const plugin_storage_2 = __req(9);
      const effect_reconciliation_1 = __req(11);
      const figma_effects_1 = __req(12);
      const send = (message) => figma.ui.postMessage(message);
      class CommandHandler {
        constructor() {
          this.preview = new preview_controller_1.PreviewController();
          this.params = defaults_1.DEFAULTS;
          this.custom = [];
          this.lightControl = new canvas_controls_1.LightCanvasControl();
        }
        async initialize() {
          this.custom = await (0, plugin_storage_1.getCustomPresets)();
          this.refresh();
        }
        refresh() {
          const nodes = (0, selection_service_1.selectedTargets)();
          if (!this.preview.active && nodes.length === 1) {
            try {
              const record = requireAttachment(nodes[0]);
              if (record) this.params = record;
            } catch {}
          }
          this.refreshCanvasControl(nodes);
          send({
            type: "state",
            selection: (0, selection_service_1.summarizeSelection)(),
            params: this.params,
            presets: [...presets_1.BUILTIN_PRESETS, ...this.custom],
            previewing: this.preview.active,
          });
        }
        refreshCanvasControl(nodes) {
          if (this.preview.active || nodes.length !== 1) {
            this.lightControl.clear();
            return;
          }
          const node = nodes[0],
            record = (0, plugin_storage_2.readNodeAttachment)(node);
          if (
            !record.attachment ||
            (0, effect_reconciliation_1.reconcile)(
              (0, figma_effects_1.readEffects)(node),
              record.attachment,
            ) !== "clean"
          ) {
            this.lightControl.clear();
            return;
          }
          this.lightControl.attach(node, this.params, (light) => {
            this.params = (0, validation_1.normalizeParams)({
              ...this.params,
              light,
            });
            void (0, batch_service_1.runBatch)("apply", this.params)
              .then(() => this.refresh())
              .catch((error) =>
                send({
                  type: "error",
                  message: (0, errors_1.errorMessage)(error),
                }),
              );
          });
        }
        onSelectionChange() {
          this.lightControl.clear();
          this.preview.cancel();
          this.params = defaults_1.DEFAULTS;
          this.refresh();
        }
        async handle(msg) {
          try {
            if (msg.type === "preview") {
              this.params = (0, validation_1.normalizeParams)(msg.params);
              this.preview.preview(this.params);
              this.refresh();
              return;
            }
            if (msg.type === "cancel-preview" || msg.type === "reset") {
              this.preview.cancel();
              this.params = defaults_1.DEFAULTS;
              this.refresh();
              return;
            }
            if (msg.type === "apply" || msg.type === "remove") {
              this.preview.cancel();
              if (msg.type === "apply")
                this.params = (0, validation_1.normalizeParams)(msg.params);
              const result = await (0, batch_service_1.runBatch)(
                msg.type,
                this.params,
                Boolean(msg.force),
              );
              send({ type: "result", action: msg.type, result });
              if (result.conflicted && !msg.force)
                send({
                  type: "conflict",
                  action: msg.type,
                  count: result.conflicted,
                });
              this.refresh();
              return;
            }
            if (msg.type === "export-css") {
              const node = (0, selection_service_1.selectedTargets)()[0];
              const size = node
                ? { width: node.width, height: node.height }
                : { width: 100, height: 100 };
              const generated = (0, shadow_engine_1.generateShadowStack)(
                (0, validation_1.normalizeParams)(msg.params),
                size,
              );
              send({
                type: "css",
                css: (0, css_export_1.shadowToCss)(generated),
              });
              return;
            }
            if (msg.type === "save-preset") {
              const name = msg.name.trim().slice(0, 60);
              if (!name) return;
              const id = `custom-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
              this.custom = [
                ...this.custom,
                {
                  id,
                  name,
                  category: "custom",
                  params: (0, validation_1.normalizeParams)(msg.params),
                },
              ].slice(-30);
              await (0, plugin_storage_1.setCustomPresets)(this.custom);
              this.refresh();
              return;
            }
            if (msg.type === "delete-preset") {
              this.custom = this.custom.filter((p) => p.id !== msg.id);
              await (0, plugin_storage_1.setCustomPresets)(this.custom);
              this.refresh();
              return;
            }
          } catch (error) {
            send({ type: "error", message: (0, errors_1.errorMessage)(error) });
          }
        }
        cancel() {
          this.preview.cancel();
          this.lightControl.clear();
        }
      }
      exports.CommandHandler = CommandHandler;
      function requireAttachment(node) {
        // Deferred import kept outside UI runtime; only plugin main accesses this helper.
        const raw = node.getPluginData(
          "36604c2e-ece2-495a-a2e0-9b0706ab9301:state",
        );
        if (!raw) return null;
        try {
          const data = JSON.parse(raw);
          return data?.params
            ? (0, validation_1.normalizeParams)(data.params)
            : null;
        } catch {
          return null;
        }
      }
    },
    function (module, exports, __req) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.DEFAULTS = exports.ATTACH_KEY = exports.TOOL_ID = void 0;
      exports.TOOL_ID = "36604c2e-ece2-495a-a2e0-9b0706ab9301";
      exports.ATTACH_KEY = exports.TOOL_ID + ":state";
      exports.DEFAULTS = {
        depth: 24,
        softness: 32,
        layers: 6,
        opacity: 28,
        color: { r: 0.04, g: 0.05, b: 0.08, a: 1 },
        light: { x: 15, y: -20 },
        spread: 0,
        curve: "legacy",
      };
    },
    function (module, exports, __req) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.color =
        exports.asRecord =
        exports.point =
        exports.clamp =
        exports.finite =
          void 0;
      exports.normalizeParams = normalizeParams;
      exports.isLegacyParams = isLegacyParams;
      const defaults_1 = __req(2);
      const finite = (v, fallback) =>
        typeof v === "number" && Number.isFinite(v) ? v : fallback;
      exports.finite = finite;
      const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
      exports.clamp = clamp;
      const point = (raw, fallback) => {
        const v = (0, exports.asRecord)(raw);
        return {
          x: (0, exports.clamp)(
            (0, exports.finite)(v.x, fallback.x),
            -200,
            200,
          ),
          y: (0, exports.clamp)(
            (0, exports.finite)(v.y, fallback.y),
            -200,
            200,
          ),
        };
      };
      exports.point = point;
      const asRecord = (raw) =>
        raw !== null && typeof raw === "object" && !Array.isArray(raw)
          ? raw
          : {};
      exports.asRecord = asRecord;
      const color = (raw, fallback) => {
        const v = (0, exports.asRecord)(raw);
        return {
          r: (0, exports.clamp)((0, exports.finite)(v.r, fallback.r), 0, 1),
          g: (0, exports.clamp)((0, exports.finite)(v.g, fallback.g), 0, 1),
          b: (0, exports.clamp)((0, exports.finite)(v.b, fallback.b), 0, 1),
          a: (0, exports.clamp)((0, exports.finite)(v.a, fallback.a), 0, 1),
        };
      };
      exports.color = color;
      const curves = ["legacy", "linear", "ease-in", "ease-out", "exponential"];
      function normalizeParams(raw, defaults = defaults_1.DEFAULTS) {
        const v = (0, exports.asRecord)(raw);
        return {
          depth: (0, exports.clamp)(
            (0, exports.finite)(v.depth, defaults.depth),
            0,
            200,
          ),
          softness: (0, exports.clamp)(
            (0, exports.finite)(v.softness, defaults.softness),
            0,
            200,
          ),
          layers: Math.round(
            (0, exports.clamp)(
              (0, exports.finite)(v.layers, defaults.layers),
              2,
              16,
            ),
          ),
          opacity: (0, exports.clamp)(
            (0, exports.finite)(v.opacity, defaults.opacity),
            0,
            100,
          ),
          color: (0, exports.color)(v.color, defaults.color),
          light: (0, exports.point)(v.light, defaults.light),
          spread: (0, exports.clamp)(
            (0, exports.finite)(v.spread, defaults.spread),
            -50,
            50,
          ),
          curve:
            typeof v.curve === "string" && curves.includes(v.curve)
              ? v.curve
              : defaults.curve,
        };
      }
      function isLegacyParams(raw) {
        const v = (0, exports.asRecord)(raw);
        return (
          ["depth", "softness", "layers", "opacity"].every(
            (k) => typeof v[k] === "number" && Number.isFinite(v[k]),
          ) &&
          Object.keys((0, exports.asRecord)(v.color)).length >= 4 &&
          Object.keys((0, exports.asRecord)(v.light)).length >= 2
        );
      }
    },
    function (module, exports, __req) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.BUILTIN_PRESETS = void 0;
      exports.findPreset = findPreset;
      const defaults_1 = __req(2);
      exports.BUILTIN_PRESETS = [
        {
          id: "floating",
          name: "Floating",
          category: "ui",
          params: { ...defaults_1.DEFAULTS },
        },
        {
          id: "soft-ambient",
          name: "Soft Ambient",
          category: "ui",
          params: {
            ...defaults_1.DEFAULTS,
            depth: 12,
            softness: 52,
            layers: 8,
            opacity: 18,
            light: { x: 50, y: 28 },
          },
        },
        {
          id: "subtle",
          name: "Subtle",
          category: "ui",
          params: {
            ...defaults_1.DEFAULTS,
            depth: 5,
            softness: 14,
            layers: 4,
            opacity: 14,
            light: { x: 50, y: 20 },
          },
        },
        {
          id: "material",
          name: "Material Elevation",
          category: "ui",
          params: {
            ...defaults_1.DEFAULTS,
            depth: 20,
            softness: 28,
            layers: 6,
            opacity: 23,
            light: { x: 50, y: 12 },
          },
        },
        {
          id: "dramatic",
          name: "Dramatic",
          category: "creative",
          params: {
            ...defaults_1.DEFAULTS,
            depth: 78,
            softness: 52,
            layers: 12,
            opacity: 42,
            light: { x: -20, y: -20 },
            curve: "ease-out",
          },
        },
        {
          id: "warm",
          name: "Warm Glow",
          category: "creative",
          params: {
            ...defaults_1.DEFAULTS,
            depth: 17,
            softness: 64,
            layers: 10,
            opacity: 25,
            color: { r: 0.6, g: 0.26, b: 0.1, a: 1 },
            light: { x: 40, y: -15 },
          },
        },
      ];
      function findPreset(id) {
        return exports.BUILTIN_PRESETS.find((p) => p.id === id)?.params;
      }
    },
    function (module, exports, __req) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.shadowToCss = shadowToCss;
      const n = (value) => Number(value.toFixed(3)).toString();
      const channel = (v) => Math.round(Math.max(0, Math.min(1, v)) * 255);
      function shadowToCss(shadows) {
        if (!shadows.length) return "box-shadow: none;";
        return (
          "box-shadow:\n  " +
          shadows
            .map(
              (s) =>
                `${n(s.offset.x)}px ${n(s.offset.y)}px ${n(s.radius)}px ${n(s.spread ?? 0)}px rgba(${channel(s.color.r)}, ${channel(s.color.g)}, ${channel(s.color.b)}, ${n(s.color.a)})`,
            )
            .join(",\n  ") +
          ";"
        );
      }
    },
    function (module, exports, __req) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.generateShadowStack = generateShadowStack;
      const validation_1 = __req(3);
      const shadow_distribution_1 = __req(7);
      function generateShadowStack(raw, geometry) {
        const p = (0, validation_1.normalizeParams)(raw);
        const scale = Math.max(1, Math.min(geometry.width, geometry.height));
        const dx =
          ((50 - p.light.x) / 100) * (geometry.width / scale) * p.depth;
        const dy =
          ((50 - p.light.y) / 100) * (geometry.height / scale) * p.depth;
        const alpha = Math.min(0.99, (p.opacity / 100) * p.color.a),
          w = (0, shadow_distribution_1.weights)(p.layers);
        return w.map((weight, i) => {
          const q = (0, shadow_distribution_1.progression)(
            (i + 1) / p.layers,
            p.curve,
          );
          return {
            type: "DROP_SHADOW",
            color: {
              r: p.color.r,
              g: p.color.g,
              b: p.color.b,
              a: 1 - Math.pow(1 - alpha, weight),
            },
            offset: { x: dx * q, y: dy * q },
            radius: p.softness * q,
            spread: p.spread * q,
            visible: true,
            blendMode: "NORMAL",
          };
        });
      }
    },
    function (module, exports, __req) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.progression = progression;
      exports.weights = weights;
      function progression(t, curve) {
        switch (curve) {
          case "linear":
            return t;
          case "ease-out":
            return Math.sqrt(t);
          case "exponential":
            return (Math.exp(3 * t) - 1) / (Math.exp(3) - 1);
          case "ease-in":
          case "legacy":
          default:
            return t * t;
        }
      }
      function weights(count) {
        const raw = Array.from(
          { length: count },
          (_, i) => 1 / Math.sqrt(i + 1),
        );
        const sum = raw.reduce((a, b) => a + b, 0);
        return raw.map((v) => v / sum);
      }
    },
    function (module, exports, __req) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.selectedTargets = selectedTargets;
      exports.summarizeSelection = summarizeSelection;
      const plugin_storage_1 = __req(9);
      const figma_effects_1 = __req(12);
      const effect_reconciliation_1 = __req(11);
      function selectedTargets() {
        return figma.currentPage.selection.filter(
          (s) => !s.removed && (0, figma_effects_1.supportsEffects)(s),
        );
      }
      function summarizeSelection() {
        const nodes = [...figma.currentPage.selection];
        let bound = 0,
          conflicted = 0;
        for (const n of nodes) {
          if (!(0, figma_effects_1.supportsEffects)(n)) continue;
          const record = (0, plugin_storage_1.readNodeAttachment)(n);
          if (record.status === "corrupt") {
            conflicted++;
            continue;
          }
          if (record.attachment) {
            bound++;
            if (
              (0, effect_reconciliation_1.reconcile)(
                (0, figma_effects_1.readEffects)(n),
                record.attachment,
              ) === "conflict"
            )
              conflicted++;
          }
        }
        return {
          key: nodes
            .map((n) => n.id)
            .sort()
            .join("|"),
          total: nodes.length,
          eligible: nodes.filter(figma_effects_1.supportsEffects).length,
          bound,
          conflicted,
          unsupported:
            nodes.length - nodes.filter(figma_effects_1.supportsEffects).length,
          name: nodes.length === 1 ? nodes[0].name : `${nodes.length} layers`,
        };
      }
    },
    function (module, exports, __req) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.readNodeAttachment = readNodeAttachment;
      exports.storeNodeAttachment = storeNodeAttachment;
      exports.clearNodeAttachment = clearNodeAttachment;
      exports.getCustomPresets = getCustomPresets;
      exports.setCustomPresets = setCustomPresets;
      const defaults_1 = __req(2);
      const attachment_migration_1 = __req(10);
      const figma_effects_1 = __req(12);
      const errors_1 = __req(13);
      function readNodeAttachment(node) {
        return (0, attachment_migration_1.parseAttachment)(
          node.getPluginData(defaults_1.ATTACH_KEY),
          (0, figma_effects_1.readEffects)(node),
          { width: node.width, height: node.height },
        );
      }
      function storeNodeAttachment(node, data) {
        const raw = JSON.stringify(data);
        if (raw.length > 90000)
          throw new errors_1.PluginError(
            "STORAGE",
            "Effect snapshot is too large for plugin data.",
          );
        node.setPluginData(defaults_1.ATTACH_KEY, raw);
      }
      function clearNodeAttachment(node) {
        node.setPluginData(defaults_1.ATTACH_KEY, "");
      }
      const PRESET_STORAGE = "layered-light-shadow:custom-presets-v2";
      async function getCustomPresets() {
        try {
          const v = await figma.clientStorage.getAsync(PRESET_STORAGE);
          return Array.isArray(v)
            ? v
                .filter(
                  (p) =>
                    p && p.category === "custom" && typeof p.name === "string",
                )
                .slice(0, 30)
            : [];
        } catch {
          return [];
        }
      }
      async function setCustomPresets(value) {
        await figma.clientStorage.setAsync(PRESET_STORAGE, value.slice(0, 30));
      }
    },
    function (module, exports, __req) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.parseAttachment = parseAttachment;
      const validation_1 = __req(3);
      const effect_reconciliation_1 = __req(11);
      const shadow_engine_1 = __req(6);
      const effect_reconciliation_2 = __req(11);
      function parseAttachment(raw, current, geometry) {
        if (!raw) return { attachment: null, status: "empty" };
        try {
          const data = JSON.parse(raw);
          if (
            data?.version === 2 &&
            Array.isArray(data.baselineEffects) &&
            Array.isArray(data.generatedEffects) &&
            typeof data.appliedFingerprint === "string" &&
            data.params
          ) {
            const attachment = {
              version: 2,
              params: (0, validation_1.normalizeParams)(data.params),
              baselineEffects: (0, effect_reconciliation_1.snapshot)(
                data.baselineEffects,
              ),
              generatedEffects: (0, effect_reconciliation_1.snapshot)(
                data.generatedEffects,
              ),
              appliedFingerprint: data.appliedFingerprint,
              updatedAt: Number(data.updatedAt) || 0,
            };
            return { attachment, status: "valid" };
          }
          if (
            data?.version === 1 &&
            (0, validation_1.isLegacyParams)(data.params) &&
            Array.isArray(data.state?.originalEffects)
          ) {
            const params = (0, validation_1.normalizeParams)(data.params);
            const baseline = (0, effect_reconciliation_1.snapshot)(
              data.state.originalEffects,
            );
            const predicted = (0, shadow_engine_1.generateShadowStack)(
              params,
              geometry,
            );
            // Legacy metadata can safely migrate ONLY if full stack matches expected legacy output.
            const isMatch =
              (0, effect_reconciliation_2.canonical)(current) ===
              (0, effect_reconciliation_2.canonical)([
                ...baseline,
                ...predicted,
              ]);
            if (!isMatch) return { attachment: null, status: "corrupt" };
            return {
              attachment: {
                version: 2,
                params,
                baselineEffects: baseline,
                generatedEffects: predicted,
                appliedFingerprint: (0, effect_reconciliation_1.fingerprint)(
                  current,
                ),
                updatedAt: Date.now(),
              },
              status: "legacy",
            };
          }
        } catch {}
        return { attachment: null, status: "corrupt" };
      }
    },
    function (module, exports, __req) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.snapshot = exports.canonical = void 0;
      exports.fingerprint = fingerprint;
      exports.reconcile = reconcile;
      exports.nextAppliedEffects = nextAppliedEffects;
      // Fingerprint is an exact structural comparison; ordering and manual edits are significant.
      const canonical = (value) => JSON.stringify(sortKeys(value));
      exports.canonical = canonical;
      function sortKeys(value) {
        if (Array.isArray(value)) return value.map(sortKeys);
        if (value && typeof value === "object")
          return Object.fromEntries(
            Object.entries(value)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([k, v]) => [k, sortKeys(v)]),
          );
        return value;
      }
      const snapshot = (value) => JSON.parse(JSON.stringify(value));
      exports.snapshot = snapshot;
      function fingerprint(effects) {
        return (0, exports.canonical)(effects);
      }
      function reconcile(current, attachment) {
        if (!attachment) return "unbound";
        return fingerprint(current) === attachment.appliedFingerprint
          ? "clean"
          : "conflict";
      }
      function nextAppliedEffects(baseline, generated) {
        return [
          ...(0, exports.snapshot)(baseline),
          ...(0, exports.snapshot)(generated),
        ];
      }
    },
    function (module, exports, __req) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.readEffects = void 0;
      exports.supportsEffects = supportsEffects;
      exports.supportsSpread = supportsSpread;
      exports.assignEffects = assignEffects;
      exports.effectParamsForNode = effectParamsForNode;
      const errors_1 = __req(13);
      // Restrict spread to node categories documented by the Plugin API.
      function supportsEffects(node) {
        return !node.removed && "effects" in node;
      }
      function supportsSpread(node) {
        if (node.type === "RECTANGLE" || node.type === "ELLIPSE") return true;
        if (
          node.type === "FRAME" ||
          node.type === "COMPONENT" ||
          node.type === "INSTANCE"
        ) {
          const target = node;
          return (
            Boolean(target.clipsContent) &&
            "fills" in target &&
            Array.isArray(target.fills) &&
            target.fills.some((p) => p.visible !== false && p.opacity !== 0)
          );
        }
        return false;
      }
      const readEffects = (node) =>
        supportsEffects(node) ? JSON.parse(JSON.stringify(node.effects)) : [];
      exports.readEffects = readEffects;
      function assignEffects(node, effects) {
        if (!supportsEffects(node))
          throw new errors_1.PluginError(
            "UNSUPPORTED",
            "Layer cannot receive effects.",
          );
        node.effects = effects;
      }
      function effectParamsForNode(node, params) {
        return !supportsSpread(node) && params.spread !== 0
          ? { ...params, spread: 0 }
          : params;
      }
    },
    function (module, exports, __req) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.errorMessage = exports.PluginError = void 0;
      class PluginError extends Error {
        constructor(code, message) {
          super(message);
          this.code = code;
          this.name = "PluginError";
        }
      }
      exports.PluginError = PluginError;
      const errorMessage = (error) =>
        error instanceof Error ? error.message : String(error);
      exports.errorMessage = errorMessage;
    },
    function (module, exports, __req) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.runBatch = runBatch;
      const shadow_engine_1 = __req(6);
      const effect_reconciliation_1 = __req(11);
      const selection_service_1 = __req(8);
      const figma_effects_1 = __req(12);
      const plugin_storage_1 = __req(9);
      const errors_1 = __req(13);
      async function runBatch(action, params, force = false) {
        const targets = (0, selection_service_1.selectedTargets)();
        const result = {
          total: figma.currentPage.selection.length,
          applied: 0,
          skipped: 0,
          conflicted: 0,
          failed: 0,
          errors: [],
        };
        for (const node of targets) {
          const before = (0, figma_effects_1.readEffects)(node),
            rawBefore = node.getPluginData(
              "36604c2e-ece2-495a-a2e0-9b0706ab9301:state",
            );
          try {
            const read = (0, plugin_storage_1.readNodeAttachment)(node);
            if (read.status === "corrupt")
              throw new errors_1.PluginError(
                "CONFLICT",
                `Ambiguous old/corrupted plugin metadata: ${node.name}.`,
              );
            const old = read.attachment;
            const state = (0, effect_reconciliation_1.reconcile)(before, old);
            if (state === "conflict" && !force)
              throw new errors_1.PluginError(
                "CONFLICT",
                `Effects were edited outside plugin: ${node.name}.`,
              );
            if (action === "remove") {
              if (!old) {
                result.skipped++;
                continue;
              }
              // Explicit force restores baseline and therefore discards intervening manual edits.
              (0, figma_effects_1.assignEffects)(node, old.baselineEffects);
              (0, plugin_storage_1.clearNodeAttachment)(node);
              node.setRelaunchData({});
              result.applied++;
              continue;
            }
            const localParams = (0, figma_effects_1.effectParamsForNode)(
              node,
              params,
            );
            const generated = (0, shadow_engine_1.generateShadowStack)(
              localParams,
              { width: node.width, height: node.height },
            );
            const baseline = old ? old.baselineEffects : before;
            const effects = (0, effect_reconciliation_1.nextAppliedEffects)(
              baseline,
              generated,
            );
            const meta = {
              version: 2,
              params: localParams,
              baselineEffects: baseline,
              generatedEffects: generated,
              appliedFingerprint: (0, effect_reconciliation_1.fingerprint)(
                effects,
              ),
              updatedAt: Date.now(),
            };
            // Preflight serialization before mutating the Figma document.
            if (JSON.stringify(meta).length > 90000)
              throw new errors_1.PluginError(
                "STORAGE",
                "Attachment exceeds safe size limit.",
              );
            (0, figma_effects_1.assignEffects)(node, effects);
            try {
              (0, plugin_storage_1.storeNodeAttachment)(node, meta);
              node.setRelaunchData({
                "36604c2e-ece2-495a-a2e0-9b0706ab9301": "Layered Light Shadow",
              });
            } catch (err) {
              (0, figma_effects_1.assignEffects)(node, before);
              node.setPluginData(
                "36604c2e-ece2-495a-a2e0-9b0706ab9301:state",
                rawBefore,
              );
              throw err;
            }
            result.applied++;
          } catch (err) {
            if (err instanceof errors_1.PluginError && err.code === "CONFLICT")
              result.conflicted++;
            else result.failed++;
            result.errors.push((0, errors_1.errorMessage)(err));
            // Best-effort restore only if operation was partially written. No blind overwrite on conflict.
          }
        }
        result.skipped += result.total - targets.length;
        return result;
      }
    },
    function (module, exports, __req) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.PreviewController = void 0;
      const selection_service_1 = __req(8);
      const plugin_storage_1 = __req(9);
      const figma_effects_1 = __req(12);
      const shadow_engine_1 = __req(6);
      const effect_reconciliation_1 = __req(11);
      class PreviewController {
        constructor() {
          this.entries = [];
        }
        get active() {
          return this.entries.length > 0;
        }
        cancel() {
          for (const item of this.entries) {
            try {
              if (
                !item.node.removed &&
                (0, effect_reconciliation_1.fingerprint)(
                  (0, figma_effects_1.readEffects)(item.node),
                ) === item.lastFingerprint
              )
                (0, figma_effects_1.assignEffects)(item.node, item.original);
            } catch {}
          }
          this.entries = [];
        }
        preview(params) {
          const targets = (0, selection_service_1.selectedTargets)();
          const ids = targets
            .map((n) => n.id)
            .sort()
            .join("|");
          if (this.entries.length && this.entries[0].selectionKey !== ids)
            this.cancel();
          if (!this.entries.length) {
            for (const node of targets) {
              const original = (0, figma_effects_1.readEffects)(node);
              const read = (0, plugin_storage_1.readNodeAttachment)(node);
              if (
                read.status === "corrupt" ||
                (0, effect_reconciliation_1.reconcile)(
                  original,
                  read.attachment,
                ) === "conflict"
              )
                continue;
              this.entries.push({
                node,
                original,
                lastFingerprint: (0, effect_reconciliation_1.fingerprint)(
                  original,
                ),
                selectionKey: ids,
              });
            }
          }
          for (const e of this.entries) {
            try {
              if (
                e.node.removed ||
                (0, effect_reconciliation_1.fingerprint)(
                  (0, figma_effects_1.readEffects)(e.node),
                ) !== e.lastFingerprint
              )
                continue;
              const old = (0, plugin_storage_1.readNodeAttachment)(
                e.node,
              ).attachment;
              const baseline = old ? old.baselineEffects : e.original;
              const generated = (0, shadow_engine_1.generateShadowStack)(
                (0, figma_effects_1.effectParamsForNode)(e.node, params),
                { width: e.node.width, height: e.node.height },
              );
              const applied = (0, effect_reconciliation_1.nextAppliedEffects)(
                baseline,
                generated,
              );
              (0, figma_effects_1.assignEffects)(e.node, applied);
              e.lastFingerprint = (0, effect_reconciliation_1.fingerprint)(
                applied,
              );
            } catch {}
          }
        }
      }
      exports.PreviewController = PreviewController;
    },
    function (module, exports, __req) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.LightCanvasControl = void 0;
      // Optional Figma canvas control. The UI sliders remain usable in clients without this API.
      class LightCanvasControl {
        constructor() {
          this.currentId = null;
          this.controls = [];
        }
        clear() {
          for (const control of this.controls) {
            try {
              if (!control.removed) control.remove();
            } catch {}
          }
          this.controls = [];
          this.currentId = null;
        }
        attach(node, params, onChange) {
          if (this.currentId === node.id && this.controls.length) return;
          this.clear();
          const maker = node.createCanvasControl;
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
            control.on("change", (value) => onChange(value));
          } catch {
            this.clear();
          }
        }
      }
      exports.LightCanvasControl = LightCanvasControl;
    },
  ];
  const cache = {};
  function __req(id) {
    if (cache[id]) return cache[id].exports;
    const mod = { exports: {} };
    cache[id] = mod;
    modules[id](mod, mod.exports, __req);
    return mod.exports;
  }
  __req(0);
})();
