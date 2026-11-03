// Finding the session's scratchpad folder. Two sources, so it works on every
// platform without guessing temp-folder layouts:
//   1. the system prompt, which names the folder for the model;
//   2. the path of a file Claude wrote there, as a fallback.

import type { EngineInterface } from 'claude-code'

import { findInPath, findInText, isInside } from '../core/paths'
import { readDir, writeDir } from './state'

// The prompt is asked once per load: its answer does not change mid-session.
let hasAskedPrompt = false

async function askPrompt($: EngineInterface): Promise<string | undefined> {
  hasAskedPrompt = true
  const { sections } = await $.prompt.compose()

  return findInText(sections.map(section => section.text).join('\n'))
}

async function remember($: EngineInterface, dir: string): Promise<string> {
  await writeDir($, dir)

  return dir
}

/** The scratchpad folder, or null while nothing has named it yet. */
export async function locate($: EngineInterface): Promise<string | null> {
  const known = await readDir($)
  if (known !== null || hasAskedPrompt) return known

  const found = await askPrompt($).catch(() => undefined)

  return found === undefined ? null : remember($, found)
}

/** The scratchpad folder a written path lies in, learning it if need be. */
export async function scratchDirOf($: EngineInterface, path: string): Promise<string | undefined> {
  const dir = (await locate($)) ?? findInPath(path)
  if (dir === undefined || !isInside(dir, path)) return undefined

  return remember($, dir)
}
