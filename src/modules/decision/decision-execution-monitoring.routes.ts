
import {
  Router,
} from "express";

import {
  asyncHandler,
} from "../../middleware/async-handler.js";

import {
  adminRateLimiter,
} from "../../middleware/admin-rate-limiter.js";

import {
  requireInternalAdmin,
} from "../../middleware/require-internal-admin.js";

import {
  getExecutionRecoveryReport,
} from "./decision-execution-monitoring.controller.js";

export const decisionExecutionMonitoringRouter =
  Router();

/*
 * Apply rate limiting before authentication.
 *
 * This also limits repeated requests
 * using invalid credentials.
 */
decisionExecutionMonitoringRouter.use(
  adminRateLimiter,
);

decisionExecutionMonitoringRouter.use(
  requireInternalAdmin,
);

/*
 * Read-only recovery monitoring endpoint.
 */
decisionExecutionMonitoringRouter.get(
  "/executions/recovery",
  asyncHandler(
    getExecutionRecoveryReport,
  ),
);
