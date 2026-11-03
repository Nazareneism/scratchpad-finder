// The pure helpers, on POSIX and Windows spellings.

import { describe, expect, test } from 'claude-code/testing'

import { entryDetails, formatAge, formatSize, shortenStart } from '../hooks/core/format'
import { baseName, dirName, findInPath, findInText, isInside, joinPath } from '../hooks/core/paths'
import { OPENERS, platformFromUname } from '../hooks/core/platform'

const MAC_DIR = '/private/var/folders/xy/T/claude-501/-Users-me-proj/abc123/scratchpad'
const WIN_DIR = 'C:\\Users\\Some One\\AppData\\Local\\Temp\\claude\\proj\\abc123\\scratchpad'

describe('paths', () => {
  test('the system prompt names the folder, spaces and all', () => {
    expect(findInText(`Scratchpad directory: ${MAC_DIR} — always use it`)).toBe(MAC_DIR)
    expect(findInText(`- Scratchpad directory: ${WIN_DIR}\n- next`)).toBe(WIN_DIR)
    expect(findInText('no such line here')).toBe(undefined)
  })

  test('a written file reveals its scratchpad folder', () => {
    expect(findInPath(`${MAC_DIR}/notes/report.md`)).toBe(MAC_DIR)
    expect(findInPath(`${WIN_DIR}\\report.md`)).toBe(WIN_DIR)
    expect(findInPath('/home/me/project/scratchpad/report.md')).toBe(undefined)
  })

  test('joins, splits and compares on both platforms', () => {
    expect(joinPath(MAC_DIR, 'a.md')).toBe(`${MAC_DIR}/a.md`)
    expect(joinPath(WIN_DIR, 'a.md')).toBe(`${WIN_DIR}\\a.md`)
    expect(baseName(`${WIN_DIR}\\a.md`)).toBe('a.md')
    expect(dirName(`${MAC_DIR}/a.md`)).toBe(MAC_DIR)
    expect(isInside(MAC_DIR, `${MAC_DIR}/a.md`)).toBe(true)
    expect(isInside(MAC_DIR, `${MAC_DIR}-other/a.md`)).toBe(false)
    expect(isInside(WIN_DIR, `${WIN_DIR.toLowerCase()}\\a.md`)).toBe(true)
  })
})

describe('platform', () => {
  test('uname names the platform; anything else is Windows', () => {
    expect(platformFromUname('Darwin\n')).toBe('mac')
    expect(platformFromUname('Linux\n')).toBe('linux')
    expect(platformFromUname('MINGW64_NT-10.0')).toBe('windows')
    expect(platformFromUname('')).toBe('windows')
  })

  test('each platform has its own open and reveal commands', () => {
    expect(OPENERS.mac.reveal.argv('/a/b.md')).toEqual(['open', '-R', '/a/b.md'])
    expect(OPENERS.windows.reveal.argv('C:\\a\\b.md')).toEqual(['explorer.exe', '/select,C:\\a\\b.md'])
    expect(OPENERS.linux.reveal.argv('/a/b.md').at(-1)).toBe('/a')
    expect(OPENERS.windows.open.isOk(1)).toBe(true)
    expect(OPENERS.mac.open.isOk(1)).toBe(false)
  })
})

describe('format', () => {
  test('sizes, ages and long paths', () => {
    expect(formatSize(512)).toBe('512 B')
    expect(formatSize(2048)).toBe('2.0 KB')
    expect(formatAge(5_000)).toBe('just now')
    expect(formatAge(3 * 60_000)).toBe('3m ago')
    expect(formatAge(2 * 3_600_000)).toBe('2h ago')
    expect(shortenStart('abcdefghij', 5)).toBe('…ghij')
  })

  test('entry details leave out what is not known', () => {
    const now = 10 * 60_000

    expect(entryDetails({ name: 'a.md', isDir: false, size: 2048, mtimeMs: now - 60_000 }, now)).toEqual([
      '2.0 KB',
      '1m ago',
    ])
    expect(entryDetails({ name: 'd', isDir: true, size: null, mtimeMs: now - 5 * 60_000 }, now)).toEqual(['5m ago'])
    expect(entryDetails({ name: 'x', isDir: true, size: null, mtimeMs: null }, now)).toEqual([])
  })
})
