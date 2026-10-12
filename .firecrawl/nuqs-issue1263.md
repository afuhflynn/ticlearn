[Skip to content](https://github.com/47ng/nuqs/issues/1263#start-of-content)

You signed in with another tab or window. [Reload](https://github.com/47ng/nuqs/issues/1263) to refresh your session.You signed out in another tab or window. [Reload](https://github.com/47ng/nuqs/issues/1263) to refresh your session.You switched accounts on another tab or window. [Reload](https://github.com/47ng/nuqs/issues/1263) to refresh your session.Dismiss alert

{{ message }}

# Nuqs not detecting adapter in Next.js 16 App Router setup\#1263

[New issue](https://github.com/login?return_to=https://github.com/47ng/nuqs/issues/1263)

Copy link

[New issue](https://github.com/login?return_to=https://github.com/47ng/nuqs/issues/1263)

Copy link

Closed

Closed

[Nuqs not detecting adapter in Next.js 16 App Router setup](https://github.com/47ng/nuqs/issues/1263#top)#1263

Copy link

Labels

[bugSomething isn't working](https://github.com/47ng/nuqs/issues?q=state%3Aopen%20label%3A%22bug%22) Something isn't working [duplicateThis issue or pull request already exists](https://github.com/47ng/nuqs/issues?q=state%3Aopen%20label%3A%22duplicate%22) This issue or pull request already exists

## Description

[![@yWilliamLima](https://avatars.githubusercontent.com/u/122046880?v=4&size=48)](https://github.com/yWilliamLima)

[yWilliamLima](https://github.com/yWilliamLima)

opened [on Dec 10, 2025on Dec 10, 2025](https://github.com/47ng/nuqs/issues/1263#issue-3715859019)

Issue body actions

## Context

**`nuqs` version:**

```
"nuqs": "2.8.5"
```

**Framework used:**

- ✅ Next.js (app router)

**Framework version:**

```
"next": "16.0.8"
```

## Description

When using `NuqsAdapter` inside the root layout of a Next.js App Router project, I get the following error:

```
⨯ Error: [nuqs] nuqs requires an adapter to work with your framework.
```

The adapter is set up exactly as shown in the documentation, but the error keeps appearing even though `NuqsAdapter` wraps the whole application.

## Reproduction

### Relevant code

```
import { NuqsAdapter } from 'nuqs/adapters/next/app'

export default function Layout({ children }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head />
      <body>
        <NuqsAdapter>
          <Providers>
            {children}
            <Toaster richColors />
          </Providers>
        </NuqsAdapter>
      </body>
    </html>
  )
}
```

### Steps to reproduce

1. Create a Next.js v16 project using the App Router.
2. Install `nuqs@2.8.5`.
3. Add `NuqsAdapter` to the root layout as shown above.
4. Run `npm run dev` or `next dev`.
5. The error appears immediately in the terminal or when loading the page.

## Activity

1. [![](https://avatars.githubusercontent.com/u/122046880?s=64&v=4)yWilliamLima](https://github.com/yWilliamLima)

added

[bugSomething isn't working](https://github.com/47ng/nuqs/issues?q=state%3Aopen%20label%3A%22bug%22) Something isn't working

[on Dec 10, 2025on Dec 10, 2025](https://github.com/47ng/nuqs/issues/1263#event-21483106468)

2. ### franky47commentedon Dec 10, 2025onDec 10, 2025



[![@franky47](https://avatars.githubusercontent.com/u/1174092?u=29efaf1c08f0f3cad76cac81be3a3d58a6cd0411&v=4&size=48)](https://github.com/franky47)





[franky47](https://github.com/franky47)



[on Dec 10, 2025on Dec 10, 2025](https://github.com/47ng/nuqs/issues/1263#issuecomment-3637952491)













Member



More actions

















I can't reproduce it with a fresh `pnpm create next-app`, could you provide a minimal example where this fails in your case please?

3. [![](https://avatars.githubusercontent.com/u/1174092?s=64&u=29efaf1c08f0f3cad76cac81be3a3d58a6cd0411&v=4)franky47](https://github.com/franky47)

added

[cannot-reproduceEither no reproduction provided, or cannot reproduce with a minimal setup](https://github.com/47ng/nuqs/issues?q=state%3Aopen%20label%3A%22cannot-reproduce%22) Either no reproduction provided, or cannot reproduce with a minimal setup

[on Dec 10, 2025on Dec 10, 2025](https://github.com/47ng/nuqs/issues/1263#event-21483782162)

4. ### yWilliamLimacommentedon Dec 10, 2025onDec 10, 2025



[![@yWilliamLima](https://avatars.githubusercontent.com/u/122046880?v=4&size=48)](https://github.com/yWilliamLima)





[yWilliamLima](https://github.com/yWilliamLima)



[on Dec 10, 2025on Dec 10, 2025](https://github.com/47ng/nuqs/issues/1263#issuecomment-3638822469)









Last edited by yWilliamLima







Author



More actions

















I have a Turborepo setup with a shared components package. Inside that package, I installed nuqs and use it in some components. These components are only consumed inside my main app, which has the proper layout and nuqs adapter configured.



The issue is that the components package uses nuqs, but since it isn’t a web app or a Next.js page, it doesn’t have its own nuqs setup. Because of that, errors occur when the components that rely on nuqs are imported, even though the main app properly provides the adapter where they are ultimately rendered.



This issue started happening after version 2.8.3 of nuqs; if I downgrade back to 2.8.3, everything works as expected.









👍React with 👍3Reacted by gdpr-labs-dev, Sumanth Chinthagunta and John

5. ### franky47commentedon Dec 10, 2025onDec 10, 2025



[![@franky47](https://avatars.githubusercontent.com/u/1174092?u=29efaf1c08f0f3cad76cac81be3a3d58a6cd0411&v=4&size=48)](https://github.com/franky47)





[franky47](https://github.com/franky47)



[on Dec 10, 2025on Dec 10, 2025](https://github.com/47ng/nuqs/issues/1263#issuecomment-3638946575)













Member



More actions

















Ah I see, then it sounds like [#798](https://github.com/47ng/nuqs/issues/798) (different versions of nuqs being resolved across packages, leading to the Context reference being different).



What package manager are you using? There's nothing specific about the Context provider in 2.8.3 that makes it relevant, it could be a difference in how the package versions are resolved in your lockfile.

6. [![](https://avatars.githubusercontent.com/u/1174092?s=64&u=29efaf1c08f0f3cad76cac81be3a3d58a6cd0411&v=4)franky47](https://github.com/franky47)

added

[duplicateThis issue or pull request already exists](https://github.com/47ng/nuqs/issues?q=state%3Aopen%20label%3A%22duplicate%22) This issue or pull request already exists

and removed

[cannot-reproduceEither no reproduction provided, or cannot reproduce with a minimal setup](https://github.com/47ng/nuqs/issues?q=state%3Aopen%20label%3A%22cannot-reproduce%22) Either no reproduction provided, or cannot reproduce with a minimal setup

[on Dec 10, 2025on Dec 10, 2025](https://github.com/47ng/nuqs/issues/1263#event-21488798657)

7. [![](https://avatars.githubusercontent.com/u/122046880?s=64&v=4)yWilliamLima](https://github.com/yWilliamLima)

closed this as [completed](https://github.com/47ng/nuqs/issues?q=is%3Aissue%20state%3Aclosed%20archived%3Afalse%20reason%3Acompleted) [on Mar 21on Mar 21, 2026](https://github.com/47ng/nuqs/issues/1263#event-23779751613)


[Sign up for free](https://github.com/signup?return_to=https://github.com/47ng/nuqs/issues/1263)**to join this conversation on GitHub.** Already have an account?[Sign in to comment](https://github.com/login?return_to=https://github.com/47ng/nuqs/issues/1263)

## Metadata

## Metadata

### Assignees

No one assigned

### Labels

[bugSomething isn't working](https://github.com/47ng/nuqs/issues?q=state%3Aopen%20label%3A%22bug%22) Something isn't working [duplicateThis issue or pull request already exists](https://github.com/47ng/nuqs/issues?q=state%3Aopen%20label%3A%22duplicate%22) This issue or pull request already exists

### Type

No type

### Projects

No projects

### Milestone

No milestone

### Relationships

None yet

### Development

No branches or pull requests

## Issue actions

- ![](https://github.githubassets.com/assets/github-copilot-app-light-15ad5534265eeacd.svg)Open in GitHub Copilot app

You can’t perform that action at this time.