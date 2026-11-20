# Prompt 02 — Safe Repository Scaffold

Prerequisite: founder has approved the stack and repository structure.

Create only the monorepo foundation:
- pnpm workspace.
- apps/web using Next.js App Router and strict TypeScript.
- apps/api using NestJS and strict TypeScript.
- packages/contracts for shared API schemas/types.
- packages/config for shared lint/TypeScript configuration.
- root scripts for dev, lint, typecheck, test and build.
- `.env.example` with names only and safe placeholder values.
- CI workflow for install, lint, typecheck, tests and build.
- basic health endpoint in API.
- basic web landing placeholder clearly marked as scaffold.

Do not implement marketplace features, authentication, payment logic or database migrations yet.
Do not overwrite existing files without inspecting and reporting the conflict.
Run all checks and report exact results.
