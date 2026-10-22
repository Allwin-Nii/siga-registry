# SIGA Registry backend

The SIGA Registry backend is a Node.js, Express, TypeScript, and MySQL 8 API. Public directory content is read-only and available without authentication. Administrator authentication is required for every change to establishments or categories.

The React frontend is intentionally not connected or changed in this milestone. Its current preview staff/review screens are documented for replacement in [`../docs/frontend-administrator-plan.md`](../docs/frontend-administrator-plan.md).

## Setup

1. Copy `.env.example` to `.env` and use a dedicated, least-privilege MySQL application account.
2. Review the migrations, including `database/migrations/002_administrator_auth.sql`. Migrations are never executed automatically.
3. Install dependencies and run the API:

```powershell
cd C:\Users\User\Documents\siga-registry\backend
npm install
npm run dev
```

Keep `.env` private. It is ignored by Git. Never place credentials in source code, command history, browser requests, or logs.

## Environment variables

| Variable | Purpose |
| --- | --- |
| `PORT` | API port; defaults to `3001`. |
| `CORS_ORIGIN` | Exact allowed frontend origin, for example `http://localhost:5173`; no path. |
| `NODE_ENV` | `development`, `test`, or `production`; defaults to `development`. |
| `SESSION_TTL_HOURS` | Administrator session lifetime, from 1 to 168 hours; defaults to `8`. |
| `COOKIE_SECURE` | `true` for HTTPS-only session cookies. Defaults to `true` in production. |
| `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_USER`, `DATABASE_PASSWORD`, `DATABASE_NAME` | MySQL connection settings. `DATABASE_NAME` must be `siga_registry`. |

For production, serve the API over HTTPS, set `NODE_ENV=production`, set `COOKIE_SECURE=true`, and configure the exact HTTPS frontend origin in `CORS_ORIGIN`.

## Database migrations

`001_initial_schema.sql` creates the established `categories` and `establishments` schema. `002_administrator_auth.sql` is additive: it creates only `administrators` and `administrator_sessions`. It does not alter or remove establishment columns, category records, or legacy workflow enum values.

Run reviewed migrations manually with an authorized administrative MySQL account. Do not run them with the runtime application account and do not run them automatically from the API:

```powershell
Get-Content -Raw .\database\migrations\002_administrator_auth.sql |
  mysql --host=$env:DATABASE_HOST --port=$env:DATABASE_PORT --user=ADMINISTRATOR_ACCOUNT --password siga_registry
```

Before execution, verify the existing database and check for conflicting pre-existing `administrators` or `administrator_sessions` tables. `CREATE TABLE IF NOT EXISTS` avoids destructive replacement but does not validate a conflicting table definition.

The application account needs `SELECT`, `INSERT`, `UPDATE`, and `DELETE` on `siga_registry.categories`, `siga_registry.establishments`, `siga_registry.administrators`, and `siga_registry.administrator_sessions`. Schema migration privileges remain separate and should be held only by the authorized migration account.

## Create the first administrator

After migration `002` has been reviewed and executed, create an administrator manually. There is no public registration endpoint and no default account.

```powershell
cd C:\Users\User\Documents\siga-registry\backend
npm run create-admin -- --email administrator@example.test
```

The CLI prompts twice for a hidden password; it requires a 12–128 character password and never accepts a password command-line argument. It stores only an scrypt password hash. It prints only the administrator email after success—never the password, password hash, session token, or CSRF token.

## Public API

No login is required for these routes. They never redirect visitors to a login page.

| Method | Endpoint | Behavior |
| --- | --- | --- |
| `GET` | `/api/health` | API and database availability. |
| `GET` | `/api/categories` | MySQL-backed public category list. |
| `GET` | `/api/establishments` | Published-only directory. |
| `GET` | `/api/establishments/:slug` | One published establishment. |

`GET /api/establishments` supports `search` (case-insensitive partial name match), `category` (`SOE`, `JVC`, or `OSE`, case-insensitive), `page`, and `pageSize`. Search and category filters combine; result ordering is deterministic. Empty directory results are valid until verified records are deliberately imported into MySQL.

Public responses contain the six approved establishment fields—name, website URL, category, email, contact number, and brief description—plus only ID/slug identifiers needed for routing. They never reveal review feedback, workflow history, or unpublished records. Missing and unpublished detail records both return `404`.

