# SIGA Registry frontend

This React, TypeScript, Vite, React Router, and Tailwind CSS frontend presents an independent demonstration of a searchable establishment-information directory and an in-memory staff workflow.

## Demonstration limits

The seeded establishment profiles use a selected set of publicly sourced names, categories, descriptions, websites, and business contacts. They do **not** constitute a complete, certified, or official SIGA directory, and this application is not an official SIGA service. The category and detail-source register is in [../docs/entity-sources.md](../docs/entity-sources.md).

Authentication, role enforcement, review decisions, uploads, saving, and persistence remain simulated. The shared React state resets to the original seed data after a browser refresh. This frontend does not use an API, database, `localStorage`, or `sessionStorage`.

## Run locally

```bash
cd frontend
npm install
npm run dev
```

The development server prints its local URL (normally `http://localhost:5173`).

## Quality checks

```bash
npm run lint
npm test
npm run build
```

## Project layout

- `src/pages/` — routed public, staff, administrator, and sign-in views.
- `src/components/` — shared layout, cards, badges, and the demonstration notice.
- `src/data/mockData.ts` — selected, publicly sourced seed profiles and category options.
- `src/state/` — shared in-memory registry and workflow state.
- `src/test/` — route, directory, workflow, and validation coverage.

## Routes

- `/` — public landing page
- `/directory` — searchable and filterable establishment directory
- `/establishments/:slug` — public establishment detail page
- `/staff/dashboard` — simulated staff overview
- `/staff/records/new` and `/staff/records/:recordId/edit` — validated local form UI
- `/admin/review` — simulated review workflow
- `/sign-in` — non-functional sign-in UI
