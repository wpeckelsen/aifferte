import type {
  AiIntegration,
  ClassificationResult,
  EmailMessage,
  GeneratedReply,
  KnowledgeChunk,
} from "../types";
import type { OpenRouterConfig } from "../config";

interface OpenRouterMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface OpenRouterRequestBody {
  model: string;
  messages: OpenRouterMessage[];
  temperature?: number;
  max_tokens?: number;
  response_format?: {
    type: "json_schema";
    json_schema: {
      name: string;
      strict: true;
      schema: Record<string, unknown>;
    };
  };
}

interface OpenRouterResponse {
  id?: string;
  model?: string;
  choices?: Array<{
    message?: {
      content?: string | null;
    };
    error?: {
      message?: string;
    };
  }>;
  error?: {
    message?: string;
  };
}

interface ClassificationPayload {
  label: "relevant" | "not_relevant";
  topic: "price" | "policy" | "other";
  confidence: number;
  reasoning?: string;
}

interface ReplyPayload {
  subject: string;
  bodyText: string;
  confidence?: number;
}

const classificationSchema = {
  type: "object",
  additionalProperties: false,
  required: ["label", "topic", "confidence", "reasoning"],
  properties: {
    label: {
      type: "string",
      enum: ["relevant", "not_relevant"],
    },
    topic: {
      type: "string",
      enum: ["price", "policy", "other"],
    },
    confidence: {
      type: "number",
      minimum: 0,
      maximum: 1,
    },
    reasoning: {
      type: "string",
      minLength: 1,
    },
  },
} as const;

const replySchema = {
  type: "object",
  additionalProperties: false,
  required: ["subject", "bodyText", "confidence"],
  properties: {
    subject: {
      type: "string",
      minLength: 1,
    },
    bodyText: {
      type: "string",
      minLength: 1,
    },
    confidence: {
      type: "number",
      minimum: 0,
      maximum: 1,
    },
  },
} as const;

export class OpenRouterAiIntegration implements AiIntegration {
  constructor(private readonly config: OpenRouterConfig) {}

  async classifyEmail(email: EmailMessage): Promise<ClassificationResult> {
    const startedAt = Date.now();
    console.info("[ai.classify.request]", {
      provider: "openrouter",
      emailId: email.id,
      model: this.config.classifyModel,
      subjectPreview: truncate(email.subject || "(empty)", 80),
    });

    try {
      const payload = await this.sendStructuredRequest<ClassificationPayload>({
        model: this.config.classifyModel,
        temperature: 0,
        max_tokens: 250,
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "email_relevance_classification",
            strict: true,
            schema: classificationSchema,
          },
        },
        messages: [
          {
            role: "system",
            content:
              "You classify inbound support emails for a small business. Only price inquiries and policy questions are relevant. Return JSON only.",
          },
          {
            role: "user",
            content: [
              "Classify this email.",
              "Relevant topics:",
              "- price: pricing, quote, cost, seats, billing questions",
              "- policy: refund, return, cancellation, cancellation terms, policy questions",
              "- other: everything else",
              "Rules:",
              "- label must be relevant only for price or policy",
              "- topic must be other when label is not_relevant",
              "- confidence must be between 0 and 1",
              `Subject: ${email.subject || "(empty)"}`,
              `Body: ${email.bodyText || "(empty)"}`,
            ].join("\n"),
          },
        ],
      }, this.config.classifierApiKey);

      const result: ClassificationResult = {
        label: payload.label,
        topic: payload.label === "not_relevant" ? "other" : payload.topic,
        confidence: clampConfidence(payload.confidence),
        reasoning: payload.reasoning,
      };

      console.info("[ai.classify.response]", {
        provider: "openrouter",
        emailId: email.id,
        label: result.label,
        topic: result.topic,
        confidence: result.confidence,
        durationMs: Date.now() - startedAt,
      });