## Administrator API

There is no public registration, staff submission, review, or role-header API. An authenticated administrator session is required for all `/api/admin/*` routes except login.

| Method | Endpoint | Access |
| --- | --- | --- |
| `POST` | `/api/admin/auth/login` | Exact allowed Origin required; sets cookies on valid credentials. |
| `GET` | `/api/admin/auth/session` | Authenticated administrator. |
| `POST` | `/api/admin/auth/logout` | Authenticated administrator + Origin + CSRF. |
| `GET` | `/api/admin/establishments` | Authenticated administrator; accepts `status`, `page`, `pageSize`. |
| `POST` | `/api/admin/establishments` | Protected create using the six fields; optional `published` boolean. |
| `PATCH` | `/api/admin/establishments/:id` | Protected update of the six fields; optional `published` boolean. |
| `PATCH` | `/api/admin/establishments/:id/publication` | Protected direct publish/unpublish with `{ "published": true | false }`. |
| `DELETE` | `/api/admin/establishments/:id` | Protected delete. |
| `GET` | `/api/admin/categories` | Authenticated administrator. |
| `POST` | `/api/admin/categories` | Protected category create. |
| `PATCH` | `/api/admin/categories/:id` | Protected category update. |
| `DELETE` | `/api/admin/categories/:id` | Protected category delete if no establishment references it. |

Administrator establishment changes use direct publication state: `published` for public visibility and `draft` when hidden. The legacy `pending_review`, `changes_requested`, and `rejected` enum values and metadata remain intact for database compatibility, but the new administrator API exposes no staff submission or review action.

### Authenticated request protection

Successful login sets two cookies with intentionally different paths:

- `siga_admin_session`: random session secret, scoped to `/api`, `HttpOnly`, `SameSite=Strict`, and `Secure` when configured. Only its SHA-256 hash is stored in MySQL.
- `siga_admin_csrf`: random CSRF value, scoped to `/`, `SameSite=Strict`, and `Secure` when configured. Its hash is stored with the session; it is intentionally not `HttpOnly` so the administrator frontend can copy it to a request header.

Every authenticated modification must include browser credentials, the exact `Origin` equal to `CORS_ORIGIN`, and an `X-CSRF-Token` header equal to the `siga_admin_csrf` cookie. The server validates both the cookie/header match and the stored CSRF hash. CORS permits credentials only from `CORS_ORIGIN`.

Example protected request shape (shown with placeholder values only):

```http
PATCH /api/admin/establishments/42/publication HTTP/1.1
Origin: https://registry.example.test
Cookie: siga_admin_session=[HttpOnly browser cookie]; siga_admin_csrf=[csrf value]
X-CSRF-Token: [csrf value]
Content-Type: application/json

{ "published": true }
```

## Security decisions

- Passwords are hashed with Node.js scrypt using a random salt and fixed memory-cost parameters; plaintext passwords are never stored or logged.
- Administrator sessions and CSRF values are random 256-bit secrets. The database retains only SHA-256 hashes.
- SQL uses parameterized queries, including directory filters and all administrator mutations.
- All six establishment fields, publication flags, category fields, IDs, query parameters, and login inputs are validated server-side.
- Category deletion checks references in a transaction and the MySQL foreign key remains the final integrity safeguard.
- Authentication and authorization are enforced by the backend. Frontend visibility, role headers, or local state are not trusted.

## Error format

Errors use a safe envelope. Database details and credentials are never included.

```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "A valid CSRF token is required."
  }
}
```

Common status codes: `400` validation error, `401` missing/invalid administrator authentication, `403` invalid Origin or CSRF protection, `404` missing public resource, `409` duplicate or referential-integrity conflict, and `503` unavailable database.

## Verification

Tests use mocked repositories, services, and transactions. They do not connect to, migrate, or modify the actual `siga_registry` database.

```powershell
cd C:\Users\User\Documents\siga-registry\backend
npm run lint
npm test
npm run build
```

Coverage includes anonymous public access, administrator account creation/login/logout, cookie properties, authentication, Origin and CSRF rejection, administrator CRUD authorization, direct publication state, category reference protection, input validation, safe database failures, transactions, and SQL injection resistance.
