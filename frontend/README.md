# SIGA Registry frontend foundation

This is Milestone 1 of a frontend-only prototype for an establishment management and reference system. It uses React, TypeScript, Vite, React Router, and Tailwind CSS.

## Important prototype limits

Every establishment, person, contact detail, category, status, and date shown in this UI is fictional sample data. Authentication, role enforcement, review decisions, uploads, saving, and persistence are deliberately simulated only. This app must not be treated as a secure or production registry until a backend is designed and implemented.

## Run locally

```bash
cd frontend
npm install
npm run dev
```

The development server prints its local URL (normally `http://localhost:5173`).

## Quality checks

```bash
npm test
npm run build
```

## Project layout

- `src/pages/` — routed public, staff, administrator, and sign-in views.
- `src/components/` — shared layout, cards, badges, and simulation notice components.
- `src/data/mockData.ts` — clearly fictional records and configurable category options.
- `src/test/` — basic route and directory UI tests.

## Routes

- `/` — public landing page
- `/directory` — searchable and filterable fictional directory
- `/establishments/:slug` — fictional establishment detail page
- `/staff/dashboard` — simulated staff overview
- `/staff/records/new` and `/staff/records/:recordId/edit` — validated local form UI
- `/admin/review` — simulated revision review
- `/sign-in` — non-functional authentication UI
