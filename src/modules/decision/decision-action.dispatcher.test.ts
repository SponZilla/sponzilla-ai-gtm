import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { decisionActionDispatcher } from "./decision-action.dispatcher.js";

describe("DecisionActionDispatcher with Real Executors", () => {
  it("dispatches outreach actions to OutreachEmailExecutor", async () => {
    const res = await decisionActionDispatcher.dispatch({
      executionId: "exec_intro_1",
      decisionId: "dec_intro_1",
      action: "SEND_INTRODUCTION",
      actionSnapshot: { description: "Outreach to Gymshark VP Partnerships" },
    });

    assert.equal(res.result.mode, "REAL_EXECUTION");
    assert.equal(res.result.channel, "EMAIL");
    assert.equal(res.result.action, "SEND_INTRODUCTION");
    assert.equal(res.result.status, "SENT");
  });

  it("dispatches CRM actions to CRMUpdateExecutor", async () => {
    const res = await decisionActionDispatcher.dispatch({
      executionId: "exec_sched_1",
      decisionId: "dec_sched_1",
      action: "SCHEDULE_DISCOVERY_CALL",
      actionSnapshot: { description: "Book discovery call" },
    });

    assert.equal(res.result.mode, "REAL_EXECUTION");
    assert.equal(res.result.channel, "CRM");
    assert.equal(res.result.action, "SCHEDULE_DISCOVERY_CALL");
    assert.equal(res.result.status, "COMPLETED");
  });
});
