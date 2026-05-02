import type { ProcessedEmailStore } from "../types";

export class InMemoryProcessedEmailStore implements ProcessedEmailStore {
  private readonly processedEmailIds = new Set<string>();

  private toKey(emailId: string, workspaceId: string): string {
    return `${workspaceId}:${emailId}`;
  }

  async hasProcessed(emailId: string, workspaceId: string): Promise<boolean> {
    return this.processedEmailIds.has(this.toKey(emailId, workspaceId));
  }

  async markProcessed(emailId: string, workspaceId: string): Promise<void> {
    this.processedEmailIds.add(this.toKey(emailId, workspaceId));
  }
}
