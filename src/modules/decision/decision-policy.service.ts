import type {
  GTMActionType,
} from "../../generated/prisma/client.js";

import type {
  GTMDecisionContext,
} from "./decision-context.types.js";

/*
 * The policy layer answers only one question:
 *
 * "Given the current state of this opportunity,
 * what GTM action is appropriate next?"
 *
 * It does NOT build reasoning, evidence,
 * confidence, or proposedAction.
 */
/*
 * Actions that send a message to a person outside SponZilla.
 *
 * These require a verified recipient; without one there is nobody
 * to contact and any execution result would be a fabrication.
 */
const OUTREACH_ACTIONS: ReadonlySet<GTMActionType> =
  new Set<GTMActionType>([
    "SEND_INTRODUCTION",
    "SEND_CASE_STUDY",
    "SEND_CAMPAIGN_PROPOSAL",
    "FOLLOW_UP",
  ]);

export const decisionPolicyService = {
  selectAction(
    context: GTMDecisionContext,
  ): GTMActionType {
    const action =
      selectBaselineAction(context);

    /*
     * Contact gate.
     *
     * An outreach action without a verified recipient can only
     * pretend to send. Route to research instead so the missing
     * contact is an explicit state the operator can act on.
     */
    if (
      OUTREACH_ACTIONS.has(action) &&
      !hasVerifiedRecipient(context)
    ) {
      return "RESEARCH_COMPANY";
    }

    return action;
  },
};

/*
 * The deterministic rule ladder.
 *
 * Chooses the action the opportunity state calls for, before the
 * contact gate decides whether outreach is actually possible.
 */
function selectBaselineAction(
  context: GTMDecisionContext,
): GTMActionType {
    /*
     * Rule 1:
     * Terminal opportunity.
     *
     * A WON or LOST opportunity should not
     * continue through normal GTM actions.
     */
    if (
      context.opportunity.stage === "WON" ||
      context.opportunity.stage === "LOST"
    ) {
      return "CLOSE_OPPORTUNITY";
    }

    /*
     * Rule 2:
     * Negotiation requires human sales handling.
     */
    if (
      context.opportunity.stage ===
      "NEGOTIATION"
    ) {
      return "ESCALATE_TO_SALES";
    }

    /*
     * Rule 3:
     * Proposal stage.
     *
     * If a proposal has already been sent,
     * the appropriate next action is follow-up.
     */
    if (
      context.opportunity.stage ===
        "PROPOSAL" ||
      hasInteraction(
        context,
        "PROPOSAL_SENT",
      )
    ) {
      return "FOLLOW_UP";
    }

    /*
     * Rule 4:
     * Explicit proposal request is a strong
     * deterministic buying signal.
     */
    if (
      hasInteraction(
        context,
        "PROPOSAL_REQUESTED",
      )
    ) {
      return "SEND_CAMPAIGN_PROPOSAL";
    }

    /*
     * Rule 5:
     * Interested opportunities should move
     * toward a discovery conversation.
     */
    if (
      context.opportunity.stage ===
      "INTERESTED"
    ) {
      return "SCHEDULE_DISCOVERY_CALL";
    }

    /*
     * Rule 6:
     * Once initial contact exists, avoid
     * repeatedly sending introductions.
     */
    if (
      context.opportunity.stage ===
        "CONTACTED" ||
      hasAnyInteraction(context)
    ) {
      return "FOLLOW_UP";
    }

    /*
     * Rule 7:
     * Newly discovered Market Intelligence
     * opportunity with usable intelligence.
     *
     * Research before outreach.
     */
    if (
      context.opportunity.source ===
        "MARKET_INTELLIGENCE" &&
      context.opportunity.stage === "NEW" &&
      context.marketIntelligence
    ) {
      return "RESEARCH_COMPANY";
    }

    /*
     * Rule 8:
     * NEW opportunity with enough basic
     * company context can begin outreach.
     */
    if (
      context.opportunity.stage === "NEW" &&
      hasBasicCompanyContext(context)
    ) {
      return "SEND_INTRODUCTION";
    }

    /*
     * Conservative fallback.
     */
    return "REQUEST_MORE_INFORMATION";
}

function hasInteraction(
  context: GTMDecisionContext,
  type:
    GTMDecisionContext["interactions"][number]["type"],
): boolean {
  return context.interactions.some(
    interaction =>
      interaction.type === type,
  );
}

/*
 * True only for interactions that represent actual contact with the
 * prospect.
 *
 * Internal NOTE records (research, escalation, closure) are our own
 * bookkeeping. Counting them would let the policy propose follow-ups
 * on a relationship that was never started.
 */
function hasAnyInteraction(
  context: GTMDecisionContext,
): boolean {
  return context.interactions.some(
    interaction =>
      interaction.type !== "NOTE",
  );
}

/*
 * A recipient is usable only when the address was verified and the
 * contact has not bounced. Unverified addresses (guessed, accept_all,
 * never checked) must never be treated as sendable.
 */
function hasVerifiedRecipient(
  context: GTMDecisionContext,
): boolean {
  return context.contacts.some(
    contact =>
      contact.emailStatus === "VERIFIED" &&
      typeof contact.email === "string" &&
      contact.email.trim().length > 0,
  );
}

function hasBasicCompanyContext(
  context: GTMDecisionContext,
): boolean {
  return Boolean(
    context.company.name.trim() &&
      (
        context.company.website ||
        context.company.industry ||
        context.opportunity.objective
      ),
  );
}