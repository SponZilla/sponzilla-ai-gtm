import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { crmUpdateExecutor } from "./crm-update.executor.js";

describe("CRMUpdateExecutor", () => {
  it("executes SCHEDULE_DISCOVERY_CALL and returns real CRM payload", async () => {
    const result = await crmUpdateExecutor.execute({
      executionId: "exec_call_1",
      decisionId: "dec_call_1",
      action: "SCHEDULE_DISCOVERY_CALL",
      actionSnapshot: {
        type: "SCHEDULE_MEETING",
        description: "Schedule discovery call with Gymshark partnership director.",
      },
    });

    assert.equal(result.result.mode, "REAL_EXECUTION");
    assert.equal(result.result.channel, "CRM");
    assert.equal(result.result.status, "COMPLETED");
    assert.equal(result.result.action, "SCHEDULE_DISCOVERY_CALL");
    assert.ok(typeof result.result.crmTaskId === "string" && result.result.crmTaskId.startsWith("crm_task_"));
  });

  it("executes CLOSE_OPPORTUNITY and records CRM task closure", async () => {
    const result = await crmUpdateExecutor.execute({
      executionId: "exec_close_1",
      decisionId: "dec_close_1",
      action: "CLOSE_OPPORTUNITY",
      actionSnapshot: {
        type: "CLOSE",
        description: "Close opportunity after no engagement.",
      },
    });

    assert.equal(result.result.mode, "REAL_EXECUTION");
    assert.equal(result.result.channel, "CRM");
    assert.equal(result.result.action, "CLOSE_OPPORTUNITY");
  });
});
