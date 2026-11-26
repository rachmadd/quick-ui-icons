import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { BellIcon as SharpBellIcon } from '@quick-ui/icons/sharp'
import { BellIcon, ChevronDownIcon, CircleAlertIcon, HeartIcon, StarIcon } from '@quick-ui/icons'
import { Code } from './Code'
import { ICONS } from './icons'
import { hrefFor } from './route'

const SECTIONS = [
  ['install', 'Installation'],
  ['usage', 'Usage'],
  ['variants', 'Variants'],
  ['corners', 'Rounded or sharp'],
  ['size', 'Size and color'],
  ['accessibility', 'Accessibility'],
  ['server', 'Server components'],
  ['bundle', 'Bundle size'],
  ['names', 'Names'],
  ['keyline', 'Coming from Keyline'],
  ['api', 'API reference'],
] as const

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="doc-section" aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`}>
        <a href={hrefFor({ page: 'docs', section: id })}>{title}</a>
      </h2>
      {children}
    </section>
  )
}

const Demo = ({ children }: { children: ReactNode }) => <div className="demo">{children}</div>

function LikeButton() {
  const [liked, setLiked] = useState(false)
  return (
    <button type="button" className="like" aria-label="Like" aria-pressed={liked} onClick={() => setLiked(!liked)}>
      <HeartIcon variant={liked ? 'fill' : 'outline'} className="size-5" />
    </button>
  )
}

export function Docs({ section }: { section: string | null }) {
  useEffect(() => {
    if (section) document.getElementById(section)?.scrollIntoView()
  }, [section])

  return (
    <div className="docs">
      <nav className="toc" aria-label="On this page">
        <ul>
          {SECTIONS.map(([id, title]) => (
            <li key={id}>
              <a href={hrefFor({ page: 'docs', section: id })} aria-current={section === id ? 'location' : undefined}>
                {title}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <article className="doc">
        <h1>Using @quick-ui/icons</h1>
        <p className="lead">
          {ICONS.length.toLocaleString('en')} icons on one 24px grid, as React components. Each one comes in outline,
          fill and duotone, with rounded or sharp corners.
        </p>

        <Section id="install" title="Installation">
          <Code language="bash">npm i @quick-ui/icons</Code>
          <p>It needs React 19.</p>
        </Section>

        <Section id="usage" title="Usage">
          <Demo>
            <button type="button" className="demo-button" aria-label="Notifications">
              <BellIcon className="size-5" />
            </button>
          </Demo>
          <Code>{`import { BellIcon } from '@quick-ui/icons'

export function NotificationsButton() {
  return (
    <button type="button" aria-label="Notifications">
      <BellIcon className="size-5" />
    </button>
  )
}`}</Code>
        </Section>

        <Section id="variants" title="Variants">
          <p>
            <code>variant</code> picks the drawing. It defaults to <code>"outline"</code>.
          </p>
          <Demo>
            <StarIcon className="size-8" />
            <StarIcon variant="fill" className="size-8" />
            <StarIcon variant="duotone" className="size-8" />
          </Demo>
          <Code>{`<StarIcon />
<StarIcon variant="fill" />
<StarIcon variant="duotone" />`}</Code>
          <p>A common pattern is the outline at rest and the fill when something is on. Press the heart:</p>
          <Demo>
            <LikeButton />
          </Demo>
          <Code>{`import { HeartIcon } from '@quick-ui/icons'

export function LikeButton({ liked, onToggle }: { liked: boolean; onToggle: () => void }) {
  return (
    <button type="button" aria-label="Like" aria-pressed={liked} onClick={onToggle}>
      <HeartIcon variant={liked ? 'fill' : 'outline'} className="size-5" />
    </button>
  )
}`}</Code>
          <p>
            Open shapes such as chevrons, arrows and <code>x</code> have nothing to fill, so they look the same in every
            variant. Don't use <code>variant</code> alone to show state on those: change the color or the icon too. A few
            closed shapes, <code>star</code> among them, have no duotone drawing yet, and <code>duotone</code> gives
            their outline.
          </p>
          <Demo>
            <ChevronDownIcon className="size-8" />
            <ChevronDownIcon variant="fill" className="size-8" />
            <ChevronDownIcon variant="duotone" className="size-8" />
          </Demo>
        </Section>

        <Section id="corners" title="Rounded or sharp">
          <p>
            Rounded is the default. The sharp drawings have the same names under <code>/sharp</code>:
          </p>
          <Demo>
            <BellIcon className="size-8" />
            <SharpBellIcon className="size-8" />
          </Demo>
          <Code>{`import { BellIcon } from '@quick-ui/icons/sharp'`}</Code>
          <p>Pick one for the whole app. To switch, change the import path. Nothing else in your code changes.</p>
        </Section>

        <Section id="size" title="Size and color">
          <p>
            An icon is 24px unless you size it. Use a class, <code>width</code> and <code>height</code>, or CSS on a
            parent. There's no <code>size</code> prop. CSS wins over <code>width</code> and <code>height</code>, so a
            parent rule like <code>[&amp;_svg]:size-4</code> sizes every icon inside it.
          </p>
          <Demo>
            <BellIcon width={16} height={16} />
            <BellIcon width={20} height={20} />
            <BellIcon />
            <BellIcon width={32} height={32} />
          </Demo>
          <Code>{`<BellIcon className="size-4" />
