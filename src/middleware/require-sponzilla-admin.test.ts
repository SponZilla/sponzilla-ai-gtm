import assert from "node:assert/strict";
import test from "node:test";
import type { Request, Response } from "express";

import { createRequireSponzillaAdmin } from "./require-sponzilla-admin.js";

interface TestResponse {
  statusCode?: number;
  body?: unknown;
  locals: Record<string, unknown>;
}

async function invoke(
  authorization: string | undefined,
  fetcher: typeof fetch,
  apiUrl: string | undefined = "https://api.sponzilla.test",
): Promise<{ response: TestResponse; nextCalled: boolean }> {
  const response: TestResponse = { locals: {} };
  let nextCalled = false;
  const middleware = createRequireSponzillaAdmin({ apiUrl }, fetcher);

  await middleware(
    { headers: { authorization } } as Request,
    {
      locals: response.locals,
      status(code: number) {
        response.statusCode = code;
        return this;
      },
      json(body: unknown) {
        response.body = body;
        return this;
      },
    } as Response,
    () => { nextCalled = true; },
  );

  return { response, nextCalled };
}

test("fails closed when SponZilla auth API is not configured", async () => {
  let fetchCalled = false;
  const result = await invoke("Bearer token", (async () => {
    fetchCalled = true;
    return new Response();
  }) as typeof fetch, "");

  assert.equal(result.response.statusCode, 503);
  assert.equal(fetchCalled, false);
  assert.equal(result.nextCalled, false);
});

test("requires a bearer session", async () => {
  let fetchCalled = false;
  const result = await invoke(undefined, (async () => {
    fetchCalled = true;
    return new Response();
  }) as typeof fetch);

  assert.equal(result.response.statusCode, 401);
  assert.equal(fetchCalled, false);
  assert.equal(result.nextCalled, false);
});

test("validates the token with SponZilla and derives the admin identity", async () => {
  let requestedUrl = "";
  let requestedHeaders: HeadersInit | undefined;
  const result = await invoke("Bearer sponzilla-jwt", (async (input, init) => {
    requestedUrl = String(input);
    requestedHeaders = init?.headers;
    return new Response(JSON.stringify({ user: {
      id: "mongo-user-123",
      name: "SponZilla Operator",
      email: "operator@sponzilla.test",
      role: "admin",
    } }), { status: 200 });
  }) as typeof fetch);

  assert.equal(result.nextCalled, true);
  assert.equal(requestedUrl, "https://api.sponzilla.test/api/auth/me");
  assert.equal(new Headers(requestedHeaders).get("authorization"), "Bearer sponzilla-jwt");
  assert.deepEqual(result.response.locals.operator, {
    id: "mongo-user-123",
    name: "SponZilla Operator",
    email: "operator@sponzilla.test",
  });
});

test("rejects a valid non-admin SponZilla user", async () => {
  const result = await invoke("Bearer club-user-token", (async () => new Response(
    JSON.stringify({ user: { id: "club-1", role: "club" } }),
    { status: 200 },
  )) as typeof fetch);

  assert.equal(result.response.statusCode, 403);
  assert.equal(result.nextCalled, false);
});

test("rejects invalid tokens and fails closed when SponZilla is unavailable", async () => {
  const invalid = await invoke("Bearer expired-token", (async () =>
    new Response("{}", { status: 401 })) as typeof fetch);
  assert.equal(invalid.response.statusCode, 401);
  assert.equal(invalid.nextCalled, false);

  const unavailable = await invoke("Bearer token", (async () => {
    throw new Error("network unavailable");
  }) as typeof fetch);
  assert.equal(unavailable.response.statusCode, 503);
  assert.equal(unavailable.nextCalled, false);
});
