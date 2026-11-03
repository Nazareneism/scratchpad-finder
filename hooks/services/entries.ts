// Listing what the scratchpad holds, newest first.

import type { EngineInterface, FsEntry } from 'claude-code'

import type { ScratchEntry } from '../../types'
import { readDir, writeEntries } from './state'

const toEntry = (entry: FsEntry): ScratchEntry => ({
  name: entry.name,
  isDir: entry.kind === 'dir',
  size: entry.size,
  mtimeMs: entry.mtimeMs,
})

async function listEntries($: EngineInterface, dir: string): Promise<ScratchEntry[]> {
  const listed = await $.fs.list(dir).catch((): FsEntry[] => [])

  return listed.map(toEntry).sort((a, b) => b.mtimeMs - a.mtimeMs)
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
