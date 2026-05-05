# PersonaGraph

An interactive personal sociograph. Node `[000-000]` is you, fixed at the
center; every other node is a person in your network. Edges encode three
independent visual axes — form (arrows / line / dotted), color (green /
grey / red), and lane count (1 / 2 / 3) — for relationship semantics.

Local-only web app. Runs on your machine via Vite.

## Run locally

```bash
npm install
npm run dev
```

Then open the URL Vite prints (default `http://localhost:5173`).

## Save / Load

- **Save JSON** opens the native folder picker (Chromium browsers via the
  File System Access API) so you choose where to save. Other browsers fall
  back to a regular download.
- **Load JSON** opens a file picker and replaces the current graph.

## Tech

React + Vite + Cytoscape.js. See `CLAUDE.md` for development rules.
