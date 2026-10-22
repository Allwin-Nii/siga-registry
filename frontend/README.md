# SIGA Registry frontend

This React, TypeScript, Vite, React Router, and Tailwind CSS frontend presents a public establishment-information directory backed by the read-only SIGA Registry API.

## Demonstration limits

The public directory, homepage statistics, category links, and establishment details use only the anonymous published-record API. They do **not** constitute a complete, certified, or official SIGA directory, and this application is not an official SIGA service. The category and detail-source register for the remaining preview fixtures is in [../docs/entity-sources.md](../docs/entity-sources.md).

The temporary staff and administrator pages remain local previews. Their actions use in-memory demonstration state, reset after refresh, and are not saved to MySQL or reflected in the public directory. Administrator API integration is intentionally out of scope for this milestone.

## Run locally

```bash
cd frontend
npm install
npm run dev
```

Copy `.env.example` to `.env` to override the local API address when needed:

```bash
VITE_PUBLIC_API_BASE_URL=http://localhost:3001/api
```

The default is `http://localhost:3001/api`. This is a public, anonymous client: it uses `GET` requests only and omits browser credentials.

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
- `src/api/` — typed anonymous API client and request-state hook.
- `src/data/mockData.ts` — local fixtures retained only for temporary staff/admin previews.
- `src/state/` — shared in-memory state for temporary staff/admin previews.
- `src/test/` — API-mocked public-route, workflow, and validation coverage.

## Routes

- `/` — public landing page
- `/directory` — searchable and filterable establishment directory
- `/establishments/:slug` — public establishment detail page
- `/staff/dashboard` — simulated staff overview
- `/staff/records/new` and `/staff/records/:recordId/edit` — validated local form UI
- `/admin/review` — simulated review workflow
- `/sign-in` — non-functional sign-in UI
