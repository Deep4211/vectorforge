# Contributing to VectorForge

Thanks for contributing. VectorForge is a long-lived, layered codebase; these
rules keep it maintainable for years. The architecture is enforced
mechanically — CI will reject violations — so following this guide keeps your PR
green.

## Prerequisites

- Node `>= 20` (`nvm use` reads [`.nvmrc`](./.nvmrc)).
- pnpm `>= 10` (`corepack enable`).
- Install hooks and deps: `pnpm install` (Husky installs the git hooks via the
  `prepare` script).

## Workflow

1. **Branch** off `main` (`feat/…`, `fix/…`, `chore/…`).
2. **Build within boundaries.** Read [docs/ENGINE_CONTRACT.md](./docs/ENGINE_CONTRACT.md)
   before touching package dependencies. Decide which package your change
   belongs in:
   - Math → `geometry`. Document/scene-graph → `document`. Mutations → `commands`.
   - Editor orchestration/state → `editor`. Pixels → `renderer`. Storage →
     `persistence`. React chrome → `ui`. Wiring → `apps/web`.
3. **Test first for domain logic.** Add tests in the package's `tests/` dir;
   keep `geometry`/`document`/`commands`/`editor` at ≥ 80% coverage.
4. **Validate locally:** `pnpm validate` (CI parity).
5. **Open a PR** using the template; describe the change and its test plan.

## The rules that CI enforces

- **No illegal dependencies.** A package may import only its allowed set
  (ENGINE_CONTRACT §6). `pnpm check:boundaries` and ESLint enforce this.
- **No circular dependencies.** The internal graph must stay acyclic.
- **No React in the core.** Only `@vectorforge/ui` and `apps/web` may import
  React. The editor engine is framework-independent.
- **No business logic in React components.** It belongs in `editor`/`commands`.
- **Mutations via commands only.** Never mutate the document model directly.
- **Public API only.** Import packages via `@vectorforge/<pkg>`, never deep
  paths into another package's `src`.

## Commit messages — Conventional Commits

Enforced by commitlint on the `commit-msg` hook.

```
<type>(<optional-scope>): <subject>
```

Types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `perf`, `ci`,
`build`, `style`, `revert`. Scope is kebab-case (e.g. `feat(geometry): …`).
Subject is lower-case, imperative, no trailing period.

## Code style

- TypeScript strict; prefer immutable data (return new objects, don't mutate).
- Many small, focused files (200–400 lines typical).
- Formatting is automatic (Prettier via lint-staged on commit) — don't hand-format.

## Changing the dependency graph

If a change legitimately requires a new edge in the dependency DAG, update **all
three enforced locations together**: the table in `docs/ENGINE_CONTRACT.md §6.1`,
the `ALLOWED_DEPS` map in `eslint.config.js`, and the `ALLOWED_DEPS` map in
`scripts/check-boundaries.mjs`. A PR that updates only some of these will fail
CI. (`ARCHITECTURE.md §3.2` is the forward-looking blueprint — keep it broadly
consistent, but it is not part of the byte-exact enforced set.)
