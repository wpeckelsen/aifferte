import type {
  AiIntegration,
  ClassificationResult,
  EmailMessage,
  GeneratedReply,
  KnowledgeChunk,
  ReplyGenerator,
  UserContext,
} from "../types";

export class ReplyService implements ReplyGenerator {
  constructor(private readonly ai: AiIntegration) {}

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
