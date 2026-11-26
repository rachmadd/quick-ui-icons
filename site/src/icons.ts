import type { ComponentType } from 'react'
import * as rounded from '@quick-ui/icons'
import * as sharp from '@quick-ui/icons/sharp'
import type { IconProps, IconVariant } from '@quick-ui/icons'
import manifest from './generated/manifest.json'

export type Corners = 'rounded' | 'sharp'
export type IconEntry = (typeof manifest.icons)[number]
export type Category = (typeof manifest.categories)[number]

export const ICONS: IconEntry[] = manifest.icons
export const CATEGORIES: Category[] = manifest.categories
export const VARIANTS: IconVariant[] = ['outline', 'fill', 'duotone']
export const BY_NAME = new Map(ICONS.map((icon) => [icon.name, icon]))

type IconComponent = ComponentType<IconProps>
const SETS = { rounded, sharp } as unknown as Record<Corners, Record<string, IconComponent>>

/** The component for an icon in one corner treatment. */
export function componentFor(component: string, corners: Corners): IconComponent {
  const found = SETS[corners][component]
  if (!found) throw new Error(`@quick-ui/icons has no ${component}`)
  return found
}

export const importPath = (corners: Corners) => (corners === 'sharp' ? '@quick-ui/icons/sharp' : '@quick-ui/icons')

/**
 * Icons matching every word of `query` in their name or search terms, best
 * first: an exact name, then names that start with the query, then names that
 * contain it, then matches in keywords and aliases.
 */
export function search(query: string, category: string): IconEntry[] {
  const words = query.toLowerCase().trim().split(/\s+/).filter(Boolean)
  const pool = category === 'All' ? ICONS : ICONS.filter((icon) => icon.category === category)
  if (!words.length) return pool
  const phrase = words.join('-')
  const scored: { icon: IconEntry; score: number }[] = []
  for (const icon of pool) {
    const haystack = [icon.name, ...icon.terms].map((t) => t.toLowerCase())
    if (!words.every((word) => haystack.some((text) => text.includes(word)))) continue
    const score =
      icon.name === phrase ? 0 : icon.name.startsWith(phrase) ? 1 : icon.name.includes(phrase) ? 2 : words.every((w) => icon.name.includes(w)) ? 3 : 4
    scored.push({ icon, score })
  }
  return scored.sort((a, b) => a.score - b.score || a.icon.name.localeCompare(b.icon.name)).map((s) => s.icon)
}
