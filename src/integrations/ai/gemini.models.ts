import "dotenv/config";

import {
  GoogleGenAI,
} from "@google/genai";

async function main(): Promise<void> {
  const apiKey =
    process.env.GEMINI_API_KEY?.trim();

  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is missing.",
    );
  }

  const client = new GoogleGenAI({
    apiKey,
  });

  console.log(
    "Checking available Gemini models...",
  );

  try {
    const models =
      await client.models.list();

    let count = 0;

    for await (const model of models) {
      const name = model.name ?? "";

      const actions =
        model.supportedActions ?? [];

      if (
        name.includes("gemini") &&
        actions.includes(
          "generateContent",
        )
      ) {
        console.log(name);
        count++;
      }
    }

    console.log(
      `Found ${count} generation models.`,
    );
  } catch (error) {
    const status =
      typeof error === "object" &&
      error !== null &&
      "status" in error
        ? error.status
        : "UNKNOWN";

    console.error(
      "Model discovery failed. HTTP status:",
      status,
    );

    process.exitCode = 1;
  }
}

main().catch(() => {
  console.error(
    "Unable to complete model discovery.",
  );

  process.exitCode = 1;
});