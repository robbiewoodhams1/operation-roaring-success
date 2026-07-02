import { unstable_cache } from 'next/cache'

export function cachedQuery<T>(
  keyParts: string[],
  tags: string[],
  fn: () => Promise<T>
): Promise<T> {
  return unstable_cache(fn, keyParts, { tags, revalidate: 3600 })()
}
