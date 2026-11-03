export type ScratchEntry = {
  name: string
  isDir: boolean
  size: number
  mtimeMs: number
}

declare module 'claude-code' {
  interface PluginState {
    'scratchpad-finder': {
      dir: string | null
      entries: Shaped<ScratchEntry[]>
    }
  }
}
