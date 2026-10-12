# Quick start

A quick guide to getting started with Base UI.

[View as Markdown](https://base-ui.com/react/overview/quick-start.md)

## [Install the library](https://base-ui.com/react/overview/quick-start\#install-the-library)

Install Base UI using a package manager.

Installation command

pnpmnpmyarnbun

```bash
npm i @base-ui/react
```

All components are included in a single package. Base UI is tree-shakable, so your app bundle will contain only the components that you actually use.

## [Set up](https://base-ui.com/react/overview/quick-start\#set-up)

### [Portals](https://base-ui.com/react/overview/quick-start\#portals)

Base UI uses portals for components that render popups, such as Dialog and Popover.
To make portaled components always appear on top of the entire page, add the following style to your application layout root:

layout.tsx

```tsx
<body>
  <div className="root">
    {children}
  </div>
</body>
```

styles.css

```css
.root {
  isolation: isolate;
}
```

This style creates a separate stacking context for your application’s `.root` element.
This way, popups always appear above the page contents, and any `z-index` property in your styles won’t interfere with them.

### [iOS 26+ Safari](https://base-ui.com/react/overview/quick-start\#ios-26-safari)

Starting with iOS 26, Safari allows content beneath the UI chrome to be visible. Backdrops such as those used by dialogs must use `position: absolute` instead of `position: fixed` to cover the entire visual viewport. For this to work after the page is scrolled, the following style must be added to your global styles:

styles.css

```css
body {
  position: relative;
}
```

## [Assemble a component](https://base-ui.com/react/overview/quick-start\#assemble-a-component)

This demo shows you how to import a [Popover](https://base-ui.com/react/components/popover) component, assemble its parts, and apply styles.
There are examples for both Tailwind and CSS Modules below, but since Base UI is unstyled, you can use CSS-in-JS, plain CSS, or any other styling solution you prefer.

Notifications

[index.tsx](https://base-ui.com/react/overview/quick-start#hero:css-modules:index.tsx) [index.module.css](https://base-ui.com/react/overview/quick-start#hero:css-modules:index.module.css)

CSS ModulesStackBlitz

CSS ModulesStackBlitz

```tsx
import * as React from 'react';
import { Popover } from '@base-ui/react/popover';
import styles from './index.module.css';

export default function ExamplePopover() {
  return (
    <Popover.Root>
      <Popover.Trigger className={styles.Button}>Notifications</Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner sideOffset={8}>
          <Popover.Popup className={styles.Popup}>
            <Popover.Arrow className={styles.Arrow} />
            <Popover.Title className={styles.Title}>Notifications</Popover.Title>
            <Popover.Description className={styles.Description}>
              You are all caught up. Good job!
            </Popover.Description>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
```

Show code

## [Pre-styled components](https://base-ui.com/react/overview/quick-start\#pre-styled-components)

[shadcn/ui](https://ui.shadcn.com/) is a great place to start if you need pre-styled components with higher-level abstractions. It uses Base UI as its unstyled foundation.

Take a look at the [Community](https://base-ui.com/react/overview/community) page to see more styled libraries powered by Base UI.

## [Working with LLMs](https://base-ui.com/react/overview/quick-start\#working-with-llms)

For those of you working with LLMs, each docs page has a “View as Markdown” link at the top, which can be shared with AI chat assistants to help them understand Base UI concepts and component APIs.

Additionally, there is an [“llms.txt”](https://base-ui.com/llms.txt) link in the “Handbook” section of the navigation sidebar, which you can feed to AI chat assistants to help them navigate the docs.

## [Next steps](https://base-ui.com/react/overview/quick-start\#next-steps)

This walkthrough outlines the basics of putting together a Base UI component.
Continue to the [Handbook](https://base-ui.com/react/handbook/styling) section for broader guidance on topics like styling, animation, and composition, or explore the [components](https://base-ui.com/react/components/accordion).