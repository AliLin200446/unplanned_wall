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

Overfilled real-mail compartments release bounded batches when fully open. Fallen and caught mail remain after closing, reopening, or reloading the page. The spill uses bounded, deterministic motion with lightweight contact handling; settled paper stops updating. Reduced-motion mode preserves the resulting state without the falling animation.

Run `node tests/spill.mjs` to verify release timing, cancellation, one-time behavior, accumulation, restoration, and reduced motion.

## People and their material

Each of the 15 mailboxes belongs to a stable prototype person. Ali Lin remains at 69-2 (mailbox `8`). Names are small secondary paper strips; the approved environment is unchanged. `dist/people.js` defines the identities. `server/directory.js` performs an idempotent, conditional-write migration: it preserves all existing letters, addresses, moderation and pin consent, adds prototype associations and trusted owner artifacts, and records `directoryVersion: 1`. Seed data is fictional prototype material, not professional claims. There is no public owner-content creation endpoint.

Ali has eight seeded objects: a visual print, interface sheet, contact sheet, personal note, three visitor letters and a mock collaboration envelope. Other people have deliberately unequal mixes, including link cards and a stapled notebook. Objects retain source (`OWNER`/`VISITOR`), media type and person/mailbox provenance. Original visual studies are rendered by `dist/artifact-art.js`; project links remain optional and validated.

Pick the exposed front object to inspect it. **LOOK UNDERNEATH** sets it aside in a held stack and exposes the next object. Only the front of that held stack is reachable. Closing a mailbox returns inspected material through its clearance corridor before closing the door. Owner prints/cards are read on their physical surface, while notes unfold as before.

## Send a letter

Open a person’s mailbox, then pick **LEAVE A NOTE** or **WORK TOGETHER** from the two loose stationery sheets. The paper identifies the fixed recipient and building address. Write up to 280 Unicode characters, optionally attach one http/https link, fold, then send. The folded sheet remains with you if delivery fails; retries reuse its delivery ID. The API validates the fixed recipient. A full mailbox refuses delivery rather than redirecting it. A confirmed save becomes a folded WebGL sheet, including after refresh. Crowded stacks can spill without deleting their records. The original found mail remains part of the approved environment.

### Storage and deployment

The static site still deploys from `dist/`. Vercel additionally runs `api/letters.js`; no frontend framework or build step is needed. `@vercel/blob` is the only server dependency. A **private** Vercel Blob store connected to the existing `unplanned_wall` project supplies `BLOB_READ_WRITE_TOKEN` server-side.

For this bounded MVP, one private document stores at most 24 letters per mailbox (360 total), plus short-lived rate-limit metadata. Uncached reads and conditional ETag writes make mailbox assignment, occupancy, idempotency, and rate limits one atomic operation. Conflicting writes retry with jitter; a full destination refuses new deliveries. No stored letters expire or get deleted when they spill. Production and development/preview use separate documents. Larger capacity or high write volume should migrate this small document store to a transactional database.

`GET /api/letters` exposes stable people, mailbox capacity and safe physical-object metadata for visible papers. Message bodies and links are retrieved individually on pickup; credentials and rate-limit metadata stay private. `POST` validates size, message, URL, and origin. It limits each daily-hashed network address to five new letters per hour, at least 15 seconds apart; no raw IP is stored. This is lightweight abuse protection, not bot-proofing. Reading requires selecting a physical letter; no feed or message list exists.

### Development and checks

1. `npm ci`
2. `vercel env pull .env.local --environment development` from the linked project (never commit this file).
3. `npm run dev` — serves the artwork and real API at `http://127.0.0.1:4173` using the private development collection.
4. `npm test` — validation, privacy projection, rate limits, capacity, recipient assignment, real-paper restoration, and original spill regression tests.
5. `node --env-file=.env.local tests/letters-storage.mjs` — optional real-storage concurrency and idempotency test; removes only its own test records and refuses production.

The visual browser checks cover write/fold/send, Unicode limits, unsafe links, network-failure recovery, refresh persistence, and phone-sized/reduced-height layouts. A real mobile keyboard still merits on-device verification.

## Open mail

Open a door and pick an exposed piece of real mail. It slides out into the foreground; **UNFOLD** opens the same two hinged folds used by the writing paper. **PUT BACK** refolds it and returns it to the exposed front of its stack. Keyboard users can activate the spatial `Open letter` controls. Fallen letters remain selectable and return to their original mailbox. No record is deleted or reassigned by handling it.

The ID determines one of six restrained paper forms. Age changes tint slowly over six years. Session-only handling remembers order, tiny offsets, and bent folds. Closed compartments use shared low-detail thin shells; only reachable or fallen papers use detailed geometry. The approved exterior found-paper details remain, while open interiors hide the decorative mail and show the real visible records; an empty mailbox is dark. The original decorative spill no longer creates fake readable objects. Real papers use the existing physical sound and spill language.

Discovery metadata contains IDs, dates, person/source/media identity, artwork keys and sealed/mock flags; it contains no visitor text, contact information or links. Message text is fetched on pickup with `POST /api/letters` and `{ "action": "read", "id": "..." }`; it is not inserted into the accessible reading surface until unfolding. No permalink or indexed letter page exists. Text is inserted with `textContent`. Attached URLs are checked server-side and client-side, with `target="_blank" rel="noopener noreferrer"`.

