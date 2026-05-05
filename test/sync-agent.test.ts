import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";
import pino from "pino";
import { RfxManagerClient } from "../src/sdk/rfx-client.js";
import { QueryManagerClient } from "../src/sdk/query-manager-client.js";
import { SyncAgent } from "../src/sync/agent.js";
import { InMemoryMappingStore } from "../src/sync/mapping.js";
import { InMemoryEventBus } from "../src/bus/in-memory.js";
import { query, NOW } from "./fixtures.js";

const RFX = "https://rfxmanager.test";
const QM = "https://querymanager.test";

interface CreatedThread {
  externalId: string;
  subject: string;
}
interface PostedMessage {
  threadId?: string;
  rfxQueryId?: string;
  body: string;
  externalMessageId?: string;
}

const calls = {
  threadsCreated: [] as CreatedThread[],
  qmMessages: [] as PostedMessage[],
  rfxMessages: [] as PostedMessage[],
  qmStatusUpdates: [] as { threadId: string; status: string }[],
  rfxStatusUpdates: [] as { rfxQueryId: string; status: string }[],
};

const thread = { ...query, id: "t-100", origin: "query_manager" as const, externalId: query.id };

const server = setupServer(
  // Query Manager
  http.get(`${QM}/api/v1/threads`, ({ request }) => {
    const url = new URL(request.url);
    const ext = url.searchParams.get("externalId");
    if (ext) return HttpResponse.json({ items: [], nextCursor: null });
    return HttpResponse.json({ items: [], nextCursor: null });
  }),
  http.post(`${QM}/api/v1/threads`, async ({ request }) => {
    const body = (await request.json()) as { externalId: string; subject: string };
    calls.threadsCreated.push({ externalId: body.externalId, subject: body.subject });
    return HttpResponse.json({ ...thread, externalId: body.externalId, subject: body.subject });
  }),
  http.post(`${QM}/api/v1/threads/:id/messages`, async ({ request, params }) => {
    const body = (await request.json()) as {
      authorId: string;
      authorRole: "buyer" | "vendor" | "system";
      body: string;
      externalMessageId?: string;
    };
    calls.qmMessages.push({
      threadId: String(params.id),
      body: body.body,
      externalMessageId: body.externalMessageId,
    });
    return HttpResponse.json({
      id: `qm-${calls.qmMessages.length}`,
      authorId: body.authorId,
      authorRole: body.authorRole,
      body: body.body,
      attachments: [],
      createdAt: NOW,
    });
  }),
  http.patch(`${QM}/api/v1/threads/:id`, async ({ request, params }) => {
    const body = (await request.json()) as { status: "open" | "answered" | "closed" };
    calls.qmStatusUpdates.push({ threadId: String(params.id), status: body.status });
    return HttpResponse.json({ ...thread, status: body.status });
  }),

  // RFX
  http.get(`${RFX}/api/v1/queries/:id`, ({ params }) =>
    HttpResponse.json({ ...query, id: String(params.id) }),
  ),
  http.post(`${RFX}/api/v1/queries/:id/messages`, async ({ request, params }) => {
    const body = (await request.json()) as { authorId: string; body: string };
    calls.rfxMessages.push({ rfxQueryId: String(params.id), body: body.body });
    return HttpResponse.json({
      id: `rfx-${calls.rfxMessages.length}`,
      authorId: body.authorId,
      authorRole: "buyer",
      body: body.body,
      attachments: [],
      createdAt: NOW,
    });
  }),
  http.patch(`${RFX}/api/v1/queries/:id`, async ({ request, params }) => {
    const body = (await request.json()) as { status: "open" | "answered" | "closed" };
    calls.rfxStatusUpdates.push({ rfxQueryId: String(params.id), status: body.status });
    return HttpResponse.json({ ...query, id: String(params.id), status: body.status });
  }),
);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  server.resetHandlers();
  calls.threadsCreated.length = 0;
  calls.qmMessages.length = 0;
  calls.rfxMessages.length = 0;
  calls.qmStatusUpdates.length = 0;
  calls.rfxStatusUpdates.length = 0;
});
afterAll(() => server.close());

const logger = pino({ level: "silent" });

function makeAgent() {
  const rfx = new RfxManagerClient({ baseUrl: RFX, token: "x", fetchImpl: (...args: Parameters<typeof fetch>) => globalThis.fetch(...args) });
  const qm = new QueryManagerClient({ baseUrl: QM, token: "x", fetchImpl: (...args: Parameters<typeof fetch>) => globalThis.fetch(...args) });
  const bus = new InMemoryEventBus();
  const store = new InMemoryMappingStore();
  const agent = new SyncAgent({
    rfx,
    qm,
    bus,
    store,
    logger,
    streams: { rfx: "rfx", qm: "qm" },
    group: "g",
  });
  return { agent, store };
}

