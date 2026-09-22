import cors from "cors";
import express from "express";
import helmet from "helmet";
import { companyRouter } from "./modules/company/company.routes.js";
import { errorHandler } from "./middleware/error-handler.js";
import { notFoundHandler } from "./middleware/not-found.js";
import { opportunityRouter } from "./modules/opportunity/opportunity.routes.js";
import { interactionRouter } from "./modules/interaction/interaction.routes.js";
import { decisionRouter } from "./modules/decision/decision.routes.js";

export const app = express();

app.disable("x-powered-by");

app.use(helmet());

app.use(
  cors({
    origin: false,
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
  "/api/v1",
  decisionRouter,
);

app.get("/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
  });
});

app.use(notFoundHandler);

app.use(errorHandler);