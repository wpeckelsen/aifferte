import type {
  AppConfig,
  EmailClassifier,
  EmailMessage,
  EmailProcessingOrchestrator,
  EmailStateTracker,
  InboxIntegration,
  KnowledgeRetriever,
  ProcessResult,
  ProcessedEmailStore,
  ReplyGenerator,
  UserContext,
} from "../types";

interface OrchestratorDependencies {
  inbox: InboxIntegration;
  classifier: EmailClassifier;
  knowledgeRetriever: KnowledgeRetriever;
  replyGenerator: ReplyGenerator;
  processedStore: ProcessedEmailStore;
  stateTracker: EmailStateTracker;
  config: Pick<AppConfig, "pollLimit">;
}

export class DefaultEmailProcessingOrchestrator implements EmailProcessingOrchestrator {
  constructor(private readonly deps: OrchestratorDependencies) { }

  async processNextBatch(userContext: UserContext): Promise<ProcessResult[]> {
    const emails = await this.deps.inbox.pollNewEmails(userContext, this.deps.config.pollLimit);

    const results: ProcessResult[] = [];
    for (const email of emails) {
      const result = await this.processSingleEmail(email, userContext);
      results.push(result);
    }

    return results;
  }

  async processSingleEmail(email: EmailMessage, userContext: UserContext): Promise<ProcessResult> {
    try {
      const alreadyProcessed = await this.deps.processedStore.hasProcessed(email.id);
      if (alreadyProcessed) {
        return {
          emailId: email.id,
          status: "skipped_duplicate",
          reason: "Email already processed",
        };
      }

      await this.transitionTo(email, "received");
      await this.transitionTo(email, "dedupe_checked");

      const classification = await this.deps.classifier.classify(email);
      await this.transitionTo(email, "classified", {
        label: classification.label,
        topic: classification.topic,
        confidence: classification.confidence,
      });

      if (classification.label === "not_relevant") {
        await this.transitionTo(email, "skipped_irrelevant", {
          topic: classification.topic,
          confidence: classification.confidence,
        });

        await this.deps.processedStore.markProcessed(email.id);
        await this.transitionTo(email, "completed");

        return {
          emailId: email.id,
          status: "skipped_irrelevant",
          reason: "Classified as not relevant",
        };
      }

      const knowledge = await this.deps.knowledgeRetriever.getRelevantKnowledge({
        email,
        classification,
        userContext,
      });
      await this.transitionTo(email, "knowledge_retrieved", {
        chunkCount: knowledge.length,
      });

      if (knowledge.length === 0) {
        throw new Error(
          `Cannot generate reply for email ${email.id}: no knowledge chunks provided`,
        );
      }

      const reply = await this.deps.replyGenerator.generateReply({
        email,
        classification,
        knowledge,
        userContext,
      });
      await this.transitionTo(email, "reply_generated");

      const draft = await this.deps.inbox.createDraftReply({
        originalEmail: email,
        reply,
        userContext,
      });
      await this.transitionTo(email, "draft_created", { draftId: draft.draftId });

      await this.deps.processedStore.markProcessed(email.id);
      await this.transitionTo(email, "completed");

      return {
        emailId: email.id,
        status: "drafted",
        draftId: draft.draftId,
        draft: reply,
      };
    } catch (error) {
      await this.safeMarkFailed(email, this.toErrorMessage(error));

      return {
        emailId: email.id,
        status: "failed",
        reason: this.toErrorMessage(error),
      };
    }
  }

  private async transitionTo(
    email: EmailMessage,
    to: "received" | "dedupe_checked" | "skipped_duplicate" | "classified" | "skipped_irrelevant" | "knowledge_retrieved" | "reply_generated" | "draft_created" | "completed",
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    const snapshot = await this.deps.stateTracker.getSnapshot(email.id);
    const from = snapshot?.state ?? "none";

    await this.deps.stateTracker.transition({
      emailId: email.id,
      from,
      to,
      provider: email.provider,
      metadata,
    });
  }

  private async safeMarkFailed(email: EmailMessage, reason: string): Promise<void> {
    const snapshot = await this.deps.stateTracker.getSnapshot(email.id);

    if (snapshot?.state === "completed") {
      return;
    }

    if (!snapshot) {
      await this.deps.stateTracker.transition({
        emailId: email.id,
        from: "none",
        to: "received",
        provider: email.provider,
      });
    }

    await this.deps.stateTracker.markFailed(email.id, reason);
  }

  private toErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return "Unknown processing error";
  }
}
