export class GeminiDeadlineExceededError
  extends Error {
  constructor() {
    super("Gemini operation deadline exceeded.");
    this.name = "GeminiDeadlineExceededError";
  }
}

export function remainingDeadlineMs(
  startedAt: number,
  deadlineMs: number,
  now: number = Date.now(),
): number {
  if (
    !Number.isFinite(startedAt) ||
    !Number.isSafeInteger(deadlineMs) ||
    deadlineMs < 1
  ) {
    throw new GeminiDeadlineExceededError();
  }

  const remaining =
    deadlineMs - (now - startedAt);

  if (
    !Number.isFinite(remaining) ||
    remaining <= 0
  ) {
    throw new GeminiDeadlineExceededError();
  }

  return Math.max(
    1,
    Math.floor(remaining),
  );
}