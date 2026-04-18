import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ClassificationResult,
  KnowledgeBaseIntegration,
  KnowledgeChunk,
  UserContext,
} from "../types";

export class SupabaseKnowledgeBaseIntegration implements KnowledgeBaseIntegration {
  constructor(private readonly supabase: SupabaseClient) {}

  async fetchKnowledgeForUser(input: {
    userContext: UserContext;
    topic?: ClassificationResult["topic"];
    query?: string;
    limit?: number;
  }): Promise<KnowledgeChunk[]> {
    let queryBuilder = this.supabase
      .from("knowledge_chunks")
      .select("id, title, content, tags, source")
      .eq("workspace_id", input.userContext.workspaceId);

    if (input.topic && input.topic !== "other") {
      queryBuilder = queryBuilder.contains("tags", [input.topic]);
    }

    if (input.limit) {
      queryBuilder = queryBuilder.limit(input.limit);
    }

    const { data, error } = await queryBuilder;

    if (error) {
      throw new Error(`Failed to fetch knowledge for workspace ${input.userContext.workspaceId}: ${error.message}`);
    }

    return (data ?? []).map((row) => ({
      id: row.id as string,
      title: row.title as string,
      content: row.content as string,
      tags: row.tags as string[],
      source: row.source as string | undefined,
    }));
  }
}
