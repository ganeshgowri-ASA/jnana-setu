import { z } from "zod";

export const IsoDateTime = z.string().datetime({ offset: true });

export const VendorSchema = z.object({
  id: z.string(),
  code: z.string().optional(),
  name: z.string(),
  email: z.string().email().optional(),
  contactPerson: z.string().optional(),
  status: z.enum(["active", "inactive", "blacklisted"]).default("active"),
});
export type Vendor = z.infer<typeof VendorSchema>;

export const RfqLineItemSchema = z.object({
  id: z.string(),
  materialCode: z.string().optional(),
  description: z.string(),
  quantity: z.number().nonnegative(),
  uom: z.string().default("EA"),
  targetPrice: z.number().nonnegative().optional(),
});
export type RfqLineItem = z.infer<typeof RfqLineItemSchema>;

export const RfqStatus = z.enum([
  "draft",
  "published",
  "in_review",
  "awarded",
  "cancelled",
  "closed",
]);

export const RfqSchema = z.object({
  id: z.string(),
  rfqNumber: z.string(),
  title: z.string(),
  description: z.string().optional(),
  status: RfqStatus,
  buyerOrgId: z.string(),
  invitedVendorIds: z.array(z.string()).default([]),
  lineItems: z.array(RfqLineItemSchema).default([]),
  publishedAt: IsoDateTime.optional(),
  closingAt: IsoDateTime.optional(),
  createdAt: IsoDateTime,
  updatedAt: IsoDateTime,
});
export type Rfq = z.infer<typeof RfqSchema>;

export const OfferLineSchema = z.object({
  lineItemId: z.string(),
  unitPrice: z.number().nonnegative(),
  currency: z.string().length(3).default("INR"),
  leadTimeDays: z.number().int().nonnegative().optional(),
  remarks: z.string().optional(),
});
export type OfferLine = z.infer<typeof OfferLineSchema>;

export const OfferVersionSchema = z.object({
  id: z.string(),
  rfqId: z.string(),
  vendorId: z.string(),
  version: z.number().int().positive(),
  totalValue: z.number().nonnegative(),
  currency: z.string().length(3).default("INR"),
  lines: z.array(OfferLineSchema).default([]),
  submittedAt: IsoDateTime,
  status: z.enum(["submitted", "withdrawn", "superseded"]).default("submitted"),
});
export type OfferVersion = z.infer<typeof OfferVersionSchema>;

export const QueryStatus = z.enum(["open", "answered", "closed"]);

export const QueryMessageSchema = z.object({
  id: z.string(),
  authorId: z.string(),
  authorRole: z.enum(["buyer", "vendor", "system"]),
  body: z.string(),
  attachments: z
    .array(z.object({ id: z.string(), filename: z.string(), url: z.string().url() }))
    .default([]),
  createdAt: IsoDateTime,
});
export type QueryMessage = z.infer<typeof QueryMessageSchema>;

export const QuerySchema = z.object({
  id: z.string(),
  rfqId: z.string(),
  vendorId: z.string().optional(),
  subject: z.string(),
  status: QueryStatus,
  origin: z.enum(["rfx", "query_manager"]),
  externalId: z.string().optional(),
  messages: z.array(QueryMessageSchema).default([]),
  createdAt: IsoDateTime,
  updatedAt: IsoDateTime,
});
export type Query = z.infer<typeof QuerySchema>;

export const PaginatedSchema = <T extends z.ZodTypeAny>(item: T) =>
  z.object({
    items: z.array(item),
    nextCursor: z.string().nullable().default(null),
    total: z.number().int().nonnegative().optional(),
  });

export type Paginated<T> = { items: T[]; nextCursor: string | null; total?: number };
