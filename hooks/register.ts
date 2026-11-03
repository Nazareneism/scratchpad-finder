// Entry point: wires each feature to its event and nothing else.

import type { Register } from 'claude-code'

import { ARGUMENT_HINT, runCommand } from './features/command'
import { handleToolCall } from './features/notify'
import { renderPane } from './features/pane'
import { refreshEntries } from './services/entries'
import { locate } from './services/locate'

// The engine reads hook matchers straight from this file's source, so the
// command name and pane id are literals here (see decisions.yaml, D-007).
export const register: Register = (on, options) => {
  const notifyOptions = { isCopyingOnSave: options.autoCopy !== false }

  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'scratchpad',
      description: 'Find, open and copy the files Claude saved to its scratchpad',
      argumentHint: ARGUMENT_HINT,
    })
    await locate($).then(() => refreshEntries($)).catch(() => undefined)

    return next(e)
  })

  on('command.run', { command: 'scratchpad' }, ($, e) => runCommand($, e.args)).catch(() => ({
    text: 'scratchpad-finder could not finish that. Try /scratchpad list.',
  }))

  // Not a guard: if reporting a save fails, the tool's own result goes on.
  on('tool.call', ($, e, next) => handleToolCall($, e, next, notifyOptions)).catch(
    (_, e, next) => next(e),
  )

  on('ui.render', { component: 'Pane', requestId: 'scratchpad-finder' }, ($, e) => renderPane($, e))
}
