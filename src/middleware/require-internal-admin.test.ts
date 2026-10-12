
import assert from "node:assert/strict";
import test from "node:test";

import express from "express";

import {
  requireInternalAdmin,
} from "./require-internal-admin.js";

const VALID_KEY = "a".repeat(64);
const INVALID_KEY = "b".repeat(64);

interface TestResponse {
  status: number;
  body: unknown;
}

/**
 * Creates an isolated Express server
 * and sends one HTTP request.
 *
 * No database or external service
 * is required.
 */
async function sendRequest(
  configuredKey: string | undefined,
  authorization?: string,
): Promise<TestResponse> {
  const previousKey =
    process.env.INTERNAL_ADMIN_API_KEY;

  if (configuredKey === undefined) {
    delete process.env.INTERNAL_ADMIN_API_KEY;
  } else {
    process.env.INTERNAL_ADMIN_API_KEY =
      configuredKey;
  }

  const app = express();

  app.get(
    "/protected",
    requireInternalAdmin,
    (_req, res) => {
      res.status(200).json({
        success: true,
      });
    },
  );

  const server = app.listen(0);

  try {
    const address = server.address();

    if (
      !address ||
      typeof address === "string"
    ) {
      throw new Error(
        "Unable to determine test server port",
      );
    }

    const headers: Record<string, string> =
      {};

    if (authorization !== undefined) {
      headers.authorization =
        authorization;
    }

    const response = await fetch(
      `http://127.0.0.1:${address.port}/protected`,
      {
        headers,
      },
    );

    return {
      status: response.status,
      body: await response.json(),
    };
  } finally {
    await new Promise<void>(
      (resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });
      },
    );

    if (previousKey === undefined) {
      delete process.env.INTERNAL_ADMIN_API_KEY;
    } else {
      process.env.INTERNAL_ADMIN_API_KEY =
        previousKey;
    }
  }
}

/*
 * Tests are executed sequentially
 * because they temporarily modify
 * the same environment variable.
 */

test(
  "rejects access when server key is missing",
  { concurrency: false },
  async () => {
    const response =
      await sendRequest(
        undefined,
        `Bearer ${VALID_KEY}`,
      );

    assert.equal(response.status, 503);
  },
);

test(
  "rejects malformed server configuration",
  { concurrency: false },
  async () => {
    const response =
      await sendRequest(
        "short-key",
        `Bearer ${VALID_KEY}`,
      );

    assert.equal(response.status, 503);
  },
);

test(
  "rejects requests without authorization",
  { concurrency: false },
  async () => {
    const response =
      await sendRequest(VALID_KEY);

    assert.equal(response.status, 401);
  },
);

test(
  "rejects incorrect API keys",
  { concurrency: false },
  async () => {
    const response =
      await sendRequest(
        VALID_KEY,
        `Bearer ${INVALID_KEY}`,
      );

    assert.equal(response.status, 401);
  },
);

test(
  "rejects malformed authorization headers",
  { concurrency: false },
  async () => {
    const response =
      await sendRequest(
        VALID_KEY,
        `Basic ${VALID_KEY}`,
      );

    assert.equal(response.status, 401);
  },
);

test(
  "accepts valid administrative credentials",
  { concurrency: false },
  async () => {
    const response =
      await sendRequest(
        VALID_KEY,
        `Bearer ${VALID_KEY}`,
      );

    assert.equal(response.status, 200);

    assert.deepEqual(response.body, {
      success: true,
    });
  },
);
