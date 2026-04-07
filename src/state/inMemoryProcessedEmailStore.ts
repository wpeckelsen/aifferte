import type { ProcessedEmailStore } from "../types";

export class InMemoryProcessedEmailStore implements ProcessedEmailStore {
  private readonly processedEmailIds = new Set<string>();

  async hasProcessed(emailId: string): Promise<boolean> {
    return this.processedEmailIds.has(emailId);
  }

  async markProcessed(emailId: string): Promise<void> {
    this.processedEmailIds.add(emailId);
  }
}
