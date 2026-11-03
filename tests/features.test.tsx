// The command, the save notice and the pane, run through the engine.

import { describe, expect, test } from 'claude-code/testing'

import { DIR, standIns } from './support'

const START = { cwd: '/', surface: 'terminal', isInteractive: true } as const
const TYPED = { origin: { kind: 'composer' }, presentation: { isFullscreen: true, columns: 100 } } as const
const typed = (args: string) => ({ command: 'scratchpad', args, ...TYPED })
const PANE = {
  plugin: 'scratchpad-finder',
  component: 'Pane',
  requestId: 'scratchpad-finder',
  props: {
    title: 'Scratchpad',
    isFocused: false,
    bodyColumns: 60,
    placement: 'dock',
    scroll: { offset: 0, bodyRows: 20 },
    view: {},
  },
} as const

describe('/scratchpad', () => {
  test('lists newest first, a folder by its own time and with no size', async ($, on) => {
    standIns(on)
    await $.session.start(START)
    const { text } = await $.command.run(typed('list'))

    expect(text).toBe(
      [
        `Scratchpad: ${DIR}`,
        '  report.md  2.0 KB  1m ago',
        '  drafts/  5m ago',
        '  old.txt  10 B  1h ago',
        '  gone/',
      ].join('\n'),
    )
  })

  for (const [machine, opener] of [['mac', 'open'], ['windows', 'explorer.exe'], ['linux', 'sh']] as const) {
    test(`opens a file by part of its name on ${machine}`, async ($, on) => {
      const recorded = standIns(on, machine)
      await $.session.start(START)
      const { text } = await $.command.run(typed('open REPORT'))

      expect(text).toBe('Opened report.md')
      expect(recorded.runs.at(-1)?.[0]).toBe(opener)
      expect(recorded.runs.at(-1)?.at(-1)).toMatch(/report\.md$/)
    })
  }

  test('copies the folder path with no file named', async ($, on) => {
    const recorded = standIns(on)
    await $.session.start(START)
    await $.command.run(typed('copy'))

    expect(recorded.copies).toEqual([DIR])
  })

  test('says so for an unknown file or verb', async ($, on) => {
    standIns(on)
    await $.session.start(START)

    expect((await $.command.run(typed('open nope'))).text).toMatch(/No file matching "nope"/)
    expect((await $.command.run(typed('fly'))).text).toMatch(/^Usage:/)
  })
})

describe('save notice', () => {
  test('a scratchpad save toasts and copies its path', async ($, on) => {
    const recorded = standIns(on)
    on('tool.call', () => ({ result: {} }))
    await $.session.start(START)
    await $.tool.call({ tool: 'Write', file_path: `${DIR}/report.md`, content: 'x' })

    expect(recorded.copies).toEqual([`${DIR}/report.md`])
    expect(recorded.toasts.at(-1)).toBe('Saved report.md · path copied · /scratchpad to open')
  })

  test('copying can be turned off', { options: { autoCopy: false } }, async ($, on) => {
    const recorded = standIns(on)
    on('tool.call', () => ({ result: {} }))
    await $.session.start(START)
    await $.tool.call({ tool: 'Write', file_path: `${DIR}/report.md`, content: 'x' })

    expect(recorded.copies).toEqual([])
    expect(recorded.toasts.at(-1)).toBe('Saved report.md · /scratchpad to open')
  })

  test('a save elsewhere stays quiet', async ($, on) => {
    const recorded = standIns(on)
    on('tool.call', () => ({ result: {} }))
    await $.session.start(START)
    await $.tool.call({ tool: 'Write', file_path: '/home/me/proj/app.ts', content: 'x' })

    expect(recorded.toasts).toEqual([])
  })
})

describe('pane', () => {
  for (const surface of ['terminal', 'desktop', 'vscode', 'mobile'] as const) {
    test(`lists files with working buttons on ${surface}`, async ($, on) => {
      const recorded = standIns(on)
      await $.session.start(START)
      const ui = await $.ui.mount({ ...PANE, surface })

      expect((await ui.find({ type: 'Text', text: /report\.md/ }))?.text).toBe('report.md')
      expect((await ui.find({ type: 'Text', text: /^drafts\// }))?.text).toBe('drafts/')
      expect((await ui.find({ type: 'Text', text: /^5m ago$/ }))?.text).toBe('5m ago')
      expect((await ui.find({ type: 'Text', text: /^⎿$/ }))?.text).toBe('⎿')
      await ui.press({ key: 'copy:report.md' })
      expect(recorded.copies).toEqual([`${DIR}/report.md`])
      expect(recorded.toasts.at(-1)).toBe(`Copied ${DIR}/report.md`)
      await ui.unmount()
    })
  }

  test('fits its own body, not the whole surface', async ($, on) => {
    standIns(on)
    await $.session.start(START)
    // 30 cells across (sizing by the surface gave 40 here); 7 rows hold the
    // 3 header rows and 2 two-row entries.
    const props = { ...PANE.props, bodyColumns: 30, scroll: { offset: 0, bodyRows: 7 } }
    const ui = await $.ui.mount({ ...PANE, props, surface: 'terminal' })

    expect((await ui.find({ type: 'Text', text: /scratchpad$/ }))?.text).toBe(`…${DIR.slice(-29)}`)
    expect((await ui.find({ type: 'Text', text: /more/ }))?.text).toBe('… +2 more (/scratchpad list)')
    await ui.unmount()
  })
})
