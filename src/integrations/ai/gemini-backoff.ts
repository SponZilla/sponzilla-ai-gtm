import {
  remainingDeadlineMs,
} from "./gemini-deadline.js";

export const GEMINI_RETRY_DELAY_MS = 250;

export async function waitBeforeGeminiRetry(
  startedAt: number,
  deadlineMs: number,
): Promise<void> {
  const remainingMs =
    remainingDeadlineMs(
      startedAt,
      deadlineMs,
    );

  // Leave time for the next API attempt.
  if (remainingMs <= GEMINI_RETRY_DELAY_MS) {
    return;
  }

  await new Promise<void>(resolve => {
    setTimeout(
      resolve,
      GEMINI_RETRY_DELAY_MS,
    );
  });

  // Ensure time remains after waiting.
  remainingDeadlineMs(
    startedAt,
    deadlineMs,
  );
}