# @roaring/config

Shared configuration package for the monorepo. Every app and package in `operation-roaring-success` pulls its TypeScript config, ESLint rules, and environment validation from here.

## What's Inside

### TypeScript Configs

Three composable tsconfig presets:

| Export                             | File                    | Use for                                     |
| ---------------------------------- | ----------------------- | ------------------------------------------- |
| `@roaring/config/tsconfig`         | `tsconfig/base.json`    | Base — inherited by the others              |
| `@roaring/config/tsconfig/nextjs`  | `tsconfig/nextjs.json`  | Next.js apps (DOM libs, `@/*` path alias)   |
| `@roaring/config/tsconfig/package` | `tsconfig/package.json` | Library packages (sets `outDir`, `rootDir`) |

Usage in a `tsconfig.json`:

```json
{
  "extends": "@roaring/config/tsconfig/nextjs",
  "include": ["**/*.ts", "**/*.tsx"]
}
```

### ESLint Config

A flat-config ESLint setup with TypeScript ESLint rules pre-configured:

```js
// eslint.config.js
import baseConfig from '@roaring/config/eslint'
export default [...baseConfig]
```

Key rules: `no-unused-vars`, `no-explicit-any`, `consistent-type-imports`.

### Environment Validation

`@roaring/config/env` exports `createEnv()` — a thin wrapper around Zod for validating `process.env` at startup. Pass a Zod schema; get back a typed config object or a thrown error if validation fails.

```ts
import { createEnv } from '@roaring/config/env'
import { z } from 'zod'

export const env = createEnv({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
})
```

## Dependencies

- `zod` — schema validation for `createEnv`
- `typescript` — peer dep for tsconfig presets
