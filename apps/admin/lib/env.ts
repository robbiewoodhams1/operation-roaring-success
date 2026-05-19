import { createEnv } from '@roaring/config/env'
import { z } from 'zod'

export const env = createEnv(
  z.object({
    NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
    NEXT_PUBLIC_APP_URL: z.url().default('http://localhost:3001'),
  })
)
