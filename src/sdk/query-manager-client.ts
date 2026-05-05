import { z } from "zod";
import { HttpClient, type HttpClientOptions } from "./http.js";
import {
  PaginatedSchema,
  QueryMessageSchema,
  QuerySchema,
  type Paginated,
  type Query,
  type QueryMessage,
} from "./types.js";

/**
 * Client for RIL Query Manager (https://pncplatform.ril.com/queryManager).
 *
 * Query Manager organises threads ("queries") referenced by an upstream
 * `externalRef` (typically the RFX query id). The client exposes the
 * minimum surface the bridge needs.
 */
export class QueryManagerClient {
  private readonly http: HttpClient;

  constructor(opts: HttpClientOptions) {
    this.http = new HttpClient(opts);
  }

  listThreads(params: {
    rfqId?: string;
    status?: "open" | "answered" | "closed";
    updatedSince?: string;
    cursor?: string;
    limit?: number;
  } = {}): Promise<Paginated<Query>> {
    return this.http.get("/api/v1/threads", PaginatedSchema(QuerySchema), params);
  }

  getThread(threadId: string): Promise<Query> {
    return this.http.get(`/api/v1/threads/${encodeURIComponent(threadId)}`, QuerySchema);
  }

  /** Find a thread by the upstream RFX query id, if it exists. */
  async findThreadByExternalId(externalId: string): Promise<Query | null> {
    const page = await this.http.get(
      "/api/v1/threads",
      PaginatedSchema(QuerySchema),
      { externalId, limit: 1 },
    );
    return page.items[0] ?? null;
  }

  createThread(input: {
    rfqId: string;
    vendorId?: string;
    subject: string;
    externalId: string;
    initialMessage: { authorId: string; authorRole: "buyer" | "vendor" | "system"; body: string };
  }): Promise<Query> {
    return this.http.post("/api/v1/threads", input, QuerySchema);
  }

  postMessage(
    threadId: string,
    body: { authorId: string; authorRole: "buyer" | "vendor" | "system"; body: string; externalMessageId?: string },
  ): Promise<QueryMessage> {
    return this.http.post(
      `/api/v1/threads/${encodeURIComponent(threadId)}/messages`,
      body,
      QueryMessageSchema,
    );
  }

  updateStatus(threadId: string, status: "open" | "answered" | "closed"): Promise<Query> {
    return this.http.patch(
      `/api/v1/threads/${encodeURIComponent(threadId)}`,
      { status },
      QuerySchema,
    );
  }

  static readonly WEBHOOK_SIGNATURE_HEADER = "x-qm-signature";

  static readonly WebhookEventSchema = z.object({
    eventId: z.string(),
    type: z.enum([
      "thread.created",
      "thread.updated",
      "thread.message_added",
      "thread.status_changed",
    ]),
    occurredAt: z.string().datetime({ offset: true }),
    data: z.record(z.unknown()),
  });
}

export type QueryManagerWebhookEvent = z.infer<typeof QueryManagerClient.WebhookEventSchema>;
