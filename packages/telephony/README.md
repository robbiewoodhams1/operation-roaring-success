# @roaring/telephony

Telephony integration for the platform — outbound/inbound calling, SMS, and any related communication workflows. Keeping this in a dedicated package means both apps can share the same integration without duplicating configuration or client setup.

## Current Status

Scaffolded. The public API (`src/index.ts`) is a placeholder and will grow as the telephony provider is chosen and integrated.

## Planned Scope

- Telephony provider client setup (e.g. Twilio, Telnyx)
- Outbound call initiation helpers
- Inbound call webhook handling utilities
- SMS send/receive helpers
- Call status and event types

## Usage

```ts
import {} from '@roaring/telephony'
```

## Development

```bash
# Type check
pnpm --filter @roaring/telephony type-check

# Lint
pnpm --filter @roaring/telephony lint
```

## Dependencies

- `@roaring/config` — shared TypeScript and ESLint config
