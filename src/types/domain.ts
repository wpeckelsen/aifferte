export type EmailProvider = "gmail" | "outlook";

export type RelevanceLabel = "relevant" | "not_relevant";

export type RelevanceTopic = "price" | "policy" | "other";

export type ProcessingStatus =
  | "skipped_duplicate"
  | "skipped_irrelevant"
  | "drafted"
  | "failed";

export interface EmailMessage {
  id: string;
  threadId?: string;
  subject: string;
  from: string;
  to: string[];
  receivedAt: string;
  bodyText: string;
  provider: EmailProvider;
}

export interface KnowledgeChunk {
  id: string;
  title: string;
  content: string;
  tags: string[];
  source?: string;
}

export interface ClassificationResult {
  label: RelevanceLabel;
  topic: RelevanceTopic;
  confidence: number;
  reasoning?: string;
}

export interface GeneratedReply {
  subject: string;
  bodyText: string;
  confidence?: number;
}

export interface ProcessResult {
  emailId: string;
  status: ProcessingStatus;
  reason?: string;
  draftId?: string;
}

export interface UserContext {
  userId: string;
  workspaceId: string;
  provider: EmailProvider;
}

export interface AppConfig {
  pollLimit: number;
  maxKnowledgeChunks: number;
  defaultReplyTone: "neutral" | "friendly" | "formal";
}
