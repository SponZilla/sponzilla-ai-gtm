import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { Execution } from "../../generated/prisma/client.js";

import {
  createDecisionExecutionMonitoringService,
  type ExecutionMonitoringDependencies,
} from "./decision-execution-monitoring.service.js";

import {
  decisionExecutionRecoveryService,
} from "./decision-execution-recovery.service.js";

const NOW = new Date("2026-10-29T12:00:00.000Z");
const DEFAULT_STALE_AFTER_MS = 15 * 60 * 1000;

function createExecution(
  overrides: Partial<Execution> = {},
): Execution {
  return {
    id: "execution-1",
    decisionId: "decision-1",
    status: "PENDING",
    startedAt: new Date(NOW.getTime() - 5 * 60 * 1000),
    lastHeartbeatAt: null,
    ...overrides,
  } as Execution;
}

function createHarness(
  unclaimed: Execution[] = [],
  potentiallyStale: Execution[] = [],
) {
  const calls = {
    unclaimed: 0,
    potentiallyStale: 0,
    staleBefore: undefined as Date | undefined,
    unclaimedLimit: undefined as number | undefined,
    staleLimit: undefined as number | undefined,
  };

  const dependencies = {
    executionRepository: {
      findUnclaimedExecutions: async (limit: number) => {
        calls.unclaimed++;
        calls.unclaimedLimit = limit;
        return unclaimed;
      },

      findPotentiallyStaleExecutions: async (
        staleBefore: Date,
        limit: number,
      ) => {
        calls.potentiallyStale++;
        calls.staleBefore = staleBefore;
        calls.staleLimit = limit;
        return potentiallyStale;
      },
    },

    recoveryService: decisionExecutionRecoveryService,
  } as unknown as ExecutionMonitoringDependencies;

  return {
    service: createDecisionExecutionMonitoringService(
      dependencies,
    ),
    calls,
  };
}

