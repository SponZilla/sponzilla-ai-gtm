
import type {
  Request,
  Response,
} from "express";

import {
  z,
} from "zod";

import {
  decisionExecutionMonitoringService,
} from "./decision-execution-monitoring.service.js";

const monitoringQuerySchema = z
  .object({
    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(100)
      .optional(),

    staleAfterMinutes: z.coerce
      .number()
      .int()
      .min(1)
      .max(1440)
      .optional(),
  })
  .strict();

export async function getExecutionRecoveryReport(
  req: Request,
  res: Response,
): Promise<void> {
  const parsed =
    monitoringQuerySchema.safeParse(
      req.query,
    );

  if (!parsed.success) {
    res.status(400).json({
      error: {
        code: "INVALID_MONITORING_QUERY",
        message:
          "Invalid recovery monitoring parameters",
      },
    });

    return;
  }

  const {
    limit = 50,
    staleAfterMinutes = 15,
  } = parsed.data;

  const report =
    await decisionExecutionMonitoringService
      .generateReport({
        limit,
        staleAfterMs:
          staleAfterMinutes * 60 * 1000,
      });

  res.setHeader(
    "Cache-Control",
    "no-store",
  );

  res.status(200).json({
    success: true,
    data: report,
  });
}
