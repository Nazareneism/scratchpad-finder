// Feature 2: the /scratchpad command.
//   /scratchpad               open the pane and list the files
//   /scratchpad list          list the files
//   /scratchpad open [file]   open a file, or the folder
//   /scratchpad reveal [file] show a file (or the folder) in its folder
//   /scratchpad copy [file]   copy a file's (or the folder's) path

import type { CommandRunResult, EngineInterface } from 'claude-code'

import { entryDetails } from '../core/format'
import { joinPath } from '../core/paths'
import { copyPath, openPath, revealPath } from '../services/actions'
import { findEntry, refreshEntries } from '../services/entries'
import { locate } from '../services/locate'
import { openPane } from './pane'

export const COMMAND = 'scratchpad'
export const ARGUMENT_HINT = '[list|open|reveal|copy] [file]'

const VERBS = new Set(['', 'list', 'open', 'reveal', 'copy'])
const NOT_FOUND = 'No scratchpad found for this session yet. It appears once Claude saves a file there.'
const USAGE = `Usage: /${COMMAND} ${ARGUMENT_HINT}`

type Target = { path: string } | { error: string }

const parseArgs = (args: string): { verb: string; name: string } => {
  const [verb = '', ...rest] = args.trim().split(/\s+/).filter(Boolean)

  return { verb: verb.toLowerCase(), name: rest.join(' ') }
}

async function listText($: EngineInterface, dir: string): Promise<string> {
  const entries = await refreshEntries($)
  const now = await $.clock.now()
  const lines = entries.map(entry =>
    [`  ${entry.name}${entry.isDir ? '/' : ''}`, ...entryDetails(entry, now)].join('  '),
  )

  return [`Scratchpad: ${dir}`, ...(lines.length > 0 ? lines : ['  (empty)'])].join('\n')
}

/** The folder when no name is given, else the entry the name matches. */
async function resolveTarget($: EngineInterface, dir: string, name: string): Promise<Target> {
  if (name === '') return { path: dir }
  const entry = findEntry(await refreshEntries($), name)

  return entry ? { path: joinPath(dir, entry.name) } : { error: `No file matching "${name}" in ${dir}` }
}

async function runPathVerb($: EngineInterface, verb: string, path: string): Promise<string> {
  switch (verb) {
    case 'open':
      return openPath($, path)
    case 'reveal':
      return revealPath($, path)
    default:
      return copyPath($, path)
  }
}

async function runVerb($: EngineInterface, verb: string, dir: string, name: string): Promise<string> {
  if (verb === '') await openPane($)
  if (verb === '' || verb === 'list') return listText($, dir)

  const target = await resolveTarget($, dir, name)

  return 'error' in target ? target.error : runPathVerb($, verb, target.path)
}

export async function runCommand($: EngineInterface, args: string): Promise<CommandRunResult> {
  const { verb, name } = parseArgs(args)
  if (!VERBS.has(verb)) return { text: USAGE }

  const dir = await locate($)

  return { text: dir === null ? NOT_FOUND : await runVerb($, verb, dir, name) }
}
