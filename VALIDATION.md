# Beta validation

- Node tests: 10 passing, including 4,500 generated problems with answers checked independently from their displayed statements, GitHub Pages artifact checks, Cloudflare Access identity context, spoofed identity-header rejection, and loopback-only local-development bypass.
- Browser: Chromium desktop 1440px, tablet 1024px, mobile 390px. No horizontal document overflow or browser exceptions in the exercised flows.
- Browser flows: wrong/correct typed answers; duplicate-submission history; equivalent fractions; grade and topic changes; decimal precision; drawing and undo; demo handwriting boundary; settings; stale response cancellation; OCR answer confirmation before recording a grade.
- API tests use mock OpenAI responses. They verify owner/origin checks, missing configuration, input validation, not trusting client-provided answers, uncertain reads, upstream rate errors, and server-created voice-session configuration.
- Not verified: live OpenAI image recognition, live WebRTC audio, Thai child speech, Apple Pencil/Safari hardware behavior, API cost/latency, or ZDR account eligibility. No real API key was supplied or used during development.
- Screenshots are generated locally in ignored `test-results/` by `node tests/browser.mjs` (install dev dependencies and Chromium first).

## Voice repair

`node tests/voice-browser.mjs` passes with a mock WebRTC transport and Chromium's synthetic microphone. It verifies waiting for session.created before greeting, requesting a reply only after input_audio_buffer.committed, queuing a replacement reply until cancellation is acknowledged, short board-item identifiers, visible API error codes, microphone selection, and closing meter/media resources. This is not a live OpenAI or physical microphone test.

Thai voice revision: API mock checks full/economy model selection, semantic turn detection, Thai transcription configuration, and near/far microphone modes. Browser tests check sending the selected modes, displaying Thai transcript events, ignoring delayed transcripts for older turns, and switching to economy/headset. No Thai speech-recognition accuracy benchmark or ChatGPT-equivalence claim has been established.
