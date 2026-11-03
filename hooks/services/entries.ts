// Listing what the scratchpad holds, newest first.

import type { EngineInterface, FsEntry } from 'claude-code'

import type { ScratchEntry } from '../../types'
import { joinPath } from '../core/paths'
import { readDir, writeEntries } from './state'

// Newest first; an unknown time sorts last, whatever the known times are.
const byNewest = (a: ScratchEntry, b: ScratchEntry): number =>
  a.mtimeMs === null || b.mtimeMs === null
    ? Number(a.mtimeMs === null) - Number(b.mtimeMs === null)
    : b.mtimeMs - a.mtimeMs

/**
 * The listing reads a file's size and time in its one call, and gives 0 for
 * both on anything else, so a folder or link is stat'ed (links followed).
 * One that cannot be (gone since the listing, or unreadable) keeps null.
 */
async function describeEntry($: EngineInterface, dir: string, entry: FsEntry): Promise<ScratchEntry> {
  if (entry.kind === 'file') {
    return { name: entry.name, isDir: false, size: entry.size, mtimeMs: entry.mtimeMs }
  }

  const stat = await $.fs.stat(joinPath(dir, entry.name)).catch(() => undefined)
  if (stat === undefined) return { name: entry.name, isDir: entry.kind === 'dir', size: null, mtimeMs: null }

  return {
    name: entry.name,
    isDir: stat.kind === 'dir',
    size: stat.kind === 'file' ? stat.size : null,
    mtimeMs: stat.mtimeMs,
  }
}

async function listEntries($: EngineInterface, dir: string): Promise<ScratchEntry[]> {
  const listed = await $.fs.list(dir).catch((): FsEntry[] => [])
  const described = await Promise.all(listed.map(entry => describeEntry($, dir, entry)))

  return described.sort(byNewest)
}

/** Re-reads the folder and stores the list. */
export async function refreshEntries($: EngineInterface): Promise<readonly ScratchEntry[]> {
  const dir = await readDir($)
  if (dir === null) return []

  const fresh = await listEntries($, dir)
  await writeEntries($, fresh)

  return fresh
}

/** An exact name first, then the first name containing the text. */
export const findEntry = (
  entries: readonly ScratchEntry[],
  name: string,
): ScratchEntry | undefined => {
  const lower = name.toLowerCase()

  return (
    entries.find(entry => entry.name === name) ??
    entries.find(entry => entry.name.toLowerCase().includes(lower))
  )
}
