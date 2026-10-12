
import {
  createHash,
  timingSafeEqual,
} from "node:crypto";

import type {
  RequestHandler,
} from "express";

/**
 * Internal server-to-server authentication.
 *
 * Do not expose the API key to browser
 * clients or mobile applications.
 */

function hashKey(value: string): Buffer {
  return createHash("sha256")
    .update(value, "utf8")
    .digest();
}

export const requireInternalAdmin:
  RequestHandler = (req, res, next) => {
    const configuredKey =
      process.env.INTERNAL_ADMIN_API_KEY;

    /*
     * Fail closed if the server is
     * not securely configured.
     */
    if (
      !configuredKey ||
      !/^[a-fA-F0-9]{64}$/.test(
        configuredKey,
      )
    ) {
      res.status(503).json({
        error: {
          code: "ADMIN_AUTH_NOT_CONFIGURED",
          message:
            "Administrative access is unavailable",
        },
      });

      return;
    }

    const authorization =
      req.headers.authorization;

    const match =
      typeof authorization === "string"
        ? /^Bearer ([a-fA-F0-9]{64})$/.exec(
            authorization,
          )
        : null;

    if (!match) {
      res.status(401).json({
        error: {
          code: "UNAUTHORIZED",
          message:
            "Valid administrative credentials required",
        },
      });

      return;
    }

    const providedKey = match[1];

    if (!providedKey) {
      res.status(401).json({
        error: {
          code: "UNAUTHORIZED",
          message:
            "Valid administrative credentials required",
        },
      });

      return;
    }

    const expectedHash =
      hashKey(configuredKey);

    const providedHash =
      hashKey(providedKey);

    if (
      !timingSafeEqual(
        expectedHash,
        providedHash,
      )
    ) {
      res.status(401).json({
        error: {
          code: "UNAUTHORIZED",
          message:
            "Valid administrative credentials required",
        },
      });

      return;
    }

    next();
  };
