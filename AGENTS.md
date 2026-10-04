# P2P Game Lab conventions

- Keep this a static, offline-capable PWA hosted under `/multiplayer-test/` on GitHub Pages. Pairing stays manual QR/text; do not introduce signaling servers, STUN/TURN, accounts, or external assets without discussing it.
- The host owns game state and simulates Pong in fixed 120 Hz steps. Clients send validated inputs, render local paddles immediately, and smooth received ball snapshots. Keep room epochs, input sequencing, bounded messages, and disconnect cleanup intact.
- Validate any new network fields/actions in `src/games/validate.ts` and `src/network/protocol.ts`. Consider mixed app versions and tell users when all devices need updating. Preserve old versioned identity/sound storage where possible.
- Keep game controls usable on touch screens. Disable gesture scrolling only on active play surfaces; the rest of the page must remain scrollable. Camera scanning uses a native modal, releases streams on every exit, and retains QR-image/text fallback.
- Sound is synthesized locally, muted by default, and unlocked by a user gesture. Service-worker updates wait for the user; never reload an active game automatically.
- Use `npm run verify` before handoff: formatting, unit tests, production build, and Playwright tests. Cover meaningful game rules and real pairing flows. Preview the production subpath for PWA/cache checks.
- For layout checks, retain readable text, touch targets, QR codes at least 240px wide on narrow phones, and generous viewport clearance. Test alternate/taller font metrics; do not loosen fit assertions to hide a layout bug. Use the `playwright-interactive` skill for live UI QA when available and review saved desktop/mobile screenshots.
- Record product behavior in README.md and manual/device QA in QA.md. Keep AGENTS.md limited to instructions for future coding agents.
