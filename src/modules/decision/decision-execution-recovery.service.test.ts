import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { Execution } from "../../generated/prisma/client.js";
import { decisionExecutionRecoveryService } from "./decision-execution-recovery.service.js";

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

describe("DecisionExecutionRecoveryService", () => {
  it("classifies an execution without a claim as UNCLAIMED", () => {
    const execution = createExecution({
      startedAt: null,
      lastHeartbeatAt: null,
    });

    const result =
      decisionExecutionRecoveryService.classify(execution, NOW);

    assert.equal(result.recoveryState, "UNCLAIMED");
    assert.equal(result.requiresReconciliation, true);
    assert.equal(result.safeToAutoRetry, false);
  });

  it("classifies recent activity as ACTIVE_OR_RECENT", () => {
    const execution = createExecution({
      startedAt: new Date(NOW.getTime() - 10 * 60 * 1000),
      lastHeartbeatAt: new Date(NOW.getTime() - 2 * 60 * 1000),
    });

    const result =
      decisionExecutionRecoveryService.classify(execution, NOW);

    assert.equal(result.recoveryState, "ACTIVE_OR_RECENT");
    assert.equal(result.requiresReconciliation, false);
    assert.equal(result.safeToAutoRetry, false);
  });

  it("uses startedAt when lastHeartbeatAt is null", () => {
    const execution = createExecution({
      startedAt: new Date(NOW.getTime() - 5 * 60 * 1000),
      lastHeartbeatAt: null,
    });

    const result =
      decisionExecutionRecoveryService.classify(execution, NOW);

    assert.equal(result.recoveryState, "ACTIVE_OR_RECENT");
    assert.equal(result.requiresReconciliation, false);
  });

  it("classifies stale activity as STALE_UNCERTAIN", () => {
    const execution = createExecution({
      startedAt: new Date(NOW.getTime() - 30 * 60 * 1000),
      lastHeartbeatAt: new Date(NOW.getTime() - 20 * 60 * 1000),
    });

    const result =
      decisionExecutionRecoveryService.classify(execution, NOW);

    assert.equal(result.recoveryState, "STALE_UNCERTAIN");
    assert.equal(result.requiresReconciliation, true);
    assert.equal(result.safeToAutoRetry, false);
  });

  it("uses the configured stale threshold", () => {
    const execution = createExecution({
      startedAt: new Date(NOW.getTime() - 10 * 60 * 1000),
      lastHeartbeatAt: new Date(NOW.getTime() - 10 * 60 * 1000),
    });

    const result =
      decisionExecutionRecoveryService.classify(
        execution,
        NOW,
        5 * 60 * 1000,
      );

    assert.equal(result.recoveryState, "STALE_UNCERTAIN");
    assert.equal(result.requiresReconciliation, true);
  });

  it("treats activity exactly at the stale threshold as stale", () => {
    const execution = createExecution({
      startedAt: new Date(
        NOW.getTime() - DEFAULT_STALE_AFTER_MS,
      ),
      lastHeartbeatAt: null,
    });

    const result =
      decisionExecutionRecoveryService.classify(execution, NOW);

    assert.equal(result.recoveryState, "STALE_UNCERTAIN");
    assert.equal(result.requiresReconciliation, true);
  });

  it("classifies SUCCEEDED executions as TERMINAL", () => {
    const execution = createExecution({
      status: "SUCCEEDED",
    });

    const result =
      decisionExecutionRecoveryService.classify(execution, NOW);

    assert.equal(result.recoveryState, "TERMINAL");
    assert.equal(result.requiresReconciliation, false);
    assert.equal(result.safeToAutoRetry, false);
  });

  it("classifies FAILED executions as TERMINAL", () => {
    const execution = createExecution({
      status: "FAILED",
    });

    const result =
      decisionExecutionRecoveryService.classify(execution, NOW);

    assert.equal(result.recoveryState, "TERMINAL");
    assert.equal(result.requiresReconciliation, false);
    assert.equal(result.safeToAutoRetry, false);
  });

  it("rejects zero, negative, and non-finite stale thresholds", () => {
    const execution = createExecution();

    for (const invalidThreshold of [
      0,
      -1,
      Number.NaN,
      Number.POSITIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
    ]) {
      assert.throws(
        () =>
          decisionExecutionRecoveryService.classify(
            execution,
            NOW,
            invalidThreshold,
          ),
        /staleAfterMs must be a positive finite number/,
      );
    }
  });

  it("includes execution and decision identifiers in its assessment", () => {
    const execution = createExecution();

    const result =
      decisionExecutionRecoveryService.classify(execution, NOW);

    assert.equal(result.executionId, "execution-1");
    assert.equal(result.decisionId, "decision-1");
  });
});