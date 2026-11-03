// Feature 1: say so when Claude saves a file to the scratchpad, copy its
// path, and keep the pane's list current after every tool call (a Bash
// command can write there too).

import type { EngineInterface, Hook, ToolCallResult } from 'claude-code'

import { baseName } from '../core/paths'
import { refreshEntries } from '../services/entries'
import { scratchDirOf } from '../services/locate'

export type NotifyOptions = { isCopyingOnSave: boolean }

const WRITING_TOOLS = new Set(['Write', 'Edit', 'MultiEdit', 'NotebookEdit'])
const PATH_FIELDS = ['file_path', 'notebook_path'] as const

const pathField = (input: Readonly<Record<string, unknown>>): string | undefined =>
  PATH_FIELDS.map(field => input[field]).find(
    (value): value is string => typeof value === 'string',
  )

/** The path a successful file-writing call wrote, else undefined. */
const savedPath = (
  tool: string,
  input: Readonly<Record<string, unknown>>,
  ran: Pick<ToolCallResult, 'deny' | 'isError'>,
): string | undefined => {
  const isSuccessfulWrite =
    WRITING_TOOLS.has(tool) && ran.deny === undefined && ran.isError !== true

  return isSuccessfulWrite ? pathField(input) : undefined
}

async function announce($: EngineInterface, path: string, options: NotifyOptions): Promise<void> {
  if ((await scratchDirOf($, path)) === undefined) return

  const copied = options.isCopyingOnSave && (await $.ui.copy({ text: path })).isCopied
  // Terse and dot-joined, as Claude Code's own notices read; the toast's
  // header already names the plugin, so "scratchpad" goes unsaid.
  const parts = [`Saved ${baseName(path)}`, ...(copied ? ['path copied'] : []), '/scratchpad to open']
  $.ui.toast(parts.join(' · '))
}

type ToolCallHook = Hook<'tool.call'>

/** Runs the tool, then reports a scratchpad save; never alters the result. */
export async function handleToolCall(
  $: Parameters<ToolCallHook>[0],
  e: Parameters<ToolCallHook>[1],
  next: Parameters<ToolCallHook>[2],
  options: NotifyOptions,
): Promise<ToolCallResult> {
  const ran = await next(e)
  const input = e as unknown as Readonly<Record<string, unknown>>
  const path = savedPath(String(e.tool), input, ran)

  if (path !== undefined) await announce($, path, options).catch(() => undefined)
  await refreshEntries($).catch(() => undefined)

  return ran
}
