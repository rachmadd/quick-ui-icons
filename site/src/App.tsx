import { useEffect, useState } from 'react'
import { MoonIcon, SparklesIcon, SunIcon } from '@quick-ui/icons'
import { Browser } from './Browser'
import { Docs } from './Docs'
import { readPreference, writePreference } from './preferences'
import { hrefFor, useRoute } from './route'

type Theme = 'light' | 'dark'

function initialTheme(): Theme {
  const saved = readPreference('theme')
  if (saved === 'light' || saved === 'dark') return saved
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function App() {
  const route = useRoute()
  const [theme, setTheme] = useState<Theme>(initialTheme)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    writePreference('theme', next)
  }
  const ThemeIcon = theme === 'dark' ? SunIcon : MoonIcon

  return (
    <>
      <a className="skip" href="#main">
        Skip to content
      </a>
      <header className="site-header">
        <a className="brand" href={hrefFor({ page: 'icons', icon: null })}>
          <SparklesIcon variant="duotone" className="size-5" />
          Quick UI Icons
        </a>
        <nav aria-label="Main">
          <a href={hrefFor({ page: 'icons', icon: null })} aria-current={route.page === 'icons' ? 'page' : undefined}>
            Icons
          </a>
          <a href={hrefFor({ page: 'docs', section: null })} aria-current={route.page === 'docs' ? 'page' : undefined}>
            Docs
          </a>
          <a href="https://github.com/rachmadd/quick-ui-icons">GitHub</a>
        </nav>
        <button type="button" className="icon-button" onClick={toggleTheme} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}>
          <ThemeIcon className="size-5" />
        </button>
      </header>
      <main id="main">
        {route.page === 'docs' ? <Docs section={route.section} /> : <Browser selected={route.icon} />}
      </main>
    </>
  )
}
