# Adapters

Using nuqs in your React framework of choice

Copy as MarkdownCopy Markdown URLOpen…

Since version 2, you can now use nuqs in the following React frameworks, by
wrapping it with a `NuqsAdapter` context provider:

- [Next.js (app router)](https://nuqs.dev/docs/adapters#nextjs-app-router)
- [Next.js (pages router)](https://nuqs.dev/docs/adapters#nextjs-pages-router)
- [React SPA (eg: with Vite)](https://nuqs.dev/docs/adapters#react-spa)
- [Remix](https://nuqs.dev/docs/adapters#remix)
- [React Router v6](https://nuqs.dev/docs/adapters#react-router-v6)
- [React Router v7](https://nuqs.dev/docs/adapters#react-router-v7)
- [React Router v8](https://nuqs.dev/docs/adapters#react-router-v8)
- [TanStack Router](https://nuqs.dev/docs/adapters#tanstack-router)

## [Next.js](https://nuqs.dev/docs/adapters\#nextjs)

### [App router](https://nuqs.dev/docs/adapters\#nextjs-app-router)

Wrap your `{children}` with the `NuqsAdapter` component in your root layout file:

src/app/layout.tsx

```
import { NuqsAdapter } from 'nuqs/adapters/next/app'
import { type ReactNode } from 'react'

export default function RootLayout({
  children
}: {
  children: ReactNode
}) {
  return (
    <html>
      <body>
        <NuqsAdapter>{children}</NuqsAdapter>
      </body>
    </html>
  )
}
```

### [Pages router](https://nuqs.dev/docs/adapters\#nextjs-pages-router)

Wrap the `<Component>` page outlet with the `NuqsAdapter` component in your `_app.tsx` file:

src/pages/\_app.tsx

```
import type { AppProps } from 'next/app'
import { NuqsAdapter } from 'nuqs/adapters/next/pages'

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <NuqsAdapter>
      <Component {...pageProps} />
    </NuqsAdapter>
  )
}
```

### [Unified (router-agnostic)](https://nuqs.dev/docs/adapters\#nextjs-unified)

If your Next.js app uses **both the app and pages routers** and the adapter needs
to be mounted in either, you can import the unified adapter, at the cost
of a slightly larger bundle size (~100B).

```
import { NuqsAdapter } from 'nuqs/adapters/next'
```

The main reason for adapters is to open up nuqs to other React frameworks:

## [React SPA](https://nuqs.dev/docs/adapters\#react-spa)

Example, with Vite:

src/main.tsx

```
import { NuqsAdapter } from 'nuqs/adapters/react'

createRoot(document.getElementById('root')!).render(
  <NuqsAdapter>
    <App />
  </NuqsAdapter>
)
```

Note

Because there is no known server in this configuration, the
[`shallow: false`](https://nuqs.dev/docs/options#shallow) option will have no effect.

See below for some options:

### [Full page navigation on \ \ `shallow: false`](https://nuqs.dev/docs/adapters\#full-page-navigation-on-shallow-false)

Introduced in version **2.4.0**.

You can specify a flag to perform a full-page navigation when
updating query state configured with `shallow: false`, to notify the web server
that the URL state has changed, if it needs it for server-side rendering other
parts of the application than the static React bundle:

src/main.tsx

```
createRoot(document.getElementById('root')!).render(
  <NuqsAdapter fullPageNavigationOnShallowFalseUpdates>
    <App />
  </NuqsAdapter>
)
```

This may be useful for servers not written in JavaScript, like Django (Python),
Rails (Ruby), Laravel (PHP), Phoenix (Elixir) etc…

### [Server-rendered islands \ \ (Astro, Fastify, Hono etc.)](https://nuqs.dev/docs/adapters\#server-rendered-islands)

Introduced in version **2.10.0**.

You may use the React SPA adapter in server-rendered frameworks like [Astro](https://astro.build/),
or bespoke server-side rendered applications based on [Fastify](https://fastify.dev/),
[Hono](https://hono.dev/), [Elysia](https://elysiajs.com/), etc.

In those cases, you can pass the `serverSearch` prop to let the SSR’d hooks know about the request URL,
to avoid a flash of default values:

src/pages/search.astro

```
---
import { SearchIsland } from '../islands/SearchIsland'
---

<SearchIsland client:load serverSearch={Astro.url.search} />
```

src/islands/SearchIsland.tsx

```
import { NuqsAdapter } from 'nuqs/adapters/react'

export function SearchIsland({ serverSearch }: { serverSearch: string }) {
  return (
    <NuqsAdapter serverSearch={serverSearch}>
      {/* useQueryState works here, on the server & the client */}
    </NuqsAdapter>
  )
}
```

`serverSearch` accepts a query string (with or without the leading
`?`) or a `URLSearchParams` object. It is only read when
server-side rendering and during hydration; afterwards, the adapter reads
`location.search` as usual. Multiple islands on the same page each get
their own `NuqsAdapter`, and stay in sync through the History API.

## [Remix](https://nuqs.dev/docs/adapters\#remix)

app/root.tsx

```
import { NuqsAdapter } from 'nuqs/adapters/remix'

// ...

export default function App() {
  return (
    <NuqsAdapter>
      <Outlet />
    </NuqsAdapter>
  )
}
```

Deprecation notice

Remix v2 has reached [end of life](https://remix.run/blog/react-router-v8) and
no longer receives security updates. The `nuqs/adapters/remix` adapter will be
removed in nuqs@3.0.0.

Remix has converged into React Router. Migrate to [React Router v7](https://nuqs.dev/docs/adapters#react-router-v7) or [v8](https://nuqs.dev/docs/adapters#react-router-v8) and use the appropriate adapter below.

## [React Router v6](https://nuqs.dev/docs/adapters\#react-router-v6)

src/main.tsx

```
import { NuqsAdapter } from 'nuqs/adapters/react-router/v6'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import App from './App'

const router = createBrowserRouter([\
  {\
    path: '/',\
    element: <App />\
  }\
])

export function ReactRouter() {
  return (
    <NuqsAdapter>
      <RouterProvider router={router} />
    </NuqsAdapter>
  )
}
```

Only `BrowserRouter` is supported. There may be support for `HashRouter`
in the future (see issue [#810](https://github.com/47ng/nuqs/issues/810)), but
support for `MemoryRouter` is not planned.

Deprecation notice

The generic import `nuqs/adapters/react-router` (pointing to v6)
is deprecated and will be removed in nuqs@3.0.0.

Please pin your imports to the specific version:

- `nuqs/adapters/react-router/v6`
- `nuqs/adapters/react-router/v7`
- `nuqs/adapters/react-router/v8`

The main difference is where the React Router hooks are imported from:
`react-router-dom` for v6, and `react-router` for v7 & v8.

Deprecation notice

React Router v6 has reached [end of life](https://remix.run/blog/react-router-v8)
and no longer receives security updates. The `nuqs/adapters/react-router/v6`
adapter will be removed in nuqs@3.0.0.

Upgrade to [React Router v7](https://nuqs.dev/docs/adapters#react-router-v7) or [v8](https://nuqs.dev/docs/adapters#react-router-v8) and use the
appropriate adapter below.

## [React Router v7](https://nuqs.dev/docs/adapters\#react-router-v7)

app/root.tsx

```
import { NuqsAdapter } from 'nuqs/adapters/react-router/v7'
import { Outlet } from 'react-router'

// ...

export default function App() {
  return (
    <NuqsAdapter>
      <Outlet />
    </NuqsAdapter>
  )
}
```

## [React Router v8](https://nuqs.dev/docs/adapters\#react-router-v8)

app/root.tsx

```
import { NuqsAdapter } from 'nuqs/adapters/react-router/v8'
import { Outlet } from 'react-router'

// ...

export default function App() {
  return (
    <NuqsAdapter>
      <Outlet />
    </NuqsAdapter>
  )
}
```

Note: shared with v7

React Router v7 and v8 expose the same `react-router` hooks, so this adapter
currently re-exports the [v7 adapter](https://nuqs.dev/docs/adapters#react-router-v7).

Pinning to `nuqs/adapters/react-router/v8` means a potential future divergence
of implementation won’t require changing your import.

## [TanStack Router](https://nuqs.dev/docs/adapters\#tanstack-router)

src/routes/\_\_root.tsx

```
import { NuqsAdapter } from 'nuqs/adapters/tanstack-router'
import { Outlet, createRootRoute } from '@tanstack/react-router'

export const Route = createRootRoute({
  component: () => (
    <>
      <NuqsAdapter>
        <Outlet />
      </NuqsAdapter>
    </>
  ),
})
```

TanStack Router support is experimental and does not yet cover TanStack Start.

### [Type-safe routing via `validateSearch`](https://nuqs.dev/docs/adapters\#type-safe-routing-via-validatesearch)

TanStack Router comes with built-in type-safe search params support,
and its APIs should likely be used in your application code for best DX.

Nevertheless, sometimes you may need to import a component that uses nuqs
(from NPM or a shared library), and benefit from TanStack Router’s type-safe routing.

You may do so via the [Standard Schema](https://nuqs.dev/docs/utilities#standard-schema) support:

```
import { createFileRoute, Link } from '@tanstack/react-router'
import {
  createStandardSchemaV1,
  parseAsIndex,
  parseAsString,
  useQueryStates
} from 'nuqs'

const searchParams = {
  searchQuery: parseAsString.withDefault(''),
  pageIndex: parseAsIndex.withDefault(0),
}

export const Route = createFileRoute('/search')({
  component: RouteComponent,
  validateSearch: createStandardSchemaV1(searchParams, {
    partialOutput: true
  })
})

function RouteComponent() {
  // Consume nuqs state as usual:
  const [{ searchQuery, pageIndex }] = useQueryStates(searchParams)
  // But now TanStack Router knows about it too:
  return (
    <Link
      to="/search"
      search={{
        searchQuery: 'foo',
        // note: we're not specifying pageIndex
      }}
    />
  )
}
```

Note that the `partialOutput` flag allows specifying only a subset of
the search params for a given route. It also does not reflect those search
in the URL automatically, following nuqs’ behaviour more closely.

Caveats

Due to differences in how TanStack Router and nuqs handle serialisation and deserialisation
(global in TanStack Router and per-key in nuqs), only _trivial_ state types are supported for
type-safe linking. Those include all string-based parsers (string, enum, literals),
number-based (integer, float, number literal), boolean, and JSON.

The `urlKeys` feature to provide shorthand key names is also not supported for similar
reasons.

## [Testing](https://nuqs.dev/docs/adapters\#testing)

Documentation for the `NuqsTestingAdapter` is on the [testing page](https://nuqs.dev/docs/testing).

[Installation\\
\\
Getting started](https://nuqs.dev/docs/installation) [Basic usage\\
\\
Replacing React.useState with useQueryState](https://nuqs.dev/docs/basic-usage)

### On this page

[Next.js](https://nuqs.dev/docs/adapters#nextjs) [App router](https://nuqs.dev/docs/adapters#nextjs-app-router) [Pages router](https://nuqs.dev/docs/adapters#nextjs-pages-router) [Unified (router-agnostic)](https://nuqs.dev/docs/adapters#nextjs-unified) [React SPA](https://nuqs.dev/docs/adapters#react-spa) [Full page navigation on \\
\\
`shallow: false`](https://nuqs.dev/docs/adapters#full-page-navigation-on-shallow-false) [Server-rendered islands \\
\\
(Astro, Fastify, Hono etc.)](https://nuqs.dev/docs/adapters#server-rendered-islands) [Remix](https://nuqs.dev/docs/adapters#remix) [React Router v6](https://nuqs.dev/docs/adapters#react-router-v6) [React Router v7](https://nuqs.dev/docs/adapters#react-router-v7) [React Router v8](https://nuqs.dev/docs/adapters#react-router-v8) [TanStack Router](https://nuqs.dev/docs/adapters#tanstack-router) [Type-safe routing via `validateSearch`](https://nuqs.dev/docs/adapters#type-safe-routing-via-validatesearch) [Testing](https://nuqs.dev/docs/adapters#testing)