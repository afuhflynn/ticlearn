# A fully featured React   components library

Build fully functional accessible web applications faster than ever – Mantine includes more than 120 customizable components and 70 hooks to cover you in any situation

[Get Started](https://mantine.dev/getting-started/) [GitHub](https://github.com/mantinedev/mantine)

Sponsored by

[![Metabase](https://opencollective-production.s3.us-west-1.amazonaws.com/account-avatar/6daa6216-6749-4a98-96c9-976d311cec1e/54813187-8601-458a-bec2-8ac3df42919b.png)Metabase](https://www.metabase.com/?utm_campaign=opencollective) [![PropelAuth](https://opencollective-production.s3.us-west-1.amazonaws.com/account-avatar/e6d0bf51-6618-4c51-a19f-a6f79d71779b/social-logo-small.png)PropelAuth](https://www.propelauth.com/) [![Medplum](https://opencollective-production.s3.us-west-1.amazonaws.com/account-avatar/ce7222f1-22a5-48d7-8d54-a91405c1b02a/medplum-symbol-512x512.png)Medplum](https://www.medplum.com/) [![N-iX Ltd](https://opencollective-production.s3.us-west-1.amazonaws.com/account-avatar/6d43cabd-7f83-4770-8b2e-068e70aded73/N-iX_Logo-RGB_Main%20(2).jpg)N-iX Ltd](https://www.n-ix.com/) [![Followerhit](https://opencollective-production.s3.us-west-1.amazonaws.com/account-avatar/58c39ad3-082f-46e5-aa75-e1a195d3179b/followerhit-square-d.webp)Followerhit](https://followerhit.de/) [You? ❤️\\
Sponsor Mantine to get featured here and support the project.](https://opencollective.com/mantinedev)

## Built for the AI-assisted workflow

LLM-optimized docs, agent skills for complex tasks, and an MCP server for direct API access — Mantine is designed to work with Cursor, Claude Code, Windsurf, and every AI coding tool you already use.

[Learn more about LLM integrations](https://mantine.dev/guides/llms/)

### LLM documentation

llms.txt and llms-full.txt files follow the LLMs.txt standard – use them with Cursor, Windsurf, ChatGPT, Claude, and other AI tools

### Skills for AI agents

Install Mantine skills for complex tasks like building forms, custom components, and combobox-based inputs

### MCP server

Use @mantine/mcp-server to give AI agents direct access to component docs, props, and search across the entire library

### Always up to date

LLM documentation is regenerated with every release – AI tools always have access to the latest API and examples

DocumentationSkillsMCP server

```
# Reference Mantine docs in Cursor
@Docs https://mantine.dev/llms.txt

# Or download full documentation
curl -o mantine-docs.txt https://mantine.dev/llms-full.txt

# Use with ChatGPT/Claude
"Using Mantine, how do I create a dark mode toggle?
Reference: https://mantine.dev/llms.txt"
```

Expand code

## 120+ components

Build your next app faster with high-quality, well-tested components. Mantine includes everything you need to create complex web applications with ease: custom select, date pickers, notifications, modals, and more.

InputsOverlaysNavigation

Text input

Number input

Date range picker

Your last vacation

Color input

Tree select

File input

Upload file

Select

Multiselect

ReactVue

Pin input

## Hooks library

70+ hooks for handling tricky and common parts of your application

[Browse all hooks](https://mantine.dev/hooks/package/)

30

70

Demo.tsxDemo.module.css

```
import { useState } from 'react';
import { DotsSixVerticalIcon } from '@phosphor-icons/react';
import { clamp, useMove } from '@mantine/hooks';
import classes from './Demo.module.css';

function Demo() {
  const [value, setValue] = useState(0.3);
  const { ref } = useMove(({ x }) => setValue(clamp(x, 0.1, 0.9)));
  const labelFloating = value < 0.2 || value > 0.8;

  return (
    <div className={classes.root}>
      <div className={classes.track} ref={ref}>
        <div
          className={classes.filled}
          style={{
            width: `calc(${value * 100}% - var(--thumb-width) / 2 - var(--thumb-offset) / 2)`,
          }}
        >
          <span className={classes.label} data-floating={labelFloating || undefined} data-filled>
            {(value * 100).toFixed(0)}
          </span>
        </div>

        <div
          className={classes.empty}
          style={{
            width: `calc(${(1 - value) * 100}% - var(--thumb-width) / 2 - var(--thumb-offset) / 2)`,
          }}
        >
          <span className={classes.label} data-floating={labelFloating || undefined}>
            {((1 - value) * 100).toFixed(0)}
          </span>
        </div>

        <div
          className={classes.thumb}
          style={{ left: `calc(${value * 100}% - var(--thumb-width) / 2)` }}
        >
          <DotsSixVerticalIcon />
        </div>
      </div>
    </div>
  );
}
```

Expand code

Resize me!

| Property | Value |
| --- | --- |
| width | 1889 |
| height | 18 |

Resize element by dragging its right bottom corner

Demo.tsxDemo.module.css

```
import { Group, Table } from '@mantine/core';
import { useResizeObserver } from '@mantine/hooks';

function Demo() {
  const [ref, rect] = useResizeObserver();

  return (
    <div className={classes.root}>
      <Group justify="center">
        <div ref={ref} className={classes.demo}>
          Resize me!
        </div>
      </Group>

      <Table
        captionSide="top"
        data={{
          caption: 'Resize element by dragging its right bottom corner',
          head: ['Property', 'Value'],
          body: [\
            ['width', rect.width],\
            ['height', rect.height],\
          ],
        }}
      />
    </div>
  );
}
```

Expand code

`Ctrl`

+

`K`

– Open search

`Ctrl`

+

`J`

– Toggle color scheme

Demo.tsxShortcut.tsx

```
import { useHotkeys } from '@mantine/hooks';
import { spotlight } from '@mantine/spotlight';
import { useMantineColorScheme } from '@mantine/core';
import { Shortcut } from './Shortcut';

function Demo() {
  const { toggleColorScheme } = useMantineColorScheme();

  useHotkeys([\
    ['mod + K', () => spotlight.open()],\
    ['mod + J', () => toggleColorScheme()],\
    ['mod + shift + alt + X', () => secret()],\
  ]);

  return (
    <>
      <Shortcut symbol="K" description="Open search" />
      <Shortcut symbol="J" description="Toggle color scheme" />
    </>
  );
}
```

Expand code

Click the button to pick color

Demo.tsx

```
import { useState } from 'react';
import { ActionIcon, Group, ColorSwatch, Text } from '@mantine/core';
import { CrosshairIcon } from '@phosphor-icons/react';
import { useEyeDropper } from '@mantine/hooks';

function Demo() {
  const [color, setColor] = useState('');
  const [error, setError] = useState<Error | null>(null);
  const { supported, open } = useEyeDropper();

  const pickColor = async () => {
    try {
      const { sRGBHex } = (await open())!;
      setColor(sRGBHex);
    } catch (e) {
      setError(e as Error);
    }
  };

  if (!supported) {
    return <Text ta="center">EyeDropper API is not supported in your browser</Text>;
  }

  return (
    <Group>
      <ActionIcon variant="default" onClick={pickColor} size="xl">
        <CrosshairIcon size={28} />
      </ActionIcon>
      {color ? (
        <Group gap="xs">
          <ColorSwatch color={color} />
          <Text>Picked color: {color}</Text>
        </Group>
      ) : (
        <Text>Click the button to pick color</Text>
      )}
      {error && <Text c="red">Error: {error?.message}</Text>}
    </Group>
  );
}
```

Expand code

## Flexible styling

Mantine components are built with native CSS – styles are performant and easy to override

[Learn more about styles](https://mantine.dev/styles/styles-overview/)

### Built with CSS

Mantine styles are exposed as .css files – styles are performant and do not have any runtime overhead

### Override anything

All Mantine components support Styles API which allows to override any part of component styles with inline styles of classes

### PostCSS preset

postcss-preset-mantine includes mixins and functions to apply dark/light, rtl and responsive styles

### Compatible with any styling solution

You can bring your own library to style Mantine components (Emotion, Vanilla Extract, Sass, etc.) – you are not limited to any specific tool

12Send files3Send files

Demo.module.cssDemo.tsx

```
.root {
  border-top-left-radius: var(--mantine-radius-xl);
  border-bottom-left-radius: var(--mantine-radius-xl);
  padding-left: 4px;

  /* The following styles will be applied only when button is disabled */
  &[data-disabled] {
    /* You can use Mantine PostCSS mixins inside data attributes */
    @mixin light {
      border: 1px solid var(--mantine-color-gray-2);
    }

    @mixin dark {
      border: 1px solid var(--mantine-color-dark-4);
    }

    /* You can target child elements that are inside .root[data-disabled] */
    & .section[data-position='left'] {
      opacity: 0.6;
    }
  }
}

.section {
  /* Apply styles only to left section */
  &[data-position='left'] {
    --section-size: calc(var(--button-height) - 8px);

    background-color: var(--mantine-color-body);
    color: var(--mantine-color-text);
    height: var(--section-size);
    width: var(--section-size);
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--mantine-radius-xl);
  }

  &[data-position='right'] {
    @mixin rtl {
      transform: rotate(180deg);
    }
  }
}
```

Expand code

## Dark color scheme

![](https://mantine.dev/_next/static/media/new.087_kask-27-k.webp)

Add dark theme to your application with just a few lines of code – Mantine exports global styles both for light and dark theme, all components support dark theme out of the box.

```
import { MantineProvider } from '@mantine/core';

function Demo() {
  return (
    <MantineProvider defaultColorScheme="dark">
      <App />
    </MantineProvider>
  );
}
```

Expand code

Toggle color scheme

## Combobox component

Combobox is a composable component which can be used to create custom select, multiselect, autocomplete, tags input and other similar components. It provides a lot of flexibility and gives you full control over the UI and behavior while keeping your codebase clean and simple.

[Explore all 50+ Combobox examples](https://mantine.dev/combobox/?e=BasicSelect)

Pick value or type anything

🍎 Apples

🍌 Bananas

🥦 Broccoli

🥕 Carrots

🍫 Chocolate

🍇 Grapes

Pick one or more values

You can select up to 2 items, currently selected: 0

🍎 Apples

🍌 Bananas

🥦 Broccoli

🥕 Carrots

🍫 Chocolate

🍎 Apples

🍌 Bananas

🥦 Broccoli

🥕 Carrots

🍫 Chocolate

Pick value

🍎 Apples

🍌 Bananas

🥦 Broccoli

🥕 Carrots

🍫 Chocolate

🍇 Grapes

Pick value

🍎

Apples

Crisp and refreshing fruit

🍌

Bananas

Naturally sweet and potassium-rich fruit

🥦

Broccoli

Nutrient-packed green vegetable

🥕

Carrots

Crunchy and vitamin-rich root vegetable

🍫

Chocolate

Indulgent and decadent treat

🍎 Apples

🍌 Bananas

🍓 Strawberries

🥦 Broccoli

🥕 Carrots

🥬 Lettuce

## Extensions

Extensions are additional packages that provide extra functionality to Mantine, such as rich text editor, notifications system, charts, modals manager and more. They are built to be easily integrated into your application and provide a seamless experience.

[Browse all extensions](https://mantine.dev/x/extensions/)

## Welcome to Mantine rich text editor

`RichTextEditor` component focuses on usability and is designed to be as simple as possible to bring a familiar editing experience to regular users. `RichTextEditor` is based on [Tiptap.dev](https://tiptap.dev/) and supports all of its features:

- General text formatting: **bold**, _italic_, underline, ~~strike-through~~

- Headings (h1-h6)

- Sub and super scripts (<sup /> and <sub /> tags)

- Ordered and bullet lists

- Text align

- And all [other extensions](https://tiptap.dev/extensions)


Show notification

Open search spotlight

Slide 1 of 5

![](https://images.unsplash.com/photo-1598928506311-c55ded91a20c?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=720&q=80)

![](https://images.unsplash.com/photo-1567767292278-a4f21aa2d36e?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=720&q=80)

![](https://images.unsplash.com/photo-1605774337664-7a846e9cdf17?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=720&q=80)

![](https://images.unsplash.com/photo-1554995207-c18c203602cb?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=720&q=80)

![](https://images.unsplash.com/photo-1616486029423-aaa4789e8c9a?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=720&q=80)

## Form library

@mantine/form – performant form library designed for Mantine components. Works out of the box with all Mantine inputs.

[Explore all form features](https://mantine.dev/form/package/)

### Seamless integration

useForm hook works out of the box with all Mantine inputs

### Excellent performance

useForm rerenders only for validation and status changes, usually only 2-3 times per form lifecycle

### Lightweight

6.3kb minified + gzipped, no dependencies except React

### Fully featured

useForm supports lists and nested objects, multiple validation approaches (including schema based with zod) and an easy way to manage subscriptions to values updates

Email \*

I agree to sell my privacy

Submit

Demo.tsx

```
import { Button, Checkbox, Group, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';

function Demo() {
  const form = useForm({
    mode: 'uncontrolled',
    initialValues: {
      email: '',
      termsOfService: false,
    },

    validate: {
      email: (value) => (/^\S+@\S+$/.test(value) ? null : 'Invalid email'),
    },
  });

  return (
    <form onSubmit={form.onSubmit((values) => console.log(values))}>
      <TextInput
        withAsterisk
        label="Email"
        placeholder="your@email.com"
        key={form.key('email')}
        {...form.getInputProps('email')}
      />

      <Checkbox
        mt="md"
        label="I agree to sell my privacy"
        key={form.key('termsOfService')}
        {...form.getInputProps('termsOfService', { type: 'checkbox' })}
      />

      <Group justify="flex-end" mt="md">
        <Button type="submit">Submit</Button>
      </Group>
    </form>
  );
}
```

Expand code

Build even faster with Mantine UI

# 120+ responsive components   built with Mantine

Build your next website even faster with premade responsive components designed and built by Mantine maintainers and community. All components are free forever for everyone.

[Explore components](https://ui.mantine.dev/)

## Trusted by thousands of developers

30,000+ GitHub stars, 5M+ monthly downloads, 500+ contributors. Mantine is built in the open and shaped by the developers who use it every day.

[View all reviews from the community](https://github.com/orgs/mantinedev/discussions/categories/kind-words)

[30,000+\\
\\
Stars on GitHub](https://github.com/mantinedev/mantine) [5M+\\
\\
Monthly downloads](https://www.npmjs.com/package/@mantine/hooks) [12,000+\\
\\
Discord members](https://discord.gg/wbH82zuWMN)

![smsuraj100](https://avatars.githubusercontent.com/u/16137686?v=4)

[@smsuraj100](https://github.com/smsuraj100)

[Open on GitHub](https://github.com/orgs/mantinedev/discussions/5783)

[One of the best UI libraries I've come across.](https://github.com/orgs/mantinedev/discussions/5783)

I am a senior Frontend Developer and wanted to use something new instead of Material UI and came across this, it has been well thought of all the different scenarios you and come across, and the hooks are just pure love :)

Thank you so much for this.

![sideral](https://avatars.githubusercontent.com/u/192025?v=4)

[@sideral](https://github.com/sideral)

[Open on GitHub](https://github.com/orgs/mantinedev/discussions/6150)

[You nailed it!](https://github.com/orgs/mantinedev/discussions/6150)

Man, I've been doing Front-End for 20 years. This is, hands-down, the best component library I've ever used. What's more, the parts that I didn't like (Styling from JS Objects, slow with big forms) have been addressed in v7. Please keep it up, this library deserves more exposure, it just works and works well and beautifully. Many thanks to [@rtivital](https://github.com/rtivital) and the contributors!

![leighton-carr](https://avatars.githubusercontent.com/u/18201458?v=4)

[@leighton-carr](https://github.com/leighton-carr)

[Open on GitHub](https://github.com/orgs/mantinedev/discussions/5504)

[Absurdly good](https://github.com/orgs/mantinedev/discussions/5504)

Hope this kind of post is ok - just wanted to say thank you.

I've been writing software professionally for 25 years, with the last 15 in web (mostly internal projects in my company). This is easily the best component library I've ever used.

In every other instance I've run into the boundaries of what the library does and have to spend a lot of time and energy customizing or extending it. Not only does Mantine provide easy access to everything under the hood, but 99% the things you need are provided as default options. I've started to lose count of the "guess I'd better build my standard xyz... oh wait, they have that too" moments. Also the docs are perfect.

Bravo, thank you.

![Gitgud6969](https://avatars.githubusercontent.com/u/57042505?v=4)

[@Gitgud6969](https://github.com/Gitgud6969)

[Open on GitHub](https://github.com/orgs/mantinedev/discussions/3741)

[Thank you mantine 💘](https://github.com/orgs/mantinedev/discussions/3741)

Dear Mantine Team, thank you for putting this library together. I have started to use and love Mantine in my free time, and bringing this great library to good use in our company now. All the developers are very pleased with the development experience, the time savings for any bigger project is insane. The amount of flexibility we have with our designers and developers will result in great products. All thanks to every contributor. Continue the good work!

![SeeSharpCode](https://avatars.githubusercontent.com/u/10228483?v=4)

[@SeeSharpCode](https://github.com/SeeSharpCode)

[Open on GitHub](https://github.com/orgs/mantinedev/discussions/5456)

[A solution for every problem](https://github.com/orgs/mantinedev/discussions/5456)

Mantine has a solution for every problem I’ve needed to solve in my web app. Components and props are named clearly, design choices promote simplicity, and it looks beautiful out of the box. Thank you for jump starting my application in a big way!

![OmkoBass](https://avatars.githubusercontent.com/u/40026131?v=4)

[@OmkoBass](https://github.com/OmkoBass)

[Open on GitHub](https://github.com/orgs/mantinedev/discussions/259)

[Thank you Mantine!](https://github.com/orgs/mantinedev/discussions/259)

Out of all react component libraries that I have ever seen this one is the most straight forward, easy to use, well documented and really beautiful. I plan on switching and using this full time. Just wanted to say huge thanks to the people that made this.

## Join the community

Mantine is an open-source project with a growing community of developers and contributors. Join us on GitHub, Discord, Twitter and other platforms to stay updated and get help with your projects.

[Chat on Discord\\
\\
Join a community of 10,000+ developers to ask questions, share feedback and explore upcoming features](https://discord.gg/wbH82zuWMN)

[Start a discussion\\
\\
Request new features, ask questions and provide feedback with GitHub discussions](https://github.com/mantinedev/mantine/discussions) [Follow on X\\
\\
Get notified about new minor and major releases](https://x.com/mantinedev)

## Ready to get started?

Mantine can be used with any modern React framework or build tool: get started with Next.js, Vite, React Router and other tools in minutes by following the installation guide or using one of the available templates.

[Get started without a framework](https://mantine.dev/)

[Recommended\\
\\
Vite\\
\\
Best choice for a single page application (SPA)](https://mantine.dev/guides/vite/) [Recommended\\
\\
Next.js\\
\\
Best choice for an application with SSR](https://mantine.dev/guides/next/)

[React Router\\
\\
Get started with React Router](https://mantine.dev/guides/react-router/) [TanStack Start\\
\\
Get started with TanStack Start](https://mantine.dev/guides/tanstack-start/)

Frontend

Backend

🇩🇪 Germany

🇫🇷 France

🇬🇧 United Kingdom

🇺🇸 United States of America

React

Angular

Vue

Svelte

Ember

Preact

Solid

Alpine