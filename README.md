# SIGA Registry

SIGA Registry is an establishment management and reference system under staged development.

## Current milestone

Milestone 2 completes the frontend prototype in [`frontend/`](frontend/README.md): a React, TypeScript, Vite, React Router, and Tailwind CSS establishment directory with fictional in-memory data.

Milestone 3, Step 1 adds the reviewed backend foundation in [`backend/`](backend/README.md): Node.js, Express, TypeScript, MySQL 8 configuration, a health endpoint, tests, and a manual initial-schema migration. It does not add authentication, CRUD endpoints, database execution, or frontend integration.

## Planned structure

```text
siga-registry/
├── frontend/   # React + TypeScript + Vite prototype
├── backend/    # Node.js + Express + MySQL backend foundation
├── docs/       # Reserved for documentation
├── .git/       # Existing repository
├── .gitignore
└── README.md
```
