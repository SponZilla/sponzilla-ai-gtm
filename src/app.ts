import cors from "cors";
import express from "express";
import helmet from "helmet";
import { companyRouter } from "./modules/company/company.routes.js";
import { errorHandler } from "./middleware/error-handler.js";
import { notFoundHandler } from "./middleware/not-found.js";
import { opportunityRouter } from "./modules/opportunity/opportunity.routes.js";
import { interactionRouter } from "./modules/interaction/interaction.routes.js";
import { decisionRouter } from "./modules/decision/decision.routes.js";
import { marketIntelligenceRouter } from "./modules/market-intelligence/market-intelligence.routes.js";
import { outreachRouter } from "./modules/outreach/outreach.routes.js";
import {
  decisionExecutionMonitoringRouter,
} from "./modules/decision/decision-execution-monitoring.routes.js";
import { prisma } from "./lib/prisma.js";
import { createReadinessHandler } from "./modules/health/health.controller.js";
import { env } from "./config/env.js";

export const app = express();

app.disable("x-powered-by");

app.use(helmet());

const allowedCorsOrigins = env.CORS_ALLOWED_ORIGINS
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        callback(null, false);
        return;
      }

      callback(
        null,
        allowedCorsOrigins.includes(origin) ? origin : false,
      );
    },
  }),
);

app.use(
  express.json({
    limit: "100kb",
  }),
);

app.use("/api/v1/companies", companyRouter);

app.use(
  "/api/v1/opportunities",
  opportunityRouter,
);

app.use(
  "/api/interactions",
  interactionRouter,
);

app.use(
  "/api/v1/market-intelligence",
  marketIntelligenceRouter,
);

app.use(
  "/api/v1",
  decisionRouter,
);

app.use(
  "/api/v1",
  outreachRouter,
);

app.get("/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
  });
});

app.get("/ready", createReadinessHandler(() => prisma.$queryRaw`SELECT 1`));

app.use(
  "/api/v1/admin",
  decisionExecutionMonitoringRouter,
);

app.use(notFoundHandler);

app.use(errorHandler);
