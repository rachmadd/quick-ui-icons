import { useEffect } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import type { IconVariant } from '@quick-ui/icons'
import { XIcon } from '@quick-ui/icons'
import { Code, CopyButton } from './Code'
import { componentFor, importPath, VARIANTS } from './icons'
import type { Corners, IconEntry } from './icons'
import { hrefFor, navigate } from './route'

const PREVIEW_SIZE = 48
const SHOWN_TERMS = 16

function usage(entry: IconEntry, variant: IconVariant, corners: Corners) {
  const prop = variant === 'outline' ? '' : ` variant="${variant}"`
  return `import { ${entry.component} } from '${importPath(corners)}'\n\n<${entry.component}${prop} className="size-5" />`
}

export function Detail({ entry, variant, corners }: { entry: IconEntry; variant: IconVariant; corners: Corners }) {
  const close = () => navigate({ page: 'icons', icon: null })
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && close()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const Current = componentFor(entry.component, corners)
  const svg = renderToStaticMarkup(<Current variant={variant} />)

  return (
    <aside className="detail" aria-label={`${entry.name} details`}>
      <header className="detail-head">
        <div>
          <h2>{entry.name}</h2>
          <p className="muted">
            {entry.category} · <code>{entry.component}</code>
          </p>
        </div>
        <a className="icon-button" href={hrefFor({ page: 'icons', icon: null })} aria-label="Close">
          <XIcon className="size-5" />
        </a>
      </header>

      <table className="previews">
        <thead>
          <tr>
            <th scope="col">
              <span className="visually-hidden">Corners</span>
            </th>
            {VARIANTS.map((v) => (
              <th key={v} scope="col">
                {v}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {(['rounded', 'sharp'] as const).map((c) => {
            const Icon = componentFor(entry.component, c)
            return (
              <tr key={c}>
                <th scope="row">{c}</th>
                {VARIANTS.map((v) => (
                  <td key={v} className={v === variant && c === corners ? 'is-current' : undefined}>
                    <Icon variant={v} width={PREVIEW_SIZE} height={PREVIEW_SIZE} />
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>

      {entry.usage && <p>{entry.usage}</p>}

      <Code>{usage(entry, variant, corners)}</Code>
      <div className="detail-actions">
        <CopyButton text={entry.component} label="Copy name" />
        <CopyButton text={svg} label={`Copy SVG (${variant}, ${corners})`} />
      </div>

      {entry.terms.length > 0 && (
        <>
          <h3>Also found by</h3>
          <ul className="terms">
            {entry.terms.slice(0, SHOWN_TERMS).map((term) => (
              <li key={term}>{term}</li>
            ))}
          </ul>
        </>
      )}
    </aside>
  )
}
