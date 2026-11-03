// Which command opens or reveals a path on each operating system. A table,
// not branches: adding a platform is adding a row.

import { dirName } from './paths'

export type Platform = 'mac' | 'windows' | 'linux'
export type OpenKind = 'open' | 'reveal'

type Opener = {
  argv: (path: string) => string[]
  isOk: (exitCode: number) => boolean
}

const exitedCleanly = (exitCode: number): boolean => exitCode === 0
// explorer.exe exits 1 even after it opened the window, so its code says nothing.
const startedAtAll = (): boolean => true

// xdg-open can leave the launched app holding its output pipes, which would
// keep the call waiting; the shell detaches it and fails fast when it is missing.
const XDG_DETACHED = 'command -v xdg-open >/dev/null || exit 127; xdg-open "$1" >/dev/null 2>&1 &'
const xdgOpen = (path: string): string[] => ['sh', '-c', XDG_DETACHED, 'sh', path]

export const OPENERS: Record<Platform, Record<OpenKind, Opener>> = {
  mac: {
    open: { argv: path => ['open', path], isOk: exitedCleanly },
    reveal: { argv: path => ['open', '-R', path], isOk: exitedCleanly },
  },
  windows: {
    open: { argv: path => ['explorer.exe', path], isOk: startedAtAll },
    reveal: { argv: path => ['explorer.exe', `/select,${path}`], isOk: startedAtAll },
  },
  linux: {
    open: { argv: xdgOpen, isOk: exitedCleanly },
    // Linux has no common "select this file" call: open the folder holding it.
    reveal: { argv: path => xdgOpen(dirName(path)), isOk: exitedCleanly },
  },
}

const UNAME_PLATFORMS: ReadonlyArray<[RegExp, Platform]> = [
  [/darwin/i, 'mac'],
  [/linux/i, 'linux'],
]

/** Anything uname does not call macOS or Linux is taken as Windows. */
export const platformFromUname = (uname: string): Platform =>
  UNAME_PLATFORMS.find(([pattern]) => pattern.test(uname))?.[1] ?? 'windows'
