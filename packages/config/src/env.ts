import { z } from 'zod'

export function createEnv<T extends z.ZodRawShape>(schema: z.ZodObject<T>) {
  const parsed = schema.safeParse(process.env)

  if (!parsed.success) {
    console.error('❌ Invalid environment variables:')
    console.error(z.treeifyError(parsed.error))
    throw new Error('Invalid environment variables — check the logs above')
  }

  return parsed.data
}
