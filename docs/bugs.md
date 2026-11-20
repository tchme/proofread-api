# Bugs and pitfalls

Entry template: Symptom → Cause → Fix → Verified by.

## Password text could reach the API (0.1.0, caught before the first run)
- Symptom (read from the code, not reproduced): with a password field focused and its text selected, Alt+R would send the password to the server.
- Cause: `capture()` skipped non-text inputs and fell through to `getSelection()`, which in Chrome also covers text selected inside inputs (per MDN).
- Fix: a focused `INPUT` whose type is not text-like returns null before the page-selection branch.
- Verified by: `scripts/e2e.js` step 5 (password field + Alt+R → no toolbar, no card).
