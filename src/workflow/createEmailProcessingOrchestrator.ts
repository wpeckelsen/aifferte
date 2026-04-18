import { createClient } from "@supabase/supabase-js";
import {
  MockInboxIntegration,
  OpenRouterAiIntegration,
  OpenRouterReplyIntegration,
  SupabaseKnowledgeBaseIntegration,
} from "../integrations";
import type { RuntimeConfig } from "../config";
import { loadRuntimeConfig } from "../config";
import {
  ClassifyService,
  KnowledgeService,
} from "../services";
import {
  SupabaseEmailStateTracker,
  SupabaseProcessedEmailStore,
} from "../state";
import { DefaultEmailProcessingOrchestrator } from "./emailProcessingOrchestrator";

interface CreateEmailProcessingOrchestratorOptions {
  pollLimit?: number;
  runtimeConfig?: RuntimeConfig;
}

export function createEmailProcessingOrchestrator(
  options: CreateEmailProcessingOrchestratorOptions = {},
): DefaultEmailProcessingOrchestrator {
  const runtimeConfig = options.runtimeConfig ?? loadRuntimeConfig();
  const openRouterConfig = runtimeConfig.openRouter;
  const supabaseConfig = runtimeConfig.supabase;

  const supabase = createClient(supabaseConfig.url, supabaseConfig.serviceKey, {
    auth: { persistSession: false },
  });

  const inbox = new MockInboxIntegration();
  const classifierAi = new OpenRouterAiIntegration(openRouterConfig);
  const knowledgeBase = new SupabaseKnowledgeBaseIntegration(supabase);

  const classifier = new ClassifyService(classifierAi);
  const knowledgeRetriever = new KnowledgeService(knowledgeBase);
  const replyGenerator = new OpenRouterReplyIntegration(openRouterConfig);

  const processedStore = new SupabaseProcessedEmailStore(supabase);
  const stateTracker = new SupabaseEmailStateTracker(supabase);

  return new DefaultEmailProcessingOrchestrator({
    inbox,
    classifier,
    knowledgeRetriever,
    replyGenerator,
    processedStore,
    stateTracker,
    config: {
      pollLimit: options.pollLimit ?? 10,
    },
  });
}
