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

  private toKey(emailId: string, workspaceId: string): string {
    return `${workspaceId}:${emailId}`;
  }

  async getSnapshot(emailId: string, workspaceId: string): Promise<EmailProcessingSnapshot | null> {
    const snapshot = this.snapshots.get(this.toKey(emailId, workspaceId));
    return snapshot ? { ...snapshot } : null;
  }

  async getEvents(emailId: string, workspaceId: string): Promise<EmailProcessingEvent[]> {
    return [...(this.events.get(this.toKey(emailId, workspaceId)) ?? [])];
  }

  async transition(request: TransitionRequest): Promise<EmailProcessingSnapshot> {
    const key = this.toKey(request.emailId, request.workspaceId);
    const existing = this.snapshots.get(key);
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

    this.snapshots.set(key, snapshot);
    this.addEvent(key, {
      emailId: request.emailId,
      from: request.from,
      to: request.to,
      at: now,
      metadata: request.metadata,
    });

    return { ...snapshot };
  }

  async markFailed(emailId: string, workspaceId: string, error: string): Promise<EmailProcessingSnapshot> {
    const current = this.snapshots.get(this.toKey(emailId, workspaceId));
    const from = current?.state ?? "none";

    return this.transition({
      emailId,
      workspaceId,
      from,
      to: "failed",
      provider: current?.provider,
      metadata: { error },
    });
  }

  private addEvent(key: string, event: EmailProcessingEvent): void {
    const current = this.events.get(key) ?? [];
    this.events.set(key, [...current, event]);
  }

  private toErrorMessage(metadata?: Record<string, unknown>): string | undefined {
    const errorValue = metadata?.error;
    if (typeof errorValue === "string") {
      return errorValue;
    }
    return undefined;
  }
}
