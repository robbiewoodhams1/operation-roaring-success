/**
 * Schema fingerprints: `kind|name|md5` lines produced by
 * packages/db-tools/scripts/schema-fingerprint.sql. Comparing two of them shows
 * which tables, functions and enums differ between environments without
 * reading any row data.
 */
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
export const DB_DIR = path.resolve(HERE, '..', '..')
export const ROOT = path.resolve(DB_DIR, '..', '..')
export const FINGERPRINT_SQL = path.join(DB_DIR, 'scripts', 'schema-fingerprint.sql')
export const FINGERPRINT_DIR = path.join(DB_DIR, 'fingerprints')
export const MIGRATIONS_DIR = path.join(ROOT, 'supabase', 'migrations')

export type Fingerprint = Map<string, string>

export function fingerprintQuery(): string {
  return readFileSync(FINGERPRINT_SQL, 'utf8')
}

export function fromRows(rows: { kind: string; name: string; hash: string }[]): Fingerprint {
  return new Map(rows.map((r) => [`${r.kind}|${r.name}`, r.hash]))
}

export function parseFingerprint(text: string): Fingerprint {
  const map: Fingerprint = new Map()
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    const cut = line.lastIndexOf('|')
    if (cut < 0) throw new Error(`malformed fingerprint line: ${line}`)
    map.set(line.slice(0, cut), line.slice(cut + 1))
  }
  return map
}

export function formatFingerprint(fp: Fingerprint): string {
  return [...fp.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, h]) => `${k}|${h}`)
    .join('\n')
}

export interface FingerprintDiff {
  onlyLeft: string[]
  onlyRight: string[]
  changed: string[]
}

export function diffFingerprints(left: Fingerprint, right: Fingerprint): FingerprintDiff {
  const onlyLeft = [...left.keys()].filter((k) => !right.has(k)).sort()
  const onlyRight = [...right.keys()].filter((k) => !left.has(k)).sort()
  const changed = [...left.keys()]
    .filter((k) => right.has(k) && right.get(k) !== left.get(k))
    .sort()
  return { onlyLeft, onlyRight, changed }
}

export function isIdentical(d: FingerprintDiff): boolean {
  return !d.onlyLeft.length && !d.onlyRight.length && !d.changed.length
}

export function printDiff(d: FingerprintDiff, leftName: string, rightName: string): void {
  if (isIdentical(d)) {
    console.log(`  identical: ${leftName} and ${rightName} have the same app schema`)
    return
  }
  for (const k of d.onlyLeft) console.log(`  only in ${leftName}:  ${k}`)
  for (const k of d.onlyRight) console.log(`  only in ${rightName}: ${k}`)
  for (const k of d.changed) console.log(`  differs:           ${k}`)
}
