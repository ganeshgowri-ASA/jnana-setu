import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

describe("OpenAPI spec", () => {
  const text = readFileSync(resolve(__dirname, "../docs/openapi.yaml"), "utf8");

  it("declares OpenAPI 3.1.0", () => {
    expect(text).toMatch(/openapi:\s*3\.1\.0/);
  });

  it("documents both webhook ingress paths", () => {
    expect(text).toMatch(/\/webhooks\/rfx:/);
    expect(text).toMatch(/\/webhooks\/qm:/);
  });

  it("references the four core schemas", () => {
    for (const name of ["Rfq", "Vendor", "OfferVersion", "Query"]) {
      expect(text).toMatch(new RegExp(`\\b${name}:`));
    }
  });
});
