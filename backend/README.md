# SIGA Registry backend

The SIGA Registry API uses Node.js, Express, TypeScript, MySQL 8, `mysql2` promise pools, and `dotenv`. This is Milestone 3, Step 2: it provides public, database-backed read endpoints and internal establishment-management services. It does not yet provide authentication, role-based authorization, or public write/review endpoints.

## Setup

1. Copy `.env.example` to `.env` and supply the local MySQL application account values. Keep `.env` private; it is ignored by Git.
2. Confirm the `siga_registry` database exists and that the reviewed initial migration has been run by an authorized administrator. The API never runs migrations automatically.
3. Install dependencies and start the service:

```powershell
cd backend
npm install
npm run dev
```

The service validates environment variables before it starts. It creates a reusable MySQL pool, but the pool connects only when a route needs it.

## Environment variables

| Variable | Purpose |
| --- | --- |
| `PORT` | HTTP port; defaults to `3001` when omitted. |
| `CORS_ORIGIN` | Allowed React development origin, for example `http://localhost:5173`. |
| `DATABASE_HOST` | MySQL server hostname or address. |
| `DATABASE_PORT` | MySQL server port; defaults to `3306` when omitted. |
| `DATABASE_USER` | Dedicated application database user. |
| `DATABASE_PASSWORD` | Password for the application database user. |
| `DATABASE_NAME` | Must be `siga_registry`. |

Never commit credentials, place a password in source code, or include it in diagnostic output.

## Public endpoints

All successful resource responses use a `data` envelope. List responses also include a `meta` pagination object. Errors use `error.code` and a safe `error.message`.

### `GET /api/health`

Reports API and database availability without disclosing database configuration or errors.

```json
{
  "status": "ok",
  "api": "available",
  "database": "available"
}
```

### `GET /api/categories`

Retrieves the configured category records from MySQL. The initial migration supplies `SOE`, `JVC`, and `OSE`; category IDs mirror the frontend's lowercase identifiers.

```powershell
Invoke-RestMethod http://localhost:3001/api/categories
```

```json
{
  "data": [
    {
      "id": "soe",
      "code": "SOE",
      "name": "SOE",
      "description": "State-Owned Enterprise"
    }
  ]
}
```

### `GET /api/establishments`

Returns only records whose workflow status is `published`. It never includes review feedback, workflow status, or audit timestamps.

| Query parameter | Meaning |
| --- | --- |
| `search` | Optional case-insensitive partial name search, up to 120 characters. Literal `%`, `_`, and `!` characters are escaped. |
| `category` | Optional category code: `SOE`, `JVC`, or `OSE`, case-insensitive. |
| `page` | One-based page number; defaults to `1`, maximum `10000`. |
| `pageSize` | Results per page; defaults to `20`, maximum `100`. |

Search and category filters can be combined. Results are ordered deterministically by establishment name and then internal ID.

```powershell
Invoke-RestMethod 'http://localhost:3001/api/establishments?search=electricity&category=soe&page=1&pageSize=20'
```

```json
{
  "data": [
    {
      "id": "7",
      "slug": "electricity-company-of-ghana",
      "name": "Electricity Company of Ghana",
      "website": "https://ecg.com.gh/",
      "categoryId": "soe",
      "category": {
        "id": "soe",
        "code": "SOE",
        "name": "SOE",
        "description": "State-Owned Enterprise"
      },
      "email": "help@ecggh.com",
      "contactNumber": "+233 302 611 611",
      "summary": "Electricity distribution utility serving customers across southern Ghana."
    }
  ],
  "meta": {
    "page": 1,
    "pageSize": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

An empty `data` list is valid while the MySQL database has no deliberately imported published establishment records. The 12 verified frontend seed records remain frontend-only until a separate, reviewed import is authorized.

### `GET /api/establishments/:slug`

Retrieves one published establishment. The response contains the six approved information fields (name, website, category, email, contact number, and brief description), plus an ID and slug for identification/routing. Missing and unpublished records both return `404`, so the public API does not reveal workflow state.

```powershell
Invoke-RestMethod http://localhost:3001/api/establishments/electricity-company-of-ghana
```

### Error responses

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid query parameters.",
    "details": {
      "page": "Use a number between 1 and 10000."
    }
  }
}
```

| Status | Code | Meaning |
| --- | --- | --- |
| `400` | `VALIDATION_ERROR` | A route, query parameter, slug, or internal-service input is invalid. |
| `404` | `NOT_FOUND` | The requested public resource does not exist or is not published. |
| `409` | `CONFLICT` / `INVALID_WORKFLOW_TRANSITION` | An internal service encountered a duplicate or invalid state change. These are not yet public HTTP responses. |
| `503` | `DATABASE_UNAVAILABLE` | MySQL could not serve the request; database details are not exposed. |

## Internal workflow services

`EstablishmentManagementService` is reusable server-side business logic, not an HTTP API. It supports:

- creating a draft;
- updating a draft or changes-requested record;
- submitting `draft` or `changes_requested` records for review;
- approving, requesting changes to, or rejecting only `pending_review` records; and
- retrieving records for future staff and administrator dashboards.

It validates the same six establishment fields and lowercase category IDs used by the frontend model, resolves those IDs against configured MySQL category codes, normalizes input, handles duplicate names and slugs, and uses transactions for its multi-step operations. Required feedback is enforced for change requests and rejections.

No public routes exist for creation, update, submission, approval, rejection, or internal record lists. Client-provided roles and placeholder authentication are deliberately not accepted. A future milestone must add verified authentication and server-side role-based authorization before any of those operations can be exposed.

## Initial schema migration

Review [`database/migrations/001_initial_schema.sql`](database/migrations/001_initial_schema.sql) before executing it with an authorized administrative account. It assumes the `siga_registry` database already exists, does not create or drop the database, uses the established `categories` and `establishments` tables, and does not seed establishment records. This Step 2 implementation requires no additional schema migration.

## Testing and verification

The automated tests use mocked repositories, services, and transaction connections. They do not connect to or modify the user's `siga_registry` database.

```powershell
cd C:\Users\User\Documents\siga-registry\backend
npm run lint
npm test
npm run build
```

The test suite covers category retrieval, published directory/detail behavior, combined filters and pagination, safe database errors, query validation, SQL parameterization/injection resistance, duplicate records, transactions, and valid/invalid workflow transitions.
