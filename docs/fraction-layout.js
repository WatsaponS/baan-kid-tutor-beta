import { inkBounds } from "./ink-recognition.js";
// Geometry evidence only: a long line may also be a minus sign. Never invent digits.
export function analyzeFractionLayout(strokes) {
  if (strokes.some((s) => s.tool === "eraser"))
    return {
      fractions: [],
      equalities: [],
      status: "needs_confirmation",
      expression: null,
      confidence: null,
      source: "local-layout",
      reason: "eraser_history_requires_raster_segmentation",
    };
  const items = strokes
    .filter((s) => s.tool !== "eraser")
    .map((s, index) => ({ index, b: inkBounds([s]) }))
    .filter((s) => s.b);
  const bars = items.filter(
    ({ b }) =>
      b.right - b.x > 25 && b.bottom - b.y < Math.max(6, (b.right - b.x) * 0.1),
  );
  const fractions = bars
    .map((bar) => ({
      bar: bar.index,
      numerator: items
        .filter(
          (s) =>
            s !== bar &&
            s.b.bottom < bar.b.y &&
            s.b.right >= bar.b.x &&
            s.b.x <= bar.b.right,
        )
        .map((s) => s.index),
      denominator: items
        .filter(
          (s) =>
            s !== bar &&
            s.b.y > bar.b.bottom &&
            s.b.right >= bar.b.x &&
            s.b.x <= bar.b.right,
        )
        .map((s) => s.index),
    }))
    .filter((f) => f.numerator.length && f.denominator.length);
  const equalities = [];
  for (let i = 0; i < bars.length; i++)
    for (let j = i + 1; j < bars.length; j++) {
      const a = bars[i],
        b = bars[j],
        w = a.b.right - a.b.x;
      if (
        Math.abs(a.b.x - b.b.x) < w * 0.2 &&
        Math.abs(b.b.right - b.b.x - w) < w * 0.25 &&
        Math.abs(a.b.y - b.b.y) > 4 &&
        Math.abs(a.b.y - b.b.y) < w * 0.6
      )
        equalities.push([a.index, b.index]);
    }
  return {
    fractions,
    equalities,
    status: items.length ? "needs_confirmation" : "pending",
    expression: null,
    confidence: null,
    source: "local-layout",
    reason: "freehand_digits_not_verified",
  };
}
export function structuredFractionExpression(values) {
  const keys = [
    "whole",
    "numerator",
    "denominator",
    "writtenNumerator",
    "writtenDenominator",
  ];
  if (keys.some((k) => !/^\d{1,9}$/.test(values[k] || ""))) return "";
  return `${values.whole} ${values.numerator}/${values.denominator} = ${values.writtenNumerator}/${values.writtenDenominator}`;
}
