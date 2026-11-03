// Feature 5: a side pane listing the scratchpad's files, newest first, each
// with Open, Show in folder and Copy path. Every button reports what it did
// as a toast.

import type { EngineInterface, Hook, RenderElement } from 'claude-code'

import type { ScratchEntry } from '../../types'
import { entryDetails, shortenStart } from '../core/format'
import { joinPath } from '../core/paths'
import { copyPath, openPath, revealPath } from '../services/actions'
import { refreshEntries } from '../services/entries'
import { readDir, readEntries } from '../services/state'

const PANE = 'scratchpad-finder'
const TITLE = 'Scratchpad'
const ROWS_PER_ENTRY = 2
const HEADER_ROWS = 4

export async function openPane($: EngineInterface): Promise<void> {
  await refreshEntries($).catch(() => undefined)
  await $.ui.open({ id: PANE, title: TITLE })
}

const describe = (entry: ScratchEntry, now: number): string => entryDetails(entry, now).join(' · ')

const fitting = (entries: readonly ScratchEntry[], rows: number) => {
  const room = Math.max(1, Math.floor((rows - HEADER_ROWS) / ROWS_PER_ENTRY))

  return { shown: entries.slice(0, room), hidden: Math.max(0, entries.length - room) }
}

type RenderHook = Hook<'ui.render'>

export async function renderPane(
  $: Parameters<RenderHook>[0],
  e: Parameters<RenderHook>[1],
): Promise<RenderElement> {
  const { Box, Button, Text } = $.ui.resolve(e)
  const dir = await readDir($)
  const columns = Math.max(20, e.viewport?.columns ?? 40)

  if (dir === null) {
    return <Text dimColor>No scratchpad yet. It appears once Claude saves a file there.</Text>
  }

  const entries = await readEntries($)
  const now = await $.clock.now()
  const { shown, hidden } = fitting(entries, e.viewport?.rows ?? 24)
  const say = (work: () => Promise<string>) => async () => $.ui.toast(await work())
  const actions = (key: string, path: string) => (
    <Box flexDirection="row">
      <Button key={`open:${key}`} label="Open" onPress={say(() => openPath($, path))} />
      <Button key={`reveal:${key}`} label="Show in folder" onPress={say(() => revealPath($, path))} />
      <Button key={`copy:${key}`} label="Copy path" onPress={say(() => copyPath($, path, e.surface))} />
    </Box>
  )
  const row = (entry: ScratchEntry) => (
    <Box flexDirection="column">
      <Box flexDirection="row">
        <Text bold>{entry.isDir ? `${entry.name}/` : entry.name} </Text>
        <Text dimColor>{describe(entry, now)}</Text>
      </Box>
      {actions(entry.name, joinPath(dir, entry.name))}
    </Box>
  )

  return (
    <Box flexDirection="column">
      <Text dimColor>{shortenStart(dir, columns)}</Text>
      <Box flexDirection="row">
        {actions('/', dir)}
        <Button key="refresh" label="Refresh" onPress={() => refreshEntries($)} />
      </Box>
      {entries.length === 0 && <Text dimColor>Empty so far.</Text>}
      {shown.map(row)}
      {hidden > 0 && <Text dimColor>+{hidden} more: /scratchpad list</Text>}
    </Box>
  )
}
