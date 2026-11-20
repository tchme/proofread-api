# Bugs and pitfalls

Entry template: Symptom → Cause → Fix → Verified by.

## Every answer took 6–8 s (0.1.0 → 0.1.1)
- Symptom: the user waited 7–8 s for a one-line fix on Haiku, Sonnet and Opus; on 2026-11-20 morning Haiku had answered in ~2 s.
- Cause: tooken.club models reason before answering unless told not to (150–250 hidden reasoning tokens per answer).
- Fix: `api.js` sends `reasoning_effort: "none"`; on a 400 whose `error.param` is `reasoning_effort` it retries without the field and remembers that model.
- Verified by: `scripts/bench.js` (6–8 s → 2.2–3.5 s, the same answers), `scripts/smoke.js` on the default model and on gemini-3.8-flash (refuses the field, answered after the retry), `scripts/e2e.js`.

## tooken.club serves only 2 requests at a time per key
- Symptom: a benchmark sending 4 requests in parallel got 429 «Очередь заполнена» (`"limit":2`), and the other timings included the queue wait.
- Fix: `scripts/bench.js` sends one request at a time. The extension sends one request per action, so a person is not affected. Tests running while the user works can hit the limit.

## Password text could reach the API (0.1.0, caught before the first run)
- Symptom (read from the code, not reproduced): with a password field focused and its text selected, Alt+R would send the password to the server.
- Cause: `capture()` skipped non-text inputs and fell through to `getSelection()`, which in Chrome also covers text selected inside inputs (per MDN).
- Fix: a focused `INPUT` whose type is not text-like returns null before the page-selection branch.
- Verified by: `scripts/e2e.js` step 5 (password field + Alt+R → no toolbar, no card).
