# Backlog

Deferred items — not blocking MVP, revisit later.

## Voice journal

- **Live transcription** — current implementation only shows text after `stop`. Web Speech API supports `interimResults = true` for word-by-word output. Trade-off: more flicker, partial-result handling. Revisit if the record-then-wait UX feels slow during real use. _(2026-05-22)_
- **Language toggle (EN/NL)** — `recognition.lang` is hardcoded to `'nl-NL'`. Add a per-recording toggle in the form header if journaling in English becomes a regular need. _(2026-05-22)_
