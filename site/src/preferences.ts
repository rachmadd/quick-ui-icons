import { useState } from 'react'

const PREFIX = 'quick-ui-icons:'

/** Reads a remembered choice. Storage can be missing or blocked, so any failure means "nothing saved". */
export function readPreference(key: string): string | null {
  try {
    return window.localStorage.getItem(PREFIX + key)
  } catch {
    return null
  }
}

export function writePreference(key: string, value: string) {
  try {
    window.localStorage.setItem(PREFIX + key, value)
  } catch {
    // Not saved this time; the choice still applies until the page reloads.
  }
}

/** A choice from `options` that's remembered across visits in this browser. */
export function usePreference<T extends string>(key: string, initial: T, options: readonly T[]) {
  const [value, setValue] = useState<T>(() => {
    const saved = readPreference(key)
    return options.includes(saved as T) ? (saved as T) : initial
  })
  const update = (next: T) => {
    setValue(next)
    writePreference(key, next)
  }
  return [value, update] as const
}
