import {
  gtmAIResponseSchema,
  type GTMAIResponse,
} from "./gtm-ai-response.schema.js";

export class InvalidGTMAIResponseError
  extends Error {
  constructor() {
    super(
      "AI response failed structured validation.",
    );

    this.name =
      "InvalidGTMAIResponseError";
  }
}

const MAX_RESPONSE_LENGTH = 5000;

export function validateGTMAIResponse(
  rawText: string,
): GTMAIResponse {
  if (
    typeof rawText !== "string" ||
    rawText.length === 0 ||
    rawText.length > MAX_RESPONSE_LENGTH
  ) {
    throw new InvalidGTMAIResponseError();
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(rawText);
  } catch {
    throw new InvalidGTMAIResponseError();
  }

  const result =
    gtmAIResponseSchema.safeParse(parsed);

  if (!result.success) {
    throw new InvalidGTMAIResponseError();
  }

  return result.data;
}