describe("DecisionExecutionMonitoringService", () => {
  it("includes unclaimed executions requiring reconciliation", async () => {
    const unclaimed = createExecution({
      id: "unclaimed-1",
      startedAt: null,
      lastHeartbeatAt: null,
    });

    const { service } = createHarness([unclaimed]);

    const report = await service.generateReport({
      now: NOW,
    });

    assert.equal(report.counts.unclaimed, 1);
    assert.equal(report.counts.staleUncertain, 0);
    assert.equal(report.counts.total, 1);

    assert.equal(
      report.executions[0]?.recoveryState,
      "UNCLAIMED",
    );

    assert.equal(
      report.executions[0]?.safeToAutoRetry,
      false,
    );
  });

  it("includes stale executions requiring reconciliation", async () => {
    const stale = createExecution({
      id: "stale-1",
      startedAt: new Date(
        NOW.getTime() - 30 * 60 * 1000,
      ),
      lastHeartbeatAt: new Date(
        NOW.getTime() - 20 * 60 * 1000,
      ),
    });

    const { service } = createHarness([], [stale]);

    const report = await service.generateReport({
      now: NOW,
    });

    assert.equal(report.counts.unclaimed, 0);
    assert.equal(report.counts.staleUncertain, 1);
    assert.equal(report.counts.total, 1);

    assert.equal(
      report.executions[0]?.recoveryState,
      "STALE_UNCERTAIN",
    );

    assert.equal(
      report.executions[0]?.safeToAutoRetry,
      false,
    );
  });

  it("excludes active executions from reconciliation", async () => {
    const active = createExecution({
      id: "active-1",
      startedAt: new Date(
        NOW.getTime() - 5 * 60 * 1000,
      ),
      lastHeartbeatAt: new Date(
        NOW.getTime() - 2 * 60 * 1000,
      ),
    });

    const { service } = createHarness([], [active]);

    const report = await service.generateReport({
      now: NOW,
    });

    assert.equal(report.counts.total, 0);
    assert.equal(report.executions.length, 0);
  });

  it("excludes terminal executions from reconciliation", async () => {
    const succeeded = createExecution({
      id: "succeeded-1",
      status: "SUCCEEDED",
    });

    const failed = createExecution({
      id: "failed-1",
      status: "FAILED",
    });

    const { service } = createHarness(
      [],
      [succeeded, failed],
    );

    const report = await service.generateReport({
      now: NOW,
    });

    assert.equal(report.counts.total, 0);
    assert.equal(report.executions.length, 0);
  });

  it("deduplicates executions returned by both queries", async () => {
    const sharedExecution = createExecution({
      id: "shared-1",
      startedAt: null,
      lastHeartbeatAt: null,
    });

    const { service } = createHarness(
      [sharedExecution],
      [sharedExecution],
    );

    const report = await service.generateReport({
      now: NOW,
    });

    assert.equal(report.counts.unclaimed, 1);
    assert.equal(report.counts.total, 1);
    assert.equal(report.executions.length, 1);
  });

  it("passes the requested limit and stale cutoff to the repository", async () => {
    const { service, calls } = createHarness();

    const customLimit = 25;
    const customStaleAfterMs = 10 * 60 * 1000;

    await service.generateReport({
      now: NOW,
      limit: customLimit,
      staleAfterMs: customStaleAfterMs,
    });

    assert.equal(calls.unclaimed, 1);
    assert.equal(calls.potentiallyStale, 1);

    assert.equal(calls.unclaimedLimit, customLimit);
    assert.equal(calls.staleLimit, customLimit);

    assert.equal(
      calls.staleBefore?.getTime(),
      NOW.getTime() - customStaleAfterMs,
    );
  });

  it("marks the report as potentially truncated when a query reaches its limit", async () => {
    const limit = 2;

    const unclaimed = [
      createExecution({
        id: "unclaimed-1",
        startedAt: null,
      }),
      createExecution({
        id: "unclaimed-2",
        startedAt: null,
      }),
    ];

    const { service } = createHarness(unclaimed, []);

    const report = await service.generateReport({
      now: NOW,
      limit,
    });

    assert.equal(report.potentiallyTruncated, true);
  });

  it("does not mark the report as truncated when neither query reaches its limit", async () => {
    const unclaimed = [
      createExecution({
        id: "unclaimed-1",
        startedAt: null,
      }),
    ];

    const { service } = createHarness(unclaimed, []);

    const report = await service.generateReport({
      now: NOW,
      limit: 10,
    });

    assert.equal(report.potentiallyTruncated, false);
  });

  it("reports the supplied generation time and stale threshold", async () => {
    const { service } = createHarness();

    const report = await service.generateReport({
      now: NOW,
      staleAfterMs: DEFAULT_STALE_AFTER_MS,
    });

    assert.equal(report.generatedAt, NOW.toISOString());
    assert.equal(
      report.staleAfterMs,
      DEFAULT_STALE_AFTER_MS,
    );
  });

  it("rejects invalid stale thresholds", async () => {
    const { service, calls } = createHarness();

    for (const staleAfterMs of [
      0,
      -1,
      Number.NaN,
      Number.POSITIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
    ]) {
      await assert.rejects(
        service.generateReport({
          now: NOW,
          staleAfterMs,
        }),
        /staleAfterMs must be a positive finite number/,
      );
    }

    assert.equal(calls.unclaimed, 0);
    assert.equal(calls.potentiallyStale, 0);
  });

  it("rejects an invalid generation date", async () => {
    const { service, calls } = createHarness();

    await assert.rejects(
      service.generateReport({
        now: new Date("invalid"),
      }),
      /now must be a valid Date/,
    );

    assert.equal(calls.unclaimed, 0);
    assert.equal(calls.potentiallyStale, 0);
  });

  it("rejects invalid limits", async () => {
    const { service, calls } = createHarness();

    for (const limit of [
      0,
      -1,
      1.5,
      101,
      Number.NaN,
      Number.POSITIVE_INFINITY,
    ]) {
      await assert.rejects(
        service.generateReport({
          now: NOW,
          limit,
        }),
        /limit must be an integer between 1 and 100/,
      );
    }

    assert.equal(calls.unclaimed, 0);
    assert.equal(calls.potentiallyStale, 0);
  });
});