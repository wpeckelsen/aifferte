import {
  MockAiIntegration,
  MockInboxIntegration,
  MockKnowledgeBaseIntegration,
} from "../integrations";
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
}

export function createEmailProcessingOrchestrator(
  options: CreateEmailProcessingOrchestratorOptions = {},
): DefaultEmailProcessingOrchestrator {
  const inbox = new MockInboxIntegration();
  const ai = new MockAiIntegration();
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
