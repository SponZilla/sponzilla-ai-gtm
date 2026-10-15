import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  InvalidDecisionConfidenceError,
  validateConfidenceSignal,
} from "./decision-confidence.validator.js";

describe(
  "Decision confidence validation",
  () => {
    it("accepts valid confidence values", () => {
      for (const value of [
        0,
        0.25,
        0.5,
        0.95,
        1,
      ]) {
        assert.equal(
          validateConfidenceSignal(value),
          value,
        );
      }
    });

    it("rejects negative confidence", () => {
      assert.throws(
        () => validateConfidenceSignal(-0.1),
        InvalidDecisionConfidenceError,
      );
    });

    it("rejects confidence above one", () => {
      assert.throws(
        () => validateConfidenceSignal(1.1),
        InvalidDecisionConfidenceError,
      );
    });

    it("rejects NaN", () => {
      assert.throws(
        () => validateConfidenceSignal(NaN),
        InvalidDecisionConfidenceError,
      );
    });

    it("rejects positive infinity", () => {
      assert.throws(
        () => validateConfidenceSignal(Infinity),
        InvalidDecisionConfidenceError,
      );
    });

    it("rejects negative infinity", () => {
      assert.throws(
        () => validateConfidenceSignal(-Infinity),
        InvalidDecisionConfidenceError,
      );
    });
  },
);