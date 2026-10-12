
import {
  decisionExecutionRepository,
} from "./decision-execution.repository.js";

import {
  decisionExecutionRecoveryService,
} from "./decision-execution-recovery.service.js";

const DEFAULT_STALE_AFTER_MS =
  15 * 60 * 1000;

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

export interface ExecutionMonitoringOptions {
  staleAfterMs?: number;
  limit?: number;
  now?: Date;
}

export const decisionExecutionMonitoringService = {
  async generateReport(
    options: ExecutionMonitoringOptions = {},
  ) {
    const {
      staleAfterMs = DEFAULT_STALE_AFTER_MS,
      limit = DEFAULT_LIMIT,
      now = new Date(),
    } = options;

    /*
     * Validate monitoring parameters.
     */
    if (
      !Number.isFinite(staleAfterMs) ||
      staleAfterMs <= 0
    ) {
      throw new Error(
        "staleAfterMs must be a positive finite number",
      );
    }

    if (
      !Number.isFinite(now.getTime())
    ) {
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

    /*
     * Both queries are read-only.
     *
     * Each query is independently limited,
     * so the combined report can contain
     * up to 2 * limit executions.
     */
    const [
      unclaimed,
      potentiallyStale,
    ] = await Promise.all([
      decisionExecutionRepository
        .findUnclaimedExecutions(limit),

      decisionExecutionRepository
        .findPotentiallyStaleExecutions(
          staleBefore,
          limit,
        ),
    ]);

    /*
     * Deduplicate defensively.
     */
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
      decisionExecutionRecoveryService
        .classify(
          execution,
          now,
          staleAfterMs,
        ),
    );

    /*
     * Only include executions that
     * require reconciliation.
     *
     * Concurrent database changes can
     * cause a record to be classified
     * as active after it was queried.
     */
    const requiringReconciliation =
      assessments.filter(
        (assessment) =>
          assessment.requiresReconciliation,
      );

    const unclaimedCount =
      requiringReconciliation.filter(
        (assessment) =>
          assessment.recoveryState ===
          "UNCLAIMED",
      ).length;

    const staleUncertainCount =
      requiringReconciliation.filter(
        (assessment) =>
          assessment.recoveryState ===
          "STALE_UNCERTAIN",
      ).length;

    return {
      generatedAt: now.toISOString(),

      staleAfterMs,

      counts: {
        unclaimed: unclaimedCount,
        staleUncertain: staleUncertainCount,
        total:
          requiringReconciliation.length,
      },

      /*
       * These counts describe only
       * the returned sample.
       */
      potentiallyTruncated:
        unclaimed.length === limit ||
        potentiallyStale.length === limit,

      executions:
        requiringReconciliation,
    };
  },
};
