// The three things you can do with a path: open it, show it in its folder,
// copy it. The command and the pane both call these, and each answers a
// sentence to show the person.

import type { EngineInterface, RenderSurface } from 'claude-code'

import { baseName } from '../core/paths'
import { OPENERS, platformFromUname } from '../core/platform'
import type { OpenKind, Platform } from '../core/platform'

const DONE: Record<OpenKind, string> = { open: 'Opened', reveal: 'Showed' }
const TIMEOUT_MS = 10_000

// Detected once per load; the machine does not change under a session.
let platform: Platform | undefined

async function detectPlatform($: EngineInterface): Promise<Platform> {
  if ((await $.env.get('OS')) === 'Windows_NT') return 'windows'
  const uname = await $.process.run(['uname', '-s']).catch(() => undefined)

  return platformFromUname(uname?.stdout ?? '')
}

async function currentPlatform($: EngineInterface): Promise<Platform> {
  platform ??= await detectPlatform($)

  return platform
}

async function launch($: EngineInterface, kind: OpenKind, path: string): Promise<string> {
  const opener = OPENERS[await currentPlatform($)][kind]
  const ran = await $.process.run(opener.argv(path), { timeoutMs: TIMEOUT_MS }).catch(() => undefined)
  const isOk = ran !== undefined && opener.isOk(ran.exitCode)

  return isOk ? `${DONE[kind]} ${baseName(path)}` : `Couldn't ${kind} it on this machine. Path: ${path}`
}

export function openPath($: EngineInterface, path: string): Promise<string> {
  return launch($, 'open', path)
}

export function revealPath($: EngineInterface, path: string): Promise<string> {
  return launch($, 'reveal', path)
}

export async function copyPath(
  $: EngineInterface,
  path: string,
  surface?: RenderSurface,
): Promise<string> {
  const copied = await $.ui.copy({ text: path, ...(surface ? { surface } : {}) })

  return copied.isCopied ? `Copied ${path}` : `Couldn't reach the clipboard. Path: ${path}`
}
