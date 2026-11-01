import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  createDecisionExecutionOrchestrator,
  ExecutionClaimError,
  ExecutionFailurePersistenceError,
  ExecutionFinalizationError,
  type ExecutionOrchestratorDependencies,
} from "./decision-execution.orchestrator.js";

const execution = {
  id: "execution-1",
  decisionId: "decision-1",
  action: "SEND_INTRODUCTION",
  actionSnapshot: {
    recipient: "prospect@example.com",
    subject: "Introduction",
  },
};

const completedExecution = {
  ...execution,
  status: "SUCCEEDED",
};

const successfulResult = {
  result: {
    mode: "PREPARATION_ONLY",
    prepared: true,
  },
};

type Overrides = {
  prepare?: () => Promise<unknown>;
  claim?: () => Promise<unknown>;
  dispatch?: () => Promise<unknown>;
  fail?: () => Promise<unknown>;
  complete?: () => Promise<unknown>;
};

function createHarness(overrides: Overrides = {}) {
  const calls = {
    prepare: 0,
    claim: 0,
    dispatch: 0,
    fail: 0,
    complete: 0,
  };

  const dependencies = {
    executionService: {
      prepare: async () => {
        calls.prepare++;
        return overrides.prepare
          ? overrides.prepare()
          : execution;
      },
    },
    executionRepository: {
      claimForExecution: async () => {
        calls.claim++;
        return overrides.claim
          ? overrides.claim()
          : { kind: "CLAIMED", execution };
      },
      failAtomically: async () => {
        calls.fail++;
        return overrides.fail
          ? overrides.fail()
          : { kind: "FAILED" };
      },
      completeAtomically: async () => {
        calls.complete++;
        return overrides.complete
          ? overrides.complete()
          : {
              kind: "COMPLETED",
              execution: completedExecution,
            };
      },
    },
    actionDispatcher: {
      dispatch: async () => {
        calls.dispatch++;
        return overrides.dispatch
          ? overrides.dispatch()
          : successfulResult;
      },
    },
  } as unknown as ExecutionOrchestratorDependencies;

  return {
    orchestrator: createDecisionExecutionOrchestrator(dependencies),
    calls,
  };
}

describe("DecisionExecutionOrchestrator", () => {
  it("does not dispatch when the execution claim is not acquired", async () => {
    const { orchestrator, calls } = createHarness({
      claim: async () => ({
        kind: "ALREADY_CLAIMED_OR_INVALID",
      }),
    });

    await assert.rejects(
      orchestrator.execute("decision-1"),
      ExecutionClaimError,
    );

    assert.equal(calls.prepare, 1);
    assert.equal(calls.claim, 1);
    assert.equal(calls.dispatch, 0);
    assert.equal(calls.fail, 0);
    assert.equal(calls.complete, 0);
  });

  it("persists executor failure and then rethrows the original error", async () => {
    const executorError = new Error("Provider is not configured");

    const { orchestrator, calls } = createHarness({
      dispatch: async () => {
        throw executorError;
      },
    });

    await assert.rejects(
      orchestrator.execute("decision-1"),
      (error: unknown) => error === executorError,
    );

    assert.equal(calls.dispatch, 1);
    assert.equal(calls.fail, 1);
    assert.equal(calls.complete, 0);
  });

  it("throws a persistence error when executor failure cannot be recorded", async () => {
    const executorError = new Error("Provider is not configured");
    const persistenceError = new Error("Database unavailable");

    const { orchestrator, calls } = createHarness({
      dispatch: async () => {
        throw executorError;
      },
      fail: async () => {
        throw persistenceError;
      },
    });

    await assert.rejects(
      orchestrator.execute("decision-1"),
      (error: unknown) => {
        assert.ok(error instanceof ExecutionFailurePersistenceError);

        const cause = error.cause;
        assert.ok(cause instanceof AggregateError);
        assert.ok(cause.errors.includes(executorError));
        assert.ok(cause.errors.includes(persistenceError));

        return true;
      },
    );

    assert.equal(calls.dispatch, 1);
    assert.equal(calls.fail, 1);
    assert.equal(calls.complete, 0);
  });

  it("does not mark execution failed or redispatch when finalization fails", async () => {
    const finalizationError = new Error("Completion transaction failed");

    const { orchestrator, calls } = createHarness({
      complete: async () => {
        throw finalizationError;
      },
    });

    await assert.rejects(
      orchestrator.execute("decision-1"),
      (error: unknown) => {
        assert.ok(error instanceof ExecutionFinalizationError);
        assert.equal(error.cause, finalizationError);
        return true;
      },
    );

    assert.equal(calls.dispatch, 1);
    assert.equal(calls.complete, 1);
    assert.equal(calls.fail, 0);
  });

  it("returns the completed execution when dispatch and finalization succeed", async () => {
    const { orchestrator, calls } = createHarness();

    const result = await orchestrator.execute("decision-1");

    assert.deepEqual(result, completedExecution);

    assert.equal(calls.prepare, 1);
    assert.equal(calls.claim, 1);
    assert.equal(calls.dispatch, 1);
    assert.equal(calls.complete, 1);
    assert.equal(calls.fail, 0);
  });

  it("does not claim or dispatch when preparation fails", async () => {
    const preparationError = new Error("Decision is not approved");

    const { orchestrator, calls } = createHarness({
      prepare: async () => {
        throw preparationError;
      },
    });

    await assert.rejects(
      orchestrator.execute("decision-1"),
      (error: unknown) => error === preparationError,
    );

    assert.equal(calls.prepare, 1);
    assert.equal(calls.claim, 0);
    assert.equal(calls.dispatch, 0);
    assert.equal(calls.fail, 0);
    assert.equal(calls.complete, 0);
  });
});