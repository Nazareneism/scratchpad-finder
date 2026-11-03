// The engine stand-ins every feature test shares: a scratchpad named in the
// system prompt, two files in it, and a machine of the given platform. The
// returned lists record what the mod asked for.

import type { On } from 'claude-code'

export const DIR = '/private/var/folders/xy/T/claude-501/-Users-me-proj/abc123/scratchpad'
export const NOW = 10 * 60_000

type Machine = 'mac' | 'linux' | 'windows'

const UNAME: Record<Machine, string> = { mac: 'Darwin\n', linux: 'Linux\n', windows: '' }

export type Recorded = { runs: string[][]; toasts: string[]; copies: string[] }

export function standIns(on: On, machine: Machine = 'mac'): Recorded {
  const recorded: Recorded = { runs: [], toasts: [], copies: [] }

  on('prompt.compose', () => ({
    sections: [{ id: 'env', text: `- Scratchpad directory: ${DIR} — use it`, scope: 'session' as const }],
  }))
  on('fs.list', () => ({
    value: [
      { name: 'old.txt', kind: 'file' as const, size: 10, mtimeMs: NOW - 3_600_000, isLink: false },
      { name: 'report.md', kind: 'file' as const, size: 2048, mtimeMs: NOW - 60_000, isLink: false },
    ],
  }))
  on('env.get', () => ({ value: machine === 'windows' ? 'Windows_NT' : undefined }))
  on('process.run', (_, e) => {
    recorded.runs.push([...e.argv])
    const stdout = e.argv[0] === 'uname' ? UNAME[machine] : ''

    return { value: { exitCode: 0, stdout, stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }
  })
  on('clock.now', () => ({ value: NOW }))
  on('command.register', () => ({ value: { command: 'scratchpad' } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('ui.toast', (_, e) => {
    recorded.toasts.push(e.text)

    return { value: undefined }
  })
  on('ui.copy', (_, e) => {
    recorded.copies.push(e.text)

    return { value: { isCopied: true } }
  })
  on('session.start', (_, e) => ({ cwd: e.cwd }))

  return recorded
}
