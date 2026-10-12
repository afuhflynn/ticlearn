# Server-Side usage

Type-safe search params on the server

Copy as MarkdownCopy Markdown URLOpen…

## [Loaders](https://nuqs.dev/docs/server-side\#loaders)

Introduced in version **2.3.0**.

To parse search params server-side, you can use a _loader_ function.

You create one using the `createLoader` function, by passing it your search params
descriptor object:

searchParams.tsx

```
import { parseAsFloat, createLoader } from 'nuqs/server'

// Describe your search params, and reuse this in useQueryStates / createSerializer:
export const coordinatesSearchParams = {
  latitude: parseAsFloat.withDefault(0),
  longitude: parseAsFloat.withDefault(0)
}

export const loadSearchParams = createLoader(coordinatesSearchParams)
```

Here, `loadSearchParams` is a function that parses search params and returns
state variables to be consumed server-side (the same state type that [`useQueryStates`](https://nuqs.dev/docs/batching) returns).

Next.js (app router)Next.js (pages router)API routesRemix / React RouterReact / client-side

app/page.tsx

```
import { loadSearchParams } from './search-params'
import type { SearchParams } from 'nuqs/server'

type PageProps = {
  searchParams: Promise<SearchParams>
}

export default async function Page({ searchParams }: PageProps) {
  const { latitude, longitude } = await loadSearchParams(searchParams)
  return <Map
    lat={latitude}
    lng={longitude}
  />

  // Pro tip: you don't *have* to await the result.
  // Pass the Promise object to children components wrapped in <Suspense>
  // to benefit from PPR / dynamicIO and serve a static outer shell
  // immediately, while streaming in the dynamic parts that depend on
  // the search params when they become available.
}
```

Note

Loaders **don’t validate** your data. If you expect positive integers
or JSON-encoded objects of a particular shape, you’ll need to feed the result
of the loader to a schema validation library, like [Zod](https://zod.dev/).

Built-in validation support is coming. [Read the RFC](https://github.com/47ng/nuqs/discussions/446).
Alternatively, you can build validation into [custom parsers](https://nuqs.dev/docs/parsers/making-your-own).

The loader function will accept the following input types to parse search params from:

- A string containing a fully qualified URL: `https://example.com/?foo=bar`
- A string containing just search params: `?foo=bar` (like `location.search`)
- A `URL` object
- A `URLSearchParams` object
- A `Request` object
- A `Record<string, string | string[] | undefined>` (eg: `{ foo: 'bar' }`)
- A `Promise` of any of the above, in which case it also returns a Promise.

### [Strict mode](https://nuqs.dev/docs/server-side\#strict-mode)

Introduced in version **2.5.0**.

If a search param contains an invalid value for the associated parser (eg: `?count=banana` for `parseAsInteger`),
the default behaviour is to return the [default value](https://nuqs.dev/docs/basic-usage#default-values) if specified, or `null` otherwise.

You can turn on **strict mode** to instead throw an error on invalid values when running the loader:

```
const loadSearchParams = createLoader({
  count: parseAsInteger.withDefault(0)
})

// Default: will return { count: 0 }
loadSearchParams('?count=banana')

// Strict mode: will throw an error
loadSearchParams('?count=banana', { strict: true })
// [nuqs] Error while parsing query `banana` for key `count`
```

## [Cache](https://nuqs.dev/docs/server-side\#cache)

Introduced in version **1.13.0**.

If you wish to access the searchParams in a deeply nested Server Component
(ie: not in the Page component), you can use `createSearchParamsCache`
to do so in a type-safe manner.

Think of it as a loader combined with a way to propagate the parsed values down
the RSC tree, like Context would on the client.

searchParams.ts

```
import {
  createSearchParamsCache,
  parseAsInteger,
  parseAsString
} from 'nuqs/server'
// Note: import from 'nuqs/server' to avoid the "use client" directive

export const searchParamsCache = createSearchParamsCache({
  // List your search param keys and associated parsers here:
  q: parseAsString.withDefault(''),
  maxResults: parseAsInteger.withDefault(10)
})
```

page.tsx

```
import { searchParamsCache } from './searchParams'
import { type SearchParams } from 'nuqs/server'

type PageProps = {
  searchParams: Promise<SearchParams> // Next.js 15+: async searchParams prop
}

export default async function Page({ searchParams }: PageProps) {
  // ⚠️ Don't forget to call `parse` here.
  // You can access type-safe values from the returned object:
  const { q: query } = await searchParamsCache.parse(searchParams)
  return (
    <div>
      <h1>Search Results for {query}</h1>
      <Results />
    </div>
  )
}

function Results() {
  // Access type-safe search params in children server components:
  const maxResults = searchParamsCache.get('maxResults')
  return <span>Showing up to {maxResults} results</span>
}
```

The cache will only be valid for the current page render
(see React’s [`cache`](https://react.dev/reference/react/cache) function).

Note: the cache only works for **server components**, but you may share your
parser declaration with `useQueryStates` for type-safety in client components:

searchParams.ts

```
import {
  parseAsFloat,
  createSearchParamsCache
} from 'nuqs/server'

export const coordinatesParsers = {
  lat: parseAsFloat.withDefault(45.18),
  lng: parseAsFloat.withDefault(5.72)
}
export const coordinatesCache = createSearchParamsCache(coordinatesParsers)
```

page.tsx

```
import { coordinatesCache } from './searchParams'
import { Server } from './server'
import { Client } from './client'

export default async function Page({ searchParams }) {
  // Note: you can also use strict mode here:
  await coordinatesCache.parse(searchParams, { strict: true })
  return (
    <>
      <Server />
      <Suspense>
        <Client />
      </Suspense>
    </>
  )
}
```

server.tsx

```
import { coordinatesCache } from './searchParams'

export function Server() {
  const { lat, lng } = coordinatesCache.all()
  // or access keys individually:
  const lat = coordinatesCache.get('lat')
  const lng = coordinatesCache.get('lng')
  return (
    <span>
      Latitude: {lat} - Longitude: {lng}
    </span>
  )
}
```

client.tsx

```
'use client'

import { useQueryStates } from 'nuqs'
import { coordinatesParsers } from './searchParams'

export function Client() {
  const [{ lat, lng }, setCoordinates] = useQueryStates(coordinatesParsers)
  // ...
}
```

### [Shorter search params keys](https://nuqs.dev/docs/server-side\#shorter-search-params-keys)

Just like with `useQueryStates`, you can
define a [`urlKeys`](https://nuqs.dev/docs/batching#shorter-search-params-keys) object to map the variable names defined by the parser to
shorter keys in the URL. They will be translated on read and your codebase
can only refer to variable names that make sense for your domain or business logic.

searchParams.ts

```
export const coordinatesParsers = {
  // Use human-readable variable names throughout your codebase
  latitude: parseAsFloat.withDefault(45.18),
  longitude: parseAsFloat.withDefault(5.72)
}
export const coordinatesCache = createSearchParamsCache(coordinatesParsers, {
  urlKeys: {
    // Remap them to read from shorter keys in the URL
    latitude: 'lat',
    longitude: 'lng'
  }
})
```

[useQueryStates\\
\\
How to read & update multiple search params at once](https://nuqs.dev/docs/batching) [Limits\\
\\
There are some limits you should be aware of when using nuqs or URL params in general.](https://nuqs.dev/docs/limits)

### On this page

[Loaders](https://nuqs.dev/docs/server-side#loaders) [Next.js (app router)](https://nuqs.dev/docs/server-side#nextjs-app-router) [Next.js (pages router)](https://nuqs.dev/docs/server-side#nextjs-pages-router) [Remix / React Router](https://nuqs.dev/docs/server-side#remix-react-router) [React / client-side](https://nuqs.dev/docs/server-side#react-client-side) [API routes](https://nuqs.dev/docs/server-side#api-routes) [Strict mode](https://nuqs.dev/docs/server-side#strict-mode) [Cache](https://nuqs.dev/docs/server-side#cache) [Shorter search params keys](https://nuqs.dev/docs/server-side#shorter-search-params-keys)