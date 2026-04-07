import type {
  ClassificationResult,
  EmailMessage,
  KnowledgeBaseIntegration,
  KnowledgeChunk,
  KnowledgeRetriever,
  UserContext,
} from "../types";

const MAX_CHUNKS = 5;

export class KnowledgeService implements KnowledgeRetriever {
  constructor(private readonly knowledgeBase: KnowledgeBaseIntegration) {}

  async getRelevantKnowledge(input: {
    email: EmailMessage;
    classification: ClassificationResult;
    userContext: UserContext;
  }): Promise<KnowledgeChunk[]> {
    if (input.classification.label !== "relevant") {
      return [];
    }

    return this.knowledgeBase.fetchKnowledgeForUser({
      userContext: input.userContext,
      topic: input.classification.topic,
      query: input.email.subject,
      limit: MAX_CHUNKS,
    });
  }
}
