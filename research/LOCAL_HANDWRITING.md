# Local handwriting MVP: implementation and review

Date: 16 November 2026. Branch: `feature/local-math-recognition`. This is a reviewable **Phase 1 structured-writing MVP**, not a release of unrestricted handwritten-math OCR. Do not merge or deploy without the owner's approval.

## Root causes

1. Previously `changed()` scheduled `/api/review` after a pause whenever paid AI auto-check was enabled. Debouncing and a seven-second throttle reduced calls, but every eligible review still needed Vision.
2. The recognizer saw the problem statement and diagram givens. Although it did not receive the canonical answer explicitly, mathematical context could bias transcription. The system did not measure recognition accuracy or expose alternative digit hypotheses.
3. `gradeAnswer()` verified a confirmed final value against the generated problem. It did not check equalities in the working. A correct final answer could therefore coexist with an incorrect intermediate conversion.
4. LLM-generated feedback and Realtime speech could comment on mathematical steps without an exact intermediate-step validator. These are distinct from recognizing what a child actually wrote.

These are code-level risks, not proof of which model error occurred in a specific child's session. No real handwriting or paid API trace from that session was supplied.

## What works now

- Expand **ตรวจวิธีทำในเครื่อง · จำนวนคละเป็นเศษเกิน** above the board. Write one Arabic digit per cell, left to right: whole number, numerator and denominator on the left; written numerator and denominator on the right. Each number has three ink cells; the editable transcription accepts up to nine digits.
- The recognizer compares normalized pen point clouds with ten original digit templates, independent of the task and its expected answer. It supports multi-stroke digits and multi-digit numbers by explicit cell segmentation. It supplies three alternatives with actual geometric distances. All readings require confirmation, even an exact template match.
- Scores are **uncalibrated geometric similarity**, not probabilities or measured child-handwriting accuracy. No trained neural model or downloaded weights are bundled. A user may correct the transcription before confirming. The system never changes `15` into `13` to make a conversion correct.
- The stacked numerator/denominator zones determine fraction layout; the whole-number zone and printed equality sign determine the mixed conversion. A separate geometry analyzer detects possible horizontal fraction bars and equal-sign pairs on the original board, but deliberately returns no digit transcription. It cannot reliably interpret a complete freehand page.
- `validateMixedConversion()` computes `whole × denominator + numerator` using BigInt. `validateSteps()` parses a bounded arithmetic grammar with exact rational arithmetic: integers, decimals, inline fractions, mixed numbers, parentheses, `+ - × ÷ * / :`, equality chains, and separate lines. No `eval`. Each equality is checked independently; an incorrect intermediate step is retained even when the final value is correct. Separate text rows are checked internally, not proven to be a complete derivation of the original task.
- `3 1/4 = 15/4` is incorrect; `13/4` is correct; `26/8` is equivalent and requires simplification only when that option is selected. Incomplete input stays pending; uncertain readings require confirmation. Zero denominators and unsupported syntax are not accepted as correct.
- Correctness of a step does not mean the whole exercise is solved. Local step feedback does not automatically award exercise history points. Entering a correct final answer cannot bypass an active incorrect, unconfirmed or unfinished recognized step; that step must be resolved first. Typed-answer edits preserve the verified ink state while cancelling stale cloud responses.
- Optional debugging displays input pen strokes, candidates, validation and the Thai hint. It is off by default, kept in a bounded in-memory log, and cleared when disabled. No log is sent to a server or saved to localStorage.

## Scheduling, voice and cloud fallback

- Structured ink is analyzed 1,000 ms after the latest stroke ends. No analysis runs while a digit is still being drawn. Editing, changing the exercise, changing pages, undo/clear and hidden-page transitions invalidate or cancel pending work. The original board auto-check is local only and also checks for an active pointer.
- Recognition has no access to the problem answer. The shared verified state contains the original problem ID/title, literal transcription, recognition evidence/similarity, confirmation, current step, deterministic result, Thai hint, page and board revision.
- While that state is active, spoken review uses the same Thai hint through browser speechSynthesis. Realtime output audio is muted and unsolicited transcripts cannot overwrite the local hint. A math-coach tool request reuses the local hint without an additional tutor API call. Press **ขั้นใหม่** to resume general Realtime tutoring. Thai speech requires an installed Thai system voice; absence produces a visible text fallback. A Realtime connection already open still incurs its normal input/audio costs until stopped.
- `/api/tutor` also recomputes supplied confirmed steps on the server instead of trusting a client verdict; stale revision/problem IDs are rejected. Authentication, adult consent, configuration and existing rate limits still apply.
- **อ่านภาพด้วย AI · ใช้เครดิต API** is an explicit fallback. Its Vision prompt receives the image but no generated problem, expected answer, solution or diagrams. It is instructed to transcribe literally, including incorrect mathematics. Cloud feedback is replaced by a neutral confirmation request. Users can edit and confirm the transcription, after which the same local validator checks it. Even a cloud final answer matching the task cannot bypass an incorrect recognized intermediate equality.
- Typed tutor questions remain explicit optional `/api/tutor` requests; general Realtime tutoring remains available outside active local verification. No paid OCR service or new API key is needed for local review. No claim of zero cost is made for explicitly enabled cloud features.

