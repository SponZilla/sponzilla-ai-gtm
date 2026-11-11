import assert from "node:assert/strict";
import test from "node:test";

import type { Request, Response } from "express";

import { createReadinessHandler } from "./health.controller.js";

async function invoke(checkDatabase: () => Promise<unknown>) {
  let statusCode: number | undefined;
  let body: unknown;
  const handler = createReadinessHandler(checkDatabase);

  await handler({} as Request, {
    status(code: number) {
      statusCode = code;
      return this;
    },
    json(value: unknown) {
      body = value;
      return this;
    },
  } as Response, () => undefined);

  return { statusCode, body };
}

test("reports ready when the database check succeeds", async () => {
  const result = await invoke(async () => 1);
  assert.equal(result.statusCode, 200);
  assert.deepEqual(result.body, {
    status: "ready",
    dependencies: { database: "ok" },
  });
});

test("reports not ready when the database check fails", async () => {
  const result = await invoke(async () => {
    throw new Error("database unavailable");
  });
  assert.equal(result.statusCode, 503);
  assert.deepEqual(result.body, {
    status: "not_ready",
    dependencies: { database: "unavailable" },
  });
});
