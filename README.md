# SIGA Registry

SIGA Registry is an establishment management and reference system under staged development.

## Current milestone

Milestone 4, Step 2 connects the React administrator workspace in [`frontend/`](frontend/README.md) to the existing Express/MySQL administrator API. Public homepage, directory, and establishment-detail routes remain anonymous and show published records only. The administrator area uses the server's cookie session and CSRF protections for live establishment and category management.

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
