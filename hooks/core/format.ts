// Pure text formatting shared by the command's output and the pane.

import type { ScratchEntry } from '../../types'

const SIZE_UNITS = ['B', 'KB', 'MB', 'GB'] as const
const AGE_STEPS = [
  [86_400_000, 'd'],
  [3_600_000, 'h'],
  [60_000, 'm'],
] as const

export const formatSize = (bytes: number): string => {
  const power = Math.min(
    SIZE_UNITS.length - 1,
    Math.floor(Math.log(Math.max(bytes, 1)) / Math.log(1024)),
  )
  const value = bytes / 1024 ** power

  return `${power === 0 ? value : value.toFixed(1)} ${SIZE_UNITS[power]}`
}

export const formatAge = (ageMs: number): string => {
  const step = AGE_STEPS.find(([size]) => ageMs >= size)

  return step ? `${Math.floor(ageMs / step[0])}${step[1]} ago` : 'just now'
}

/** What a listing says after an entry's name: its size and age, each only when known. */
export const entryDetails = (entry: ScratchEntry, now: number): string[] => [
  ...(entry.size === null ? [] : [formatSize(entry.size)]),
  ...(entry.mtimeMs === null ? [] : [formatAge(now - entry.mtimeMs)]),
]

/** Keeps the end of a long text (a path's most telling part). */
export const shortenStart = (text: string, max: number): string =>
  text.length <= max ? text : `…${text.slice(-(max - 1))}`
