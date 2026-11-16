import { test } from "node:test";
import assert from "node:assert/strict";
import {
  validateMixedConversion,
  validateSteps,
  evaluateRational,
  thaiStepFeedback,
} from "../src/math-step-validator.js";
import { DIGIT_TEMPLATES, recognizeDigit } from "../src/ink-recognition.js";
import {
  analyzeFractionLayout,
  structuredFractionExpression,
} from "../src/fraction-layout.js";
import { createVerifiedState } from "../src/local-math.js";
test("mixed conversion regression: recognized 15/4 is never repaired into 13/4", () => {
  const input = {
    whole: 3,
    numerator: 1,
    denominator: 4,
    writtenNumerator: 15,
    writtenDenominator: 4,
  };
  assert.deepEqual(validateMixedConversion(input), {
    status: "incorrect",
    expectedNumerator: 13,
    expectedDenominator: 4,
    equivalent: false,
    simplified: true,
    errorType: "mixed_number_conversion",
  });
  for (const [text, status] of [
    ["3 1/4 = 15/4", "incorrect"],
    ["3 1/4 = 13/4", "correct"],
    ["3 1/4 = 26/8", "correct"],
    ["2 2/3 = 8/3", "correct"],
    ["2 2/3 = 7/3", "incorrect"],
  ]) {
    const result = validateSteps(text, { confirmed: true });
    assert.equal(result.status, status, text);
    assert.equal(result.steps[0].right, text.split("=")[1].trim());
  }
  assert.equal(
    validateSteps("3 1/4 = 26/8", { confirmed: true, requireSimplified: true })
      .status,
    "needs_simplification",
  );
  assert.equal(
    validateSteps("3 1/4 = 26/8 = 13/4", {
      confirmed: true,
      requireSimplified: true,
    }).status,
    "correct",
  );
  assert.equal(
    validateSteps("1/4 + 1/4 = 2/4", {
      confirmed: true,
      requireSimplified: true,
    }).status,
    "needs_simplification",
  );
});
test("exact rational multi-step arithmetic rejects bad intermediate steps despite correct final value", () => {
  assert.equal(
    validateSteps("3 1/4 = 15/4 = 13/4", { confirmed: true }).status,
    "incorrect",
  );
  assert.equal(
    validateSteps("3 1/4 = (3 * 4 + 1)/4 = 13/4", { confirmed: true }).status,
    "correct",
  );
  assert.equal(
    validateSteps("1/3 + 1/6 = 1/2\n1/2 * 2 = 1", { confirmed: true }).status,
    "correct",
  );
  assert.equal(
    validateSteps("0.1 + 0.2 = 0.3", { confirmed: true }).status,
    "correct",
  );
  assert.deepEqual(evaluateRational("9007199254740993/3"), {
    n: 3002399751580331n,
    d: 1n,
  });
  for (let w = 0; w < 12; w++)
    for (let d = 2; d < 20; d++)
      for (let n = 0; n < d; n++) {
        const en = w * d + n;
        assert.equal(
          validateMixedConversion({
            whole: w,
            numerator: n,
            denominator: d,
            writtenNumerator: en * 7,
            writtenDenominator: d * 7,
          }).status,
          "correct",
        );
        assert.equal(
          validateMixedConversion({
            whole: w,
            numerator: n,
            denominator: d,
            writtenNumerator: en + 1,
            writtenDenominator: d,
          }).status,
          "incorrect",
        );
      }
});
test("incomplete, unsafe, invalid and ambiguous input never receives a correct verdict", () => {
  for (const text of ["", "3 1/4 =", "3 1/4 = 13/", "3 1/4"])
    assert.equal(
      validateSteps(text, { confirmed: true }).status,
      "pending",
      text,
    );
  assert.equal(validateSteps("3 1/4 = 13/4").status, "needs_confirmation");
  for (const text of ["1/0 = 1", "alert(1) = 1", "1e3 = 1000", "1/2 = 0/0"])
    assert.notEqual(validateSteps(text, { confirmed: true }).status, "correct");
  assert.equal(
    validateMixedConversion({
      whole: 3,
      numerator: 1,
      denominator: 4,
      writtenNumerator: null,
      writtenDenominator: 4,
    }).status,
    "pending",
  );
  assert.equal(
    validateMixedConversion({
      whole: 3,
      numerator: 1,
      denominator: 4,
      writtenNumerator: "13 or 15",
      writtenDenominator: 4,
    }).status,
    "needs_confirmation",
  );
});
test("isolated digit recognizer reports measured alternatives without mathematical context", () => {
  for (const t of DIGIT_TEMPLATES) {
    const strokes = t.strokes.map((s) => ({
      points: s.points.map((p) => ({ x: 20 + p.x * 60, y: 10 + p.y * 80 })),
    }));
    const r = recognizeDigit(strokes);
    assert.equal(r.text, t.label, t.label);
    assert.equal(r.requiresConfirmation, true);
    assert.equal(r.status, "needs_confirmation");
    assert.equal(r.candidates.length, 3);
    assert.ok(r.confidence >= 0 && r.confidence <= 1);
    assert.ok(r.candidates.every((c) => Number.isFinite(c.distance)));
  }
  assert.equal(recognizeDigit([]).status, "pending");
  assert.equal(recognizeDigit([{ points: [{ x: 5, y: 5 }] }]).confidence, null);
  const r = recognizeDigit(DIGIT_TEMPLATES[3].strokes);
  assert.notEqual(r.candidates[0].distance, r.candidates[1].distance);
});
test("fraction layout identifies stroke geometry but never fabricates a full expression", () => {
  const stroke = (points) => ({ points: points.map(([x, y]) => ({ x, y })) });
  const result = analyzeFractionLayout([
    stroke([
      [10, 50],
      [90, 50],
    ]),
    stroke([
      [40, 10],
      [40, 30],
    ]),
    stroke([
      [40, 65],
      [40, 90],
    ]),
    stroke([
      [120, 45],
      [155, 45],
    ]),
    stroke([
      [120, 55],
      [155, 55],
    ]),
  ]);
  assert.ok(
    result.fractions.some(
      (f) =>
        f.bar === 0 && f.numerator.includes(1) && f.denominator.includes(2),
    ),
  );
  assert.deepEqual(result.equalities, [[3, 4]]);
  assert.equal(result.expression, null);
  assert.equal(result.confidence, null);
  assert.equal(result.status, "needs_confirmation");
  assert.equal(
    structuredFractionExpression({
      whole: "3",
      numerator: "1",
      denominator: "4",
      writtenNumerator: "15",
      writtenDenominator: "4",
    }),
    "3 1/4 = 15/4",
  );
});
test("screen and voice share an immutable-by-value deterministic state and Thai hint", () => {
  const p = { id: "test", title: "แปลงจำนวนคละ" };
  const state = createVerifiedState({
    problem: p,
    expression: "3 1/4 = 15/4",
    confirmed: true,
    confidence: 0.58,
    revision: 9,
    page: 1,
  });
  assert.equal(state.validation.status, "incorrect");
  assert.equal(state.recognizedHandwriting, "3 1/4 = 15/4");
  assert.equal(state.recognitionConfidence, 0.58);
  assert.equal(state.boardRevision, 9);
  assert.equal(state.page, 1);
  assert.equal(state.suggestedHint, thaiStepFeedback(state.validation));
  assert.match(state.suggestedHint, /3 คูณ 4/);
  assert.equal(
    createVerifiedState({
      problem: p,
      expression: "3 1/4 = 13/4",
      revision: 10,
    }).validation.status,
    "needs_confirmation",
  );
});
