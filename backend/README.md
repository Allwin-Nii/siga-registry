# SIGA Registry backend foundation

This is the Milestone 3, Step 1 foundation for the SIGA Registry API. It uses Node.js, Express, TypeScript, MySQL 8, `mysql2` promise pools, and `dotenv`.

It deliberately does **not** include authentication, user accounts, CRUD endpoints, automatic migration execution, or frontend integration.

## Setup

1. Copy `.env.example` to `.env` and replace the placeholders.
2. Create or obtain a dedicated MySQL application account with only the privileges it needs for `siga_registry`. Do not use the MySQL root account for the application.
3. Install dependencies and run the service:

```powershell
cd backend
npm install
npm run dev
```

The server starts only after its required environment variables pass validation. A database connection is not opened at startup; the reusable pool connects on demand.

## Environment variables

| Variable | Purpose |
| --- | --- |
| `PORT` | HTTP port; defaults to `3001` when omitted. |
| `CORS_ORIGIN` | Allowed React development origin, for example `http://localhost:5173`. |
| `DATABASE_HOST` | MySQL server hostname or address. |
| `DATABASE_PORT` | MySQL server port; defaults to `3306` when omitted. |
| `DATABASE_USER` | Dedicated application database user. |
| `DATABASE_PASSWORD` | Password for that application user. |
| `DATABASE_NAME` | Must be `siga_registry`. |

`.env` files are ignored by Git. Do not commit credentials or log them.

## Health endpoint

`GET /api/health` returns API availability without disclosing configuration details or database errors.

```json
{
  "status": "ok",
  "api": "available",
  "database": "available"
}
```

`database` is `not_checked` when no health probe is configured and `unavailable` when a configured MySQL probe cannot connect. API availability remains distinct from database connectivity.

## Initial schema migration

Review [`database/migrations/001_initial_schema.sql`](database/migrations/001_initial_schema.sql) before running it. It assumes the `siga_registry` database already exists, never creates or drops a database, uses `CREATE TABLE IF NOT EXISTS`, and does not seed establishment records.

After loading valid environment variables and confirming that the database exists, run it manually from PowerShell. `--password` deliberately prompts instead of placing a password in command history.

```powershell
Get-Content -Raw .\database\migrations\001_initial_schema.sql |
  mysql --host=$env:DATABASE_HOST --port=$env:DATABASE_PORT --user=$env:DATABASE_USER --password $env:DATABASE_NAME
```

Then verify the category seed and schema:

```sql
SELECT code, name, description FROM categories ORDER BY code;
SHOW CREATE TABLE establishments;
```

The migration idempotently seeds `SOE`, `JVC`, and `OSE`. It maps the frontend workflow labels to these database codes:

| Database code | Frontend label |
| --- | --- |
| `draft` | Draft |
| `pending_review` | Pending review |
| `published` | Published |
| `changes_requested` | Changes requested |
| `rejected` | Rejected |

The `establishments` table holds exactly the six establishment information fields: `name`, `website_url`, `category_id`, `email`, `contact_number`, and `summary`. Its other fields support identifiers and workflow audit timestamps.

Future staff and administrator roles should be introduced in a separate migration with a `users` table and nullable foreign keys such as `establishments.created_by_user_id`. This keeps existing establishment rows valid while ownership is added.

## Verification

```powershell
npm run lint
npm test
npm run build
```

The unit tests do not require a live MySQL server. They verify configuration validation, pool creation without a connection, application initialization, and health responses.
