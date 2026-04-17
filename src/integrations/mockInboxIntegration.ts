import type {
  EmailMessage,
  GeneratedReply,
  InboxIntegration,
  UserContext,
} from "../types";

export class MockInboxIntegration implements InboxIntegration {
  private readonly emails: EmailMessage[] = [
    {
      id: "email-1",
      threadId: "thread-1",
      subject: "Can I get pricing for 20 seats?",
      from: "alice@acme.com",
      to: ["support@aifferte.com"],
      receivedAt: new Date().toISOString(),
      bodyText: "Hi team, what is your pricing for 20 users?",
      provider: "gmail",
    },
    {
      id: "email-2",
      threadId: "thread-2",
      subject: "What is your refund policy?",
      from: "bob@beta.io",
      to: ["support@aifferte.com"],
      receivedAt: new Date().toISOString(),
      bodyText: "Please share your cancellation and refund policy.",
      provider: "outlook",
    },
    {
      id: "email-3",
      threadId: "thread-3",
      subject: "Your subscription is ending soon",
      from: "noreply@examplecomp.com",
      to: ["support@aifferte.com"],
      receivedAt: new Date().toISOString(),
      bodyText: "Dear xyz, your subscription is ending soon. Please renew to continue enjoying our service.",
      provider: "gmail",
    },
  ];

  async pollNewEmails(userContext: UserContext, limit: number): Promise<EmailMessage[]> {
    return this.emails.filter((email) => email.provider === userContext.provider).slice(0, limit);
  }

  async createDraftReply(input: {
    originalEmail: EmailMessage;
    reply: GeneratedReply;
    userContext: UserContext;
  }): Promise<{ draftId: string }> {
    const draftId = `draft-${input.originalEmail.id}`;
    return { draftId };
  }
}