## Model investigation and decision

Primary sources inspected on the date above; sizes are artifact metadata, not measured tablet RAM usage. None of these candidates was adopted or benchmarked against children's math handwriting.

| Candidate | Availability and license | Size evidence | Task/Chrome assessment |
|---|---|---|---|
| [Official TensorFlow.js MNIST example](https://github.com/tensorflow/tfjs-examples/tree/master/mnist) | Browser training example; [Apache 2.0 source](https://github.com/tensorflow/tfjs-examples/blob/master/LICENSE). Not a pinned, trained full-math recognizer. | The example constructs a small digit classifier; no trained weight bundle is selected here, so no fabricated download size or accuracy is reported. | Recognizes 0–9 in isolated 28×28 inputs, not fraction structure or complete 2D expressions. Browser-compatible in principle; real Android pen accuracy unmeasured. |
| [TrOCR small handwritten ONNX](https://huggingface.co/Xenova/trocr-small-handwritten) | Actual ONNX/Transformers.js model; conversion card lists MIT. [Original model](https://huggingface.co/microsoft/trocr-small-handwritten) is fine-tuned on IAM text lines. | Quantized encoder 23,082,942 B + merged quantized decoder 40,527,613 B = **63,610,555 B**, excluding tokenizer/runtime and memory overhead. [Artifact listing](https://huggingface.co/api/models/Xenova/trocr-small-handwritten/tree/main/onnx). | Available for JS, but handwritten text-line OCR is not evidence for stacked fractions or mixed-number layout. Its generative output still needs literal-transcription testing. No tablet latency/accuracy claim. |
| [pix2tex / LaTeX-OCR](https://github.com/lukas-blecher/LaTeX-OCR) | MIT repository; documented Python/PyTorch application, not a ready drop-in Chrome math-ink module. | [Weights release](https://github.com/lukas-blecher/LaTeX-OCR/releases/tag/v0.0.1): weights.pth 102,113,875 B and image_resizer.pth 19,441,973 B, before runtime. | Two-dimensional formula recognition is relevant, but browser conversion, symbol-layout support and actual child handwriting accuracy need separate validation. No automatic adoption of a Python model into the Worker/browser. |

[ONNX Runtime Web's official support matrix](https://onnxruntime.ai/docs/get-started/with-javascript/web.html) lists Chrome/Edge Android support through WebAssembly. This establishes runtime feasibility, **not** compatibility or accuracy of every model. ONNX Runtime is not itself a handwriting model. The current MVP uses plain JS and Pointer Events, avoiding model downloads, GPU requirements and third-party runtime dependencies.

Decision: ship the permitted structured-writing fallback for review first. Phase 2 remains a separate effort: collect consented, non-identifying realistic pen samples; choose a pinned artifact and verify its license; benchmark literal transcription and 13/15 confusion separately from mathematical grading; measure download, RAM, warm/cold latency on actual Android Chrome; then consider a model integration. Synthetic tests here must not be presented as real handwriting validation.

## Files

New: `src/ink-recognition.js`, `src/fraction-layout.js`, `src/math-step-validator.js`, `src/local-math.js`, `tests/local-math.test.mjs`, `tests/local-math-browser.mjs`, this report; corresponding generated browser modules in `docs/`.

Changed: `src/app.js`, `src/style.css`, `src/worker.js`, `scripts/build.mjs`, `scripts/build-pages.mjs`, API/browser/voice/Pages regression tests, README and VALIDATION. The existing math engine and curriculum remain in use. No native app, production configuration, authentication bypass or frontend API key was added.

## Testing locally

```powershell
git switch feature/local-math-recognition
npm ci
npx playwright install chromium
npm run build
npm run build:pages
npm test
npm start
```

Open http://127.0.0.1:3000. In another terminal:

```powershell
node tests/local-math-browser.mjs
node tests/browser.mjs
node tests/voice-browser.mjs
node tests/curriculum-browser.mjs
node tests/fraction-browser.mjs
node tests/paper-browser.mjs
node tests/pages-browser.mjs
```

No real API key is needed for these tests. Voice tests use a mocked transport, synthetic microphone and mock Thai speech; pen tests use explicitly authored synthetic coordinates. Android hardware, palm rejection, an installed Thai TTS voice and unrestricted child handwriting remain manual device checks. For a physical tablet, serve a reachable HTTPS test deployment only after approval; tablet `localhost` is the tablet itself.
