import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { outreachEmailExecutor } from "./outreach-email.executor.js";

describe("OutreachEmailExecutor", () => {
  it("executes SEND_INTRODUCTION and returns real execution payload", async () => {
    const result = await outreachEmailExecutor.execute({
      executionId: "exec_1",
      decisionId: "dec_1",
      action: "SEND_INTRODUCTION",
      actionSnapshot: {
        type: "OUTREACH",
        description: "Prepare an introductory outreach message for Gymshark.",
      },
    });

    assert.equal(result.result.mode, "REAL_EXECUTION");
    assert.equal(result.result.channel, "EMAIL");
    assert.equal(result.result.status, "SENT");
    assert.equal(result.result.action, "SEND_INTRODUCTION");
    assert.ok(typeof result.result.messageId === "string" && result.result.messageId.startsWith("msg_"));
    assert.match(String(result.result.subject), /Introduction/);
    assert.match(String(result.result.bodyPreview), /Gymshark/);
  });

  it("executes SEND_CAMPAIGN_PROPOSAL and returns proposal-specific email", async () => {
    const result = await outreachEmailExecutor.execute({
      executionId: "exec_2",
      decisionId: "dec_2",
      action: "SEND_CAMPAIGN_PROPOSAL",
      actionSnapshot: {
        type: "PREPARE_PROPOSAL",
        description: "Proposal for Red Bull campus activation.",
      },
    });

    assert.equal(result.result.mode, "REAL_EXECUTION");
    assert.equal(result.result.channel, "EMAIL");
    assert.match(String(result.result.subject), /Campaign Proposal/);
  });
});
