import type {
  AiIntegration,
  ClassificationResult,
  EmailClassifier,
} from "../types";
import type { EmailMessage } from "../types";

export class ClassifyService implements EmailClassifier {
  constructor(private readonly ai: AiIntegration) {}

  async classify(email: EmailMessage): Promise<ClassificationResult> {
    if (!email.bodyText.trim() && !email.subject.trim()) {
      return {
        label: "not_relevant",
        topic: "other",
        confidence: 1,
        reasoning: "Email has no subject or body",
      };
    }

    return this.ai.classifyEmail(email);
  }
}
