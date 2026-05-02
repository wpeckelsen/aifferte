export type AiProvider = "openrouter";

export interface OpenRouterConfig {
  classifierApiKey: string;
  replyGeneratorApiKey: string;
  classifyModel: string;
  replyModel: string;
  baseUrl: string;
  timeoutMs: number;
  appTitle?: string;
  httpReferer?: string;
}

export interface SupabaseConfig {
  url: string;
  serviceKey: string;
}

export interface RuntimeConfig {
  port: number;
  aiProvider: AiProvider;
  openRouter: OpenRouterConfig;
  supabase: SupabaseConfig;
}

function readRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function readRequiredEnvFrom(names: string[]): string {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) {
      return value;
    }
  }

  throw new Error(`Missing required environment variable: ${names.join(" or ")}`);
}

function readOptionalEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

function readNumberEnv(name: string, defaultValue: number): number {
  const raw = process.env[name]?.trim();

  if (!raw) {
    return defaultValue;
  }

  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Environment variable ${name} must be a positive number`);
  }

  return parsed;
}

export function loadRuntimeConfig(): RuntimeConfig {
  const aiProvider = process.env.AI_PROVIDER?.trim() || "openrouter";

  if (aiProvider !== "openrouter") {
    throw new Error("AI_PROVIDER must be 'openrouter'");
  }

  const config: RuntimeConfig = {
    port: readNumberEnv("PORT", 3000),
    aiProvider: "openrouter",
    openRouter: {
      classifierApiKey: readRequiredEnvFrom([
        "OPENROUTER_API_KEY_CLASSIFIER",
        "OPENROUTER_API_KEY",
      ]),
      replyGeneratorApiKey: readRequiredEnvFrom([
        "OPENROUTER_API_KEY_REPLY_GENERATOR",
        "OPENROUTER_API_KEY",
      ]),
      classifyModel: readRequiredEnv("OPENROUTER_CLASSIFY_MODEL"),
      replyModel: readRequiredEnv("OPENROUTER_REPLY_MODEL"),
      baseUrl: readOptionalEnv("OPENROUTER_BASE_URL") ?? "https://openrouter.ai/api/v1",
      timeoutMs: readNumberEnv("AI_TIMEOUT_MS", 15000),
      appTitle: readOptionalEnv("OPENROUTER_APP_TITLE"),
      httpReferer: readOptionalEnv("OPENROUTER_HTTP_REFERER"),
    },
    supabase: {
      url: readRequiredEnv("SUPABASE_URL"),
      serviceKey: readRequiredEnv("SUPABASE_SECRET_KEY"),
    },
  };

  return config;
}