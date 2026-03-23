import type {
  AiIntegration,
  ClassificationResult,
  EmailMessage,
  GeneratedReply,
  KnowledgeChunk,
} from "../types";

export class MockAiIntegration implements AiIntegration {
  async classifyEmail(email: EmailMessage): Promise<ClassificationResult> {
    const text = `${email.subject} ${email.bodyText}`.toLowerCase();

    const isPrice = /price|pricing|quote|cost/.test(text);
    const isPolicy = /policy|refund|return|cancellation|cancel/.test(text);

    if (isPrice) {
      return {
        label: "relevant",
        topic: "price",
        confidence: 0.92,
        reasoning: "Matched pricing keywords",
      };
    }

    if (isPolicy) {
      return {
        label: "relevant",
        topic: "policy",
        confidence: 0.91,
        reasoning: "Matched policy keywords",
      };
    }

    return {
      label: "not_relevant",
      topic: "other",
      confidence: 0.95,
      reasoning: "No supported topic detected",
    };
  }

  async generateEmailReply(input: {
    email: EmailMessage;
    classification: ClassificationResult;
    knowledge: KnowledgeChunk[];
  }): Promise<GeneratedReply> {
    const knowledgeLines = input.knowledge
      .slice(0, 2)
      .map((chunk) => `- ${chunk.title}: ${chunk.content}`)
      .join("\n");

    return {
      subject: `Re: ${input.email.subject}`,
      bodyText:
        `Hi,\n\nThanks for your question about ${input.classification.topic}.\n\n` +
        `Here is what I found:\n${knowledgeLines || "- No matching knowledge found."}\n\n` +
        "If you want, I can provide more detail.\n\nBest regards,\nAifferte",
      confidence: 0.88,
    };
  }
}
