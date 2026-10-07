# unplanned_wall

An experimental Three.js environment inspired by an old Taiwanese apartment mailbox wall.

Fifteen physical mailboxes, found building labels, worn metal, inserted paper, and an accumulated notice board. Click a door to open it; press Escape to close open doors. Keyboard controls are available with Tab and Enter.

## Run locally

Serve the `dist` directory using any static HTTP server, then open its local URL. No build step is required; Three.js and the material textures are included.

## Files

- `dist/app.js` — scene, materials, physical doors, and sound
- `dist/style.css` — viewport and accessible controls
- `dist/assets/` — generated material textures
- `material-prompts.json` — texture generation prompts
- `.openai/hosting.json` — existing Sites publishing identity

Interaction wear is stored for the current browser session. Audio starts only after interaction.

Two overfilled compartments spill once per browser session. Fallen and caught mail remain after closing, reopening, or reloading the page. The spill uses bounded, deterministic motion with lightweight contact handling; settled paper stops updating. Reduced-motion mode preserves the resulting state without the falling animation.

Run `node tests/spill.mjs` to verify release timing, cancellation, one-time behavior, accumulation, restoration, and reduced motion.

## Send a letter

Pick up the unused paper at the lower edge of the wall. Write up to 280 Unicode characters, optionally attach one http/https link, fold, then send. The folded sheet remains with you if delivery fails; retries reuse its delivery ID. The API chooses a mailbox using weighted real occupancy. A confirmed save becomes a folded WebGL sheet, including after refresh. Crowded stacks can spill without deleting their records. The original found mail remains part of the approved environment.

### Storage and deployment

The static site still deploys from `dist/`. Vercel additionally runs `api/letters.js`; no frontend framework or build step is needed. `@vercel/blob` is the only server dependency. A **private** Vercel Blob store connected to the existing `unplanned_wall` project supplies `BLOB_READ_WRITE_TOKEN` server-side.

For this bounded MVP, one private document stores at most 24 letters per mailbox (360 total), plus short-lived rate-limit metadata. Uncached reads and conditional ETag writes make mailbox assignment, occupancy, idempotency, and rate limits one atomic operation. Conflicting writes retry with jitter; a full wall refuses new deliveries. No stored letters expire or get deleted when they spill. Production and development/preview use separate documents. Larger capacity or high write volume should migrate this small document store to a transactional database.

`GET /api/letters` exposes only mailbox capacity and opaque paper IDs. Letter bodies, links, timestamps, credentials, and rate-limit metadata stay private. `POST` validates size, message, URL, and origin. It limits each daily-hashed network address to five new letters per hour, at least 15 seconds apart; no raw IP is stored. This is lightweight abuse protection, not bot-proofing. Reading letters is intentionally absent.

### Development and checks

1. `npm ci`
2. `vercel env pull .env.local --environment development` from the linked project (never commit this file).
3. `npm run dev` — serves the artwork and real API at `http://127.0.0.1:4173` using the private development collection.
4. `npm test` — validation, privacy projection, rate limits, capacity, weighted assignment, real-paper restoration, and original spill regression tests.
5. `node --env-file=.env.local tests/letters-storage.mjs` — optional real-storage concurrency and idempotency test; removes only its own test records and refuses production.

The visual browser checks cover write/fold/send, Unicode limits, unsafe links, network-failure recovery, refresh persistence, and phone-sized/reduced-height layouts. A real mobile keyboard still merits on-device verification.
