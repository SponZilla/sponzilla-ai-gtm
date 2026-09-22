import type { Request, Response } from "express";

import { companyService } from "./company.service.js";
import {
  companyIdSchema,
  createCompanySchema,
} from "./company.validator.js";

export async function createCompany(
  req: Request,
  res: Response,
) {
  const parsed = createCompanySchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      error: "INVALID_REQUEST",
      details: parsed.error.flatten().fieldErrors,
    });
  }

  const company = await companyService.createCompany(
    parsed.data,
  );

  return res.status(201).json({
    data: company,
  });
}

export async function getCompany(
  req: Request,
  res: Response,
) {
  const parsed = companyIdSchema.safeParse(req.params);

  if (!parsed.success) {
    return res.status(400).json({
      error: "INVALID_COMPANY_ID",
    });
  }

  const company = await companyService.getCompany(
    parsed.data.id,
  );

  if (!company) {
    return res.status(404).json({
      error: "COMPANY_NOT_FOUND",
    });
  }

  return res.status(200).json({
    data: company,
  });
}

export async function listCompanies(
  _req: Request,
  res: Response,
) {
  const companies = await companyService.listCompanies();

  return res.status(200).json({
    data: companies,
  });
}