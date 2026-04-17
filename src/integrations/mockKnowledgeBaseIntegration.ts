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
      const tokens = tokenizeQuery(input.query);

      if (tokens.length > 0) {
        const scored = result
          .map((chunk) => ({
            chunk,
            score: countMatches(chunk, tokens),
          }))
          .filter((item) => item.score > 0)
          .sort((a, b) => b.score - a.score)
          .map((item) => item.chunk);

        // Keep behavior forgiving: if nothing matches query tokens, return topic-matched chunks.
        if (scored.length > 0) {
          result = scored;
        }
      }
    }

    return result.slice(0, input.limit ?? 5);
  }
}

function tokenizeQuery(query: string): string[] {
  const stopWords = new Set([
    "a",
    "an",
    "and",
    "are",
    "can",
    "for",
    "get",
    "how",
    "i",
    "is",
    "it",
    "my",
    "of",
    "on",
    "or",
    "the",
    "to",
    "we",
    "what",
    "your",
  ]);

  return query
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3)
    .filter((token) => !stopWords.has(token));
}

function countMatches(chunk: KnowledgeChunk, tokens: string[]): number {
  const haystack = `${chunk.title} ${chunk.content} ${chunk.tags.join(" ")}`.toLowerCase();
  let score = 0;

  for (const token of tokens) {
    if (haystack.includes(token)) {
      score += 1;
    }
  }

  return score;
}