<BellIcon width={16} height={16} />`}</Code>
          <p>
            Icons draw in <code>currentColor</code>, so they take the text color around them.{' '}
            <code>strokeWidth</code> changes the weight of the strokes. The default is 2.
          </p>
          <Demo>
            <BellIcon className="size-8 tone-accent" />
            <BellIcon className="size-8 tone-danger" />
            <BellIcon className="size-8" strokeWidth={1.5} />
            <BellIcon className="size-8" strokeWidth={2.5} />
          </Demo>
          <Code>{`<BellIcon className="text-red-600" />
<BellIcon strokeWidth={1.5} />`}</Code>
        </Section>

        <Section id="accessibility" title="Accessibility">
          <p>
            Every icon renders <code>aria-hidden="true"</code>, because an icon usually sits next to text or inside a
            button that has its own label. Give an icon-only button an <code>aria-label</code>. Screen readers have
            nothing else to announce. When the icon itself carries meaning, label it:
          </p>
          <Demo>
            <CircleAlertIcon aria-hidden={false} role="img" aria-label="Warning" className="size-8 tone-danger" />
          </Demo>
          <Code>{`<CircleAlertIcon aria-hidden={false} role="img" aria-label="Warning" />`}</Code>
        </Section>

        <Section id="server" title="Server components">
          <p>
            Icons have no <code>'use client'</code>, no hooks and no context, so server components can render them.
            Rendered on the server, they add no JavaScript to the page.
          </p>
        </Section>

        <Section id="bundle" title="Bundle size">
          <p>
            Each icon is its own module, and the package is marked <code>sideEffects: false</code>. An app ships only
            the icons it imports, each with its three variants. In a Vite 7 or Next 16 production build, each icon after
            the first adds about 210 B gzipped. You can also import one icon's module directly:
          </p>
          <Code>{`import { StarIcon } from '@quick-ui/icons/icons/star'
import { StarIcon as SharpStarIcon } from '@quick-ui/icons/sharp/icons/star'`}</Code>
        </Section>

        <Section id="names" title="Names">
          <p>
            Each icon is exported twice, as <code>StarIcon</code> and <code>Star</code>. They're the same component. The
            name is the icon's name in PascalCase: <code>arrow-up-right</code> is <code>ArrowUpRightIcon</code>.
            shadcn/ui's components import the <code>…Icon</code> form, and the one they spell differently is{' '}
            <code>Loader2Icon</code>, which is <code>LoaderCircleIcon</code> here.
          </p>
          <p>
            Prefer the <code>…Icon</code> names. A few short names, such as <code>Image</code>, <code>Link</code> and{' '}
            <code>Map</code>, would shadow a browser global in your file.
          </p>
        </Section>

        <Section id="keyline" title="Coming from @keyline-icons/react">
          <p>
            The names are Keyline's. Swap the import, turn <code>/fill</code> and <code>/duotone</code> imports into{' '}
            <code>variant</code>, and turn <code>size</code> into a class:
          </p>
          <Code>{`// Before
import { BellIcon } from '@keyline-icons/react'
import { BellIcon as BellFillIcon } from '@keyline-icons/react/fill'

<BellFillIcon size={16} />

// After
import { BellIcon } from '@quick-ui/icons'

<BellIcon variant="fill" className="size-4" />`}</Code>
          <p>
            Keyline's deprecated names for renamed icons aren't here. Use the new name, for example{' '}
            <code>TextAlignStartIcon</code> for <code>AlignLeftIcon</code>. There's no two-tone style.
          </p>
        </Section>

        <Section id="api" title="API reference">
          <div className="table-wrap">
            <table className="api">
              <thead>
                <tr>
                  <th scope="col">Prop</th>
                  <th scope="col">Type</th>
                  <th scope="col">Default</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <code>variant</code>
                  </td>
                  <td>
                    <code>'outline' | 'fill' | 'duotone'</code>
                  </td>
                  <td>
                    <code>'outline'</code>
                  </td>
                </tr>
                <tr>
                  <td>Any &lt;svg&gt; prop</td>
                  <td>
                    <code>SVGProps&lt;SVGSVGElement&gt;</code>, <code>ref</code> included
                  </td>
                  <td />
                </tr>
              </tbody>
            </table>
          </div>
          <p>
            The <code>&lt;svg&gt;</code> starts with <code>viewBox="0 0 24 24"</code>, <code>width</code> and{' '}
            <code>height</code> of 24, <code>aria-hidden="true"</code>, <code>focusable="false"</code>, and the drawing's
            own fill and stroke. Your props come after these, so any of them can be overridden. The types are exported as{' '}
            <code>IconProps</code> and <code>IconVariant</code>.
          </p>
        </Section>

        <footer className="doc-footer">
          MIT. Based on <a href="https://keylineicons.com">Keyline Icons</a>, also MIT, whose drawings these are.
        </footer>
      </article>
    </div>
  )
}
