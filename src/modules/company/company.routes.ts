import { Router } from "express";

import { asyncHandler } from "../../middleware/async-handler.js";
import { adminRateLimiter } from "../../middleware/admin-rate-limiter.js";
import { requireInternalAdmin } from "../../middleware/require-internal-admin.js";
import {
  createCompany,
  getCompany,
  listCompanies,
} from "./company.controller.js";

export const companyRouter = Router();

companyRouter.use(
  adminRateLimiter,
  requireInternalAdmin,
);

companyRouter.post(
  "/",
  asyncHandler(createCompany),
);

companyRouter.get(
  "/",
  asyncHandler(listCompanies),
);

companyRouter.get(
  "/:id",
  asyncHandler(getCompany),
);
