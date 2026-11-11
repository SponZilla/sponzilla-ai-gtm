import type { RequestHandler } from "express";

export function createReadinessHandler(
  checkDatabase: () => Promise<unknown>,
): RequestHandler {
  return async (_req, res) => {
    try {
      await checkDatabase();
      res.status(200).json({
        status: "ready",
        dependencies: { database: "ok" },
      });
    } catch {
      res.status(503).json({
        status: "not_ready",
        dependencies: { database: "unavailable" },
      });
    }
  };
}
