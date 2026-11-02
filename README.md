# SIGA Registry

SIGA Registry is a Specified Entity management and reference system under staged development.

## Current milestone

Milestone 4, Step 2 connects the React administrator workspace in [`frontend/`](frontend/README.md) to the existing Express/MySQL administrator API. Public homepage, directory, and entity-detail routes remain anonymous and show published records only. The administrator area uses the server's cookie session and CSRF protections for live entity management. The three fixed categories remain available as read-only data for entity selection and public filtering. Existing technical API routes retain their `establishments` naming for compatibility.

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
