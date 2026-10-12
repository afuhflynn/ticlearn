Parsers

# Built-in parsers

When using strings is not enough

Copy as MarkdownCopy Markdown URLOpen…

Search params are strings by default, but chances are your state is more complex than that.

You might want to use numbers, booleans, Dates, objects, arrays, or even custom types.
This is where **parsers** come in.

`nuqs` provides built-in parsers for the most common types, and allows you to [define your own](https://nuqs.dev/docs/parsers/making-your-own). Community parsers like [UUID](https://nuqs.dev/registry/parser-uuid) are available from the [shadcn registry](https://nuqs.dev/registry).

## [String](https://nuqs.dev/docs/parsers/built-in\#string)

```
import { parseAsString } from 'nuqs'
```

```
<empty query>
```

Clear

Type-safety tip

`parseAsString` is a noop: it does not perform any validation when parsing,
and will accept **any** value.

If you’re expecting a certain set of string values, like `'foo' | 'bar'`,
see [Literals](https://nuqs.dev/docs/parsers/built-in#literals) for ensuring type-runtime safety.

If search params are strings by default, what’s the point of this _“parser”_ ?

It becomes useful if you’re declaring a search params object, and/or you want
to use the builder pattern to specify [default values](https://nuqs.dev/docs/basic-usage#default-values)
and [options](https://nuqs.dev/docs/options):

```
export const searchParamsParsers = {
  q: parseAsString.withDefault('').withOptions({
    shallow: false
  })
}
```

## [Numbers](https://nuqs.dev/docs/parsers/built-in\#numbers)

### [Integers](https://nuqs.dev/docs/parsers/built-in\#integers)

Transforms the search param string into an integer with `parseInt` (base 10).

```
import { parseAsInteger } from 'nuqs'

useQueryState('int', parseAsInteger.withDefault(0))
```

```
<empty query>
```

Clear

### [Floating point](https://nuqs.dev/docs/parsers/built-in\#floating-point)

Same as integer, but uses `parseFloat` under the hood.

```
import { parseAsFloat } from 'nuqs'

useQueryState('float', parseAsFloat.withDefault(0))
```

```
<empty query>
```

Clear

### [Hexadecimal](https://nuqs.dev/docs/parsers/built-in\#hexadecimal)

Encodes integers in hexadecimal.

```
import { parseAsHex } from 'nuqs'

useQueryState('hex', parseAsHex.withDefault(0x00))
```

```
<empty query>
```

Clear

Going further

Check out the [Hex Colors](https://nuqs.dev/playground/hex-colors) playground for a demo.

### [Index](https://nuqs.dev/docs/parsers/built-in\#index)

Same as integer, but adds a `+1` offset to the serialized querystring (and `-1` when parsing).
Useful for pagination indexes.

```
import { parseAsIndex } from 'nuqs'

const [pageIndex] = useQueryState('page', parseAsIndex.withDefault(0))
```

```
<empty query>
```

```
pageIndex: 0 // internal state is zero-indexed
```

Clear

## [Boolean](https://nuqs.dev/docs/parsers/built-in\#boolean)

```
import { parseAsBoolean } from 'nuqs'

useQueryState('bool', parseAsBoolean.withDefault(false))
```

```
<empty query>
```

Checked: `false`Clear

## [Literals](https://nuqs.dev/docs/parsers/built-in\#literals)

These parsers extend the basic integer and float parsers, but validate against
some expected values, defined as [TypeScript literals](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#literal-types).

```
import { parseAsStringLiteral, type inferParserType } from 'nuqs'

// Create parser
const parser = parseAsStringLiteral(['asc', 'desc'])

// Optional: extract the type
type SortOrder = inferParserType<typeof parser> // 'asc' | 'desc'
```

Should I declare values inline or outside the parser?

It depends®. Declaring them inline is shorter, and makes the parser
the source of truth for type inference with `inferParserType`,
but it locks the values inside the parser.

Declaring them outside allows reading and iterating over the values at runtime.
Don’t forget to add `as const` though, otherwise the type will widen as a `string`.

### [String literals](https://nuqs.dev/docs/parsers/built-in\#string-literals)

```
import { parseAsStringLiteral } from 'nuqs'

// List accepted values
const sortOrder = ['asc', 'desc'] as const

// Then pass it to the parser
parseAsStringLiteral(sortOrder)
```

```
<empty query>
```

No order definedClear

### [Numeric literals](https://nuqs.dev/docs/parsers/built-in\#numeric-literals)

```
import { parseAsNumberLiteral } from 'nuqs'

parseAsNumberLiteral([1, 2, 3, 4, 5, 6])
```

```
import { parseAsNumberLiteral } from 'nuqs'

// List accepted values
const diceSides = [1, 2, 3, 4, 5, 6] as const

// Then pass it to the parser
parseAsNumberLiteral(diceSides)
```

## [Enums](https://nuqs.dev/docs/parsers/built-in\#enums)

String enums are a bit more verbose than string literals, but `nuqs` supports them.

```
enum Direction {
  up = 'UP',
  down = 'DOWN',
  left = 'LEFT',
  right = 'RIGHT'
}

parseAsStringEnum<Direction>(Object.values(Direction))
```

Note

The query string value will be the **value** of the enum, not its name (here:
`?direction=UP`).

## [Dates & timestamps](https://nuqs.dev/docs/parsers/built-in\#dates--timestamps)

There are three parsers that give you a `Date` object, their difference is
on how they encode the value into the query string.

### [ISO 8601 Datetime](https://nuqs.dev/docs/parsers/built-in\#iso-8601-datetime)

```
import { parseAsIsoDateTime } from 'nuqs'
```

```
<empty query>
```

UTC

NowClear

### [ISO 8601 Date](https://nuqs.dev/docs/parsers/built-in\#iso-8601-date)

Introduced in version **2.1.0**.

```
import { parseAsIsoDate } from 'nuqs'
```

```
<empty query>
```

UTC

NowClear

The Date is parsed without the time zone offset, making it at 00:00:00 UTC.

### [Timestamp](https://nuqs.dev/docs/parsers/built-in\#timestamp)

Miliseconds since the Unix epoch.

```
import { parseAsTimestamp } from 'nuqs'
```

```
<empty query>
```

UTC

NowClear

## [Arrays](https://nuqs.dev/docs/parsers/built-in\#arrays)

All of the parsers on this page can be used to parse arrays of their respective types.

```
import { parseAsArrayOf, parseAsInteger } from 'nuqs'

parseAsArrayOf(parseAsInteger)

// Optionally, customise the separator
parseAsArrayOf(parseAsInteger, ';')
```

## [JSON](https://nuqs.dev/docs/parsers/built-in\#json)

If primitive types are not enough, you can encode JSON in the query string.

Pass it a [Standard Schema](https://standardschema.dev/) (eg: a Zod schema)
to validate and infer the type of the parsed data:

```
import { parseAsJson } from 'nuqs'
import { z } from 'zod'

const schema = z.object({
  pkg: z.string(),
  version: z.number(),
  worksWith: z.array(z.string())
})

// This parser is a function, don't forget to call it
// with your schema as an argument.
const [json, setJson] = useQueryState('json', parseAsJson(schema))

setJson({
  pkg: 'nuqs',
  version: 2,
  worksWith: ['Next.js', 'React', 'Remix', 'React Router', 'and more']
})
```

```
<empty query>
```

```
null
```

Try itClear

Using other validation libraries is possible: `parseAsJson` accepts
any Standard Schema compatible input (eg: ArkType, Valibot, Sury),
or a custom validation function (eg: Yup, Joi, etc):

```
import { object, string, number } from 'yup';

let userSchema = object({
  name: string().required(),
  age: number().required().positive().integer(),
});

parseAsJson(userSchema.validateSync)
```

Note

Validation functions must either throw an error or
return `null` for invalid data. Only **synchronous** validation is supported.

## [Native Arrays](https://nuqs.dev/docs/parsers/built-in\#native-arrays)

Introduced in version **2.7.0**.

If you want to use the native URL format for arrays, repeating the same key multiple times like:

```
/products?tag=books&tag=tech&tag=design
```

you can now use `MultiParsers` like `parseAsNativeArrayOf` to read and write those values in a fully type-safe way.

```
import { useQueryState, parseAsNativeArrayOf, parseAsInteger } from 'nuqs'

const [projectIds, setProjectIds] = useQueryState(
  'project',
  parseAsNativeArrayOf(parseAsInteger)
)

// ?project=123&project=456 → [123, 456]
```

```
<empty query>
```

Add random numberRemove last numberClear

```
[]
```

Note: empty array default

`parseAsNativeArrayOf` has a built-in default value of empty array (`.withDefault([])`) so that you don’t have to handle `null` cases.

Calls to `.withDefault()` can be chained, so you can use it to set a custom default.

## [Using parsers server-side](https://nuqs.dev/docs/parsers/built-in\#using-parsers-server-side)

For shared code that may be imported in the Next.js app router, you should import
parsers from `nuqs/server` to use them in both server & client code,
as it doesn’t include the `'use client'` directive.

```
import { parseAsString } from 'nuqs/server'
```

Importing from `nuqs` will only work in client code, and will throw bundling errors
when using functions (like `.withDefault` & `.withOptions`)
across shared code.

For all other frameworks, you can use either interchangeably, as they don’t
care about the `'use client'` directive.

[Basic usage\\
\\
Replacing React.useState with useQueryState](https://nuqs.dev/docs/basic-usage) [Custom parsers\\
\\
Making your own parsers for custom data types & pretty URLs](https://nuqs.dev/docs/parsers/making-your-own)

### On this page

[String](https://nuqs.dev/docs/parsers/built-in#string) [Numbers](https://nuqs.dev/docs/parsers/built-in#numbers) [Integers](https://nuqs.dev/docs/parsers/built-in#integers) [Floating point](https://nuqs.dev/docs/parsers/built-in#floating-point) [Hexadecimal](https://nuqs.dev/docs/parsers/built-in#hexadecimal) [Index](https://nuqs.dev/docs/parsers/built-in#index) [Boolean](https://nuqs.dev/docs/parsers/built-in#boolean) [Literals](https://nuqs.dev/docs/parsers/built-in#literals) [String literals](https://nuqs.dev/docs/parsers/built-in#string-literals) [Numeric literals](https://nuqs.dev/docs/parsers/built-in#numeric-literals) [Enums](https://nuqs.dev/docs/parsers/built-in#enums) [Dates & timestamps](https://nuqs.dev/docs/parsers/built-in#dates--timestamps) [ISO 8601 Datetime](https://nuqs.dev/docs/parsers/built-in#iso-8601-datetime) [ISO 8601 Date](https://nuqs.dev/docs/parsers/built-in#iso-8601-date) [Timestamp](https://nuqs.dev/docs/parsers/built-in#timestamp) [Arrays](https://nuqs.dev/docs/parsers/built-in#arrays) [JSON](https://nuqs.dev/docs/parsers/built-in#json) [Native Arrays](https://nuqs.dev/docs/parsers/built-in#native-arrays) [Using parsers server-side](https://nuqs.dev/docs/parsers/built-in#using-parsers-server-side)