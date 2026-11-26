import { useDeferredValue, useMemo, useState } from 'react'
import type { IconVariant } from '@quick-ui/icons'
import { SearchIcon, XIcon } from '@quick-ui/icons'
import { Detail } from './Detail'
import { BY_NAME, CATEGORIES, componentFor, ICONS, search, VARIANTS } from './icons'
import type { Corners, IconEntry } from './icons'
import { hrefFor } from './route'
import { usePreference } from './preferences'

const SIZES = { min: 16, max: 48, step: 4, initial: 24 }

function Segmented<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: T[]; onChange: (value: T) => void }) {
  return (
    <div className="segmented" role="group" aria-label={label}>
      {options.map((option) => (
        <button key={option} type="button" aria-pressed={value === option} onClick={() => onChange(option)}>
          {option}
        </button>
      ))}
    </div>
  )
}

function Tile({ icon, variant, corners, size, current }: { icon: IconEntry; variant: IconVariant; corners: Corners; size: number; current: boolean }) {
  const Icon = componentFor(icon.component, corners)
  return (
    <li>
      <a className="tile" href={hrefFor({ page: 'icons', icon: icon.name })} aria-current={current ? 'true' : undefined} title={icon.name}>
        <Icon variant={variant} width={size} height={size} />
        <span>{icon.name}</span>
      </a>
    </li>
  )
}

export function Browser({ selected }: { selected: string | null }) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All')
  const [variant, setVariant] = usePreference<IconVariant>('variant', 'outline', VARIANTS)
  const [corners, setCorners] = usePreference<Corners>('corners', 'rounded', ['rounded', 'sharp'])
  const [size, setSize] = useState(SIZES.initial)
  const deferredQuery = useDeferredValue(query)
  const results = useMemo(() => search(deferredQuery, category), [deferredQuery, category])
  const entry = selected ? (BY_NAME.get(selected) ?? null) : null

  return (
    <div className={entry ? 'browser has-detail' : 'browser'}>
      <section className="browser-main" aria-label="Icons">
        <div className="toolbar">
          <label className="search">
            <SearchIcon className="size-4" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={`Search ${ICONS.length.toLocaleString('en')} icons`}
              aria-label="Search icons"
              autoFocus
            />
            {query && (
              <button type="button" className="clear" onClick={() => setQuery('')} aria-label="Clear search">
                <XIcon className="size-4" />
              </button>
            )}
          </label>
          <select value={category} onChange={(event) => setCategory(event.target.value)} aria-label="Category">
            <option value="All">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c.label} value={c.label}>
                {c.label}
              </option>
            ))}
          </select>
          <Segmented label="Variant" value={variant} options={VARIANTS} onChange={setVariant} />
          <Segmented label="Corners" value={corners} options={['rounded', 'sharp']} onChange={setCorners} />
          <label className="size">
            <span>{size}px</span>
            <input
              type="range"
              min={SIZES.min}
              max={SIZES.max}
              step={SIZES.step}
              value={size}
              onChange={(event) => setSize(Number(event.target.value))}
              aria-label="Icon size"
            />
          </label>
        </div>
        <p className="count" aria-live="polite">
          {results.length.toLocaleString('en')} {results.length === 1 ? 'icon' : 'icons'}
          {category !== 'All' && ` in ${category}`}
        </p>
        {results.length ? (
          <ul className="grid">
            {results.map((icon) => (
              <Tile key={icon.name} icon={icon} variant={variant} corners={corners} size={size} current={icon.name === selected} />
            ))}
          </ul>
        ) : (
          <p className="empty">No icon matches “{query}”. Try a shorter word, or another category.</p>
        )}
      </section>
      {entry && <Detail entry={entry} variant={variant} corners={corners} />}
    </div>
  )
}
