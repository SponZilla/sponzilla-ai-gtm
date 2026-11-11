import { env } from "../../config/env.js";

export const DRAFT_PROMPT_VERSION = "outreach-draft-v1";

export class DraftGenerationUnavailableError extends Error {
  constructor() {
    super(
      "GEMINI_API_KEY is not configured; outreach drafts cannot be generated.",
    );
    this.name = "DraftGenerationUnavailableError";
  }
}

export class DraftGenerationFailedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DraftGenerationFailedError";
  }
}

export interface DraftGenerationInput {
  company: {
    name: string;
    website: string | null;
    industry: string | null;
  };
  contact: {
    name: string;
    title: string | null;
  };
  opportunity: {
    title: string;
    objective: string | null;
  };
  evidence: ReadonlyArray<{ fact: string; sourceUrl?: string | null }>;
  signals: ReadonlyArray<{ type: string; title: string; summary: string }>;
  recommendation: string | null;
  nextActionHint: string | null;
  /** Operator-supplied context: offering, proof points, tone. */
  brief: string;
}

export interface GeneratedDraft {
  subject: string;
  body: string;
  modelVersion: string;
  promptVersion: string;
}

function buildPrompt(input: DraftGenerationInput): string {
  const evidenceLines = input.evidence
    .slice(0, 5)
    .map((item, index) => `${index + 1}. ${item.fact}`)
    .join("\n");

  const signalLines = input.signals
    .slice(0, 5)
    .map((signal) => `- ${signal.type}: ${signal.title} — ${signal.summary}`)
    .join("\n");

  return [
    "You write a single cold outreach email for a sponsorship/partnership agency.",
    "",
    "HARD RULES:",
    "- Use ONLY the facts provided below. Never invent numbers, budgets, client names, results, or dates.",
    "- Do not claim any prior conversation or relationship.",
    "- No placeholders such as [Name] appear in the body except the greeting name.",
    "- Plain text only, no markdown, no bullet lists.",
    "- 110-170 words. One clear call to action (a short call).",
    "- Confident and specific, never hypey or desperate.",
    "",
    "RECIPIENT",
    `Name: ${input.contact.name}`,
    `Title: ${input.contact.title ?? "unknown"}`,
    `Company: ${input.company.name}`,
    `Industry: ${input.company.industry ?? "unknown"}`,
    "",
    "OPPORTUNITY",
    `Working title: ${input.opportunity.title}`,
    `Objective: ${input.opportunity.objective ?? "not stated"}`,
    `Recommendation: ${input.recommendation ?? "not stated"}`,
    `Suggested next step: ${input.nextActionHint ?? "not stated"}`,
    "",
    "VERIFIED EVIDENCE (the only facts you may reference)",
    evidenceLines || "(none)",
    "",
    "DETECTED SIGNALS",
    signalLines || "(none)",
    "",
    "WHAT WE SELL (operator-supplied)",
    input.brief.trim() || "(not provided — keep the ask generic and low-commitment)",
    "",
    'Return JSON only: {"subject": "...", "body": "..."}',
  ].join("\n");
}

function parseDraftJson(raw: string): { subject: string; body: string } {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();

  let parsed: unknown;

  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new DraftGenerationFailedError(
      "Model returned content that is not valid JSON",
    );
  }

  const subject =
    typeof (parsed as { subject?: unknown }).subject === "string"
      ? (parsed as { subject: string }).subject.trim()
      : "";

  const body =
    typeof (parsed as { body?: unknown }).body === "string"
      ? (parsed as { body: string }).body.trim()
      : "";

  if (subject.length < 5 || subject.length > 150) {
    throw new DraftGenerationFailedError("Model returned an unusable subject");
  }

  if (body.length < 80 || body.length > 4000) {
    throw new DraftGenerationFailedError("Model returned an unusable body");
  }

  return { subject, body };
}

export async function generateOutreachDraft(
  input: DraftGenerationInput,
  dependencies: { apiKey?: string; fetchImpl?: typeof fetch } = {},
): Promise<GeneratedDraft> {
  const apiKey = dependencies.apiKey ?? env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new DraftGenerationUnavailableError();
  }

  const model = env.GEMINI_MODEL;
  const fetchImpl = dependencies.fetchImpl ?? fetch;

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  let response: Response | null = null;
  let text = "";

  /*
   * Gemini answers 503 "high demand" often enough that one attempt turned a
   * working draft into a 502 during the first live run. Absorb that here
   * instead of surfacing a transient upstream limit as a failed draft.
   */
  for (let attempt = 1; attempt <= 3; attempt++) {
    response = await fetchImpl(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: buildPrompt(input) }],
          },
        ],
        generationConfig: {
          temperature: 0.4,
          responseMimeType: "application/json",
        },
      }),
      signal: AbortSignal.timeout(45_000),
    });

    text = await response.text();

    if (response.ok) {
      break;
    }

    const retryable =
      response.status === 429 || response.status === 503 || response.status >= 500;

    if (!retryable || attempt === 3) {
      throw new DraftGenerationFailedError(
        `Gemini request failed [${response.status}]: ${text.slice(0, 200)}`,
      );
    }

    await new Promise((resolve) => setTimeout(resolve, 1_500 * attempt));
  }

  if (!response?.ok) {
    throw new DraftGenerationFailedError(
      `Gemini request failed after retries: ${text.slice(0, 200)}`,
    );
  }

  let payload: {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> } | null;
    }>;
  };

  try {
    payload = JSON.parse(text);
  } catch {
    throw new DraftGenerationFailedError("Gemini returned a non-JSON envelope");
  }

  const raw =
    payload.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? "")
      .join("") ?? "";

  if (!raw) {
    throw new DraftGenerationFailedError("Gemini returned no content");
  }

  const { subject, body } = parseDraftJson(raw);

  return {
    subject,
    body,
    modelVersion: model,
    promptVersion: DRAFT_PROMPT_VERSION,
  };
}
