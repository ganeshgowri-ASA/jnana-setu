import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";
import { QueryManagerClient } from "../src/sdk/query-manager-client.js";
import { query, NOW } from "./fixtures.js";

const BASE = "https://querymanager.test";

const thread = { ...query, id: "t-1", origin: "query_manager" as const, externalId: query.id };

const server = setupServer(
  http.get(`${BASE}/api/v1/threads`, ({ request }) => {
    const url = new URL(request.url);
    const externalId = url.searchParams.get("externalId");
    if (externalId === query.id) {
      return HttpResponse.json({ items: [thread], nextCursor: null });
    }
    if (externalId) {
      return HttpResponse.json({ items: [], nextCursor: null });
    }
    return HttpResponse.json({ items: [thread], nextCursor: null });
  }),
  http.post(`${BASE}/api/v1/threads`, async ({ request }) => {
    const body = (await request.json()) as { externalId: string; subject: string };
    return HttpResponse.json({ ...thread, externalId: body.externalId, subject: body.subject });
  }),
  http.post(`${BASE}/api/v1/threads/${thread.id}/messages`, async ({ request }) => {
    const body = (await request.json()) as {
      authorId: string;
      authorRole: "buyer" | "vendor" | "system";
      body: string;
    };
    return HttpResponse.json({
      id: "qm-m-1",
      authorId: body.authorId,
      authorRole: body.authorRole,
      body: body.body,
      attachments: [],
      createdAt: NOW,
    });
  }),
  http.patch(`${BASE}/api/v1/threads/${thread.id}`, async ({ request }) => {
    const body = (await request.json()) as { status: "open" | "answered" | "closed" };
    return HttpResponse.json({ ...thread, status: body.status });
  }),
);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("QueryManagerClient", () => {
  const client = new QueryManagerClient({
    baseUrl: BASE,
    token: "qm-test-token",
    fetchImpl: (...args: Parameters<typeof fetch>) => globalThis.fetch(...args),
  });

  it("findThreadByExternalId returns the matching thread", async () => {
    const found = await client.findThreadByExternalId(query.id);
    expect(found?.id).toBe(thread.id);
  });

  it("findThreadByExternalId returns null when none match", async () => {
    const found = await client.findThreadByExternalId("does-not-exist");
    expect(found).toBeNull();
  });

  it("createThread posts payload and parses response", async () => {
    const created = await client.createThread({
      rfqId: query.rfqId,
      vendorId: query.vendorId,
      subject: "New thread",
      externalId: "ext-2",
      initialMessage: { authorId: "vendor-1", authorRole: "vendor", body: "hi" },
    });
    expect(created.subject).toBe("New thread");
    expect(created.externalId).toBe("ext-2");
  });

  it("postMessage forwards externalMessageId for idempotency", async () => {
    const msg = await client.postMessage(thread.id, {
      authorId: "buyer-1",
      authorRole: "buyer",
      body: "ack",
      externalMessageId: "rfx-m-1",
    });
    expect(msg.body).toBe("ack");
  });

  it("updateStatus mutates the thread status", async () => {
    const updated = await client.updateStatus(thread.id, "answered");
    expect(updated.status).toBe("answered");
  });
});
