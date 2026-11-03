// The session values the pane draws from. They live in $.state so a reload
// of the mod keeps them; their types are declared in types/index.d.ts.
// Every read and write goes through this file.

import { atom, read, update } from 'claude-code'
import type { EngineInterface } from 'claude-code'

import type { ScratchEntry } from '../../types'

const scratchDir = atom({ plugin: 'scratchpad-finder', key: 'dir' } as const, null)

// Change the shape tag when ScratchEntry's fields change: values an earlier
// version stored are then read as empty instead of in the wrong shape.
const scratchEntries = atom(
  { plugin: 'scratchpad-finder', key: 'entries' } as const,
  [],
  { shape: 'entries-1' },
)

const isSameList = (a: readonly ScratchEntry[], b: readonly ScratchEntry[]): boolean =>
  JSON.stringify(a) === JSON.stringify(b)

export function readDir($: EngineInterface): Promise<string | null> {
  return read($, scratchDir)
}

export function readEntries($: EngineInterface): Promise<readonly ScratchEntry[]> {
  return read($, scratchEntries)
}

/** Writes only on a change, so the pane redraws only when something moved. */
export async function writeDir($: EngineInterface, dir: string): Promise<void> {
  await update($, scratchDir, current => (current === dir ? current : dir))
}

export async function writeEntries($: EngineInterface, entries: ScratchEntry[]): Promise<void> {
  await update($, scratchEntries, current => (isSameList(current, entries) ? current : entries))
}
