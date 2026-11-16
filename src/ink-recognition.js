// Small transparent stroke-template recognizer for ISOLATED digit cells.
// Scores are geometric similarity, NOT calibrated recognition probabilities.
// No problem/expected answer enters this module. All readings require confirmation.
const paths = {
  0: [
    [
      [0.5, 0],
      [0.15, 0.12],
      [0, 0.5],
      [0.15, 0.9],
      [0.5, 1],
      [0.85, 0.85],
      [1, 0.5],
      [0.85, 0.1],
      [0.5, 0],
    ],
  ],
  1: [
    [
      [0.1, 0.25],
      [0.5, 0],
      [0.5, 1],
    ],
  ],
  2: [
    [
      [0, 0.2],
      [0.25, 0],
      [0.7, 0],
      [1, 0.2],
      [0.9, 0.4],
      [0, 1],
      [1, 1],
    ],
  ],
  3: [
    [
      [0, 0],
      [1, 0],
      [0.5, 0.45],
      [1, 0.55],
      [1, 0.85],
      [0.65, 1],
      [0, 0.9],
    ],
  ],
  4: [
    [
      [0.75, 0],
      [0, 0.65],
      [1, 0.65],
    ],
    [
      [0.75, 0],
      [0.75, 1],
    ],
  ],
  5: [
    [
      [1, 0],
      [0, 0],
      [0, 0.5],
      [0.7, 0.5],
      [1, 0.7],
      [0.85, 0.95],
      [0.35, 1],
      [0, 0.85],
    ],
  ],
  6: [
    [
      [0.85, 0],
      [0.35, 0.15],
      [0, 0.6],
      [0.1, 0.9],
      [0.5, 1],
      [0.9, 0.85],
      [1, 0.6],
      [0.7, 0.45],
      [0.2, 0.5],
    ],
  ],
  7: [
    [
      [0, 0],
      [1, 0],
      [0.35, 1],
    ],
  ],
  8: [
    [
      [0.5, 0.5],
      [0.05, 0.2],
      [0.3, 0],
      [0.8, 0.05],
      [1, 0.25],
      [0.5, 0.5],
      [0, 0.75],
      [0.2, 1],
      [0.75, 1],
      [1, 0.75],
      [0.5, 0.5],
    ],
  ],
  9: [
    [
      [0.8, 0.5],
      [0.25, 0.5],
      [0, 0.3],
      [0.15, 0.05],
      [0.6, 0],
      [0.95, 0.2],
      [1, 0.6],
      [0.55, 1],
    ],
  ],
};
export const DIGIT_TEMPLATES = Object.entries(paths).map(
  ([label, strokes]) => ({
    label,
    strokes: strokes.map((points) => ({
      points: points.map(([x, y]) => ({ x, y })),
    })),
  }),
);
export function inkBounds(strokes) {
  let x = Infinity,
    y = Infinity,
    right = -Infinity,
    bottom = -Infinity;
  for (const s of strokes)
    for (const p of s.points || []) {
      if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) continue;
      x = Math.min(x, p.x);
      y = Math.min(y, p.y);
      right = Math.max(right, p.x);
      bottom = Math.max(bottom, p.y);
    }
  return x === Infinity ? null : { x, y, right, bottom };
}
function cloud(strokes) {
  const b = inkBounds(strokes);
  if (!b) return [];
  const scale = Math.max(b.right - b.x, b.bottom - b.y);
  if (!scale) return [];
  const out = [];
  for (const s of strokes) {
    for (let i = 1; i < s.points.length; i++) {
      const a = s.points[i - 1],
        z = s.points[i],
        n = Math.max(
          1,
          Math.ceil((Math.hypot(z.x - a.x, z.y - a.y) / scale) * 32),
        );
      for (let j = 0; j < n; j++)
        out.push({
          x: (a.x + ((z.x - a.x) * j) / n - (b.x + b.right) / 2) / scale,
          y: (a.y + ((z.y - a.y) * j) / n - (b.y + b.bottom) / 2) / scale,
        });
    }
  }
  return out.filter(
    (_, i) => i % Math.max(1, Math.ceil(out.length / 160)) === 0,
  );
}
function distance(a, b) {
  return (
    a.reduce(
      (sum, p) =>
        sum + Math.min(...b.map((q) => Math.hypot(p.x - q.x, p.y - q.y))),
      0,
    ) / a.length
  );
}
export function recognizeDigit(strokes, templates = DIGIT_TEMPLATES) {
  const points = cloud(strokes);
  if (points.length < 3)
    return {
      text: "",
      confidence: null,
      candidates: [],
      status: "pending",
      source: "local-ink",
      requiresConfirmation: true,
    };
  const scores = new Map();
  for (const t of templates) {
    const target = cloud(t.strokes);
    if (!target.length) continue;
    const d = (distance(points, target) + distance(target, points)) / 2;
    scores.set(t.label, Math.min(scores.get(t.label) ?? Infinity, d));
  }
  const candidates = [...scores]
    .map(([text, distance]) => ({
      text,
      distance,
      similarity: Math.max(0, 1 - distance * 3),
    }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 3);
  const best = candidates[0];
  return {
    text: best?.text || "",
    confidence: best?.similarity ?? null,
    confidenceKind: "uncalibrated-geometric-similarity",
    margin: candidates[1] ? candidates[1].distance - best.distance : 0,
    candidates,
    status: "needs_confirmation",
    source: "local-ink",
    requiresConfirmation: true,
  };
}
