export type ScratchEntry = {
  name: string
  isDir: boolean
  /** Bytes, for a file or a link to one; null for a folder or an entry that could not be read. */
  size: number | null
  /** Last modification, ms since the epoch; null when it could not be read. */
  mtimeMs: number | null
}

declare module 'claude-code' {
  interface PluginState {
    'scratchpad-finder': {
      dir: string | null
      entries: Shaped<ScratchEntry[]>
    }
  }
}
