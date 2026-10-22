# SIGA Registry frontend

This React, TypeScript, Vite, React Router, and Tailwind CSS frontend presents the public establishment-information directory and the protected SIGA Registry administrator workspace.

## Demonstration limits

The public directory, homepage statistics, category links, and establishment details use only the anonymous published-record API. They do **not** constitute a complete, certified, or official SIGA directory, and this application is not an official SIGA service. The category and detail-source register for retained historical fixtures is in [../docs/entity-sources.md](../docs/entity-sources.md).

The routable administrator workspace is API-backed: it manages establishments, publication state, and categories through protected administrator endpoints. Legacy mock-data and preview components remain in the source tree for now but are no longer exposed by the application routes and do not represent persisted actions.

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

The default is `http://localhost:3001/api`; do not hardcode a production address. Public requests are anonymous and omit browser credentials. Administrator requests use the same base URL with browser credentials included, so the configured backend `CORS_ORIGIN` must be the exact frontend origin.

Administrator login uses the server's `HttpOnly` session cookie, which remains scoped to `/api`. The readable `siga_admin_csrf` cookie is scoped to `/` so the React app can obtain its value after login/session restoration and retain it only in React memory for the `X-CSRF-Token` header. Neither passwords, session credentials, nor CSRF tokens are persisted in browser storage or logged.

The development server prints its local URL (normally `http://localhost:5173`).

## Quality checks

```bash
npm run lint
npm test
npm run build
```

## Project layout

- `src/pages/` — routed public and administrator views.
- `src/components/` — shared public and administrator layouts, cards, and badges.
- `src/api/` — typed public and administrator API clients plus public request-state hook.
- `src/state/AdminAuthProvider.tsx` — in-memory administrator session/CSRF state.
- `src/test/` — API-mocked public-route, administrator, and validation coverage.

## Routes

- `/` — public landing page
- `/directory` — searchable and filterable establishment directory
- `/establishments/:slug` — public establishment detail page
- `/admin/login` — administrator sign-in
- `/admin` — live administrator overview
- `/admin/establishments` — live establishment listing, publication, and deletion controls
- `/admin/establishments/new` — create an establishment
- `/admin/establishments/:id/edit` — edit an establishment
- `/admin/categories` — live category management

The legacy `/sign-in`, `/staff/*`, and `/admin/review` paths redirect to administrator sign-in or the administrator overview instead of exposing local-only workflows.
