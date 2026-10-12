
import {
  rateLimit,
} from "express-rate-limit";

/**
 * Rate limiter for internal administrative APIs.
 *
 * Limit: 30 requests per minute per IP.
 *
 * This initial in-memory limiter is suitable
 * for a single backend instance.
 */
export const adminRateLimiter = rateLimit({
  windowMs: 60 * 1000,

  limit: 30,

  standardHeaders: "draft-8",

  legacyHeaders: false,

  /*
   * Reject excessive requests instead
   * of passing them to the database.
   */
  handler: (_req, res) => {
    res.status(429).json({
      error: {
        code: "ADMIN_RATE_LIMIT_EXCEEDED",
        message:
          "Too many administrative requests. Please try again later.",
      },
    });
  },
});
