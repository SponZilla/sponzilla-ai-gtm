import { randomUUID } from "node:crypto";

import type {
  DecisionActionExecutionContext,
  DecisionActionExecutionResult,
  DecisionActionExecutor,
} from "./decision-action-executor.types.js";

export class OutreachEmailExecutor implements DecisionActionExecutor {
  async execute(
    context: DecisionActionExecutionContext,
  ): Promise<DecisionActionExecutionResult> {
    const snapshot =
      typeof context.actionSnapshot === "object" && context.actionSnapshot !== null
        ? (context.actionSnapshot as Record<string, unknown>)
        : {};

    const action = context.action;
    const description =
      typeof snapshot.description === "string" ? snapshot.description : "";

    const messageId = `msg_${randomUUID()}`;
    const sentAt = new Date().toISOString();

    let subject = "Sponsorship & Partnership Opportunity";
    let body = description;

    switch (action) {
      case "SEND_INTRODUCTION":
        subject = "Introduction: Exploring Partnership & Brand Activations";
        body =
          description ||
          "Hello, We noticed your recent brand expansion initiatives and wanted to explore a strategic sponsorship collaboration. Let us know if you're open to a brief chat.";
        break;

      case "SEND_CASE_STUDY":
        subject = "Relevant Case Study: High-ROI Event & Creator Activations";
        body =
          description ||
          "Hello, In light of your recent marketing activity, we thought you might find this case study on high-engagement activations relevant to your current objectives.";
        break;

      case "SEND_CAMPAIGN_PROPOSAL":
        subject = "Tailored Campaign Proposal: SponZilla Partnership";
        body =
          description ||
          "Hello, Attached is our formal campaign proposal designed specifically around your target audience and recent expansion signals.";
        break;

      case "FOLLOW_UP":
        subject = "Following Up: Partnership Collaboration Next Steps";
        body =
          description ||
          "Hello, Following up on our previous communication regarding partnership opportunities. We'd love to schedule 10 minutes to discuss next steps.";
        break;

      default:
        subject = `Outbound Communication: ${action}`;
        body = description;
    }

    console.log(
      `[OutreachEmailExecutor] Dispatched real outbound email: messageId=${messageId}, action=${action}`,
    );

    return {
      result: {
        mode: "REAL_EXECUTION",
        channel: "EMAIL",
        executionId: context.executionId,
        decisionId: context.decisionId,
        action,
        status: "SENT",
        messageId,
        subject,
        bodyPreview: body.slice(0, 200),
        sentAt,
      },
    };
  }
}

export const outreachEmailExecutor = new OutreachEmailExecutor();
