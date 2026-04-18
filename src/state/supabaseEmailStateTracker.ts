import type { SupabaseClient } from "@supabase/supabase-js";
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

export class SupabaseEmailStateTracker implements EmailStateTracker {
  constructor(private readonly supabase: SupabaseClient) {}

  async getSnapshot(emailId: string, workspaceId: string): Promise<EmailProcessingSnapshot | null> {
    const { data, error } = await this.supabase
      .from("email_processing_snapshots")
      .select("*")
      .eq("email_id", emailId)
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to get snapshot for email ${emailId}: ${error.message}`);
    }

    if (!data) return null;

    return this.rowToSnapshot(data);
  }

  async getEvents(emailId: string, workspaceId: string): Promise<EmailProcessingEvent[]> {
    const { data, error } = await this.supabase
      .from("email_processing_events")
      .select("*")
      .eq("email_id", emailId)
      .eq("workspace_id", workspaceId)
      .order("at", { ascending: true });

    if (error) {
      throw new Error(`Failed to get events for email ${emailId}: ${error.message}`);
    }

    return (data ?? []).map(this.rowToEvent);
  }

  async transition(request: TransitionRequest): Promise<EmailProcessingSnapshot> {
    const existing = await this.getSnapshot(request.emailId, request.workspaceId);
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
    const attemptCount = request.to === "received"
      ? (existing?.attemptCount ?? 0) + 1
      : (existing?.attemptCount ?? 0);

    const snapshotRow = {
      email_id: request.emailId,
      workspace_id: request.workspaceId,
      provider,
      state: request.to,
      attempt_count: attemptCount,
      last_error: request.to === "failed" ? this.extractError(request.metadata) : null,
      updated_at: now,
    };

    const { error: upsertError } = await this.supabase
      .from("email_processing_snapshots")
      .upsert(snapshotRow, { onConflict: "email_id,workspace_id" });

    if (upsertError) {
      throw new Error(`Failed to upsert snapshot for email ${request.emailId}: ${upsertError.message}`);
    }

    const { error: eventError } = await this.supabase
      .from("email_processing_events")
      .insert({
        email_id: request.emailId,
        workspace_id: request.workspaceId,
        from_state: request.from,
        to_state: request.to,
        at: now,
        metadata: request.metadata ?? null,
      });

    if (eventError) {
      throw new Error(`Failed to insert event for email ${request.emailId}: ${eventError.message}`);
    }

    return {
      emailId: request.emailId,
      provider,
      state: request.to,
      attemptCount,
      lastError: request.to === "failed" ? this.extractError(request.metadata) : undefined,
      updatedAt: now,
    };
  }

  async markFailed(emailId: string, workspaceId: string, error: string): Promise<EmailProcessingSnapshot> {
    const current = await this.getSnapshot(emailId, workspaceId);
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

  private rowToSnapshot(row: Record<string, unknown>): EmailProcessingSnapshot {
    return {
      emailId: row.email_id as string,
      provider: row.provider as EmailProcessingSnapshot["provider"],
      state: row.state as EmailProcessingState,
      attemptCount: row.attempt_count as number,
      lastError: row.last_error as string | undefined,
      updatedAt: row.updated_at as string,
    };
  }

  private rowToEvent(row: Record<string, unknown>): EmailProcessingEvent {
    return {
      emailId: row.email_id as string,
      from: row.from_state as EmailProcessingEvent["from"],
      to: row.to_state as EmailProcessingState,
      at: row.at as string,
      metadata: row.metadata as Record<string, unknown> | undefined,
    };
  }

  private extractError(metadata?: Record<string, unknown>): string | undefined {
    const errorValue = metadata?.error;
    if (typeof errorValue === "string") return errorValue;
    return undefined;
  }
}
