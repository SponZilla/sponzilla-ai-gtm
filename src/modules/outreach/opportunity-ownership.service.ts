import { opportunityRepository } from "../opportunity/opportunity.repository.js";

/**
 * A card answers one person's question, so it belongs to that person.
 *
 * Ownership is written when the research is ingested (`ownerId`), not claimed
 * later and never shared: a card is the result of a specific user's input, so
 * another user must not see it, edit it, or draft from its contacts. There is
 * no pool and no lottery — a card with no owner is a card whose research call
 * carried no user, which is a data problem to fix at ingest, not a free-for-all.
 */
export const opportunityOwnershipService = {
  /** Only the cards this operator created from their own research. */
  listForOperator(operatorId: string) {
    return opportunityRepository.findOwnedBy(operatorId);
  },
};
