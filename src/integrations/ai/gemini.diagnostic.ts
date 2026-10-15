import "dotenv/config";

import {
  GoogleGenAI,
} from "@google/genai";

function safeErrorDetails(error: unknown) {
  if (
    typeof error !== "object" ||
    error === null
  ) {
    return {
      type: "UNKNOWN_ERROR",
    };
  }

  const details = error as {
    name?: unknown;
    status?: unknown;
    code?: unknown;
  };

  return {
    name:
      typeof details.name === "string"
        ? details.name
        : "UNKNOWN_ERROR",

    status:
      typeof details.status === "number"
        ? details.status
        : null,

    code:
      typeof details.code === "number"
        ? details.code
        : null,
  };
}

async function main() {
  const apiKey =
    process.env.GEMINI_API_KEY?.trim();

  const model =
    process.env.GEMINI_MODEL?.trim();

  if (!apiKey || !model) {
    console.error(
      "Missing Gemini API configuration.",
    );

    process.exitCode = 1;
    return;
  }

  const client = new GoogleGenAI({
    apiKey,
  });

  console.log(
    "Testing Gemini model:",
    model,
  );

  try {
    const response =
      await client.models.generateContent({
        model,
        contents:
          "Reply with exactly the word OK.",
        config: {
          temperature: 0,
          maxOutputTokens: 100,
          httpOptions: {
            timeout: 15000,
          },
        },
      });

    console.log(
      "API request completed.",
    );

    console.log(
      "Response received:",
      Boolean(response.text?.trim()),
    );

    console.log(
      "Response text:",
      response.text?.trim() ?? "(empty)",
    );
  } catch (error) {
    console.error(
      "Gemini diagnostic:",
      safeErrorDetails(error),
    );

    process.exitCode = 1;
  }
}

main().catch(() => {
  console.error(
    "Unexpected diagnostic failure.",
  );

  process.exitCode = 1;
});