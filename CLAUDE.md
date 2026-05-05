# PersonaGraph — Execution Rules for Claude

These rules govern any AI-assisted contribution to this repository. They are
authoritative and supersede default agent behavior.

## 1. Always ask permission before implementing code changes

Before writing or modifying any source file, describe — in plain language —
exactly what is going to be changed and why, and wait for explicit approval.
This applies to every change, no matter how small.

## 2. Push to `main` only

All commits go to the `main` branch. Do not create new branches, do not push
to feature branches, and do not open pull requests unless the user explicitly
requests it.

## 3. Modular source layout

All application code lives under `src/` and is split into small,
single-responsibility files. Group by concern (`state/`, `graph/`,
`components/`, `io/`, `data/`, `styles/`). Avoid mega-files.

## 4. Inline explainer comments

Every functionally separate part of the code (a function, a hook, a non-trivial
block) must carry a short comment explaining:

- what this part does, and
- any caveats, edge cases, or known issues a future reader should be aware of.

Comments should be brief and reference the *why*, not restate the code.
