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
