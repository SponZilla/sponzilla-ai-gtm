import { Router } from "express";

import { asyncHandler } from "../../middleware/async-handler.js";
import {
  createCompany,
  getCompany,
  listCompanies,
} from "./company.controller.js";

export const companyRouter = Router();

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