// Feature 5: a side pane listing the scratchpad's files, newest first, each
// with Open, Show in folder and Copy path. Every button reports what it did
// as a toast.

import type { EngineInterface, Hook, RenderElement, RenderInput } from 'claude-code'

import type { ScratchEntry } from '../../types'
import { entryDetails, shortenStart } from '../core/format'
import { joinPath } from '../core/paths'
import { copyPath, openPath, revealPath } from '../services/actions'
import { refreshEntries } from '../services/entries'
import { readDir, readEntries } from '../services/state'

const PANE = 'scratchpad-finder'
const TITLE = 'Scratchpad'
const ROWS_PER_ENTRY = 2
// The path, the folder's actions and the gap before the list (the pane's
// bodyRows already leaves out the engine's frame).
const HEADER_ROWS = 3
// Claude Code's own look: facts and actions joined by a middle dot, and a
// row's actions on a dim ⎿ line beneath it, as a tool call's result is.
const SEP = ' · '
const BRANCH = '⎿'

export async function openPane($: EngineInterface): Promise<void> {
  await refreshEntries($).catch(() => undefined)
  await $.ui.open({ id: PANE, title: TITLE })
}

const describe = (entry: ScratchEntry, now: number): string => entryDetails(entry, now).join(SEP)

const fitting = (entries: readonly ScratchEntry[], rows: number) => {
  const room = Math.max(1, Math.floor((rows - HEADER_ROWS) / ROWS_PER_ENTRY))

  return { shown: entries.slice(0, room), hidden: Math.max(0, entries.length - room) }
}

type RenderHook = Hook<'ui.render'>

// Sized by the pane's own body, not e.viewport: that is the whole surface,
// so a path cut to its width still wrapped inside the narrower pane.
export async function renderPane($: Parameters<RenderHook>[0], e: RenderInput<'Pane'>): Promise<RenderElement> {
  const { Box, Button, Text } = $.ui.resolve(e)
  const dir = await readDir($)
  const columns = Math.max(2, e.props.bodyColumns)

  if (dir === null) {
    return <Text dimColor>No scratchpad yet. It appears once Claude saves a file there.</Text>
  }

  const entries = await readEntries($)
  const now = await $.clock.now()
  const { shown, hidden } = fitting(entries, e.props.scroll.bodyRows)
  const say = (work: () => Promise<string>) => async () => $.ui.toast(await work())
  // Secondary controls: dim at rest, full strength under the focus or pointer.
  const action = (key: string, label: string, work: () => Promise<string>) => (
    <Button plain dimColor key={key} label={label} onPress={say(work)} />
  )
  const actions = (key: string, path: string) => (
    <Box flexDirection="row">
      {action(`open:${key}`, 'Open', () => openPath($, path))}
      <Text dimColor>{SEP}</Text>
      {action(`reveal:${key}`, 'Show in folder', () => revealPath($, path))}
      <Text dimColor>{SEP}</Text>
      {action(`copy:${key}`, 'Copy path', () => copyPath($, path, e.surface))}
    </Box>
  )
  const row = (entry: ScratchEntry) => {
    const details = describe(entry, now)

    return (
      <Box flexDirection="column">
        <Box flexDirection="row" columnGap="md">
          <Text weight="semibold">{entry.isDir ? `${entry.name}/` : entry.name}</Text>
          {details !== '' && <Text dimColor>{details}</Text>}
        </Box>
        <Box flexDirection="row" paddingLeft="md" columnGap="md">
          <Text dimColor>{BRANCH}</Text>
          {actions(entry.name, joinPath(dir, entry.name))}
        </Box>
      </Box>
    )
  }

  return (
    <Box flexDirection="column">
      <Text dimColor>{shortenStart(dir, columns)}</Text>
      <Box flexDirection="row">
        {actions('/', dir)}
        <Text dimColor>{SEP}</Text>
        <Button plain dimColor key="refresh" label="Refresh" onPress={() => refreshEntries($)} />
      </Box>
      <Box flexDirection="column" marginTop="md">
        {entries.length === 0 && <Text dimColor>No files yet</Text>}
        {shown.map(row)}
        {hidden > 0 && <Text dimColor>… +{hidden} more (/scratchpad list)</Text>}
      </Box>
    </Box>
  )
}
