# Options

Configuring nuqs

Copy as MarkdownCopy Markdown URLOpen…

By default, `nuqs` will update search params:

1. On the client only (not sending requests to the server),
2. by replacing the current history entry,
3. without scrolling to the top of the page.
4. with a throttle rate adapted to your browser

These default behaviours can be [configured](https://nuqs.dev/docs/options#global-defaults-override),
along with a few additional options.

## [Passing options](https://nuqs.dev/docs/options\#passing-options)

Options can be passed at the hook level via the builder pattern:

```
const [state, setState] = useQueryState(
  'foo',
  parseAsString.withOptions({ history: 'push' })
)
```

Or when calling the state updater function, as a second parameter:

```
setState('foo', { scroll: true })
```

Call-level options will override hook level options.

## [History](https://nuqs.dev/docs/options\#history)

By default, state updates are done by **replacing** the current history entry with
the updated query when state changes.

You can see this as a sort of `git squash`, where all state-changing
operations are merged into a single browsing history entry.

You can also opt-in to **push** a new history entry for each state change,
per key, which will let you use the Back button to navigate state
updates:

```
// Append state changes to history:
useQueryState('foo', { history: 'push' })
```

Watch out!

Breaking the Back button can lead to a bad user experience. Make sure to use this
option only if the search params to update contribute to a navigation-like
experience (eg: tabs, modals). Overriding the Back behaviour must be a UX
enhancement rather than a nuisance.

_— “With great power comes great responsibility.”_

## [Shallow](https://nuqs.dev/docs/options\#shallow)

By default, query state updates are done in a _client-first_ manner: there are
no network calls to the server.

This is equivalent to the `shallow` option of the Next.js router set to `true`.

To opt-in to notifying the server on query updates, you can set `shallow` to `false`:

```
useQueryState('foo', { shallow: false })
```

Note that the shallow option only makes sense if your page can be server-side rendered.
Therefore, it has no effect in React SPA.

For server-side renderable frameworks, you would pair `shallow: false` with:

- In Next.js app router: the `searchParams` page prop to render the RSC tree based on the updated query state.
- In Next.js pages router: the `getServerSideProps` function
- In Remix & React Router: a `loader` function

### [In React Router based frameworks](https://nuqs.dev/docs/options\#in-react-router-based-frameworks)

While the `shallow: true` default behaviour is uncommon for Remix and React Router,
where loaders are always supposed to run on URL changes, nuqs gives you control
of this behaviour, by opting in to running loaders only if they do need to access
the relevant search params.

One caveat is that the stock `useSearchParams` hook from those frameworks doesn’t
reflect shallow-updated search params, so we provide you with one that does:

```
import { useOptimisticSearchParams } from 'nuqs/adapters/remix' // or '…/react-router/v{6,7,8}'

function Component() {
  // Note: this is read-only, but reactive to all URL changes
  const searchParams = useOptimisticSearchParams()
  return <div>{searchParams.get('foo')}</div>
}
```

This concept of _“shallow routing”_ is done via updates to the browser’s
[History API](https://developer.mozilla.org/en-US/docs/Web/API/History_API/Working_with_the_History_API).

Why not using shouldRevalidate?

[`shouldRevalidate`](https://reactrouter.com/start/framework/route-module#shouldrevalidate)
is the idomatic way of opting out of running loaders on navigation, but nuqs uses
the opposite approach: opting in to running loaders only when needed.

In order to avoid specifying `shouldRevalidate` for every route, nuqs chose to
patch the history methods to enable shallow routing by default (on its own updates)
in React Router based frameworks.

## [Scroll](https://nuqs.dev/docs/options\#scroll)

The Next.js router scrolls to the top of the page on navigation updates,
which may not be desirable when updating the query string with local state.

Query state updates won’t scroll to the top of the page by default, but you
can opt-in to this behaviour:

```
useQueryState('foo', { scroll: true })
```

## [Rate-limiting URL updates](https://nuqs.dev/docs/options\#rate-limiting-url-updates)

Because of browsers rate-limiting the History API, updates **to the**
**URL** are queued and throttled to a default of 50ms, which seems to satisfy
most browsers even when sending high-frequency query updates, like binding
to a text input or a slider.

Safari’s rate limits are much stricter and use a default throttle of 120ms
(320ms for older versions of Safari).

Note

the state returned by the hook is always updated **instantly**, to keep UI responsive.
Only changes to the URL, and server requests when using `shallow: false`, are throttled or debounced.

This [throttle](https://nuqs.dev/docs/options#throttle) time is configurable, and also allows you to [debounce](https://nuqs.dev/docs/options#debounce) updates
instead.

Which one should I use?

Throttle will emit the first update immediately, then batch updates at a slower
pace **regularly**. This is recommended for most low-frequency updates.

Debounce will push back the moment when the URL is updated when you set your state,
making it **eventually consistent**. This is recommended for high-frequency
updates where the last value is more interesting than the intermediate ones,
like a search input or moving a slider.

Read more about [debounce vs throttle](https://kettanaito.com/blog/debounce-vs-throttle).

### [Throttle](https://nuqs.dev/docs/options\#throttle)

If you want to increase the throttle time — for example to reduce the amount
of requests sent to the server when paired with `shallow: false` — you can
specify it under the `limitUrlUpdates` option:

```
useQueryState('foo', {
  // Send updates to the server maximum once every second
  shallow: false,
  limitUrlUpdates: {
    method: 'throttle',
    timeMs: 1000
  }
})

// or using the shorthand:
import { throttle } from 'nuqs'

useQueryState('foo', {
  shallow: false,
  limitUrlUpdates: throttle(1000)
})
```

If multiple hooks set different throttle values on the same event loop tick,
the highest value will be used. Also, values lower than 50ms will be ignored,
to avoid rate-limiting issues.
[Read more](https://francoisbest.com/posts/2023/storing-react-state-in-the-url-with-nextjs#batching--throttling).

Specifying a `+Infinity` value for throttle time will **disable** updates to the
URL or the server, but all `useQueryState(s)` hooks will still update their
internal state and stay in sync with each other.

Deprecation notice

The `throttleMs` option has been deprecated in `nuqs@2.5.0` and will be removed
in a later major upgrade.

To migrate:

1. `import { throttle } from 'nuqs'`
2. Replace `{ throttleMs: 100 }` with `{ limitUrlUpdates: throttle(100) }` in your options.

### [Debounce](https://nuqs.dev/docs/options\#debounce)

Do I need debounce?

Debounce only makes sense for **server-side data fetching** (RSCs & loaders, when combined with [`shallow: false`](https://nuqs.dev/docs/options#shallow)),
to control when requests are made to the server. For example: it lets you avoid sending the first
character on its own when typing in a search input, by waiting for the user to finish typing.

If you are **fetching client-side** (eg: with TanStack Query), you’ll want to debounce the
state returned by the hooks instead (using a 3rd party `useDebounce` utility hook).

In addition to throttling, you can apply a debouncing mechanism to URL updates,
to delay the moment where the URL gets updated with the latest value.

The returned state is always updated **immediately**: only the network requests
sent to the server are debounced.

This can be useful for high frequency state updates where the server only cares about
the final value, not all the intermediary ones while typing in a search input
or moving a slider.

We recommend you opt-in to debouncing on specific state updates, rather than
defining it for the whole search param.

Let’s take the example of a search input. You’ll want to update it:

1. When the user is typing text, with debouncing
2. When the user clears the input, by sending an immediate update
3. When the user presses Enter, by sending an immediate update

You can see the debounce case is the outlier here, and actually conditioned on
the set value, so we can specify it using the state updater function:

```
import { useQueryState, parseAsString, debounce } from 'nuqs';

function Search() {
  const [search, setSearch] = useQueryState(
    'q',
    parseAsString
      .withDefault('')
      .withOptions({ shallow: false })
  )

  return (
    <input
      value={search}
      onChange={(e) =>
        setSearch(e.target.value, {
          // Send immediate update if resetting, otherwise debounce at 500ms
          limitUrlUpdates: e.target.value === '' ? undefined : debounce(500)
        })
      }
      onKeyPress={(e) => {
        if (e.key === 'Enter') {
          // Send immediate update
          setSearch(e.target.value)
        }
      }}
    />
  )
}
```

### [Resetting](https://nuqs.dev/docs/options\#resetting)

You can use the `defaultRateLimit` import to reset debouncing or throttling to
the default:

```
import { debounce, defaultRateLimit } from 'nuqs'

const [, setState] = useQueryState('foo', {
  limitUrlUpdates: debounce(1000)
})

// This state update isn't debounced
setState('bar', { limitUrlUpdates: defaultRateLimit })
```

## [Transitions](https://nuqs.dev/docs/options\#transitions)

When combined with `shallow: false`, you can use React’s `useTransition` hook
to get loading states while the server is re-rendering server components with
the updated URL.

Pass in the `startTransition` function from `useTransition` to the options
to enable this behaviour:

```
'use client'

import React from 'react'
import { useQueryState, parseAsString } from 'nuqs'

function ClientComponent({ data }) {
  // 1. Provide your own useTransition hook:
  const [isLoading, startTransition] = React.useTransition()
  const [query, setQuery] = useQueryState(
    'query',
    // 2. Pass the `startTransition` as an option:
    parseAsString.withOptions({ startTransition, shallow: false })
  )
  // 3. `isLoading` will be true while the server is re-rendering
  // and streaming RSC payloads, when the query is updated via `setQuery`.

  // Indicate loading state
  if (isLoading) return <div>Loading...</div>

  // Normal rendering with data
  return <div>...</div>
}
```

React Router support

In React Router v7+ data routers, `navigate()` returns a Promise, so
`isLoading` stays true until route loaders have settled (this requires
React 19, where transitions can await promises).

In declarative routers, React Router v6, and Remix, `navigate()` doesn’t
report navigation completion, so `isLoading` only covers the URL update.
In data router apps, use
[`useNavigation`](https://reactrouter.com/api/hooks/useNavigation) to
track loader states instead.

In `nuqs@1.x.x`, passing `startTransition` as an option automatically sets
`shallow: false`.

This is no longer the case in `nuqs@>=2.0.0`: you’ll need to set it explicitly.

## [Clear on default](https://nuqs.dev/docs/options\#clear-on-default)

When the state is set to the default value, the search parameter is
removed from the URL, instead of being reflected explicitly.

However, sometimes you might want to keep the search parameter in the URL,
because **default values _can_ change**, and the meaning of the URL along with it.

Example of defaults changing

In `nuqs@1.x.x`, `clearOnDefault` was `false` by default.

In `nuqs@2.0.0`, `clearOnDefault` is now `true` by default, in response
to [user feedback](https://x.com/fortysevenfx/status/1841610237540696261).

If you want to keep the search parameter in the URL when it’s set to the default
value, you can set `clearOnDefault` to `false`:

```
useQueryState('search', {
  defaultValue: '',
  clearOnDefault: false
})
```

Tip

Clearing the key-value pair from the query string can always be done by setting the state to `null`.

This option compares the set state against the default value using `===`
reference equality, so if you are using a [custom parser](https://nuqs.dev/docs/parsers/making-your-own)
for a state type that wouldn’t work with reference equality, you should provide
the `eq` function to your parser (this is done for you in built-in parsers):

```
const dateParser = createParser({
  parse: (value: string) => new Date(value.slice(0, 10)),
  serialize: (date: Date) => date.toISOString().slice(0, 10),
  eq: (a: Date, b: Date) => a.getTime() === b.getTime()
})
```

## [Adapter props](https://nuqs.dev/docs/options\#adapter-props)

The following options are global and can be passed directly
on the [`<NuqsAdapter>`](https://nuqs.dev/docs/adapters) as props, and apply to its whole
children tree.

### [Global defaults override](https://nuqs.dev/docs/options\#global-defaults-override)

Introduced in version **2.5.0**.

Default values for some options can be configured globally via the `defaultOptions`
adapter prop:

```
<NuqsAdapter
  defaultOptions={{
    history: 'push',
    shallow: false,
    scroll: true,
    clearOnDefault: false,
    limitUrlUpdates: throttle(250),
  }}
>
  {children}
</NuqsAdapter>
```

Don't break the Back button

Setting `history: 'push'` globally will add a new entry to the navigation
history for **every** search param update across your whole app, which is likely
to pollute the Back/Forward history and degrade that experience.

Prefer opting into `history: 'push'` on a per-hook or per-call basis, only
where the search params contribute to a navigation-like experience (eg: tabs,
modals).

### [Processing `URLSearchParams`](https://nuqs.dev/docs/options\#processing-urlsearchparams)

Introduced in version **2.6.0**.

You can pass a `processUrlSearchParams` callback to the adapter,
which will be called _after_ the `URLSearchParams` have been merged
when performing a state update, and _before_ they are sent to the adapter
for updating the URL.

Think of it as a sort of **middleware** for processing search params.

#### [Alphabetical Sort](https://nuqs.dev/docs/options\#alphabetical-sort)

Sort the search parameters alphabetically:

```
<NuqsAdapter
  processUrlSearchParams={(search) => {
    // Note: you can modify search in-place,
    // or return a copy, as you wish.
    search.sort()
    return search
  }}
>
  {children}
</NuqsAdapter>
```

_Try toggling **c**, then **b**, then **a**, and note how the URL remains ordered:_

Enable alphabetical sorting on updates

```
<empty query>
```

Toggle "a"

Toggle "b"

Toggle "c"

#### [Timestamp](https://nuqs.dev/docs/options\#timestamp)

Add a timestamp to the search parameters:

```
<NuqsAdapter
  processUrlSearchParams={(search) => {
    search.set('ts', Date.now().toString())
    return search
  }}
>
  {children}
</NuqsAdapter>
```

```
<empty query>
```

Increment "d": 0

Increment "e": 0

Increment "f": 0

[Sury Parsers\\
\\
Use Sury to parse, serialize and compare URL state.](https://nuqs.dev/docs/parsers/community/sury) [useQueryStates\\
\\
How to read & update multiple search params at once](https://nuqs.dev/docs/batching)

### On this page

[Passing options](https://nuqs.dev/docs/options#passing-options) [History](https://nuqs.dev/docs/options#history) [Shallow](https://nuqs.dev/docs/options#shallow) [In React Router based frameworks](https://nuqs.dev/docs/options#in-react-router-based-frameworks) [Scroll](https://nuqs.dev/docs/options#scroll) [Rate-limiting URL updates](https://nuqs.dev/docs/options#rate-limiting-url-updates) [Throttle](https://nuqs.dev/docs/options#throttle) [Debounce](https://nuqs.dev/docs/options#debounce) [Resetting](https://nuqs.dev/docs/options#resetting) [Transitions](https://nuqs.dev/docs/options#transitions) [Clear on default](https://nuqs.dev/docs/options#clear-on-default) [Adapter props](https://nuqs.dev/docs/options#adapter-props) [Global defaults override](https://nuqs.dev/docs/options#global-defaults-override) [Processing `URLSearchParams`](https://nuqs.dev/docs/options#processing-urlsearchparams) [Alphabetical Sort](https://nuqs.dev/docs/options#alphabetical-sort) [Timestamp](https://nuqs.dev/docs/options#timestamp)