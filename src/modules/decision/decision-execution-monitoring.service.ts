import {
  decisionExecutionRepository,
} from "./decision-execution.repository.js";

import {
  decisionExecutionRecoveryService,
} from "./decision-execution-recovery.service.js";

const DEFAULT_STALE_AFTER_MS = 15 * 60 * 1000;
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

export interface ExecutionMonitoringOptions {
  staleAfterMs?: number;
  limit?: number;
  now?: Date;
}

export interface ExecutionMonitoringDependencies {
  executionRepository: Pick<
    typeof decisionExecutionRepository,
    | "findUnclaimedExecutions"
    | "findPotentiallyStaleExecutions"
  >;

  recoveryService: Pick<
    typeof decisionExecutionRecoveryService,
    "classify"
  >;
}

export function createDecisionExecutionMonitoringService(
  dependencies: ExecutionMonitoringDependencies = {
    executionRepository: decisionExecutionRepository,
    recoveryService: decisionExecutionRecoveryService,
  },
) {
  return {
    async generateReport(
      options: ExecutionMonitoringOptions = {},
    ) {
      const {
        staleAfterMs = DEFAULT_STALE_AFTER_MS,
        limit = DEFAULT_LIMIT,
        now = new Date(),
      } = options;

      if (
        !Number.isFinite(staleAfterMs) ||
        staleAfterMs <= 0
      ) {
        throw new Error(
          "staleAfterMs must be a positive finite number",
        );
      }

      if (!Number.isFinite(now.getTime())) {
        throw new Error(
          "now must be a valid Date",
        );
      }

      if (
        !Number.isSafeInteger(limit) ||
        limit < 1 ||
        limit > MAX_LIMIT
      ) {
        throw new Error(
          `limit must be an integer between 1 and ${MAX_LIMIT}`,
        );
      }

      const staleBefore = new Date(
        now.getTime() - staleAfterMs,
      );

      const [
        unclaimed,
        potentiallyStale,
      ] = await Promise.all([
        dependencies.executionRepository
          .findUnclaimedExecutions(limit),

        dependencies.executionRepository
          .findPotentiallyStaleExecutions(
            staleBefore,
            limit,
          ),
      ]);

      const uniqueExecutions = new Map(
        [
          ...unclaimed,
          ...potentiallyStale,
        ].map((execution) => [
          execution.id,
          execution,
        ]),
      );

      const assessments = [
        ...uniqueExecutions.values(),
      ].map((execution) =>
        dependencies.recoveryService.classify(
          execution,
          now,
          staleAfterMs,
        ),
      );

      const requiringReconciliation =
        assessments.filter(
          (assessment) =>
            assessment.requiresReconciliation,
        );

      const unclaimedCount =
        requiringReconciliation.filter(
          (assessment) =>
            assessment.recoveryState === "UNCLAIMED",
        ).length;

      const staleUncertainCount =
        requiringReconciliation.filter(
          (assessment) =>
            assessment.recoveryState === "STALE_UNCERTAIN",
        ).length;

      return {
        generatedAt: now.toISOString(),
        staleAfterMs,

        counts: {
          unclaimed: unclaimedCount,
          staleUncertain: staleUncertainCount,
          total: requiringReconciliation.length,
        },

        potentiallyTruncated:
          unclaimed.length === limit ||
          potentiallyStale.length === limit,

        executions: requiringReconciliation,
      };
    },
  };
}

export const decisionExecutionMonitoringService =
  createDecisionExecutionMonitoringService();
