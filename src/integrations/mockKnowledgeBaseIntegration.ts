import type {
  ClassificationResult,
  KnowledgeBaseIntegration,
  KnowledgeChunk,
  UserContext,
} from "../types";

export class MockKnowledgeBaseIntegration implements KnowledgeBaseIntegration {
  private readonly chunks: KnowledgeChunk[] = [
    {
      id: "kb-price-1",
      title: "Standard Pricing",
      content: "Starter plan is 29 EUR per user per month, billed monthly.",
      tags: ["price"],
      source: "mock-supabase",
    },
    {
      id: "kb-price-2",
      title: "Volume Discounts",
      content: "Discounts start at 10 users with tiered rates.",
      tags: ["price"],
      source: "mock-supabase",
    },
    {
      id: "kb-policy-1",
      title: "Refund Policy",
      content: "Refunds are available within 14 days for annual plans.",
      tags: ["policy"],
      source: "mock-supabase",
    },
    {
      id: "kb-policy-2",
      title: "Cancellation Policy",
      content: "You can cancel anytime; access remains until period end.",
      tags: ["policy"],
      source: "mock-supabase",
    },
  ];

  async fetchKnowledgeForUser(input: {
    userContext: UserContext;
    topic?: ClassificationResult["topic"];
    query?: string;
    limit?: number;
  }): Promise<KnowledgeChunk[]> {
    let result = [...this.chunks];

    if (input.topic && input.topic !== "other") {
      result = result.filter((chunk) => chunk.tags.includes(input.topic as string));
    }

    if (input.query) {
      const query = input.query.toLowerCase();
      result = result.filter(
        (chunk) =>
          chunk.title.toLowerCase().includes(query) ||
          chunk.content.toLowerCase().includes(query) ||
          chunk.tags.some((tag) => tag.toLowerCase().includes(query)),
      );
    }

    return result.slice(0, input.limit ?? 5);
  }
}
