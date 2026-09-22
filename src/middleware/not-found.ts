import type { RequestHandler } from "express";

export const notFoundHandler: RequestHandler = (
  _req,
  res,
) => {
  res.status(404).json({
    error: "ROUTE_NOT_FOUND",
  });
};