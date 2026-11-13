import { Router } from "express";

import { adminRateLimiter } from "../../middleware/admin-rate-limiter.js";
import { asyncHandler } from "../../middleware/async-handler.js";
import { requireInternalAdmin } from "../../middleware/require-internal-admin.js";
import { requireSponzillaAdmin } from "../../middleware/require-sponzilla-admin.js";

import {
  approveOutreachDraft,
  createOutreachDraft,
  enrichContacts,
  getOutreachTargets,
  listMyOpportunities,
  listOutreachDrafts,
  rejectOutreachDraft,
} from "./outreach.controller.js";

export const outreachRouter = Router();

/**
 * Rate limiting happens before authentication so repeated unauthorized
 * requests are restricted.
 */
outreachRouter.use(adminRateLimiter);

/**
 * The operator's own cards only: those generated from their own research
 * requests. There is no shared pool, so nothing here is claimable.
 *
 * Kept under /outreach/ so it cannot be shadowed by the internal-admin
 * opportunity router mounted on /api/v1/opportunities.
 */
outreachRouter.get(
  "/outreach/opportunities",
  requireSponzillaAdmin,
  asyncHandler(listMyOpportunities),
);

/**
 * Who to contact, ranked by persona fit, with LinkedIn URLs.
 */
outreachRouter.get(
  "/opportunities/:id/outreach-targets",
  requireInternalAdmin,
  asyncHandler(getOutreachTargets),
);

/**
 * Spend enrichment credits to turn targets into Contact rows.
 */
outreachRouter.post(
  "/opportunities/:id/enrich-contacts",
  requireInternalAdmin,
  asyncHandler(enrichContacts),
);

/**
 * Generate a draft email for one verified contact.
 */
outreachRouter.post(
  "/opportunities/:id/outreach-drafts",
  requireInternalAdmin,
  asyncHandler(createOutreachDraft),
);

outreachRouter.get(
  "/opportunities/:id/outreach-drafts",
  requireInternalAdmin,
  asyncHandler(listOutreachDrafts),
);

/**
 * The human gate: only an authenticated operator may approve or reject a
 * draft. Approving records a decision; it does not send anything.
 */
outreachRouter.post(
  "/outreach-drafts/:id/approve",
  requireSponzillaAdmin,
  asyncHandler(approveOutreachDraft),
);

outreachRouter.post(
  "/outreach-drafts/:id/reject",
  requireSponzillaAdmin,
  asyncHandler(rejectOutreachDraft),
);
