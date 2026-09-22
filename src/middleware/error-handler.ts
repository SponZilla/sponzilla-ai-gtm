import type {
  ErrorRequestHandler,
} from "express";

import { env } from "../config/env.js";

export const errorHandler: ErrorRequestHandler = (
  error,
  _req,
  res,
  _next,
) => {
  console.error(error);

  res.status(500).json({
    error: "INTERNAL_SERVER_ERROR",
    ...(env.NODE_ENV === "development" && {
      message:
        error instanceof Error
          ? error.message
          : "Unknown error",
    }),
  });
};