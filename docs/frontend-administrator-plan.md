# Frontend administrator integration

Milestone 4, Step 2 replaces the routeable administrator previews with an API-backed administrator workspace. The backend remains the authorization authority; the frontend only provides the authenticated user experience.

## Delivered routes

- `/`, `/directory`, and `/establishments/:slug` remain public and anonymous.
- `/admin/login` uses `POST /api/admin/auth/login` and redirects a successful administrator to the requested protected route or `/admin`.
- `/admin` loads live establishment and category totals.
- `/admin/establishments`, `/admin/establishments/new`, and `/admin/establishments/:id/edit` manage records through the protected administrator API, including publication and confirmed deletion.
- `/admin/categories` manages categories and reports referential-integrity deletion failures safely.
- `/sign-in`, `/staff/*`, and `/admin/review` redirect away from the old local-only simulation routes.

## Session and request security

`AdminAuthProvider` restores the administrator with `GET /api/admin/auth/session`, treats `401` as logged out, and keeps session information and the CSRF value only in React memory. It does not use localStorage or sessionStorage.

Administrator mutations use `credentials: 'include'` and send the in-memory CSRF value in `X-CSRF-Token`. The browser sets the Origin header; the client does not attempt to forge it. The backend validates the allowed Origin, cookie/header CSRF match, stored CSRF hash, and administrator session for every protected mutation.

The `siga_admin_session` cookie stays `HttpOnly` and scoped to `/api`. The intentionally non-HttpOnly `siga_admin_csrf` cookie is scoped to `/` so the React app can read it after login or session restoration. Existing `SameSite`, `Secure`, server-side CSRF validation, and administrator authorization protections remain in force.

## Out of scope

Legacy mock-data components remain in source for a later cleanup, but are no longer routable and do not imply MySQL persistence. Data imports, migrations, account creation, and any administrator-route changes remain separately authorized work.
