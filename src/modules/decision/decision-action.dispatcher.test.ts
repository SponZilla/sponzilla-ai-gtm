import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { decisionActionDispatcher } from "./decision-action.dispatcher.js";

describe("DecisionActionDispatcher executor routing", () => {
  it("routes outreach actions to the email executor", async () => {
    const res = await decisionActionDispatcher.dispatch({
      executionId: "exec_intro_1",
      decisionId: "dec_intro_1",
      action: "SEND_INTRODUCTION",
      actionSnapshot: { description: "Outreach to Gymshark VP Partnerships" },
    });

    assert.equal(res.result.channel, "EMAIL");
    assert.equal(res.result.action, "SEND_INTRODUCTION");

    /* Routing only: no delivery is claimed while no provider exists. */
    assert.equal(res.result.mode, "SIMULATED");
    assert.equal(res.result.status, "NOT_SENT");
  });

  it("routes CRM actions to the CRM executor", async () => {
    const res = await decisionActionDispatcher.dispatch({
      executionId: "exec_sched_1",
      decisionId: "dec_sched_1",
      action: "SCHEDULE_DISCOVERY_CALL",
      actionSnapshot: { description: "Book discovery call" },
    });

    assert.equal(res.result.channel, "CRM");
    assert.equal(res.result.action, "SCHEDULE_DISCOVERY_CALL");

    assert.equal(res.result.mode, "PREPARATION_ONLY");
    assert.equal(res.result.status, "NOT_APPLIED");
  });
});
