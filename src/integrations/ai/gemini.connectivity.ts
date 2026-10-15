import "dotenv/config";

import {
  GeminiProvider,
} from "./gemini.provider.js";

import {
  validateGTMAIResponse,
} from "./gtm-ai-response.validator.js";

async function main(): Promise<void> {
  const provider = new GeminiProvider();

  console.log(
    "Starting Gemini connectivity test...",
  );

  const response =
    await provider.generateText({
      systemInstruction: [
        "You are a GTM research assistant.",
        "Return only a valid JSON object.",
        "The JSON must contain exactly two fields:",
        "summary (string) and reasoning (array of strings).",
        "Do not include Markdown.",
      ].join(" "),

      prompt: [
        "A consumer electronics company",
        "is considering a student marketing campaign.",
        "The approved next action is company research.",
        "Provide one short summary and two reasoning statements.",
        "Do not change the action.",
      ].join(" "),
    });

  const validated =
    validateGTMAIResponse(
      response.text,
    );

  console.log(
    "Gemini connectivity successful.",
  );

  console.log(
    JSON.stringify(
      {
        model: response.model,
        summary: validated.summary,
        reasoning: validated.reasoning,
      },
      null,
      2,
    ),
  );
}

main().catch(error => {
  console.error(
    "Gemini connectivity test failed:",
    error instanceof Error
      ? error.name
      : "UnknownError",
  );

  process.exitCode = 1;
});