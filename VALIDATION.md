# Beta validation

- Node tests: 7 passing, including 4,500 generated problems with answers checked independently from their displayed statements.
- Browser: Chromium desktop 1440px, tablet 1024px, mobile 390px. No horizontal document overflow or browser exceptions in the exercised flows.
- Browser flows: wrong/correct typed answers; duplicate-submission history; equivalent fractions; grade and topic changes; decimal precision; drawing and undo; demo handwriting boundary; settings; stale response cancellation; OCR answer confirmation before recording a grade.
- API tests use mock OpenAI responses. They verify owner/origin checks, missing configuration, input validation, not trusting client-provided answers, uncertain reads, upstream rate errors, and server-created voice-session configuration.
- Not verified: live OpenAI image recognition, live WebRTC audio, Thai child speech, Apple Pencil/Safari hardware behavior, API cost/latency, or ZDR account eligibility. No real API key was supplied or used during development.
- Screenshots are generated locally in ignored `test-results/` by `node tests/browser.mjs` (install dev dependencies and Chromium first).
