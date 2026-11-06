import { describe, it, expect } from "vitest";
import { parseAttachment } from "../../src/infrastructure/attachment-migration";
import { DEFAULTS } from "../../src/domain/defaults";
import { generateShadowStack } from "../../src/domain/shadow-engine";
import { baseline, geometry } from "../fixtures/effects";
const legacy = JSON.stringify({
  version: 1,
  params: DEFAULTS,
  state: { originalEffects: baseline },
});
describe("v1 migration", () => {
  it("migrates only unchanged legacy stacks", () => {
    const current = [...baseline, ...generateShadowStack(DEFAULTS, geometry)];
    const migrated = parseAttachment(
      legacy,
      current as unknown as typeof baseline,
      geometry,
    );
    expect(migrated.status).toBe("legacy");
    expect(migrated.attachment?.version).toBe(2);
  });
  it("flags edited legacy stacks without overwriting", () => {
    const migrated = parseAttachment(
      legacy,
      [...baseline, { type: "DROP_SHADOW", radius: 999 }],
      geometry,
    );
    expect(migrated.status).toBe("corrupt");
  });
  it("rejects invalid payloads", () =>
    expect(parseAttachment("{broken", [], geometry).status).toBe("corrupt"));
});
