import type {
  GTMDecisionOutput,
} from "./decision-output.schema.js";

export interface PreparedGTMDecision
  extends GTMDecisionOutput {
  opportunityId: string;

  status: "AWAITING_APPROVAL";

  generatedAt: Date;
}