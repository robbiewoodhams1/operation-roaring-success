# @roaring/algorithms

Business logic and algorithms used by the platform. Centralising these here keeps core logic testable in isolation, independent of any framework or UI layer.

## Current Status

Scaffolded. The public API (`src/index.ts`) is a placeholder and will grow as domain logic is extracted from the apps.

## Planned Scope

- Target-scoring and ranking algorithms
- Data processing helpers
- Domain-specific calculations that need to be shared between `@roaring/platform` and `@roaring/admin`

## Usage

```ts
import {} from '@roaring/algorithms'
```

## Development

```bash
# Type check
pnpm --filter @roaring/algorithms type-check

# Lint
pnpm --filter @roaring/algorithms lint
```

## Dependencies

- `@roaring/config` — shared TypeScript and ESLint config
