<!-- Keep PRs focused and within package boundaries. -->

## Summary

<!-- What does this change do, and why? Link the sprint/issue. -->

## Affected packages

<!-- e.g. @vectorforge/geometry, @vectorforge/editor -->

## Type of change

- [ ] feat
- [ ] fix
- [ ] refactor
- [ ] perf
- [ ] docs / chore / test / ci / build

## Architecture checklist

- [ ] Changes stay within the allowed dependency boundaries (ENGINE_CONTRACT §6).
- [ ] No new circular dependencies; no React imported outside `ui`/`apps/web`.
- [ ] Document mutations (if any) go through commands.
- [ ] Public API changes go through the package's `src/index.ts`.
- [ ] If the dependency graph changed, ESLint + `check-boundaries` + the docs
      were all updated together.

## Test plan

<!-- Commands run and what they cover. New/updated tests? Coverage impact? -->

- [ ] `pnpm validate` passes locally.
