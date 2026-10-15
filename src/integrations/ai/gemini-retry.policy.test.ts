import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  GEMINI_MAX_ATTEMPTS,
  isRetryableGeminiError,
} from "./gemini-retry.policy.js";

describe("Gemini retry policy", () => {
  it("limits attempts to two", () => {
    assert.equal(GEMINI_MAX_ATTEMPTS, 2);
  });

  it("retries temporary provider failures", () => {
    for (const status of [
      429, 500, 502, 503, 504,
    ]) {
      assert.equal(
        isRetryableGeminiError({ status }),
        true,
      );
    }
  });

  it("does not retry authentication errors", () => {
    for (const status of [401, 403]) {
      assert.equal(
        isRetryableGeminiError({ status }),
        false,
      );
    }
  });

  it("does not retry invalid requests", () => {
    for (const status of [400, 404, 422]) {
      assert.equal(
        isRetryableGeminiError({ status }),
        false,
      );
    }
  });

  it("does not retry unknown failures", () => {
    assert.equal(
      isRetryableGeminiError(
        new Error("Network failure"),
      ),
      false,
    );

    assert.equal(
      isRetryableGeminiError(null),
      false,
    );
  });
});