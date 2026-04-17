import type {
  ClassificationResult,
  EmailMessage,
  GeneratedReply,
  KnowledgeChunk,
  ReplyGenerator,
  UserContext,
} from "../types";
import type { OpenRouterConfig } from "../config";
import { OpenRouterAiIntegration } from "./openRouterAiIntegration";

export class OpenRouterReplyIntegration implements ReplyGenerator {
  private readonly ai: OpenRouterAiIntegration;

  constructor(config: OpenRouterConfig) {
    this.ai = new OpenRouterAiIntegration(config);
  }

  async generateReply(input: {
    email: EmailMessage;
    classification: ClassificationResult;
    knowledge: KnowledgeChunk[];
    userContext: UserContext;
  }): Promise<GeneratedReply> {
    if (input.knowledge.length === 0) {
      throw new Error(
        `Cannot generate reply for email ${input.email.id}: no knowledge chunks provided`,
      );
    }

    return this.ai.generateEmailReply({
      email: input.email,
      classification: input.classification,
      knowledge: input.knowledge,
    });
  }
}