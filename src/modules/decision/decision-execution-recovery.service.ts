
import type {
  Execution,
} from "../../generated/prisma/client.js";

export type ExecutionRecoveryState =
  | "UNCLAIMED"
  | "ACTIVE_OR_RECENT"
  | "STALE_UNCERTAIN"
  | "TERMINAL";

export interface ExecutionRecoveryAssessment {
  executionId: string;
  decisionId: string;
  recoveryState: ExecutionRecoveryState;
  requiresReconciliation: boolean;
  safeToAutoRetry: false;
  reason: string;
}

const DEFAULT_STALE_AFTER_MS =
  15 * 60 * 1000;

export const decisionExecutionRecoveryService = {
  classify(
    execution: Execution,
    now: Date = new Date(),
    staleAfterMs: number = DEFAULT_STALE_AFTER_MS,
  ): ExecutionRecoveryAssessment {
    if (
      !Number.isFinite(staleAfterMs) ||
      staleAfterMs <= 0
    ) {
      throw new Error(
        "staleAfterMs must be a positive finite number",
      );
    }

    const base = {
      executionId: execution.id,
      decisionId: execution.decisionId,
      safeToAutoRetry: false as const,
    };

    if (
      execution.status === "SUCCEEDED" ||
      execution.status === "FAILED"
    ) {
      return {
        ...base,
        recoveryState: "TERMINAL",
        requiresReconciliation: false,
        reason:
          "Execution has reached a terminal state.",
      };
    }

    if (execution.startedAt === null) {
      return {
        ...base,
        recoveryState: "UNCLAIMED",
        requiresReconciliation: true,
        reason:
          "Execution exists but has not been claimed.",
      };
    }

    const lastActivity =
      execution.lastHeartbeatAt ??
      execution.startedAt;

    const elapsedMs =
      now.getTime() -
      lastActivity.getTime();

    if (
      elapsedMs < DEFAULT_STALE_AFTER_MS &&
      staleAfterMs === DEFAULT_STALE_AFTER_MS
    ) {
      return {
        ...base,
        recoveryState: "ACTIVE_OR_RECENT",
        requiresReconciliation: false,
        reason:
          "Execution has recent activity.",
      };
    }

    if (elapsedMs < staleAfterMs) {
      return {
        ...base,
        recoveryState: "ACTIVE_OR_RECENT",
        requiresReconciliation: false,
        reason:
          "Execution is within the configured activity window.",
      };
    }

    return {
      ...base,
      recoveryState: "STALE_UNCERTAIN",
      requiresReconciliation: true,
      reason:
        "Execution activity is stale; external outcome is unknown.",
    };
  },
};
