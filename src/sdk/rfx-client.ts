import { z } from "zod";
import { HttpClient, type HttpClientOptions } from "./http.js";
import {
  OfferVersionSchema,
  PaginatedSchema,
  QueryMessageSchema,
  QuerySchema,
  RfqSchema,
  VendorSchema,
  type OfferVersion,
  type Paginated,
  type Query,
  type QueryMessage,
  type Rfq,
  type Vendor,
} from "./types.js";

/**
 * Client for RIL RFX Manager (https://rfxmanager.ril.com).
 *
 * Endpoints follow the conventional shape `/api/v1/...` since the public
 * portal does not expose a documented OpenAPI spec; the bridge service
 * is designed so the path map below is the single point of change.
 */
export class RfxManagerClient {
  private readonly http: HttpClient;

  constructor(opts: HttpClientOptions) {
    this.http = new HttpClient(opts);
  }

  // ---------- RFQs ----------

  listRfqs(params: {
    status?: string;
    cursor?: string;
    limit?: number;
    updatedSince?: string;
  } = {}): Promise<Paginated<Rfq>> {
    return this.http.get("/api/v1/rfqs", PaginatedSchema(RfqSchema), params);
  }

  getRfq(rfqId: string): Promise<Rfq> {
    return this.http.get(`/api/v1/rfqs/${encodeURIComponent(rfqId)}`, RfqSchema);
  }

  // ---------- Vendors ----------

  listVendors(params: { cursor?: string; limit?: number } = {}): Promise<Paginated<Vendor>> {
    return this.http.get("/api/v1/vendors", PaginatedSchema(VendorSchema), params);
  }

  getVendor(vendorId: string): Promise<Vendor> {
    return this.http.get(`/api/v1/vendors/${encodeURIComponent(vendorId)}`, VendorSchema);
  }

  // ---------- Offer versions ----------

  listOfferVersions(rfqId: string): Promise<Paginated<OfferVersion>> {
    return this.http.get(
      `/api/v1/rfqs/${encodeURIComponent(rfqId)}/offers`,
      PaginatedSchema(OfferVersionSchema),
    );
  }

  getOfferVersion(rfqId: string, offerId: string): Promise<OfferVersion> {
    return this.http.get(
      `/api/v1/rfqs/${encodeURIComponent(rfqId)}/offers/${encodeURIComponent(offerId)}`,
      OfferVersionSchema,
    );
  }

  // ---------- Queries (RFX side) ----------

  listQueries(rfqId: string, params: { updatedSince?: string } = {}): Promise<Paginated<Query>> {
    return this.http.get(
      `/api/v1/rfqs/${encodeURIComponent(rfqId)}/queries`,
      PaginatedSchema(QuerySchema),
      params,
    );
  }

  getQuery(queryId: string): Promise<Query> {
    return this.http.get(`/api/v1/queries/${encodeURIComponent(queryId)}`, QuerySchema);
  }

  postQueryMessage(queryId: string, body: { authorId: string; body: string }): Promise<QueryMessage> {
    return this.http.post(
      `/api/v1/queries/${encodeURIComponent(queryId)}/messages`,
      body,
      QueryMessageSchema,
    );
  }

  updateQueryStatus(queryId: string, status: "open" | "answered" | "closed"): Promise<Query> {
    return this.http.patch(
      `/api/v1/queries/${encodeURIComponent(queryId)}`,
      { status },
      QuerySchema,
    );
  }

  // ---------- Webhook signature ----------

  /** Header name used by RFX Manager to deliver the HMAC signature. */
  static readonly WEBHOOK_SIGNATURE_HEADER = "x-rfx-signature";

  /** Schema describing the inbound webhook envelope. */
  static readonly WebhookEventSchema = z.object({
    eventId: z.string(),
    type: z.enum([
      "rfq.published",
      "rfq.updated",
      "query.created",
      "query.message_added",
      "query.status_changed",
      "offer.submitted",
    ]),
    occurredAt: z.string().datetime({ offset: true }),
    data: z.record(z.unknown()),
  });
}

export type RfxWebhookEvent = z.infer<typeof RfxManagerClient.WebhookEventSchema>;
