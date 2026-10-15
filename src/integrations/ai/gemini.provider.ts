import {
  GoogleGenAI,
} from "@google/genai";

import {
  waitBeforeGeminiRetry,
} from "./gemini-backoff.js";

import {
  remainingDeadlineMs,
} from "./gemini-deadline.js";

import {
  GEMINI_MAX_ATTEMPTS,
  isRetryableGeminiError,
} from "./gemini-retry.policy.js";

import type {
  AIProvider,
  AITextGenerationRequest,
  AITextGenerationResult,
} from "./ai-provider.types.js";

export class GeminiConfigurationError
  extends Error {
  constructor() {
    super("Gemini provider configuration is invalid.");
    this.name = "GeminiConfigurationError";
  }
}

export class GeminiGenerationError
  extends Error {
  constructor() {
    super("Gemini text generation failed.");
    this.name = "GeminiGenerationError";
  }
}

interface GeminiResponse {
  text?: string;
}

interface GeminiClient {
  models: {
    generateContent(
      request: {
        model: string;
        contents: string;
        config: {
  systemInstruction: string;
  temperature: number;
  maxOutputTokens: number;
  responseMimeType: "application/json";
  httpOptions: {
    timeout: number;
  };
};
      },
    ): Promise<GeminiResponse>;
  };
}

interface GeminiProviderOptions {
  apiKey?: string;
  model?: string;
  timeoutMs?: number;
  client?: GeminiClient;
}

export class GeminiProvider
  implements AIProvider {
  private readonly client: GeminiClient;
  private readonly model: string;
  private readonly timeoutMs: number;

  constructor(
    options: GeminiProviderOptions = {},
  ) {
    const apiKey =
      options.apiKey ??
      process.env.GEMINI_API_KEY;

    const model =
      options.model ??
      process.env.GEMINI_MODEL;

    const timeoutMs =
      options.timeoutMs ??
      Number(
        process.env.GEMINI_TIMEOUT_MS ??
          "15000",
      );

    if (
      !apiKey?.trim() ||
      !model?.trim() ||
      !Number.isSafeInteger(timeoutMs) ||
      timeoutMs < 1000 ||
      timeoutMs > 60000
    ) {
      throw new GeminiConfigurationError();
    }

    this.client =
      options.client ??
      new GoogleGenAI({
        apiKey: apiKey.trim(),
      });

    this.model = model.trim();
    this.timeoutMs = timeoutMs;
  }

  async generateText(
    request: AITextGenerationRequest,
  ): Promise<AITextGenerationResult> {
    const systemInstruction =
      request.systemInstruction.trim();

    const prompt =
      request.prompt.trim();

    if (
      !systemInstruction ||
      !prompt ||
      systemInstruction.length > 10000 ||
      prompt.length > 20000
    ) {
      throw new GeminiGenerationError();
    }

    const startedAt = Date.now();

   for (
  let attempt = 1;
  attempt <= GEMINI_MAX_ATTEMPTS;
  attempt++
) {
    const remainingMs =
  remainingDeadlineMs(
    startedAt,
    this.timeoutMs,
  );
  try {
    const response =
      await this.client.models.generateContent({
        model: this.model,
        contents: prompt,
        config: {
          systemInstruction,
          temperature: 0.2,
          maxOutputTokens: 1024,
          responseMimeType: "application/json",
          httpOptions: {
            timeout: remainingMs,
          },
        },
      });

    const text = response.text?.trim();

    if (!text || text.length > 5000) {
      throw new GeminiGenerationError();
    }

    return {
      text,
      model: this.model,
    };
  } catch (error) {
    const shouldRetry =
      attempt < GEMINI_MAX_ATTEMPTS &&
      isRetryableGeminiError(error);

   if (!shouldRetry) {
  throw new GeminiGenerationError();
}

try {
  await waitBeforeGeminiRetry(
    startedAt,
    this.timeoutMs,
  );
} catch {
  throw new GeminiGenerationError();
}
  }
}

throw new GeminiGenerationError();
}
  }