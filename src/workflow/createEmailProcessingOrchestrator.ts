import {
  MockInboxIntegration,
  MockKnowledgeBaseIntegration,
  OpenRouterAiIntegration,
  OpenRouterReplyIntegration,
} from "../integrations";
import type { RuntimeConfig } from "../config";
import { loadRuntimeConfig } from "../config";
import {
  ClassifyService,
  KnowledgeService,
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
  const openRouterConfig = runtimeConfig.openRouter;
  const inbox = new MockInboxIntegration();
  const classifierAi = new OpenRouterAiIntegration(openRouterConfig);
  const knowledgeBase = new MockKnowledgeBaseIntegration();

  const classifier = new ClassifyService(classifierAi);
  const knowledgeRetriever = new KnowledgeService(knowledgeBase);
  const replyGenerator = new OpenRouterReplyIntegration(openRouterConfig);

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
