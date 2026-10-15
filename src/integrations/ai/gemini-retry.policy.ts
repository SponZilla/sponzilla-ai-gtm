export const GEMINI_MAX_ATTEMPTS = 2;

const RETRYABLE_STATUSES = new Set([
  429,
  500,
  502,
  503,
  504,
]);

export function isRetryableGeminiError(
  error: unknown,
): boolean {
  if (
    typeof error !== "object" ||
    error === null ||
    !("status" in error)
  ) {
    return false;
  }

  const status = error.status;

  return (
    typeof status === "number" &&
    RETRYABLE_STATUSES.has(status)
  );
}