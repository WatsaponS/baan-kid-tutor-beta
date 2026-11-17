import { recognizeDigit } from "./ink-recognition.js";
import {
  analyzeFractionLayout,
  structuredFractionExpression,
} from "./fraction-layout.js";
import { validateSteps, thaiStepFeedback } from "./math-step-validator.js";

export function createVerifiedState({
  problem,
  expression = "",
  confidence = null,
  evidence = [],
  confirmed = false,
  revision,
  page = 0,
  source = "local-ink",
  requireSimplified = false,
}) {
  const validation = validateSteps(expression, {
    confirmed,
    requireSimplified,
  });
  return {
    originalProblem: { id: problem.id, title: problem.title },
    recognizedHandwriting: expression,
    recognitionConfidence: confidence,
    recognitionEvidence: evidence,
    confidenceKind:
      source === "local-ink" ? "uncalibrated-geometric-similarity" : null,
    confirmed,
    requireSimplified,
    source,
    currentStep: validation.currentStep || null,
    validation,
    suggestedHint: thaiStepFeedback(validation),
    boardRevision: revision,
    page,
  };
}
export function mountLocalMath({
  host,
  getContext,
  onFeedback,
  onMutation,
  speak,
}) {
  const el = (tag, text, cls) => {
    const e = document.createElement(tag);
    if (text) e.textContent = text;
    if (cls) e.className = cls;
    return e;
  };
  const panel = el("details", null, "local-math");
  panel.id = "localMath";
  panel.append(el("summary", "ตรวจวิธีทำในเครื่อง · จำนวนคละเป็นเศษเกิน"));
  panel.append(
    el(
      "p",
      "เขียนเลขอารบิกช่องละ 1 ตัว เรียงซ้ายไปขวา (สูงสุด 3 ตัวต่อจำนวน) แล้วตรวจหรือแก้ตัวเลขที่อ่านได้และกดยืนยัน ไม่ส่งภาพไป AI เมื่อมีผลตรวจ เสียงจะอ่านคำแนะนำชุดเดียวกันจากเครื่อง กด “ขั้นใหม่” เพื่อกลับไปคุย AI ทั่วไป",
    ),
  );
  panel.append(
    el(
      "p",
      "รุ่นทดลองอ่านเลขแยกช่อง: คะแนนใต้ช่องบอกความคล้ายของเส้น ไม่ใช่เปอร์เซ็นต์ความแม่นยำ ต้องยืนยันทุกครั้ง",
    ),
  );
  const groups = el("div", null, "ink-equation"),
    fields = new Map();
  let timer,
    state = null,
    generation = 0,
    debug = false,
    penTime = 0;
  const logs = [];
  const labels = [
    ["whole", "จำนวนเต็ม"],
    ["numerator", "เศษ"],
    ["denominator", "ส่วน"],
    ["writtenNumerator", "เศษที่เขียน"],
    ["writtenDenominator", "ส่วนที่เขียน"],
  ];
  const lhs = el("div", null, "ink-mixed"),
    frac = el("div", null, "ink-fraction"),
    rhs = el("div", null, "ink-fraction");
  lhs.append(frac);
  groups.append(lhs, el("strong", "="), rhs);
  function log(event, input, output) {
    if (!debug) return;
    logs.push({
      event,
      at: Date.now(),
      revision: getContext().revision,
      input,
      output,
    });
    if (logs.length > 30) logs.shift();
    debugText.textContent = JSON.stringify(logs, null, 2);
  }
  function publish(next) {
    state = next;
    status.textContent = next.suggestedHint;
    transcription.textContent =
      "อ่านได้: " + (next.recognizedHandwriting || "ยังไม่ครบ");
    onFeedback(next);
    log("validation", next.recognizedHandwriting, {
      validation: next.validation,
      feedback: next.suggestedHint,
    });
  }
  function invalidate() {
    generation++;
    clearTimeout(timer);
    onMutation();
    state = createVerifiedState({ ...getContext() });
    confirm.disabled = true;
    status.textContent = "กำลังเขียน · ยังไม่ตรวจ";
  }
  function read() {
    if ([...fields.values()].some((f) => f.cells.some((c) => c.current)))
      return;
    const values = {},
      scores = [];
    for (const [key, f] of fields) {
      if (!f.dirty) {
        values[key] = f.input.value;
        continue;
      }
      let text = "",
        gap = false,
        hasGap = false;
      for (const cell of f.cells) {
        if (!cell.strokes.length) {
          gap = true;
          cell.reading = null;
          continue;
        }
        if (gap) hasGap = true;
        const r = recognizeDigit(cell.strokes);
        cell.reading = r;
        text += r.text;
        cell.result.textContent = r.candidates
          .map((c) => `${c.text} (${Math.round(c.similarity * 100)} คะแนน)`)
          .join(" / ");
        log("recognition", { field: key, strokes: cell.strokes }, r);
      }
      f.input.value = text;
      f.dirty = false;
      f.gap = hasGap;
      values[key] = text;
    }
    const expression = [...fields.values()].some((f) => f.gap)
      ? ""
      : structuredFractionExpression(values);
    confirm.disabled = !expression;
    const evidence = [];
    for (const [field, f] of fields)
      for (const [index, cell] of f.cells.entries())
        if (cell.reading) {
          evidence.push({ field, index, ...cell.reading });
          scores.push(cell.reading.confidence ?? 0);
        }
    const edited = [...fields.values()].some((f) => f.edited);
    const c = getContext();
    publish(
      createVerifiedState({
        ...c,
        expression,
        evidence,
        source: edited ? "user-edited" : "local-ink",
        confidence: !edited && scores.length ? Math.min(...scores) : null,
      }),
    );
  }
  function schedule() {
    clearTimeout(timer);
    const token = generation;
    timer = setTimeout(() => {
      if (token === generation) read();
    }, 1000);
  }
  for (const [key, label] of labels) {
    const group = el("fieldset");
    group.append(el("legend", label));
    const cells = el("div", null, "ink-cells");
    const field = { cells: [], input: el("input"), gap: false };
    field.input.type = "text";
    field.input.inputMode = "numeric";
    field.input.maxLength = 9;
    field.input.setAttribute("aria-label", label + " ที่อ่านได้");
    field.input.dataset.field = key;
    for (let index = 0; index < 3; index++) {
      const wrap = el("div"),
        canvas = el("canvas");
      canvas.width = 100;
      canvas.height = 130;
      canvas.setAttribute("aria-label", `${label} หลักที่ ${index + 1}`);
      canvas.dataset.ink = key + "-" + index;
      const cell = { canvas, strokes: [], current: null, result: el("small") };
      field.cells.push(cell);
      const ctx = canvas.getContext("2d");
      const draw = () => {
        ctx.clearRect(0, 0, 100, 130);
        ctx.strokeStyle = "#40334d";
        ctx.lineWidth = 5;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        for (const s of [
          ...cell.strokes,
          ...(cell.current ? [cell.current] : []),
        ]) {
          ctx.beginPath();
          s.points.forEach((p, i) =>
            i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y),
          );
          ctx.stroke();
        }
      };
      const point = (e) => {
        const b = canvas.getBoundingClientRect();
        return {
          x: ((e.clientX - b.left) * 100) / b.width,
          y: ((e.clientY - b.top) * 130) / b.height,
        };
      };
      canvas.onpointerdown = (e) => {
        if (
          e.button > 0 ||
          [...fields.values()].some((f) => f.cells.some((c) => c.current)) ||
          (e.pointerType === "touch" && Date.now() - penTime < 2500)
        )
          return;
        if (e.pointerType === "pen") penTime = Date.now();
        e.preventDefault();
        canvas.setPointerCapture(e.pointerId);
        invalidate();
        field.dirty = true;
        field.edited = false;
        cell.current = { id: e.pointerId, points: [point(e)] };
        draw();
      };
      canvas.onpointermove = (e) => {
        if (cell.current?.id !== e.pointerId) return;
        e.preventDefault();
        for (const p of e.getCoalescedEvents?.() || [e])
          if (cell.current.points.length < 2000)
            cell.current.points.push(point(p));
        draw();
      };
      const end = (e) => {
        if (cell.current?.id !== e.pointerId) return;
        cell.strokes.push(cell.current);
        cell.current = null;
        draw();
        schedule();
      };
      canvas.onpointerup = end;
      canvas.onpointercancel = end;
      const clear = el("button", "ลบ");
      clear.type = "button";
      clear.setAttribute("aria-label", `ลบ${label} หลักที่ ${index + 1}`);
      clear.onclick = () => {
        cell.strokes = [];
        cell.current = null;
        cell.result.textContent = "";
        field.dirty = true;
        draw();
        invalidate();
        schedule();
      };
      wrap.append(canvas, clear, cell.result);
      cells.append(wrap);
    }
    field.input.oninput = () => {
      invalidate();
      field.dirty = false;
      field.gap = false;
      field.edited = true;
      const values = Object.fromEntries(
        [...fields].map(([k, f]) => [k, f.input.value]),
      );
      const expression = structuredFractionExpression(values);
      confirm.disabled =
        !expression || [...fields.values()].some((f) => f.dirty);
      if ([...fields.values()].some((f) => f.dirty)) schedule();
      publish(
        createVerifiedState({
          ...getContext(),
          expression,
          source: "user-edited",
          confidence: null,
        }),
      );
    };
    group.append(cells, field.input);
    fields.set(key, field);
    if (key === "whole") lhs.prepend(group);
    else if (["numerator", "denominator"].includes(key)) frac.append(group);
    else rhs.append(group);
  }
  const transcription = el("p", "ยังไม่มีตัวเลข"),
    status = el("p", "เขียนเลขลงในช่อง หรือพิมพ์ยืนยันตัวเลขที่อ่านได้");
  status.id = "localMathStatus";
  status.setAttribute("aria-live", "polite");
  const confirm = el("button", "ยืนยันตัวเลขและตรวจขั้นนี้", "primary-btn");
  confirm.type = "button";
  confirm.id = "confirmLocalInk";
  confirm.disabled = true;
  const simplify = el("input");
  simplify.type = "checkbox";
  const simplifyLabel = el("label", " ต้องเป็นเศษส่วนอย่างต่ำ ");
  simplifyLabel.prepend(simplify);
  simplify.onchange = () => {
    if (state?.confirmed) confirm.click();
  };
  confirm.onclick = () => {
    clearTimeout(timer);
    if (
      [...fields.values()].some(
        (f) => f.dirty || f.cells.some((c) => c.current),
      )
    )
      return;
    const expression = structuredFractionExpression(
      Object.fromEntries([...fields].map(([k, f]) => [k, f.input.value])),
    );
    if (!expression) return;
    onMutation();
    const context = getContext();
    publish(
      createVerifiedState({
        ...context,
        expression,
        evidence: state?.recognitionEvidence || [],
        confidence: state?.recognitionConfidence ?? null,
        source: state?.source || "user-edited",
        confirmed: true,
        requireSimplified: simplify.checked,
      }),
    );
  };
  const speakButton = el("button", "ฟังคำแนะนำจากเครื่อง");
  speakButton.type = "button";
  speakButton.onclick = () => speak(state?.suggestedHint || status.textContent);
  const next = el("button", "ขั้นใหม่");
  next.type = "button";
  next.onclick = () => {
    const c = getContext();
    if (state?.confirmed && state.boardRevision === c.revision)
      log("completed_step", state.recognizedHandwriting, state.validation);
    onMutation();
    reset();
  };
  const debugDetails = el("details"),
    debugLabel = el(
      "label",
      " เปิด debug เฉพาะหน้านี้ (มีเส้นปากกาและตัวเลข ไม่ส่งขึ้นเซิร์ฟเวอร์)",
    ),
    debugCheck = el("input"),
    debugText = el("pre");
  debugCheck.type = "checkbox";
  debugCheck.onchange = () => {
    debug = debugCheck.checked;
    if (!debug) {
      logs.length = 0;
      debugText.textContent = "";
    }
  };
  debugLabel.prepend(debugCheck);
  debugDetails.append(el("summary", "ข้อมูลตรวจสอบ"), debugLabel, debugText);
  const multi = el("details"),
    text = el("textarea"),
    checkText = el("button", "ยืนยันข้อความและตรวจสมการในเครื่อง");
  text.maxLength = 300;
  text.setAttribute("aria-label", "สมการหลายขั้น");
  text.placeholder = "3 1/4 = (3 × 4 + 1)/4 = 13/4";
  text.oninput = () => {
    invalidate();
    publish(
      createVerifiedState({
        ...getContext(),
        expression: text.value,
        source: "user-edited",
      }),
    );
  };
  checkText.type = "button";
  checkText.onclick = () => {
    onMutation();
    publish(
      createVerifiedState({
        ...getContext(),
        expression: text.value,
        confirmed: true,
        source: "user-edited",
        requireSimplified: simplify.checked,
      }),
    );
  };
  multi.append(el("summary", "พิมพ์หรือแก้สมการหลายขั้น"), text, checkText);
  panel.append(
    groups,
    transcription,
    simplifyLabel,
    confirm,
    speakButton,
    next,
    status,
    multi,
    debugDetails,
  );
  host.append(panel);
  function reset() {
    generation++;
    clearTimeout(timer);
    state = null;
    text.value = "";
    confirm.disabled = true;
    for (const f of fields.values()) {
      f.input.value = "";
      f.dirty = false;
      f.gap = false;
      f.edited = false;
      for (const c of f.cells) {
        c.current = null;
        c.strokes = [];
        c.reading = null;
        c.result.textContent = "";
        c.canvas.getContext("2d").clearRect(0, 0, 100, 130);
      }
    }
    status.textContent = "เขียนขั้นใหม่ได้เลย";
    transcription.textContent = "ยังไม่มีตัวเลข";
  }
  return {
    element: panel,
    speakState() {
      if (state) speak(state.suggestedHint);
    },
    getState() {
      const c = getContext();
      return state?.boardRevision === c.revision &&
        state.page === c.page &&
        state.originalProblem.id === c.problem.id
        ? state
        : null;
    },
    rebaseForTypedAnswer(previous) {
      const c = getContext();
      if (
        !previous ||
        previous.originalProblem.id !== c.problem.id ||
        previous.page !== c.page
      )
        return;
      publish(
        createVerifiedState({
          ...c,
          expression: previous.recognizedHandwriting,
          confidence: previous.recognitionConfidence,
          evidence: previous.recognitionEvidence,
          confirmed: previous.confirmed,
          source: previous.source,
          requireSimplified: previous.requireSimplified,
        }),
      );
    },
    confirmExpression(expression) {
      onMutation();
      publish(
        createVerifiedState({
          ...getContext(),
          expression,
          confirmed: true,
          source: "cloud-transcription-confirmed",
        }),
      );
      return state;
    },
    reset,
    pause() {
      generation++;
      clearTimeout(timer);
    },
    reviewFreehand(strokes) {
      const c = getContext(),
        layout = analyzeFractionLayout(strokes);
      const next = createVerifiedState({ ...c });
      next.validation = { status: layout.status, steps: [] };
      next.suggestedHint = strokes.length
        ? "กระดานอิสระยังอ่านเลขไม่ได้แน่นอน พิมพ์คำตอบเพื่อยืนยัน หรือกดอ่านภาพด้วย AI เมื่อต้องการนะ"
        : "เขียนวิธีทำก่อนนะ";
      log("layout", strokes, layout);
      publish(next);
      return next;
    },
  };
}
