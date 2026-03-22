import type { EmailProvider } from "./domain";

export type EmailProcessingState =
  | "received"
  | "dedupe_checked"
  | "skipped_duplicate"
  | "classified"
  | "skipped_irrelevant"
  | "knowledge_retrieved"
  | "reply_generated"
  | "draft_created"
  | "completed"
  | "failed";

export interface EmailProcessingSnapshot {
  emailId: string;
  provider: EmailProvider;
  state: EmailProcessingState;
  attemptCount: number;
  lastError?: string;
  updatedAt: string;
}

export interface EmailProcessingEvent {
  emailId: string;
  from: EmailProcessingState | "none";
  to: EmailProcessingState;
  at: string;
  metadata?: Record<string, unknown>;
}

export interface TransitionRequest {
  emailId: string;
  from: EmailProcessingState | "none";
  to: EmailProcessingState;
  provider?: EmailProvider;
  metadata?: Record<string, unknown>;
}
