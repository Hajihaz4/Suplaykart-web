# docs/

Project documentation for **Suplaykart**.

This folder is the single source of truth for *how* the system is designed and
operated. It holds written documentation only — no application code.

## What goes here

| Subfolder / file        | Purpose                                                        |
| ----------------------- | ------------------------------------------------------------- |
| `architecture/`         | High-level system design, diagrams, component boundaries.     |
| `adr/`                  | Architecture Decision Records (one file per significant call).|
| `api/`                  | API contracts (OpenAPI / REST specs, request–response shapes).|
| `data-model/`           | Database schema, ER diagrams, migration notes.                |
| `guides/`               | Setup, local dev, deployment, and onboarding guides.          |
| `product/`              | Requirements, user flows, scope, and roadmap.                 |

## Conventions

- Prefer Markdown (`.md`) for all written docs so they diff cleanly in Git.
- Diagrams: keep editable source (e.g. `.excalidraw`, Mermaid in Markdown) next
  to any exported image.
- One decision per ADR; never edit a past decision — supersede it with a new one.
