import type {
  ClassificationResult,
  EmailMessage,
  GeneratedReply,
  KnowledgeChunk,
  ProcessResult,
  UserContext,
} from "./domain";
import type {
  EmailProcessingEvent,
  EmailProcessingSnapshot,
  TransitionRequest,
} from "./processing";

export interface EmailClassifier {
  classify(email: EmailMessage): Promise<ClassificationResult>;
}

export interface KnowledgeRetriever {
  getRelevantKnowledge(input: {
    email: EmailMessage;
    classification: ClassificationResult;
    userContext: UserContext;
  }): Promise<KnowledgeChunk[]>;
}

export interface ReplyGenerator {
  generateReply(input: {
    email: EmailMessage;
    classification: ClassificationResult;
    knowledge: KnowledgeChunk[];
    userContext: UserContext;
  }): Promise<GeneratedReply>;
}

export interface InboxIntegration {
  pollNewEmails(userContext: UserContext, limit: number): Promise<EmailMessage[]>;
  createDraftReply(input: {
    originalEmail: EmailMessage;
    reply: GeneratedReply;
    userContext: UserContext;
  }): Promise<{ draftId: string }>;
}

export interface AiIntegration {
  classifyEmail(email: EmailMessage): Promise<ClassificationResult>;
  generateEmailReply(input: {
    email: EmailMessage;
    classification: ClassificationResult;
    knowledge: KnowledgeChunk[];
  }): Promise<GeneratedReply>;
}

export interface KnowledgeBaseIntegration {
  fetchKnowledgeForUser(input: {
    userContext: UserContext;
    topic?: ClassificationResult["topic"];
    query?: string;
    limit?: number;
  }): Promise<KnowledgeChunk[]>;
}

export interface ProcessedEmailStore {
  hasProcessed(emailId: string): Promise<boolean>;
  markProcessed(emailId: string): Promise<void>;
}

export interface EmailStateTracker {
  getSnapshot(emailId: string): Promise<EmailProcessingSnapshot | null>;
  getEvents(emailId: string): Promise<EmailProcessingEvent[]>;
  transition(request: TransitionRequest): Promise<EmailProcessingSnapshot>;
  markFailed(emailId: string, error: string): Promise<EmailProcessingSnapshot>;
}

export interface EmailProcessingOrchestrator {
  processNextBatch(userContext: UserContext): Promise<ProcessResult[]>;
  processSingleEmail(email: EmailMessage, userContext: UserContext): Promise<ProcessResult>;
}
