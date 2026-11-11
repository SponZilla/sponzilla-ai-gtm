import {
  decisionService,
} from "./decision.service.js";

const opportunityId = process.argv[2];

if (!opportunityId) {
  throw new Error(
    "Provide an opportunity ID.",
  );
}

const result =
  await decisionService.generate(
    opportunityId,
  );

console.log(
  JSON.stringify(
    {
      decisionId: result.decision.id,

      opportunityId:
        result.decision.opportunityId,

      action:
        result.decision.action,

      priority:
        result.decision.priority,

      status:
        result.decision.status,

      confidence:
        result.decision.confidence.toString(),

      modelVersion:
        result.decision.modelVersion,

      promptVersion:
        result.decision.promptVersion,

      policyVersion:
        result.decision.policyVersion,

      evidence:
        result.evidence,
    },
    null,
    2,
  ),
);