// Pure path helpers. They work on POSIX and Windows spellings alike and touch
// no file system, so every feature (and every test) shares them.

const SCRATCH_IN_TEXT = /Scratchpad directory:\s*(.*?[\\/]scratchpad)(?=[\s\\/]|$)/i
const SCRATCH_IN_PATH = /^(.*[\\/]claude[^\\/]*[\\/].*?[\\/]scratchpad)(?=[\\/]|$)/i
const TRAILING_SEPARATORS = /[\\/]+$/

/** The scratchpad folder the system prompt names, if it names one. */
export const findInText = (text: string): string | undefined =>
  SCRATCH_IN_TEXT.exec(text)?.[1]

/** The scratchpad folder a written file's path lies in, if it lies in one. */
export const findInPath = (path: string): string | undefined =>
  SCRATCH_IN_PATH.exec(path)?.[1]

export const isWindowsPath = (path: string): boolean =>
  /^[A-Za-z]:[\\/]/.test(path) || path.startsWith('\\\\')

const separatorOf = (path: string): string => (isWindowsPath(path) ? '\\' : '/')

export const joinPath = (dir: string, name: string): string =>
  `${dir.replace(TRAILING_SEPARATORS, '')}${separatorOf(dir)}${name}`

export const baseName = (path: string): string =>
  path.split(/[\\/]/).filter(Boolean).at(-1) ?? path

export const dirName = (path: string): string =>
  path.replace(TRAILING_SEPARATORS, '').replace(/[\\/][^\\/]*$/, '') || path

/** Windows paths compare case-insensitively and with either separator. */
const comparable = (path: string): string => {
  const unified = path.replace(/\\/g, '/').replace(TRAILING_SEPARATORS, '')

  return isWindowsPath(path) ? unified.toLowerCase() : unified
}

export const isInside = (dir: string, path: string): boolean =>
  comparable(path).startsWith(`${comparable(dir)}/`)
