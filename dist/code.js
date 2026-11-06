"use strict";
(() => {
  // src/domain/defaults.ts
  var TOOL_ID = "36604c2e-ece2-495a-a2e0-9b0706ab9301";
  var ATTACH_KEY = TOOL_ID + ":state";
  var DEFAULTS = {
    depth: 24,
    softness: 32,
    layers: 6,
    opacity: 28,
    color: { r: 0.04, g: 0.05, b: 0.08, a: 1 },
    light: { x: 15, y: -20 },
    spread: 0,
    curve: "legacy"
  };

  // src/shared/validation.ts
  var finite = (v, fallback) => typeof v === "number" && Number.isFinite(v) ? v : fallback;
  var clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  var point = (raw, fallback) => {
    const v = asRecord(raw);
    return {
      x: clamp(finite(v.x, fallback.x), -200, 200),
      y: clamp(finite(v.y, fallback.y), -200, 200)
    };
  };
  var asRecord = (raw) => raw !== null && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  var color = (raw, fallback) => {
    const v = asRecord(raw);
    return {
      r: clamp(finite(v.r, fallback.r), 0, 1),
      g: clamp(finite(v.g, fallback.g), 0, 1),
      b: clamp(finite(v.b, fallback.b), 0, 1),
      a: clamp(finite(v.a, fallback.a), 0, 1)
    };
  };
  var curves = [
    "legacy",
    "linear",
    "ease-in",
    "ease-out",
    "exponential"
  ];
  function normalizeParams(raw, defaults = DEFAULTS) {
    const v = asRecord(raw);
    return {
      depth: clamp(finite(v.depth, defaults.depth), 0, 200),
      softness: clamp(finite(v.softness, defaults.softness), 0, 200),
      layers: Math.round(clamp(finite(v.layers, defaults.layers), 2, 16)),
      opacity: clamp(finite(v.opacity, defaults.opacity), 0, 100),
      color: color(v.color, defaults.color),
      light: point(v.light, defaults.light),
      spread: clamp(finite(v.spread, defaults.spread), -50, 50),
      curve: typeof v.curve === "string" && curves.includes(v.curve) ? v.curve : defaults.curve
    };
  }
  function isLegacyParams(raw) {
    const v = asRecord(raw);
    return ["depth", "softness", "layers", "opacity"].every(
      (k) => typeof v[k] === "number" && Number.isFinite(v[k])
    ) && Object.keys(asRecord(v.color)).length >= 4 && Object.keys(asRecord(v.light)).length >= 2;
  }

  // src/domain/presets.ts
  var BUILTIN_PRESETS = [
    { id: "floating", name: "Floating", category: "ui", params: { ...DEFAULTS } },
    {
      id: "soft-ambient",
      name: "Soft Ambient",
      category: "ui",
      params: {
        ...DEFAULTS,
        depth: 12,
        softness: 52,
        layers: 8,
        opacity: 18,
        light: { x: 50, y: 28 }
      }
    },
    {
      id: "subtle",
      name: "Subtle",
      category: "ui",
      params: {
        ...DEFAULTS,
        depth: 5,
        softness: 14,
        layers: 4,
        opacity: 14,
        light: { x: 50, y: 20 }
      }
    },
    {
      id: "material",
      name: "Material Elevation",
      category: "ui",
      params: {
        ...DEFAULTS,
        depth: 20,
        softness: 28,
        layers: 6,
        opacity: 23,
        light: { x: 50, y: 12 }
      }
    },
    {
      id: "dramatic",
      name: "Dramatic",
      category: "creative",
      params: {
        ...DEFAULTS,
        depth: 78,
        softness: 52,
        layers: 12,
        opacity: 42,
        light: { x: -20, y: -20 },
        curve: "ease-out"
      }
    },
    {
      id: "warm",
      name: "Warm Glow",
      category: "creative",
      params: {
        ...DEFAULTS,
        depth: 17,
        softness: 64,
        layers: 10,
        opacity: 25,
        color: { r: 0.6, g: 0.26, b: 0.1, a: 1 },
        light: { x: 40, y: -15 }
      }
    }
  ];

  // src/domain/css-export.ts
  var n = (value) => Number(value.toFixed(3)).toString();
  var channel = (v) => Math.round(Math.max(0, Math.min(1, v)) * 255);
  function shadowToCss(shadows) {
    if (!shadows.length) return "box-shadow: none;";
    return "box-shadow:\n  " + shadows.map(
      (s) => `${n(s.offset.x)}px ${n(s.offset.y)}px ${n(s.radius)}px ${n(s.spread ?? 0)}px rgba(${channel(s.color.r)}, ${channel(s.color.g)}, ${channel(s.color.b)}, ${n(s.color.a)})`
    ).join(",\n  ") + ";";
  }

  // src/domain/shadow-distribution.ts
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
    const raw = Array.from({ length: count }, (_, i) => 1 / Math.sqrt(i + 1));
    const sum = raw.reduce((a, b) => a + b, 0);
    return raw.map((v) => v / sum);
  }

  // src/domain/shadow-engine.ts
  function generateShadowStack(raw, geometry) {
    const p = normalizeParams(raw);
    const scale = Math.max(1, Math.min(geometry.width, geometry.height));
    const dx = (50 - p.light.x) / 100 * (geometry.width / scale) * p.depth;
    const dy = (50 - p.light.y) / 100 * (geometry.height / scale) * p.depth;
    const alpha = Math.min(0.99, p.opacity / 100 * p.color.a), w = weights(p.layers);
    return w.map((weight, i) => {
      const q = progression((i + 1) / p.layers, p.curve);
      return {
        type: "DROP_SHADOW",
        color: {
          r: p.color.r,
          g: p.color.g,
          b: p.color.b,
          a: 1 - Math.pow(1 - alpha, weight)
        },
        offset: { x: dx * q, y: dy * q },
        radius: p.softness * q,
        spread: p.spread * q,
        visible: true,
        blendMode: "NORMAL"
      };
    });
  }

  // src/domain/effect-reconciliation.ts
  var canonical = (value) => JSON.stringify(sortKeys(value));
  function sortKeys(value) {
    if (Array.isArray(value)) return value.map(sortKeys);
    if (value && typeof value === "object")
      return Object.fromEntries(
        Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => [k, sortKeys(v)])
      );
    return value;
  }
  var snapshot = (value) => JSON.parse(JSON.stringify(value));
  function fingerprint(effects) {
    return canonical(effects);
  }
  function reconcile(current, attachment) {
    if (!attachment) return "unbound";
    return fingerprint(current) === attachment.appliedFingerprint ? "clean" : "conflict";
  }
  function nextAppliedEffects(baseline, generated) {
    return [...snapshot(baseline), ...snapshot(generated)];
  }

  // src/infrastructure/attachment-migration.ts
  var MAX_ATTACHMENT_BYTES = 9e4;
  var CURVES = ["legacy", "linear", "ease-in", "ease-out", "exponential"];
  var isRecord = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
  var isFiniteNumber = (value) => typeof value === "number" && Number.isFinite(value);
  var isSerializedEffect = (value) => {
    if (!isRecord(value)) return false;
    const entry = value;
    if (typeof entry.type !== "string") return false;
    if ("visible" in entry && typeof entry.visible !== "boolean") return false;
    if ("blendMode" in entry && typeof entry.blendMode !== "string") return false;
    if ("radius" in entry && !isFiniteNumber(entry.radius)) return false;
    if ("spread" in entry && !isFiniteNumber(entry.spread)) return false;
    if ("opacity" in entry && !isFiniteNumber(entry.opacity)) return false;
    if ("x" in entry && !isFiniteNumber(entry.x)) return false;
    if ("y" in entry && !isFiniteNumber(entry.y)) return false;
    if ("offset" in entry) {
      const offset = entry.offset;
      if (!isRecord(offset)) return false;
      if (!isFiniteNumber(offset.x)) return false;
      if (!isFiniteNumber(offset.y)) return false;
    }
    if ("color" in entry && !isRecord(entry.color)) return false;
    return true;
  };
  var isSerializedEffectsArray = (value) => Array.isArray(value) && value.length <= 64 && value.every(isSerializedEffect);
  var isShadowParams = (value) => {
    if (!isRecord(value)) return false;
    const p = value;
    if (!isFiniteNumber(p.depth) || !isFiniteNumber(p.softness)) return false;
    if (!isFiniteNumber(p.layers) || !isFiniteNumber(p.opacity)) return false;
    if (!isFiniteNumber(p.spread) || typeof p.curve !== "string") return false;
    if (!CURVES.includes(p.curve)) return false;
    if (!isRecord(p.color)) return false;
    const color2 = p.color;
    if (!["r", "g", "b", "a"].every((key) => isFiniteNumber(color2[key]))) {
      return false;
    }
    if (!isRecord(p.light)) return false;
    const light = p.light;
    return isFiniteNumber(light.x) && isFiniteNumber(light.y);
  };
  function parseAttachment(raw, current, geometry) {
    if (!raw) return { attachment: null, status: "empty" };
    try {
      const data = JSON.parse(raw);
      if (typeof data !== "object" || data === null) {
        return { attachment: null, status: "corrupt" };
      }
      if (data.version === 2) {
        const rawBudget = JSON.stringify(data).length;
        if (rawBudget > MAX_ATTACHMENT_BYTES || !isShadowParams(data.params) || !isSerializedEffectsArray(data.baselineEffects) || !isSerializedEffectsArray(data.generatedEffects) || typeof data.appliedFingerprint !== "string" || typeof data.updatedAt !== "number") {
          return { attachment: null, status: "corrupt" };
        }
        const attachment = {
          version: 2,
          params: normalizeParams(data.params),
          baselineEffects: snapshot(data.baselineEffects),
          generatedEffects: snapshot(data.generatedEffects),
          appliedFingerprint: data.appliedFingerprint,
          updatedAt: data.updatedAt
        };
        if (attachment.appliedFingerprint !== fingerprint([...attachment.baselineEffects, ...attachment.generatedEffects])) {
          return { attachment: null, status: "corrupt" };
        }
        return { attachment, status: "valid" };
      }
      if (data.version === 1 && isLegacyParams(data.params) && isRecord(data.state) && isSerializedEffectsArray(data.state.originalEffects)) {
        const params = normalizeParams(data.params);
        const baseline = snapshot(data.state.originalEffects);
        const predicted = generateShadowStack(
          params,
          geometry
        );
        if (!Array.isArray(predicted) || !predicted.every(isSerializedEffect)) {
          return { attachment: null, status: "corrupt" };
        }
        const isMatch = canonical(current) === canonical([...baseline, ...predicted]);
        if (!isMatch) return { attachment: null, status: "corrupt" };
        return {
          attachment: {
            version: 2,
            params,
            baselineEffects: baseline,
            generatedEffects: predicted,
            appliedFingerprint: fingerprint(current),
            updatedAt: Date.now()
          },
          status: "legacy"
        };
      }
    } catch {
    }
    return { attachment: null, status: "corrupt" };
  }

  // src/shared/errors.ts
  var PluginError = class extends Error {
    constructor(code, message) {
      super(message);
      this.code = code;
      this.name = "PluginError";
    }
  };
  var errorMessage = (error) => error instanceof Error ? error.message : String(error);

  // src/infrastructure/figma-effects.ts
  function supportsEffects(node) {
    return !node.removed && "effects" in node;
  }
  function supportsSpread(node) {
    if (node.type === "RECTANGLE" || node.type === "ELLIPSE") return true;
    if (node.type === "FRAME" || node.type === "COMPONENT" || node.type === "INSTANCE") {
      const target = node;
      return Boolean(target.clipsContent) && "fills" in target && Array.isArray(target.fills) && target.fills.some((p) => p.visible !== false && p.opacity !== 0);
    }
    return false;
  }
  var readEffects = (node) => supportsEffects(node) ? JSON.parse(JSON.stringify(node.effects)) : [];
  function assignEffects(node, effects) {
    if (!supportsEffects(node))
      throw new PluginError("UNSUPPORTED", "Layer cannot receive effects.");
    node.effects = effects;
  }
  function effectParamsForNode(node, params) {
    return !supportsSpread(node) && params.spread !== 0 ? { ...params, spread: 0 } : params;
  }

  // src/infrastructure/plugin-storage.ts
  function readNodeAttachment(node) {
    return parseAttachment(node.getPluginData(ATTACH_KEY), readEffects(node), {
      width: node.width,
      height: node.height
    });
  }
  function storeNodeAttachment(node, data) {
    const raw = JSON.stringify(data);
    if (raw.length > 9e4)
      throw new PluginError(
        "STORAGE",
        "Effect snapshot is too large for plugin data."
      );
    node.setPluginData(ATTACH_KEY, raw);
  }
  function clearNodeAttachment(node) {
    node.setPluginData(ATTACH_KEY, "");
  }
  var PRESET_STORAGE = "layered-light-shadow:custom-presets-v2";
  async function getCustomPresets() {
    try {
      const v = await figma.clientStorage.getAsync(PRESET_STORAGE);
      return Array.isArray(v) ? v.filter(
        (p) => p && p.category === "custom" && typeof p.name === "string"
      ).slice(0, 30) : [];
    } catch {
      return [];
    }
  }
  async function setCustomPresets(value) {
    await figma.clientStorage.setAsync(PRESET_STORAGE, value.slice(0, 30));
  }

  // src/application/selection-service.ts
  function selectedTargets() {
    return figma.currentPage.selection.filter(
      (s) => !s.removed && supportsEffects(s)
    );
  }
  function summarizeSelection() {
    const nodes = [...figma.currentPage.selection];
    let bound = 0, conflicted = 0;
    for (const n2 of nodes) {
      if (!supportsEffects(n2)) continue;
      const record = readNodeAttachment(n2);
      if (record.status === "corrupt") {
        conflicted++;
        continue;
      }
      if (record.attachment) {
        bound++;
        if (reconcile(readEffects(n2), record.attachment) === "conflict")
          conflicted++;
      }
    }
    return {
      key: nodes.map((n2) => n2.id).sort().join("|"),
      total: nodes.length,
      eligible: nodes.filter(supportsEffects).length,
      bound,
      conflicted,
      unsupported: nodes.length - nodes.filter(supportsEffects).length,
      name: nodes.length === 1 ? nodes[0].name : `${nodes.length} layers`
    };
  }

  // src/application/batch-service.ts
  function restoreNodeState(node, originalEffects, originalState) {
    if ("effects" in node) node.effects = originalEffects;
    node.setPluginData(
      "36604c2e-ece2-495a-a2e0-9b0706ab9301:state",
      originalState
    );
  }
  async function runBatch(action, params, force = false) {
    const targets = selectedTargets();
    const result = {
      total: figma.currentPage.selection.length,
      applied: 0,
      skipped: 0,
      conflicted: 0,
      failed: 0,
      errors: []
    };
    for (const node of targets) {
      const before = readEffects(node), rawBefore = node.getPluginData(
        "36604c2e-ece2-495a-a2e0-9b0706ab9301:state"
      );
      try {
        const read = readNodeAttachment(node);
        if (read.status === "corrupt")
          throw new PluginError(
            "CONFLICT",
            `Ambiguous old/corrupted plugin metadata: ${node.name}.`
          );
        const old = read.attachment;
        const state = reconcile(before, old);
        if (state === "conflict" && !force)
          throw new PluginError(
            "CONFLICT",
            `Effects were edited outside plugin: ${node.name}.`
          );
        if (action === "remove") {
          if (!old) {
            result.skipped++;
            continue;
          }
          if (state === "conflict" && force) {
            assignEffects(node, old.baselineEffects);
          } else {
            assignEffects(node, old.baselineEffects);
          }
          clearNodeAttachment(node);
          node.setRelaunchData({});
          result.applied++;
          continue;
        }
        const localParams = effectParamsForNode(node, params);
        const generated = generateShadowStack(localParams, {
          width: node.width,
          height: node.height
        });
        const baseline = old ? old.baselineEffects : before;
        const effects = nextAppliedEffects(baseline, generated);
        const meta = {
          version: 2,
          params: localParams,
          baselineEffects: baseline,
          generatedEffects: generated,
          appliedFingerprint: fingerprint(effects),
          updatedAt: Date.now()
        };
        if (JSON.stringify(meta).length > 9e4)
          throw new PluginError("STORAGE", "Attachment exceeds safe size limit.");
        assignEffects(node, effects);
        try {
          storeNodeAttachment(node, meta);
          node.setRelaunchData({
            "36604c2e-ece2-495a-a2e0-9b0706ab9301": "Layered Light Shadow"
          });
        } catch (err) {
          restoreNodeState(node, before, rawBefore);
          throw err;
        }
        result.applied++;
      } catch (err) {
        if (err instanceof PluginError && err.code === "CONFLICT")
          result.conflicted++;
        else result.failed++;
        result.errors.push(errorMessage(err));
      }
    }
    result.skipped += result.total - targets.length;
    return result;
  }

  // src/application/preview-controller.ts
  var PreviewController = class {
    constructor() {
      this.entries = [];
      this.revision = 0;
    }
    get active() {
      return this.entries.length > 0;
    }
    bumpRevision(revision) {
      if (typeof revision === "number") {
        if (revision < this.revision) return this.revision;
        this.revision = revision;
        return this.revision;
      }
      this.revision += 1;
      return this.revision;
    }
    cancel(revision) {
      if (typeof revision === "number" && revision < this.revision) return;
      const token = this.bumpRevision(revision);
      for (const item of this.entries) {
        try {
          if (!item.node.removed && fingerprint(readEffects(item.node)) === item.lastFingerprint)
            assignEffects(item.node, item.original);
        } catch {
        }
      }
      if (token === this.revision) this.entries = [];
    }
    preview(params, revision) {
      if (typeof revision === "number" && revision < this.revision) return;
      const token = this.bumpRevision(revision);
      const targets = selectedTargets();
      const ids = targets.map((n2) => n2.id).sort().join("|");
      if (this.entries.length && this.entries[0].selectionKey !== ids)
        this.cancel(token);
      if (!this.entries.length) {
        for (const node of targets) {
          const original = readEffects(node);
          const read = readNodeAttachment(node);
          if (read.status === "corrupt" || reconcile(original, read.attachment) === "conflict")
            continue;
          this.entries.push({
            node,
            original,
            lastFingerprint: fingerprint(original),
            selectionKey: ids
          });
        }
      }
      for (const e of this.entries) {
        try {
          if (e.node.removed || fingerprint(readEffects(e.node)) !== e.lastFingerprint || token !== this.revision)
            continue;
          const old = readNodeAttachment(e.node).attachment;
          const baseline = old ? old.baselineEffects : e.original;
          const generated = generateShadowStack(
            effectParamsForNode(e.node, params),
            { width: e.node.width, height: e.node.height }
          );
          const applied = nextAppliedEffects(baseline, generated);
          assignEffects(e.node, applied);
          e.lastFingerprint = fingerprint(applied);
        } catch {
        }
      }
    }
  };

  // src/infrastructure/canvas-controls.ts
  var LightCanvasControl = class {
    constructor() {
      this.currentId = null;
      this.controls = [];
    }
    clear() {
      for (const control of this.controls) {
        try {
          if (!control.removed) control.remove();
        } catch {
        }
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
          value: params.light
        });
        this.controls.push(control);
        this.currentId = node.id;
        control.on("change", (value) => onChange(value));
      } catch {
        this.clear();
      }
    }
  };

  // src/application/command-handler.ts
  var send = (message) => figma.ui.postMessage(message);
  var CommandHandler = class {
    constructor() {
      this.preview = new PreviewController();
      this.previewRevision = 0;
      this.activeBatchOperation = 0;
      this.params = DEFAULTS;
      this.custom = [];
      this.lightControl = new LightCanvasControl();
    }
    async initialize() {
      this.custom = await getCustomPresets();
      this.refresh();
    }
    refresh() {
      const nodes = selectedTargets();
      if (!this.preview.active && nodes.length === 1) {
        try {
          const record = requireAttachment(nodes[0]);
          if (record) this.params = record;
        } catch {
        }
      }
      this.refreshCanvasControl(nodes);
      send({
        type: "state",
        selection: summarizeSelection(),
        params: this.params,
        presets: [...BUILTIN_PRESETS, ...this.custom],
        previewing: this.preview.active
      });
    }
    refreshCanvasControl(nodes) {
      if (this.preview.active || nodes.length !== 1) {
        this.lightControl.clear();
        return;
      }
      const node = nodes[0], record = readNodeAttachment(node);
      if (!record.attachment || reconcile(readEffects(node), record.attachment) !== "clean") {
        this.lightControl.clear();
        return;
      }
      this.lightControl.attach(node, this.params, (light) => {
        this.params = normalizeParams({ ...this.params, light });
        void runBatch("apply", this.params).then(() => this.refresh()).catch(
          (error) => send({ type: "error", message: errorMessage(error) })
        );
      });
    }
    onSelectionChange() {
      this.lightControl.clear();
      this.activeBatchOperation = 0;
      this.previewRevision += 1;
      this.preview.cancel(this.previewRevision);
      this.params = DEFAULTS;
      this.refresh();
    }
    async handle(msg) {
      try {
        if (this.activeBatchOperation && (msg.type === "preview" || msg.type === "cancel-preview" || msg.type === "reset")) {
          return;
        }
        if (msg.type === "preview") {
          this.params = normalizeParams(msg.params);
          this.previewRevision += 1;
          this.preview.preview(this.params, this.previewRevision);
          this.refresh();
          return;
        }
        if (msg.type === "cancel-preview" || msg.type === "reset") {
          this.previewRevision += 1;
          this.preview.cancel(this.previewRevision);
          this.params = DEFAULTS;
          this.refresh();
          return;
        }
        if (msg.type === "apply" || msg.type === "remove") {
          this.previewRevision += 1;
          this.activeBatchOperation = this.previewRevision;
          this.preview.cancel(this.previewRevision);
          if (msg.type === "apply") this.params = normalizeParams(msg.params);
          const token = this.activeBatchOperation;
          try {
            const result = await runBatch(
              msg.type,
              this.params,
              Boolean(msg.force)
            );
            if (token !== this.activeBatchOperation) return;
            send({ type: "result", action: msg.type, result });
            if (result.conflicted && !msg.force)
              send({
                type: "conflict",
                action: msg.type,
                count: result.conflicted
              });
            this.refresh();
          } finally {
            if (token === this.activeBatchOperation) this.activeBatchOperation = 0;
          }
          return;
        }
        if (msg.type === "export-css") {
          const node = selectedTargets()[0];
          const size = node ? { width: node.width, height: node.height } : { width: 100, height: 100 };
          const generated = generateShadowStack(
            normalizeParams(msg.params),
            size
          );
          send({ type: "css", css: shadowToCss(generated) });
          return;
        }
        if (msg.type === "save-preset") {
          const name = msg.name.trim().slice(0, 60);
          if (!name) return;
          const id = `custom-${Date.now()}-${Math.floor(Math.random() * 1e5)}`;
          this.custom = [
            ...this.custom,
            {
              id,
              name,
              category: "custom",
              params: normalizeParams(msg.params)
            }
          ].slice(-30);
          await setCustomPresets(this.custom);
          this.refresh();
          return;
        }
        if (msg.type === "delete-preset") {
          this.custom = this.custom.filter((p) => p.id !== msg.id);
          await setCustomPresets(this.custom);
          this.refresh();
          return;
        }
      } catch (error) {
        send({ type: "error", message: errorMessage(error) });
      }
    }
    cancel() {
      this.activeBatchOperation = 0;
      this.previewRevision += 1;
      this.preview.cancel(this.previewRevision);
      this.lightControl.clear();
    }
  };
  function requireAttachment(node) {
    const raw = node.getPluginData("36604c2e-ece2-495a-a2e0-9b0706ab9301:state");
    if (!raw) return null;
    try {
      const data = JSON.parse(raw);
      return data?.params ? normalizeParams(data.params) : null;
    } catch {
      return null;
    }
  }

  // src/main.ts
  var handler = new CommandHandler();
  void figma.showUI(__html__, { width: 360, height: 640, themeColors: true });
  figma.on("selectionchange", () => handler.onSelectionChange());
  figma.on("close", () => handler.cancel());
  var queue = Promise.resolve();
  figma.ui.onmessage = (msg) => {
    queue = queue.then(() => handler.handle(msg)).catch((error) => {
      void figma.notify(String(error), { error: true });
      return void 0;
    });
  };
  void handler.initialize();
})();
