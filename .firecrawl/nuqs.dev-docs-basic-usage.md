# Basic usage

Replacing React.useState with useQueryState

Copy as MarkdownCopy Markdown URLOpen…

Prerequisite

Have you setup your app with the appropriate [**adapter**](https://nuqs.dev/docs/adapters)? Then you
are all set!

If you are using `React.useState` to manage your local UI state,
you can replace it with `useQueryState` to sync it with the URL.

```
'use client'

import { useQueryState } from 'nuqs'

export function Demo() {
  const [name, setName] = useQueryState('name')
  return (
    <>
      <input value={name || ''} onChange={e => setName(e.target.value)} />
      <button onClick={() => setName(null)}>Clear</button>
      <p>Hello, {name || 'anonymous visitor'}!</p>
    </>
  )
}
```

```
<empty query>
```

Hello, anonymous visitor!Clear

`useQueryState` takes one required argument: the key to use in the query string.

Like `React.useState`, it returns an array with the value present in the query
string as a string (or `null` if none was found), and a state updater function.

Example outputs for our demo example:

| URL | name value | Notes |
| --- | --- | --- |
| `/` | `null` | No `name` key in URL |
| `/?name=` | `''` | Empty string |
| `/?name=foo` | `'foo'` |  |
| `/?name=2` | `'2'` | Always returns a string by default, see [Parsers](https://nuqs.dev/docs/parsers) |

Tip

Setting `null` as a value will remove the key from the query string.

## [Default values](https://nuqs.dev/docs/basic-usage\#default-values)

When the query string is not present in the URL, the default behaviour is to
return `null` as state.

It can make state updating and UI rendering tedious.
Take this example of a simple counter stored in the URL:

```
import { useQueryState, parseAsInteger } from 'nuqs'

export default () => {
  const [count, setCount] = useQueryState('count', parseAsInteger)
  return (
    <>
      <pre>count: {count}</pre>
      <button onClick={() => setCount(0)}>Reset</button>
      {/* handling null values in setCount is annoying: */}
      <button onClick={() => setCount(c => (c ?? 0) + 1)}>+</button>
      <button onClick={() => setCount(c => (c ?? 0) - 1)}>-</button>
      <button onClick={() => setCount(null)}>Clear</button>
    </>
  )
}
```

You can provide a default value as the second argument to `useQueryState` (or
via the `.withDefault` builder method on parsers):

```
const [search] = useQueryState('search', { defaultValue: '' })
//      ^? string

const [count] = useQueryState('count', parseAsInteger)
//      ^? number | null -> no default value = nullable

const [count] = useQueryState('count', parseAsInteger.withDefault(0))
//      ^? number
```

It makes it much easier to handle state updates:

```
const increment = () => setCount(c => c + 1) // c will never be null
const decrement = () => setCount(c => c - 1) // c will never be null
const clearCount = () => setCount(null) // Remove query from the URL
```

Note

The default value is internal to React, it will **not** be written to the
URL _unless you set it explicitly_ and use the [`clearOnDefault: false` option](https://nuqs.dev/docs/options#clear-on-default).

Tip

The default value is also returned if the value is _invalid_ for the parser.

Tip

Setting the state to `null` when a default value is specified:

1. Clears the query from the URL
2. Returns the default value as state

[Adapters\\
\\
Using nuqs in your React framework of choice](https://nuqs.dev/docs/adapters) [Built-in parsers\\
\\
When using strings is not enough](https://nuqs.dev/docs/parsers/built-in)

### On this page

[Default values](https://nuqs.dev/docs/basic-usage#default-values)