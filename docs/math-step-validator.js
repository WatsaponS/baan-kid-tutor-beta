// Exact arithmetic only. No OCR, problem answer, eval, or floating point grading.
const abs = (n) => (n < 0n ? -n : n);
function gcd(a, b) {
  a = abs(a);
  b = abs(b);
  while (b) [a, b] = [b, a % b];
  return a;
}
function rational(n, d = 1n) {
  if (!d) throw Error("zero_denominator");
  if (d < 0n) {
    n = -n;
    d = -d;
  }
  const g = gcd(n, d);
  return { n: n / g, d: d / g };
}
export function evaluateRational(text) {
  text = String(text)
    .replace(/[๐-๙]/g, (c) => String(c.charCodeAt(0) - 3664))
    .replace(/[−–]/g, "-")
    .replace(/×/g, "*")
    .replace(/÷/g, ":")
    .trim();
  if (!text || text.length > 300) throw Error("incomplete");
  // A mixed number is one token; whitespace is significant here.
  text = text.replace(/(\d+)\s+(\d+)\s*\/\s*(\d+)/g, "($1+$2/$3)");
  const tokens = text.match(/\d+(?:\.\d+)?|[()+*\-/:]/g) || [];
  if (tokens.join("") !== text.replace(/\s/g, "")) throw Error("unsupported");
  let i = 0;
  function atom() {
    if (tokens[i] === "-") {
      i++;
      const a = atom();
      return rational(-a.n, a.d);
    }
    if (tokens[i] === "+") {
      i++;
      return atom();
    }
    if (tokens[i] === "(") {
      i++;
      const v = sum();
      if (tokens[i++] !== ")") throw Error("incomplete");
      return v;
    }
    const t = tokens[i++];
    if (!/^\d+(?:\.\d+)?$/.test(t || "")) throw Error("incomplete");
    if (t.replace(".", "").length > 18) throw Error("too_large");
    const [a, b = ""] = t.split(".");
    return rational(BigInt(a + b), 10n ** BigInt(b.length));
  }
  function product() {
    let a = atom();
    while (["*", "/", ":"].includes(tokens[i])) {
      const op = tokens[i++],
        b = atom();
      a =
        op === "*"
          ? rational(a.n * b.n, a.d * b.d)
          : rational(a.n * b.d, a.d * b.n);
    }
    return a;
  }
  function sum() {
    let a = product();
    while (["+", "-"].includes(tokens[i])) {
      const op = tokens[i++],
        b = product();
      a = rational(a.n * b.d + (op === "+" ? b.n : -b.n) * a.d, a.d * b.d);
    }
    return a;
  }
  const value = sum();
  if (i !== tokens.length) throw Error("unsupported");
  return value;
}
export function validateMixedConversion({
  whole,
  numerator,
  denominator,
  writtenNumerator,
  writtenDenominator,
  requireSimplified = false,
}) {
  const values = [
    whole,
    numerator,
    denominator,
    writtenNumerator,
    writtenDenominator,
  ];
  if (values.some((v) => v === null || v === undefined || v === ""))
    return { status: "pending" };
  if (values.some((v) => !/^\d{1,9}$/.test(String(v))))
    return { status: "needs_confirmation" };
  const [w, n, d, wn, wd] = values.map(BigInt);
  if (!d || !wd) return { status: "invalid", errorType: "zero_denominator" };
  if (n >= d)
    return { status: "invalid", errorType: "not_proper_mixed_number" };
  const en = w * d + n,
    correct = en * wd === wn * d,
    simplified = gcd(wn, wd) === 1n;
  return {
    status: correct
      ? requireSimplified && !simplified
        ? "needs_simplification"
        : "correct"
      : "incorrect",
    expectedNumerator:
      en <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(en) : String(en),
    expectedDenominator: Number(d),
    equivalent: correct,
    simplified,
    errorType: correct ? null : "mixed_number_conversion",
  };
}
export function validateSteps(
  expression,
  { confirmed = false, requireSimplified = false } = {},
) {
  if (!expression || !String(expression).trim())
    return { status: "pending", steps: [] };
  if (!confirmed) return { status: "needs_confirmation", steps: [] };
  const rows = String(expression)
    .split(/\n|;/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (rows.length > 12) return { status: "unsupported", steps: [] };
  const steps = [];
  for (const row of rows) {
    const sides = row.split("=");
    if (sides.length < 2 || sides.some((s) => !s.trim()))
      return { status: "pending", steps };
    for (let i = 1; i < sides.length; i++) {
      const left = sides[i - 1].trim(),
        right = sides[i].trim();
      let result;
      const m = left.match(/^(\d+)\s+(\d+)\s*\/\s*(\d+)$/),
        f = right.match(/^(\d+)\s*\/\s*(\d+)$/);
      try {
        const a = evaluateRational(left),
          b = evaluateRational(right);
        result =
          m && f
            ? validateMixedConversion({
                whole: m[1],
                numerator: m[2],
                denominator: m[3],
                writtenNumerator: f[1],
                writtenDenominator: f[2],
                requireSimplified:
                  requireSimplified &&
                  row === rows.at(-1) &&
                  i === sides.length - 1,
              })
            : {
                status: a.n === b.n && a.d === b.d ? "correct" : "incorrect",
                errorType: a.n === b.n && a.d === b.d ? null : "unequal_step",
              };
        if (
          result.status === "correct" &&
          requireSimplified &&
          row === rows.at(-1) &&
          i === sides.length - 1 &&
          f &&
          gcd(BigInt(f[1]), BigInt(f[2])) !== 1n
        )
          result.status = "needs_simplification";
      } catch (e) {
        result = {
          status:
            e.message === "incomplete"
              ? "pending"
              : e.message === "zero_denominator"
                ? "invalid"
                : "unsupported",
          errorType: e.message,
        };
      }
      steps.push({ left, right, ...result });
    }
  }
  const failure = steps.find((s) => s.status !== "correct");
  return {
    status: failure?.status || "correct",
    steps,
    errorType: failure?.errorType || null,
    currentStep: failure || steps.at(-1),
  };
}
export function thaiStepFeedback(result) {
  if (result.status === "needs_confirmation")
    return "ครูยังอ่านตัวเลขไม่แน่ใจ ช่วยยืนยันหรือแก้ตัวเลขที่อ่านได้ก่อนนะ";
  if (result.status === "pending")
    return "เขียนให้ครบทั้งสองข้างของเครื่องหมายเท่ากับก่อนนะ ครูรอได้";
  if (result.status === "needs_simplification")
    return "ทั้งสองข้างมีค่าเท่ากันแล้ว ลองทำเศษส่วนให้เป็นอย่างต่ำตามที่เลือกนะ";
  if (result.status === "correct")
    return "แปลงหรือคำนวณขั้นนี้ได้ถูกต้องแล้ว ลองทำขั้นตอนต่อไปนะ";
  const s = result.currentStep || result,
    m = s.left?.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (s.errorType === "mixed_number_conversion" && m)
    return `ลองดูอีกครั้งนะ ${m[1]} คูณ ${m[3]} ได้เท่าไร แล้วต้องบวกอีก ${m[2]} นะ ตัวส่วนยังเท่าเดิม`;
  if (result.status === "incorrect")
    return "สองข้างของเครื่องหมายเท่ากับยังมีค่าไม่เท่ากัน ลองตรวจขั้นนี้อีกครั้งนะ";
  if (result.errorType === "zero_denominator")
    return "ตัวส่วนเป็นศูนย์ไม่ได้ ลองตรวจตัวเลขอีกครั้งนะ";
  return "ขั้นนี้ยังตรวจอัตโนมัติไม่ได้ ช่วยตรวจรูปแบบตัวเลขและเครื่องหมายก่อนนะ";
}
