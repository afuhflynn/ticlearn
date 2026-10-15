# Design system

TiCLearn uses one owned set of `components/ui/` primitives, built on Radix UI, styled only with semantic tokens, mobile first. Read this before building any screen.

## Component ownership

- `components/ui/` is the only primitive layer. Check what already exists before writing a `<button>`, `<input>`, `<select>` or `<textarea>`.
- The base is Radix UI. `combobox.tsx` is the one Base UI exception.
- AISurfaces go through `components/ai-elements/`; assistant markdown goes through `components/markdown.tsx`.
- Custom primitives live in `components/ui/`; compositions live in `components/<feature>/`. Build a primitive only when two or more screens need it and no registry or element covers it.

## Tokens

- Colour is tokens only: no hex, no oklch literal, no raw palette classes. Dark mode changes only the `.dark` block.
- Semantic pairs only, such as `bg-primary` with `text-primary-foreground`.
- Tokens are declared only in `app/globals.css` under `:root` and `.dark`, exposed through `@theme inline`.
- `--radius` is the only corner knob. No bespoke `rounded-*` values.

## Accessibility

- Every focusable control shows a focus indicator using full opacity `ring-ring`.
- Touch targets are at least 44 by 44 pixels. Targets only reachable by pointer may be 24 by 24.
- Respect `prefers-reduced-motion`. Charts ship a visually hidden data table.

## Responsive contract

Mobile first. Unprefixed classes are the phone layout. Breakpoints are `sm:` 640px, `md:` 768px, `lg:` 1024px, `xl:` 1280px. Content stacks in one column until `md`, navigation collapses to a Sheet below `sm`, data tables switch to stacked cards below `md`. No new breakpoints.

## No new styling systems

Tailwind v4 with tokens only. No CSS modules, no CSS in JS, no second utility library.

## References

Full decision: `docs/specs/0004-design-system-and-ui-toolkit-convention/index.md`
