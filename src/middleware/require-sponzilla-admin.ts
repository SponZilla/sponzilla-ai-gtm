import type { RequestHandler } from "express";

export interface SponzillaOperator {
  id: string;
  name: string;
  email?: string;
}

interface SponzillaUser {
  id?: unknown;
  name?: unknown;
  email?: unknown;
  role?: unknown;
}

interface SponzillaAuthResponse {
  user?: SponzillaUser;
}

interface SponzillaAuthConfig {
  apiUrl?: string;
}

type FetchLike = typeof fetch;

/**
 * Verifies the main SponZilla application JWT through its protected
 * /api/auth/me endpoint. That endpoint verifies the JWT and loads the
 * user's current role from MongoDB, so AutoGTM never trusts browser claims
 * or needs the JWT signing secret.
 */
export function createRequireSponzillaAdmin(
  config: SponzillaAuthConfig,
  fetcher: FetchLike = fetch,
): RequestHandler {
  return async (req, res, next) => {
    if (!config.apiUrl) {
      res.status(503).json({
        error: {
          code: "OPERATOR_AUTH_NOT_CONFIGURED",
          message: "Operator approval is unavailable",
        },
      });
      return;
    }

    const authorization = req.headers.authorization;
    const match = typeof authorization === "string"
      ? /^Bearer ([^\s]+)$/.exec(authorization)
      : null;

    if (!match?.[1]) {
      res.status(401).json({
        error: {
          code: "OPERATOR_AUTH_REQUIRED",
          message: "A valid operator session is required",
        },
      });
      return;
    }

    let response: Response;
    try {
      const apiUrl = config.apiUrl.replace(/\/$/, "");
      response = await fetcher(`${apiUrl}/api/auth/me`, {
        headers: { authorization: `Bearer ${match[1]}` },
        signal: AbortSignal.timeout(5_000),
      });
    } catch {
      res.status(503).json({
        error: {
          code: "OPERATOR_AUTH_UNAVAILABLE",
          message: "Operator identity could not be verified",
        },
      });
      return;
    }

    if (response.status === 401 || response.status === 403) {
      res.status(401).json({
        error: {
          code: "OPERATOR_SESSION_INVALID",
          message: "A valid operator session is required",
        },
      });
      return;
    }

    if (!response.ok) {
      res.status(503).json({
        error: {
          code: "OPERATOR_AUTH_UNAVAILABLE",
          message: "Operator identity could not be verified",
        },
      });
      return;
    }

    let user: SponzillaUser | undefined;
    try {
      user = (await response.json() as SponzillaAuthResponse).user;
    } catch {
      res.status(503).json({
        error: {
          code: "OPERATOR_AUTH_INVALID_RESPONSE",
          message: "Operator identity could not be verified",
        },
      });
      return;
    }

    if (typeof user?.id !== "string" || user.role !== "admin") {
      res.status(403).json({
        error: {
          code: "OPERATOR_ADMIN_REQUIRED",
          message: "Administrator access is required",
        },
      });
      return;
    }

    const name = typeof user.name === "string" ? user.name : user.id;
    res.locals.operator = {
      id: user.id,
      name,
      ...(typeof user.email === "string" ? { email: user.email } : {}),
    } satisfies SponzillaOperator;

    next();
  };
}

export const requireSponzillaAdmin = createRequireSponzillaAdmin({
  apiUrl: process.env.SPONZILLA_AUTH_API_URL,
});
