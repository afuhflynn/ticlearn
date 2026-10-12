Overview

[Introduction](https://elements.ai-sdk.dev/docs) [Benefits](https://elements.ai-sdk.dev/docs/benefits) [Community](https://elements.ai-sdk.dev/docs/community) [The Vercel AI Frontend Stack](https://elements.ai-sdk.dev/docs/vercel-ai-frontend)

Usage

[Setup](https://elements.ai-sdk.dev/docs/setup) [Usage](https://elements.ai-sdk.dev/docs/usage) [Skill](https://elements.ai-sdk.dev/docs/skill) [Troubleshooting](https://elements.ai-sdk.dev/docs/troubleshooting)

Contributing

[How to Contribute](https://elements.ai-sdk.dev/docs/how-to-contribute) [New Components](https://elements.ai-sdk.dev/docs/new-components) [Philosophy](https://elements.ai-sdk.dev/docs/philosophy)

# Setup

Get AI Elements installed and running in your project.

This guide walks you through setting up AI Elements in your project.

## [Prerequisites](https://elements.ai-sdk.dev/docs/setup\#prerequisites)

Before installing AI Elements, ensure your environment meets these requirements:

- **Node.js** 18 or later
- **React** 19
- **Next.js** 14+ (App Router recommended)
- **AI SDK** installed and configured
- **shadcn/ui** initialized in your project
- **Tailwind CSS** 4

If you don't have shadcn/ui installed, running any AI Elements install command
will automatically set it up for you.

## [AI Gateway (Recommended)](https://elements.ai-sdk.dev/docs/setup\#ai-gateway-recommended)

We recommend using [AI Gateway](https://vercel.com/docs/ai-gateway) for model access as it offers a single API key for multiple model providers, built-in fallback support, unified billing and more.

Add `AI_GATEWAY_API_KEY` to your `.env.local` file. [Get your API key here](https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fai%2Fapi-keys&title=Get%20your%20AI%20Gateway%20key).

## [Installing Components](https://elements.ai-sdk.dev/docs/setup\#installing-components)

Use the AI Elements CLI to add components:

npm

pnpm

yarn

bun

```
npx ai-elements@latest add message
```

Or use the shadcn CLI:

npm

pnpm

yarn

bun

```
npx shadcn@latest add @ai-elements/message
```

Components are added to `@/components/ai-elements/` by default.

## [Verify Installation](https://elements.ai-sdk.dev/docs/setup\#verify-installation)

After installing a component, verify it works:

1. Check that the component file exists in your components directory
2. Import and use it in a page:

app/page.tsx

```
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";

export default function Page() {
  return (
    <Message from="assistant">
      <MessageContent>
        <MessageResponse>Hello, world!</MessageResponse>
      </MessageContent>
    </Message>
  );
}
```

3. Run your development server and confirm the component renders

## [Next Steps](https://elements.ai-sdk.dev/docs/setup\#next-steps)

- Learn how to [use components](https://elements.ai-sdk.dev/docs/usage) in your application
- Browse available [components](https://elements.ai-sdk.dev/components) to find what you need
- Check [troubleshooting](https://elements.ai-sdk.dev/docs/troubleshooting) if you run into issues

[The Vercel AI Frontend Stack\\
\\
How AI Gateway, AI SDK, and AI Elements work together.](https://elements.ai-sdk.dev/docs/vercel-ai-frontend) [Usage\\
\\
Learn how to use AI Elements components in your application.](https://elements.ai-sdk.dev/docs/usage)

### On this page

[Prerequisites](https://elements.ai-sdk.dev/docs/setup#prerequisites) [AI Gateway (Recommended)](https://elements.ai-sdk.dev/docs/setup#ai-gateway-recommended) [Installing Components](https://elements.ai-sdk.dev/docs/setup#installing-components) [Verify Installation](https://elements.ai-sdk.dev/docs/setup#verify-installation) [Next Steps](https://elements.ai-sdk.dev/docs/setup#next-steps)

[GitHubEdit this page on GitHub](https://github.com/vercel/ai-elements/edit/main/apps/docs/content/docs/setup.mdx) Scroll to topGive feedbackCopy pageAsk AI about this pageOpen in chat

## Chat

What is AI Elements?What can I build with AI Elements?How do I install AI Elements?How do I use AI Elements?

Tip: You can open and close chat with `⌘I`

0 / 1000