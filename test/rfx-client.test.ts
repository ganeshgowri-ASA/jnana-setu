import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";
import { RfxManagerClient } from "../src/sdk/rfx-client.js";
import { rfq, query, vendor, NOW } from "./fixtures.js";

const BASE = "https://rfxmanager.test";

const server = setupServer(
  http.get(`${BASE}/api/v1/rfqs`, ({ request }) => {
    const url = new URL(request.url);
    const status = url.searchParams.get("status");
    const items = status && status !== rfq.status ? [] : [rfq];
    return HttpResponse.json({ items, nextCursor: null, total: items.length });
  }),
  http.get(`${BASE}/api/v1/rfqs/${rfq.id}`, () => HttpResponse.json(rfq)),
  http.get(`${BASE}/api/v1/vendors`, () =>
    HttpResponse.json({ items: [vendor], nextCursor: null }),
  ),
  http.get(`${BASE}/api/v1/rfqs/${rfq.id}/queries`, () =>
    HttpResponse.json({ items: [query], nextCursor: null }),
  ),
  http.post(`${BASE}/api/v1/queries/${query.id}/messages`, async ({ request }) => {
    const body = (await request.json()) as { authorId: string; body: string };
    return HttpResponse.json({
      id: "m-server-1",
      authorId: body.authorId,
      authorRole: "buyer",
      body: body.body,
      attachments: [],
      createdAt: NOW,
    });
  }),
  http.patch(`${BASE}/api/v1/queries/${query.id}`, async ({ request }) => {
    const body = (await request.json()) as { status: "open" | "answered" | "closed" };
    return HttpResponse.json({ ...query, status: body.status });
  }),
);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("RfxManagerClient", () => {
  const client = new RfxManagerClient({
    baseUrl: BASE,
    token: "rfx-test-token",
    fetchImpl: (...args: Parameters<typeof fetch>) => globalThis.fetch(...args),
  });

  it("listRfqs returns paginated, schema-validated RFQs", async () => {
    const page = await client.listRfqs({ status: "published" });
    expect(page.items).toHaveLength(1);
    expect(page.items[0]?.rfqNumber).toBe("RFQ-2026-001");
    expect(page.nextCursor).toBeNull();
  });

  it("listRfqs filter param is forwarded as query string", async () => {
    const page = await client.listRfqs({ status: "draft" });
    expect(page.items).toHaveLength(0);
  });

  it("getRfq parses the full schema", async () => {
    const got = await client.getRfq(rfq.id);
    expect(got.lineItems[0]?.materialCode).toBe("MAT-33KV-PANEL");
  });

  it("listVendors returns vendors", async () => {
    const page = await client.listVendors();
    expect(page.items[0]?.id).toBe(vendor.id);
  });

  it("postQueryMessage roundtrips body and parses response", async () => {
    const msg = await client.postQueryMessage(query.id, {
      authorId: "buyer-1",
      body: "We accept Class B insulation.",
    });
    expect(msg.body).toBe("We accept Class B insulation.");
    expect(msg.id).toBe("m-server-1");
  });

  it("updateQueryStatus patches and returns updated query", async () => {
    const updated = await client.updateQueryStatus(query.id, "closed");
    expect(updated.status).toBe("closed");
  });

  it("rejects responses that fail schema validation", async () => {
    server.use(
      http.get(`${BASE}/api/v1/rfqs/bad`, () => HttpResponse.json({ id: "bad" })),
    );
    await expect(client.getRfq("bad")).rejects.toThrow();
  });

  it("throws HttpError on non-2xx", async () => {
    server.use(
      http.get(`${BASE}/api/v1/rfqs/missing`, () =>
        HttpResponse.json({ error: "not_found" }, { status: 404 }),
      ),
    );
    await expect(client.getRfq("missing")).rejects.toThrow(/404/);
  });
});
