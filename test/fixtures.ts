import type { Query, Rfq, Vendor } from "../src/sdk/types.js";

export const NOW = "2026-05-05T10:00:00.000Z";

export const vendor: Vendor = {
  id: "v-1",
  code: "VEN001",
  name: "Acme Industrial",
  email: "sales@acme.example",
  status: "active",
};

export const rfq: Rfq = {
  id: "rfq-1",
  rfqNumber: "RFQ-2026-001",
  title: "33kV Switchgear Procurement",
  description: "Supply of 33kV indoor switchgear panels.",
  status: "published",
  buyerOrgId: "org-ril",
  invitedVendorIds: [vendor.id],
  lineItems: [
    {
      id: "li-1",
      materialCode: "MAT-33KV-PANEL",
      description: "33kV VCB Panel",
      quantity: 6,
      uom: "EA",
      targetPrice: 850000,
    },
  ],
  publishedAt: NOW,
  closingAt: "2026-05-19T10:00:00.000Z",
  createdAt: NOW,
  updatedAt: NOW,
};

export const query: Query = {
  id: "q-1",
  rfqId: rfq.id,
  vendorId: vendor.id,
  subject: "Clarification on insulation class",
  status: "open",
  origin: "rfx",
  messages: [
    {
      id: "m-1",
      authorId: vendor.id,
      authorRole: "vendor",
      body: "Please confirm acceptable insulation class.",
      attachments: [],
      createdAt: NOW,
    },
  ],
  createdAt: NOW,
  updatedAt: NOW,
};
