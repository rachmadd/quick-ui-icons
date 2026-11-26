import { useEffect, useState } from 'react'

/** `#/` is the icon browser, `#/icons/<name>` opens one icon, `#/docs` is the usage page. */
export type Route = { page: 'icons'; icon: string | null } | { page: 'docs'; section: string | null }

function parse(hash: string): Route {
  const path = hash.replace(/^#/, '')
  const [, first, second] = path.split('/')
  if (first === 'docs') return { page: 'docs', section: second ?? null }
  if (first === 'icons' && second) return { page: 'icons', icon: decodeURIComponent(second) }
  return { page: 'icons', icon: null }
}

export const hrefFor = (route: Route) =>
  route.page === 'docs'
    ? `#/docs${route.section ? `/${route.section}` : ''}`
    : route.icon
      ? `#/icons/${encodeURIComponent(route.icon)}`
      : '#/'

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parse(window.location.hash))
  useEffect(() => {
    const onChange = () => setRoute(parse(window.location.hash))
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return route
}

export const navigate = (route: Route) => {
  window.location.hash = hrefFor(route)
}