describe("SyncAgent (RFX → QM)", () => {
  it("creates a QM thread on rfx.query.created", async () => {
    const { agent, store } = makeAgent();
    await agent.handleRfxEvent({
      id: "e1",
      source: "rfx",
      type: "rfx.query.created",
      occurredAt: NOW,
      payload: { query },
    });
    expect(calls.threadsCreated).toHaveLength(1);
    expect(calls.threadsCreated[0]?.externalId).toBe(query.id);
    expect(await store.getThreadId(query.id)).toBe(thread.id);
  });

  it("is idempotent across duplicate query.created events", async () => {
    const { agent } = makeAgent();
    await agent.handleRfxEvent({
      id: "e1",
      source: "rfx",
      type: "rfx.query.created",
      occurredAt: NOW,
      payload: { query },
    });
    await agent.handleRfxEvent({
      id: "e2",
      source: "rfx",
      type: "rfx.query.created",
      occurredAt: NOW,
      payload: { query },
    });
    expect(calls.threadsCreated).toHaveLength(1);
  });

  it("mirrors a new RFX message into the existing thread", async () => {
    const { agent } = makeAgent();
    await agent.handleRfxEvent({
      id: "e1",
      source: "rfx",
      type: "rfx.query.created",
      occurredAt: NOW,
      payload: { query },
    });
    const newMsg = {
      id: "m-2",
      authorId: "buyer-1",
      authorRole: "buyer" as const,
      body: "Class B is acceptable.",
      attachments: [],
      createdAt: NOW,
    };
    await agent.handleRfxEvent({
      id: "e3",
      source: "rfx",
      type: "rfx.query.message_added",
      occurredAt: NOW,
      payload: { queryId: query.id, message: newMsg },
    });
    expect(calls.qmMessages).toHaveLength(1);
    expect(calls.qmMessages[0]?.body).toBe("Class B is acceptable.");
    expect(calls.qmMessages[0]?.externalMessageId).toBe("m-2");
  });

  it("does not double-mirror the same RFX message", async () => {
    const { agent } = makeAgent();
    await agent.handleRfxEvent({
      id: "e1",
      source: "rfx",
      type: "rfx.query.created",
      occurredAt: NOW,
      payload: { query },
    });
    const msg = {
      id: "m-2",
      authorId: "buyer-1",
      authorRole: "buyer" as const,
      body: "again",
      attachments: [],
      createdAt: NOW,
    };
    const ev = {
      id: "e3",
      source: "rfx" as const,
      type: "rfx.query.message_added" as const,
      occurredAt: NOW,
      payload: { queryId: query.id, message: msg },
    };
    await agent.handleRfxEvent(ev);
    await agent.handleRfxEvent({ ...ev, id: "e4" });
    expect(calls.qmMessages).toHaveLength(1);
  });

  it("forwards RFX status changes to QM", async () => {
    const { agent } = makeAgent();
    await agent.handleRfxEvent({
      id: "e1",
      source: "rfx",
      type: "rfx.query.created",
      occurredAt: NOW,
      payload: { query },
    });
    await agent.handleRfxEvent({
      id: "e2",
      source: "rfx",
      type: "rfx.query.status_changed",
      occurredAt: NOW,
      payload: { queryId: query.id, status: "closed" },
    });
    expect(calls.qmStatusUpdates).toEqual([{ threadId: thread.id, status: "closed" }]);
  });
});

describe("SyncAgent (QM → RFX)", () => {
  it("mirrors QM messages back to the originating RFX query", async () => {
    const { agent, store } = makeAgent();
    await store.setThreadId(query.id, thread.id);

    const reply = {
      id: "qm-m-9",
      authorId: "vendor-1",
      authorRole: "vendor" as const,
      body: "Confirmed Class B.",
      attachments: [],
      createdAt: NOW,
    };
    await agent.handleQmEvent({
      id: "e1",
      source: "query_manager",
      type: "qm.thread.message_added",
      occurredAt: NOW,
      payload: { threadId: thread.id, message: reply },
    });
    expect(calls.rfxMessages).toEqual([
      { rfxQueryId: query.id, body: "Confirmed Class B." },
    ]);
  });

  it("drops QM messages for unmapped threads (no upstream RFX query)", async () => {
    const { agent } = makeAgent();
    const reply = {
      id: "qm-m-9",
      authorId: "vendor-1",
      authorRole: "vendor" as const,
      body: "Orphan",
      attachments: [],
      createdAt: NOW,
    };
    await agent.handleQmEvent({
      id: "e1",
      source: "query_manager",
      type: "qm.thread.message_added",
      occurredAt: NOW,
      payload: { threadId: "t-unknown", message: reply },
    });
    expect(calls.rfxMessages).toHaveLength(0);
  });

  it("forwards QM status changes back to RFX", async () => {
    const { agent, store } = makeAgent();
    await store.setThreadId(query.id, thread.id);
    await agent.handleQmEvent({
      id: "e1",
      source: "query_manager",
      type: "qm.thread.status_changed",
      occurredAt: NOW,
      payload: { threadId: thread.id, status: "answered" },
    });
    expect(calls.rfxStatusUpdates).toEqual([{ rfxQueryId: query.id, status: "answered" }]);
  });
});
