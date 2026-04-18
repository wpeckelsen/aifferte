import type { SupabaseClient } from "@supabase/supabase-js";
import type { ProcessedEmailStore } from "../types";

export class SupabaseProcessedEmailStore implements ProcessedEmailStore {
  constructor(private readonly supabase: SupabaseClient) {}

  async hasProcessed(emailId: string, workspaceId: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from("processed_emails")
      .select("email_id")
      .eq("email_id", emailId)
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to check processed status for email ${emailId}: ${error.message}`);
    }

    return data !== null;
  }

  async markProcessed(emailId: string, workspaceId: string): Promise<void> {
    const { error } = await this.supabase
      .from("processed_emails")
      .insert({ email_id: emailId, workspace_id: workspaceId });

    if (error) {
      // Ignore duplicate key errors — idempotent by design
      if (error.code === "23505") {
        return;
      }
      throw new Error(`Failed to mark email ${emailId} as processed: ${error.message}`);
    }
  }
}
