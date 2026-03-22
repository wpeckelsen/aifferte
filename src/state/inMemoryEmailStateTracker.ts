import type { EmailStateTracker } from "../types";
import type {
  EmailProcessingEvent,
  EmailProcessingSnapshot,
  EmailProcessingState,
  TransitionRequest,
} from "../types";

const ALLOWED_TRANSITIONS: Record<EmailProcessingState | "none", EmailProcessingState[]> = {
  none: ["received"],
  received: ["dedupe_checked", "failed"],
  dedupe_checked: ["skipped_duplicate", "classified", "failed"],
  skipped_duplicate: ["completed"],
  classified: ["skipped_irrelevant", "knowledge_retrieved", "failed"],
  skipped_irrelevant: ["completed"],
  knowledge_retrieved: ["reply_generated", "failed"],
  reply_generated: ["draft_created", "failed"],
  draft_created: ["completed", "failed"],
  completed: [],
  failed: ["received"],
};

export class InMemoryEmailStateTracker implements EmailStateTracker {
  private readonly snapshots = new Map<string, EmailProcessingSnapshot>();
  private readonly events = new Map<string, EmailProcessingEvent[]>();

  async getSnapshot(emailId: string): Promise<EmailProcessingSnapshot | null> {
    const snapshot = this.snapshots.get(emailId);
    return snapshot ? { ...snapshot } : null;
  }

  async getEvents(emailId: string): Promise<EmailProcessingEvent[]> {
    return [...(this.events.get(emailId) ?? [])];
  }

  async transition(request: TransitionRequest): Promise<EmailProcessingSnapshot> {
    const existing = this.snapshots.get(request.emailId);
    const expectedFrom = existing?.state ?? "none";

    if (expectedFrom !== request.from) {
      throw new Error(
        `Invalid state transition for email ${request.emailId}: expected from ${expectedFrom}, got ${request.from}`,
      );
    }

    const validTargets = ALLOWED_TRANSITIONS[request.from];
    if (!validTargets.includes(request.to)) {
      throw new Error(
        `Invalid state transition for email ${request.emailId}: ${request.from} -> ${request.to}`,
      );
    }

    const provider = request.provider ?? existing?.provider;
    if (!provider) {
      throw new Error(`Provider is required for initial state transition on email ${request.emailId}`);
    }

    const now = new Date().toISOString();
    const snapshot: EmailProcessingSnapshot = {
      emailId: request.emailId,
      provider,
      state: request.to,
      attemptCount: request.to === "received" ? (existing?.attemptCount ?? 0) + 1 : (existing?.attemptCount ?? 0),
      lastError: request.to === "failed" ? this.toErrorMessage(request.metadata) : undefined,
      updatedAt: now,
    };

    this.snapshots.set(request.emailId, snapshot);
    this.addEvent({
      emailId: request.emailId,
      from: request.from,
      to: request.to,
      at: now,
      metadata: request.metadata,
    });

    return { ...snapshot };
  }

  async markFailed(emailId: string, error: string): Promise<EmailProcessingSnapshot> {
    const current = this.snapshots.get(emailId);
    const from = current?.state ?? "none";

    return this.transition({
      emailId,
      from,
      to: "failed",
      provider: current?.provider,
      metadata: { error },
    });
  }

  private addEvent(event: EmailProcessingEvent): void {
    const current = this.events.get(event.emailId) ?? [];
    this.events.set(event.emailId, [...current, event]);
  }

  private toErrorMessage(metadata?: Record<string, unknown>): string | undefined {
    const errorValue = metadata?.error;
    if (typeof errorValue === "string") {
      return errorValue;
    }
    return undefined;
  }
}
