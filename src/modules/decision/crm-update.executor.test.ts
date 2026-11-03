import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { crmUpdateExecutor } from "./crm-update.executor.js";

describe("CRMUpdateExecutor", () => {
  it("prepares SCHEDULE_DISCOVERY_CALL without claiming it was applied", async () => {
    const result = await crmUpdateExecutor.execute({
      executionId: "exec_call_1",
      decisionId: "dec_call_1",
      action: "SCHEDULE_DISCOVERY_CALL",
      actionSnapshot: {
        type: "SCHEDULE_MEETING",
        description: "Schedule discovery call with Gymshark partnership director.",
      },
    });

    /*
     * No CRM task row and no calendar event is created here, so this
     * must not report a completed external action.
     */
    assert.equal(result.result.mode, "PREPARATION_ONLY");
    assert.notEqual(result.result.mode, "REAL_EXECUTION");

    assert.equal(result.result.channel, "CRM");
    assert.equal(result.result.status, "NOT_APPLIED");
    assert.equal(result.result.action, "SCHEDULE_DISCOVERY_CALL");

    assert.equal(result.result.crmTaskId, undefined);
    assert.ok(
      typeof result.result.draftTaskId === "string" &&
        result.result.draftTaskId.startsWith("crm_task_"),
    );
  });

  it("prepares CLOSE_OPPORTUNITY without claiming it was applied", async () => {
    const result = await crmUpdateExecutor.execute({
      executionId: "exec_close_1",
      decisionId: "dec_close_1",
      action: "CLOSE_OPPORTUNITY",
      actionSnapshot: {
        type: "CLOSE",
        description: "Close opportunity after no engagement.",
      },
    });

    assert.equal(result.result.mode, "PREPARATION_ONLY");
    assert.equal(result.result.channel, "CRM");
    assert.equal(result.result.status, "NOT_APPLIED");
    assert.equal(result.result.action, "CLOSE_OPPORTUNITY");
  });
});
