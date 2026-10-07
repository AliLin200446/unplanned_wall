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

`GET /api/letters` exposes mailbox capacity, opaque IDs, and creation times for visible papers. Message bodies and links are retrieved individually on pickup; credentials and rate-limit metadata stay private. `POST` validates size, message, URL, and origin. It limits each daily-hashed network address to five new letters per hour, at least 15 seconds apart; no raw IP is stored. This is lightweight abuse protection, not bot-proofing. Reading requires selecting a physical letter; no feed or message list exists.

### Development and checks

1. `npm ci`
2. `vercel env pull .env.local --environment development` from the linked project (never commit this file).
3. `npm run dev` — serves the artwork and real API at `http://127.0.0.1:4173` using the private development collection.
4. `npm test` — validation, privacy projection, rate limits, capacity, weighted assignment, real-paper restoration, and original spill regression tests.
5. `node --env-file=.env.local tests/letters-storage.mjs` — optional real-storage concurrency and idempotency test; removes only its own test records and refuses production.

The visual browser checks cover write/fold/send, Unicode limits, unsafe links, network-failure recovery, refresh persistence, and phone-sized/reduced-height layouts. A real mobile keyboard still merits on-device verification.

## Open mail

Open a door and pick an exposed piece of real mail. It slides out into the foreground; **UNFOLD** opens the same two hinged folds used by the writing paper. **PUT BACK** refolds it and returns it behind the next reachable piece. Keyboard users can activate the spatial `Open letter` controls. Fallen letters remain selectable and return to their original mailbox. No record is deleted or reassigned by handling it.

The ID determines one of six restrained paper forms. Age changes tint slowly over six years. Session-only handling remembers order, tiny offsets, and bent folds. Closed compartments use shared low-detail quads; only reachable or fallen papers use detailed geometry. The approved exterior found-paper details remain, while open interiors hide the decorative mail and show the real visible records; an empty mailbox is dark. The original decorative spill no longer creates fake readable objects. Real papers use the existing physical sound and spill language.

Discovery metadata contains only IDs and creation times. Message text is fetched on pickup with `POST /api/letters` and `{ "action": "read", "id": "..." }`; it is not inserted into the accessible reading surface until unfolding. No permalink or indexed letter page exists. Text is inserted with `textContent`. Attached URLs are checked server-side and client-side, with `target="_blank" rel="noopener noreferrer"`.

Records support `status: "visible" | "hidden" | "pending"`. New letters default to visible; legacy records without a status remain visible. Hidden/pending/unknown statuses are excluded from metadata and content requests. Status changes require trusted server-side storage access; there is deliberately no public moderation mutation endpoint or moderation UI. This is moderation support, not automatic content screening.

`node --env-file=.env.local scripts/seed-reading.mjs` adds real development fixtures for empty, 1-, 5-, 12-, and 21-letter cases plus hidden/pending records. It refuses production, preserves existing records, and does not seed the public wall. Run `npm test` for moderation, deterministic forms, front-only reachability, session rearrangement, LOD, spill/return identity, and existing sending regressions.
