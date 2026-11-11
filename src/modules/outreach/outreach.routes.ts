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
