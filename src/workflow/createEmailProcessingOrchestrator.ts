import {
  MockAiIntegration,
  MockInboxIntegration,
  MockKnowledgeBaseIntegration,
  OpenRouterAiIntegration,
} from "../integrations";
import type { RuntimeConfig } from "../config";
import { loadRuntimeConfig } from "../config";
import {
  ClassifyService,
  KnowledgeService,
  ReplyService,
} from "../services";
import {
  InMemoryEmailStateTracker,
  InMemoryProcessedEmailStore,
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
  const inbox = new MockInboxIntegration();
  const ai = runtimeConfig.aiProvider === "openrouter"
    ? new OpenRouterAiIntegration(getOpenRouterConfig(runtimeConfig))
    : new MockAiIntegration();
  const knowledgeBase = new MockKnowledgeBaseIntegration();

  const classifier = new ClassifyService(ai);
  const knowledgeRetriever = new KnowledgeService(knowledgeBase);
  const replyGenerator = new ReplyService(ai);

  const processedStore = new InMemoryProcessedEmailStore();
  const stateTracker = new InMemoryEmailStateTracker();

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

function getOpenRouterConfig(runtimeConfig: RuntimeConfig) {
  if (!runtimeConfig.openRouter) {
    throw new Error("OpenRouter config is missing while AI_PROVIDER is set to openrouter");
  }

  return runtimeConfig.openRouter;
}
