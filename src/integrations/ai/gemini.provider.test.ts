import assert from "node:assert/strict";
import {
  describe,
  it,
} from "node:test";

import {
  GeminiProvider,
  GeminiConfigurationError,
  GeminiGenerationError,
} from "./gemini.provider.js";

function createProvider(
  generateContent: (
    request: any,
  ) => Promise<{ text?: string }>,
) {
  return new GeminiProvider({
    apiKey: "test-api-key",
    model: "test-model",
    timeoutMs: 15000,
    client: {
      models: {
        generateContent,
      },
    },
  });
}

const validRequest = {
  systemInstruction:
    "You are a GTM assistant.",
  prompt:
    "Analyze the provided opportunity.",
};

describe(
  "Gemini provider",
  () => {
    it(
  "retries once after a transient failure",
  async () => {
    let attempts = 0;

    const provider = createProvider(
      async () => {
        attempts++;

        if (attempts === 1) {
          throw { status: 503 };
        }

        return {
          text: JSON.stringify({
            summary: "Research the company.",
            reasoning: [
              "Research is required.",
            ],
          }),
        };
      },
    );

    const result =
      await provider.generateText(
        validRequest,
      );

    assert.equal(attempts, 2);
    assert.ok(result.text);
  },
);

it(
  "does not retry authentication failures",
  async () => {
    let attempts = 0;

    const provider = createProvider(
      async () => {
        attempts++;
        throw { status: 403 };
      },
    );

    await assert.rejects(
      provider.generateText(
        validRequest,
      ),
      GeminiGenerationError,
    );

    assert.equal(attempts, 1);
  },
);
    it(
      "returns a valid generated response",
      async () => {
        const provider = createProvider(
          async () => ({
            text: "Research the company.",
          }),
        );

        const result =
          await provider.generateText(
            validRequest,
          );

        assert.deepEqual(result, {
          text: "Research the company.",
          model: "test-model",
        });
      },
    );

    it(
      "passes controlled generation settings",
      async () => {
        let capturedRequest: any;

        const provider = createProvider(
          async request => {
            capturedRequest = request;

            return {
              text: "Valid response",
            };
          },
        );

        await provider.generateText(
          validRequest,
        );

        assert.equal(
          capturedRequest.model,
          "test-model",
        );

        assert.equal(
          capturedRequest.config.temperature,
          0.2,
        );

        assert.equal(
          capturedRequest.config.httpOptions.timeout,
          15000,
        );
      },
    );

    it(
      "rejects empty prompts",
      async () => {
        const provider = createProvider(
          async () => ({
            text: "Unused",
          }),
        );

        await assert.rejects(
          provider.generateText({
            ...validRequest,
            prompt: "   ",
          }),
          GeminiGenerationError,
        );
      },
    );

    it(
      "rejects oversized prompts",
      async () => {
        const provider = createProvider(
          async () => ({
            text: "Unused",
          }),
        );

        await assert.rejects(
          provider.generateText({
            ...validRequest,
            prompt: "a".repeat(20001),
          }),
          GeminiGenerationError,
        );
      },
    );

    it(
      "rejects empty model responses",
      async () => {
        const provider = createProvider(
          async () => ({
            text: "   ",
          }),
        );

        await assert.rejects(
          provider.generateText(
            validRequest,
          ),
          GeminiGenerationError,
        );
      },
    );

    it(
      "sanitizes provider failures",
      async () => {
        const provider = createProvider(
          async () => {
            throw new Error(
              "Sensitive provider details",
            );
          },
        );

        await assert.rejects(
          provider.generateText(
            validRequest,
          ),
          error => {
            assert.ok(
              error instanceof
                GeminiGenerationError,
            );

            assert.equal(
              error.message,
              "Gemini text generation failed.",
            );

            return true;
          },
        );
      },
    );

    it(
      "rejects invalid timeout configuration",
      () => {
        assert.throws(
          () =>
            new GeminiProvider({
              apiKey: "test-api-key",
              model: "test-model",
              timeoutMs: -1,
            }),
          GeminiConfigurationError,
        );
      },
    );
  },
);