/**
 * Maps an upstream RFX query id <-> Query Manager thread id and tracks
 * which messages have been mirrored, so the sync agent can guarantee
 * idempotency under at-least-once delivery.
 */
export interface MappingStore {
  getThreadId(rfxQueryId: string): Promise<string | undefined>;
  setThreadId(rfxQueryId: string, threadId: string): Promise<void>;

  getRfxQueryId(threadId: string): Promise<string | undefined>;

  isMessageMirrored(scope: "rfx->qm" | "qm->rfx", externalMessageId: string): Promise<boolean>;
  markMessageMirrored(scope: "rfx->qm" | "qm->rfx", externalMessageId: string): Promise<void>;
}

/** Default in-memory implementation; production wires up a Redis-backed one. */
export class InMemoryMappingStore implements MappingStore {
  private rfxToQm = new Map<string, string>();
  private qmToRfx = new Map<string, string>();
  private mirrored = new Set<string>();

  async getThreadId(rfxQueryId: string) {
    return this.rfxToQm.get(rfxQueryId);
  }
  async setThreadId(rfxQueryId: string, threadId: string) {
    this.rfxToQm.set(rfxQueryId, threadId);
    this.qmToRfx.set(threadId, rfxQueryId);
  }
  async getRfxQueryId(threadId: string) {
    return this.qmToRfx.get(threadId);
  }
  async isMessageMirrored(scope: "rfx->qm" | "qm->rfx", id: string) {
    return this.mirrored.has(`${scope}:${id}`);
  }
  async markMessageMirrored(scope: "rfx->qm" | "qm->rfx", id: string) {
    this.mirrored.add(`${scope}:${id}`);
  }
}
