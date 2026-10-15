export class InvalidDecisionConfidenceError
  extends Error {
  constructor() {
    super(
      "Decision confidence must be a finite number between 0 and 1.",
    );

    this.name =
      "InvalidDecisionConfidenceError";
  }
}

export function validateConfidenceSignal(
  value: number,
): number {
  if (
    !Number.isFinite(value) ||
    value < 0 ||
    value > 1
  ) {
    throw new InvalidDecisionConfidenceError();
  }

  return value;
}