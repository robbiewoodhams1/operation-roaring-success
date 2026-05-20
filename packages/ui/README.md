# @roaring/ui

Shared React component library used by `@roaring/platform` and `@roaring/admin`. Building components here ensures visual consistency across apps and avoids duplicating UI code.

## Current Status

Scaffolded. The public API (`src/index.ts`) is a placeholder and will grow as common components are extracted from the apps.

## Planned Scope

- Primitive components (Button, Input, Modal, etc.)
- Layout components
- Design tokens / Tailwind theme extensions
- Any component used in more than one app

## Usage

```tsx
import { Button } from '@roaring/ui'
```

## Development

```bash
# Type check
pnpm --filter @roaring/ui type-check

# Lint
pnpm --filter @roaring/ui lint
```

## Notes

- Components are written in TypeScript/TSX
- Styling relies on TailwindCSS 4 — consuming apps must have Tailwind configured
- No bundler step yet; apps import source directly via TypeScript path resolution

## Dependencies

- `@roaring/config` — shared TypeScript and ESLint config