      return result;
    } catch (error) {
      console.error("[ai.classify.error]", {
        provider: "openrouter",
        emailId: email.id,
        durationMs: Date.now() - startedAt,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }

  async generateEmailReply(input: {
    email: EmailMessage;
    classification: ClassificationResult;
    knowledge: KnowledgeChunk[];
  }): Promise<GeneratedReply> {
    const startedAt = Date.now();
    console.info("[ai.reply.request]", {
      provider: "openrouter",
      emailId: input.email.id,
      model: this.config.replyModel,
      topic: input.classification.topic,
      knowledgeCount: input.knowledge.length,
    });

    const knowledgeText = input.knowledge
      .map((chunk, index) => {
        const source = chunk.source ? ` [source: ${chunk.source}]` : "";
        return `${index + 1}. ${chunk.title}${source}\n${chunk.content}`;
      })
      .join("\n\n");

    try {
      const payload = await this.sendStructuredRequest<ReplyPayload>({
        model: this.config.replyModel,
        temperature: 0.2,
        max_tokens: 500,
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "draft_reply",
            strict: true,
            schema: replySchema,
          },
        },
        messages: [
          {
            role: "system",
            content:
              "You draft concise, professional email replies for a small business support inbox. Use only the provided knowledge. Do not invent policies, prices, or terms. Return JSON only.",
          },
          {
            role: "user",
            content: [
              `Customer subject: ${input.email.subject || "(empty)"}`,
              `Customer message: ${input.email.bodyText || "(empty)"}`,
              `Detected topic: ${input.classification.topic}`,
              "Knowledge base context:",
              knowledgeText || "No knowledge provided.",
              "Draft a reply email with a helpful tone. Keep it specific to the supplied knowledge and end with the company signature name Aifferte.",
            ].join("\n\n"),
          },
        ],
      }, this.config.replyGeneratorApiKey);

      const reply: GeneratedReply = {
        subject: payload.subject,
        bodyText: payload.bodyText,
        confidence: payload.confidence === undefined ? undefined : clampConfidence(payload.confidence),
      };

      console.info("[ai.reply.response]", {
        provider: "openrouter",
        emailId: input.email.id,
        confidence: reply.confidence,
        subjectPreview: truncate(reply.subject, 80),
        bodyLength: reply.bodyText.length,
        durationMs: Date.now() - startedAt,
      });

      return reply;
    } catch (error) {
      console.error("[ai.reply.error]", {
        provider: "openrouter",
        emailId: input.email.id,
        durationMs: Date.now() - startedAt,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }

  private async sendStructuredRequest<T>(body: OpenRouterRequestBody, apiKey: string): Promise<T> {
    const response = await this.post(body, apiKey);
    const content = response.choices?.[0]?.message?.content;

    if (!content) {
      const providerError = response.choices?.[0]?.error?.message || response.error?.message;
      throw new Error(providerError || "OpenRouter returned no message content");
    }

    try {
      return JSON.parse(content) as T;
    } catch (error) {
      throw new Error(
        `OpenRouter returned invalid JSON: ${error instanceof Error ? error.message : "Unknown parse error"}`,
      );
    }
  }

  private async post(body: OpenRouterRequestBody, apiKey: string): Promise<OpenRouterResponse> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);

    try {
      const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
        method: "POST",
        headers: this.buildHeaders(apiKey),
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      const data = (await response.json()) as OpenRouterResponse;

      if (!response.ok) {
        throw new Error(data.error?.message || `OpenRouter request failed with status ${response.status}`);
      }

      return data;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error(`OpenRouter request timed out after ${this.config.timeoutMs}ms`);
      }

      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  private buildHeaders(apiKey: string): Record<string, string> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    };

    if (this.config.httpReferer) {
      headers["HTTP-Referer"] = this.config.httpReferer;
    }

    if (this.config.appTitle) {
      headers["X-OpenRouter-Title"] = this.config.appTitle;
    }

    return headers;
  }
}

function clampConfidence(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  if (value < 0) {
    return 0;
  }

  if (value > 1) {
    return 1;
  }

  return value;
}

function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 3)}...`;
}