Records support `status: "visible" | "hidden" | "pending"`. New letters default to visible; legacy records without a status remain visible. Hidden/pending/unknown statuses are excluded from metadata and content requests. Status changes require trusted server-side storage access; there is deliberately no public moderation mutation endpoint or moderation UI. This is moderation support, not automatic content screening.

`node --env-file=.env.local scripts/seed-reading.mjs` adds real development fixtures for empty, 1-, 5-, 12-, and 21-letter cases plus hidden/pending records. It refuses production, preserves existing records, and does not seed the public wall. Run `npm test` for moderation, deterministic forms, front-only reachability, session rearrangement, LOD, spill/return identity, and existing sending regressions.

### Pinning permitted letters

The writing sheet defaults to **KEEP IN MAILBOX**. Only an explicit **MAY BE PINNED** stamp stores `allowPinToWall: true`; legacy letters remain ineligible. Reading an eligible letter exposes **PIN TO WALL**. The server checks consent and visibility inside the same conditional-write transaction as the move. Retried or concurrent moves reuse the existing placement.

Pinned letters keep their original record, message, creation date and mailbox provenance. Public metadata removes them from mailbox occupancy and includes only visible, consented wall records. Physical placement, rotation, layer and pin timestamp persist. The browser animates the held paper into place only after confirmation, then reconciles with storage. Failure leaves the letter available to retry or return.

The board has fixed bounds. Candidate placements favor less overlap and older layers; no placement may cover more than 12% of a letter pinned in the preceding 24 hours. When fresh paper fills the board, pinning waits for space to become eligible. Papers do not shrink. Age follows real elapsed years: subtle discoloration and curl, remnants after 12 years, and ghosts after 20 years. Records are retained, including covered and removed items. Moderation remains the existing visible/pending/hidden architecture, not an automated moderation service.

Pinned text is a paper texture in the WebGL scene. Activating a paper brings the camera closer while it remains attached; **STEP BACK** or Escape restores the wall view. Semantic controls expose the text and any safe attached link to assistive technology. The wall refreshes on visibility changes and periodically while idle so moderated items disappear.

### Paper collision integrity

`dist/paper-physics.js` defines compartment back/side/top/bottom/frame volumes, the slot boundaries, and a collider attached to each actual door pivot. Paper uses a closed 0.0022-unit shell, normal depth testing and depth writes. Interior transforms are fitted within conservative bounds; parallel depth layers keep stacks separated. Only the exposed front sheet can be extracted, and returned sheets settle at the front instead of passing through other letters.

Delivery follows an arc-length slot guide: flatten outside the structure, enter the horizontal opening, bend behind its lip, then descend in front of the stored stack. Extraction and return use validated whole-sheet clearance corridors. Spills clear their compartment before gravity-like motion starts; vertically aligned spill batches wait for each other, and a door waits while its exit corridor is occupied. Settled mail rests on the ground plane below the bank, with layered separation; old invalid session poses are migrated. The retired decorative spill trajectories are disabled in production. Found paper caught in slots remains constrained to the actual opening.

Development inspection: `PORT=4174 npm run dev`, then open `http://127.0.0.1:4174/?collisions`. The local-only `/__debug/paper-collisions.js` overlay shows 150 solid volumes, paper bounds, active/sleep counts and intersections. It is outside the production output directory and never imported on production hosts. Port 4173 remains the default when unused.

`npm test` includes all 15 compartments at 0/1/5/12/24 letters; opening, spills and rapid closure; settled and paper-to-paper contacts; finite triangle sizes under slot bending; and full-sheet extraction/return clearance. Geometry deformation is bounded; slot feeding cannot extend a sheet's indexed edges arbitrarily.

### Private collaboration letters

**WORK TOGETHER** accepts a message and one optional email/http(s) contact link. The server forces `sourceType: VISITOR`, `visibility: private`, `mediaType: COLLABORATION`, canonical person ID, and `allowPinToWall: false`; client overrides cannot make the message public. Known-ID read and pin requests reject private records. Wall projection independently excludes them. Delivery/list responses expose only the envelope’s safe physical metadata. Message/contact details remain in private Blob storage.

No authentication is implemented. Accordingly **nobody can read real collaboration messages through the public site**, including the owner until authenticated owner access is built. The writing paper explains this before sending. The seeded mock envelope demonstrates the form and stays sealed. Future owner access must authenticate the viewer and verify mailbox ownership server-side; never add a client-selected owner flag to the public read endpoint.

Public notes retain explicit KEEP IN MAILBOX / MAY BE PINNED consent and visible/pending/hidden moderation. Rate limiting, origin validation, sanitization, conditional writes, and retry identity include recipient, intent and contact. No messages are emailed or sent to an outside inbox.

Run `npm test` for directory migration, fixed-recipient capacity/replay, collaboration privacy, consent, moderation and mixed-media collision/handling regressions. `PORT=4279 npm run dev` is useful when the default port is occupied. Preview/development data remains separate from production.
