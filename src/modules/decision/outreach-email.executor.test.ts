import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { outreachEmailExecutor } from "./outreach-email.executor.js";

describe("OutreachEmailExecutor", () => {
  it("prepares SEND_INTRODUCTION without claiming it was sent", async () => {
    const result = await outreachEmailExecutor.execute({
      executionId: "exec_1",
      decisionId: "dec_1",
      action: "SEND_INTRODUCTION",
      actionSnapshot: {
        type: "OUTREACH",
        description: "Prepare an introductory outreach message for Gymshark.",
      },
    });

    /*
     * No provider is configured, so this must never report a real
     * delivery. The closed loop turns this payload into CRM history.
     */
    assert.equal(result.result.mode, "SIMULATED");
    assert.notEqual(result.result.mode, "REAL_EXECUTION");

    assert.equal(result.result.channel, "EMAIL");
    assert.equal(result.result.status, "NOT_SENT");
    assert.equal(result.result.provider, null);

    assert.equal(result.result.action, "SEND_INTRODUCTION");
    assert.ok(
      typeof result.result.draftId === "string" &&
        result.result.draftId.startsWith("msg_"),
    );

    /* No message ID may exist while nothing was delivered. */
    assert.equal(result.result.messageId, undefined);

    assert.match(String(result.result.subject), /Introduction/);
    assert.match(String(result.result.bodyPreview), /Gymshark/);
  });

  it("prepares SEND_CAMPAIGN_PROPOSAL without claiming it was sent", async () => {
    const result = await outreachEmailExecutor.execute({
      executionId: "exec_2",
      decisionId: "dec_2",
      action: "SEND_CAMPAIGN_PROPOSAL",
      actionSnapshot: {
        type: "PREPARE_PROPOSAL",
        description: "Proposal for Red Bull campus activation.",
      },
    });

    assert.equal(result.result.mode, "SIMULATED");
    assert.equal(result.result.channel, "EMAIL");
    assert.equal(result.result.status, "NOT_SENT");
    assert.match(String(result.result.subject), /Campaign Proposal/);
  });
});
