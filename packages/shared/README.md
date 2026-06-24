# @vectorforge/shared

> Layer: **cross-cutting** · Implementation: foundational (grows across Sprints 1–4)

Cross-cutting primitives and **port interfaces** depended upon by every other
layer. This package is a dependency leaf: it must never import another
`@vectorforge/*` package.

## Responsibilities

- Stable id generation (`IdGenerator` port) and the injected clock (`IClock` port).
- The `Result<T, E>` type and assertion/invariant helpers.
- A typed event emitter used by the document and editor layers.
- Structured logger and other framework-agnostic utilities.
- Framework-agnostic **ports** that bridge layers without creating cycles
  (e.g. `IRenderer`, `DocumentRepository`), so consumers depend on contracts
  rather than concrete adapters.

## Public API

Everything is re-exported from [`src/index.ts`](./src/index.ts). Consumers
import from `@vectorforge/shared` only — never via deep paths.

## Dependency rules

|               |                              |
| ------------- | ---------------------------- |
| May import    | _nothing_ (`@vectorforge/*`) |
| Imported by   | all packages                 |
| React allowed | ❌ no                        |

See [docs/ENGINE_CONTRACT.md §6](../../docs/ENGINE_CONTRACT.md).
