Open main menu

[Resend](https://resend.com/home)

- Features
- Company
- Enterprise
- Help
- Docs
- AI
- [Pricing](https://resend.com/pricing)

[Log in](https://resend.com/login) [Get started](https://resend.com/signup)

![Floor background](https://resend.com/_next/image?url=%2Fstatic%2Flanding-page%2Fbg-hero-1.jpg&w=3840&q=100&dpl=dpl_7Lm9ZixRJFR2NzJGnMaQVYok6Jf9)

[What you missed at Resend Forward](https://resend.com/blog/resend-forward-2026-recap)

# Email for  developers

The best way to reach humans instead of spam folders. Deliver transactional and marketing emails at scale.

[Get started](https://resend.com/signup) [Documentation](https://resend.com/docs)

![Light ray background](https://resend.com/_next/image?url=%2Fstatic%2Flanding-page%2Fbg-light.avif&w=3840&q=100&dpl=dpl_7Lm9ZixRJFR2NzJGnMaQVYok6Jf9)

Companies of all sizes trust Resend to deliver their most important emails.

[Explore Enterprise](https://resend.com/enterprise)

## Integrate tonight

A simple, elegant interface so you can start sending emails in minutes. It fits right into your code with SDKs for your favorite programming languages.

Node.js

Serverless

Ruby

Python

PHP

CLI

Go

Rust

Java

Elixir

.NET

REST

SMTP

Node.js

Next.jsRemixNuxtExpressHonoRedwoodBunAstro

```
1import { Resend } from 'resend';
2

3const resend = new Resend('re_xxxxxxxxx');
4

5(async function() {
6  const { data, error } = await resend.emails.send({
7    from: 'onboarding@resend.dev',
8    to: 'delivered@resend.dev',
9    subject: 'Hello World',
10    html: '<strong>it works!</strong>'
11  });
12

13  if (error) {
14    return console.log(error);
15  }
16

17  console.log(data);
18})();
```

[View on GitHub](https://github.com/resend/resend-node-example) [Download ZIP](https://github.com/resend/resend-node-example/archive/refs/heads/main.zip)

## First-class   developer experience

We are a team of engineers who love building tools for other engineers.

Our goal is to create the email platform we've always wished we had — one that _just works_.

delivereddelivered@resend.dev
Send

```
HTTP 200:
```

```
{ "id": "26abdd24-36a9-475d-83bf-4d27a31c7def" }
```

```
HTTP 200:
```

```
{ "id": "cc3817db-d398-4892-8bc0-8bc589a2cfb3" }
```

```
HTTP 200:
```

```
{ "id": "4ea2f827-c3a2-471e-b0a1-8bb0bcb5c67c" }
```

```
HTTP 200:
```

```
{ "id": "8e1d73b4-ebe1-485d-bce8-0d7044f1d879" }
```

```
HTTP 200:
```

```
{ "id": "a08045a6-122a-4e16-ace1-aa81df4278ac" }
```

```
HTTP 200:
```

```
{ "id": "c3be1838-b80e-457a-9fc5-3abf49c3b33e" }
```

```
HTTP 200:
```

```
{ "id": "13359f77-466e-436d-9cb2-ff0b0c9a8af4" }
```

```
HTTP 200:
```

```
{ "id": "c027274d-6479-4592-8442-6b741a0dd2a7" }
```

## Test mode

Simulate events and experiment with our API without the risk of accidentally sending real emails to real people.

[Learn more](https://resend.com/docs/dashboard/emails/send-test-emails)

deliveredOct 2311:03:02

toliam@yahoo.comwith subjectHello world

on agent Yahoo Mailrunning on macOS

clickedOct 2311:03:02

fromliam@xerox.comonMagic Link

on agent Gmailrunning on Windows

openedOct 2311:03:02

fromsophia@gmail.comwith subjectMagic Link

on agent Gmailrunning on macOS

complainedOct 2311:03:02

tonoah@figma.comwith feedbackSpam

on agent Gmailrunning on Windows

bouncedOct 2311:03:02

tocharlotte@xerox.comwith typeSpam

on agent ProtonMailrunning on macOS

openedOct 2311:03:02

from isabella@xerox.com with subjectWelcome

on agent Sparkrunning on Windows

## Modular webhooks

Receive real-time notifications directly to your server. Every time an email is delivered, opened, bounces, or a link is clicked.

[Learn more](https://resend.com/docs/webhooks/introduction)

## Write using a delightful editor

A modern editor that makes it easy for anyone to write, format, and send emails.

Visually build your email and change the design by adding custom styles.

Styles

Weekly Acme Newsletter

a day ago

Test

Send

Fromyour.name@acme.com

To NewsletterSubscribers

SubjectWeekly Newsletter

![Full-screen image](https://resend.com/_next/image?url=%2Fstatic%2Fproduct-pages%2Fbroadcast-email-header.webp&w=1200&q=100&dpl=dpl_7Lm9ZixRJFR2NzJGnMaQVYok6Jf9)

## Go beyond editing

Group and control your contacts in a simple and intuitive way.

Straightforward analytics and reporting tools that will help you send better emails.

![Audiences Screenshot](https://resend.com/_next/image?url=%2Fstatic%2Fproduct-pages%2Fscreenshot-zoom-audience.avif&w=1920&q=100&dpl=dpl_7Lm9ZixRJFR2NzJGnMaQVYok6Jf9)

## Contact management

Import your list in minutes, regardless the size of your audience. Get full visibility of each contact and their personal attributes.

[Learn more](https://resend.com/features/audiences)

![Illustration](https://resend.com/_next/image?url=%2Fstatic%2Fproduct-pages%2Fscreenshot-zoom-analytics.webp&w=1920&q=100&dpl=dpl_7Lm9ZixRJFR2NzJGnMaQVYok6Jf9)

## Broadcast analytics

Unlock powerful insights and understand exactly how your audience is interacting with your broadcast emails.

[Learn more](https://resend.com/features/broadcasts)

## Develop emails using React

Create beautiful templates without having to deal with <table> layouts and HTML.

Powered by react-email, our open source component library.

[Get started](https://resend.com/signup) [Check the docs](https://react.email/docs)

user-welcome.tsxreset-password.tsxuser-invite.tsxweekly-digest.tsx

```
1import { Body, Button, Column, Container, Head, Heading, Hr, Html, Img, Link, Preview, Row, Section, Text, Tailwind } from 'react-email';
2import * as React from 'react';
3

4const WelcomeEmail = ({
5  username = 'Steve',
6  company = 'ACME',
7}: WelcomeEmailProps) => {
8  const previewText = `Welcome to ${company}, ${username}!`;
9

10  return (
11    <Html>
12      <Head />
13      <Preview>{previewText}</Preview>
14      <Tailwind>
15      <Body className="bg-white my-auto mx-auto font-sans">
16        <Container className="my-10 mx-auto p-5 w-[465px]">
17          <Section className="mt-8">
18            <Img
19              src={`${baseUrl}/static/example-logo.png`}
20              width="80"
21              height="80"
22              alt="Logo Example"
23              className="my-0 mx-auto"
24            />
25          </Section>
26          <Heading className="text-2xl font-normal text-center p-0 my-8 mx-0">
27            Welcome to <strong>{company}</strong>, {username}!
28          </Heading>
29          <Text className="text-sm">
30            Hello {username},
31          </Text>
32          <Text className="text-sm">
33            We're excited to have you onboard at <strong>{company}</strong>. We hope you enjoy your journey with us. If you have any questions or need assistance, feel free to reach out.
34          </Text>
35          <Section className="text-center mt-[32px] mb-[32px]">
36              <Button
37                pX={20}
38                pY={12}
39                className="bg-[#00A3FF] rounded-sm text-white text-xs font-semibold no-underline text-center"
40                href={`${baseUrl}/get-started`}
41              >
42                Get Started
43              </Button>
44          </Section>
45          <Text className="text-sm">
46            Cheers,
47            <br/>
48            The {company} Team
49          </Text>
50        </Container>
51      </Body>
52      </Tailwind>
53    </Html>
54  );
55};
56

57interface WelcomeEmailProps {
58  username?: string;
59  company?: string;
60}
61

62const baseUrl = process.env.URL
63  ? `https://${process.env.URL}`
64  : '';
65

66export default WelcomeEmail;
```

|     |
| --- |
| |     |
| --- |
| ![Logo Example](https://resend.com/_next/image?url=%2Fstatic%2Fexample-logo.png&w=256&q=75&dpl=dpl_7Lm9ZixRJFR2NzJGnMaQVYok6Jf9) |

## Welcome to **ACME**, user!

Hello Steve,

We're excited to have you onboard at **ACME**. We hope you enjoy your journey with us. If you have any questions or need assistance, feel free to reach out.

|     |
| --- |
| [Get Started](https://resend.com/get-started) |

Cheers,

The ACME Team |

## Reach humans, not spam folders

### Proactive blocklist tracking

Be the first to know if your domain is added to aDNSBLssuch as those offered bySpamhauswith removal requests generated by Resend.

### Faster time to inbox

Send emails from the region closest to your users. Reduce delivery latency with North American, South American, European, and Asian regions.

### Build confidence with BIMI

Showcase your logo and company branding withBIMI. Receive guidance to obtain aVMC\- the email equivalent of a checkmark on social media.

### Managed dedicated IPs

Get a fully managed dedicated IP that automatically warms up and autoscales based on your sending volume, no waiting period.

### Dynamic suppression list

Prevent repeated sending to recipients who no longer want your email and comply with standards like theCAN-SPAM Actand others.

### IP and domain monitoring

Monitor your DNS configuration for any errors or regressions. Be notified of any changes that could hinder your deliverability.

### Verify DNS records

Protect your reputation by verifying your identity as a legitimate sender. Secure your email communication usingDKIMandSPF.

### Battle-tested infrastructure

Rely on a platform of reputable IP's used by trustworthy senders with distributed workloads across different IP pools.

### Prevent spoofing with DMARC

Avoid impersonation by creatingDMARCpolicies and instructing inbox providers on how to treat unauthenticated email.

![Vercel](https://resend.com/static/landing-page/vercel.svg?dpl=dpl_7Lm9ZixRJFR2NzJGnMaQVYok6Jf9)

> Resend is transforming email for developers. Simple interface, easy integrations, handy templates. What else could we ask for.

![Guillermo Rauch](https://resend.com/static/avatars/guillermo-rauch.webp)

Guillermo Rauch

CEO at Vercel

[Send with Next.js](https://resend.com/docs/send-with-nextjs)

## Everything in your control

All the features you need to manage your email sending, troubleshoot with

detailed logs, and protect your domain reputation – without the friction.

### Intuitive analytics

### Full visibility

### Domain authentication

![Resend Dashboard - Overview](https://resend.com/_next/image?url=%2Fstatic%2Fproduct-pages%2Fscreenshot-metrics.webp&w=3840&q=100&dpl=dpl_7Lm9ZixRJFR2NzJGnMaQVYok6Jf9)

## Beyond expectations

Resend is driving remarkable developer experiences that enable success

stories, empower businesses, and fuel growth across industries and individuals.

- > "Our team loves Resend. It makes email sending so easy and reliable. After we switched to Dedicated IPs, our deliverability improved tremendously and we don't hear complaints about emails landing on spam anymore."
>
> ![Infisical](https://cdn.resend.com/posts/logo-infisical.jpg)
>
> ![Vlad Matsiiako](https://resend.com/static/avatars/vlad-matsiiako.jpg)
>
> Vlad MatsiiakoCo-founder of Infisical

- > "As a developer I love the approach that the Resend team is taking. Its so refreshing. They are also extremely user-centric and helpful in terms of getting you up and running, sending beautiful emails that deliver."
>
> ![Mintlify](https://cdn.resend.com/posts/logo-mintlify.jpg)
>
> ![Hahnbee Lee](https://resend.com/static/avatars/hahnbee-lee.jpg)
>
> Hahnbee LeeCo-Founder at Mintlify

- > "We value tools that feel stable, well thought out, and aligned with the standards we expect across our stack. Resend meets those expectations. It lets our team stay focused on building the larger platform rather than getting pulled into the overhead that typically comes with legacy email infrastructure."
>
> ![MrBeast](https://cdn.resend.com/posts/logo-mrbeast.png)
>
> ![Bradley Greenwood](https://resend.com/static/avatars/bradley-greenwood.jpg)
>
> Bradley GreenwoodVP of Engineering at MrBeast

- > "Our partnership with Resend has been a great experience. They've made sure we can focus on what we do best—building our product and growing our business."
>
> ![Gumroad](https://cdn.resend.com/posts/logo-gumroad.png)
>
> ![Sahil Lavingia](https://resend.com/static/avatars/sahil-lavingia.jpg)
>
> Sahil LavingiaCEO of Gumroad

- > "Switching over to Resend from SendGrid marked a significant improvement in our email management. We started with a small test - waitlist emails for our iOS and Windows apps. Within 30 minutes, we were done."
>
> ![Raycast](https://cdn.resend.com/posts/logo-raycast.png)
>
> ![Thomas Mann](https://resend.com/static/avatars/thomas-mann.jpg)
>
> Thomas MannFounder & CEO of Raycast

- > "The simplicity and reliability of Resend allowed our engineers to focus on building features rather than troubleshooting email infrastructure."
>
> ![Replit](https://cdn.resend.com/posts/logo-replit.png)
>
> ![Amadeo Pellicce](https://resend.com/static/avatars/amadeo-pellicce.jpg)
>
> Amadeo PellicceConnectors, Agents and Automations Lead at Replit

- > "We're a small team with a lot on our plates. Email infrastructure is something we don't want to think about, and with Resend we don't have to."
>
> ![Tailwind](https://cdn.resend.com/posts/logo-tailwind.png)
>
> ![Peter Suhm](https://resend.com/static/avatars/peter-suhm.jpg)
>
> Peter SuhmOps at Tailwind

- > "The best part about taking Resend into production was that there was no friction at all."
>
> ![Braintrust](https://cdn.resend.com/posts/logo-braintrust.png)
>
> ![Tara Nagar](https://resend.com/static/avatars/tara-nagar.jpg)
>
> Tara NagarSoftware Engineer at Braintrust

- > "The flexibility of Resend is what we value most. It allows us to quickly adapt and refine our email communications as our products evolve."
>
> ![Turso](https://cdn.resend.com/posts/logo-turso.png)
>
> ![Glauber Costa](https://resend.com/static/avatars/glauber-costa.jpg)
>
> Glauber CostaFounder and CEO at Turso

- > "Resend is email with simpler APIs, better webhooks, and best-in-class debugging."
>
> ![Inngest](https://cdn.resend.com/posts/logo-inngest.png)
>
> ![Dan Farrelly](https://resend.com/static/avatars/dan-farrelly.jpg)
>
> Dan FarrellyCTO and Co-Founder of Inngest


- > "Our team loves Resend. It makes email sending so easy and reliable. After we switched to Dedicated IPs, our deliverability improved tremendously and we don't hear complaints about emails landing on spam anymore."
>
> ![Infisical](https://cdn.resend.com/posts/logo-infisical.jpg)
>
> ![Vlad Matsiiako](https://resend.com/static/avatars/vlad-matsiiako.jpg)
>
> Vlad MatsiiakoCo-founder of Infisical

- > "As a developer I love the approach that the Resend team is taking. Its so refreshing. They are also extremely user-centric and helpful in terms of getting you up and running, sending beautiful emails that deliver."
>
> ![Mintlify](https://cdn.resend.com/posts/logo-mintlify.jpg)
>
> ![Hahnbee Lee](https://resend.com/static/avatars/hahnbee-lee.jpg)
>
> Hahnbee LeeCo-Founder at Mintlify

- > "We value tools that feel stable, well thought out, and aligned with the standards we expect across our stack. Resend meets those expectations. It lets our team stay focused on building the larger platform rather than getting pulled into the overhead that typically comes with legacy email infrastructure."
>
> ![MrBeast](https://cdn.resend.com/posts/logo-mrbeast.png)
>
> ![Bradley Greenwood](https://resend.com/static/avatars/bradley-greenwood.jpg)
>
> Bradley GreenwoodVP of Engineering at MrBeast

- > "Our partnership with Resend has been a great experience. They've made sure we can focus on what we do best—building our product and growing our business."
>
> ![Gumroad](https://cdn.resend.com/posts/logo-gumroad.png)
>
> ![Sahil Lavingia](https://resend.com/static/avatars/sahil-lavingia.jpg)
>
> Sahil LavingiaCEO of Gumroad

- > "Switching over to Resend from SendGrid marked a significant improvement in our email management. We started with a small test - waitlist emails for our iOS and Windows apps. Within 30 minutes, we were done."
>
> ![Raycast](https://cdn.resend.com/posts/logo-raycast.png)
>
> ![Thomas Mann](https://resend.com/static/avatars/thomas-mann.jpg)
>
> Thomas MannFounder & CEO of Raycast

- > "The simplicity and reliability of Resend allowed our engineers to focus on building features rather than troubleshooting email infrastructure."
>
> ![Replit](https://cdn.resend.com/posts/logo-replit.png)
>
> ![Amadeo Pellicce](https://resend.com/static/avatars/amadeo-pellicce.jpg)
>
> Amadeo PellicceConnectors, Agents and Automations Lead at Replit

- > "We're a small team with a lot on our plates. Email infrastructure is something we don't want to think about, and with Resend we don't have to."
>
> ![Tailwind](https://cdn.resend.com/posts/logo-tailwind.png)
>
> ![Peter Suhm](https://resend.com/static/avatars/peter-suhm.jpg)
>
> Peter SuhmOps at Tailwind

- > "The best part about taking Resend into production was that there was no friction at all."
>
> ![Braintrust](https://cdn.resend.com/posts/logo-braintrust.png)
>
> ![Tara Nagar](https://resend.com/static/avatars/tara-nagar.jpg)
>
> Tara NagarSoftware Engineer at Braintrust

- > "The flexibility of Resend is what we value most. It allows us to quickly adapt and refine our email communications as our products evolve."
>
> ![Turso](https://cdn.resend.com/posts/logo-turso.png)
>
> ![Glauber Costa](https://resend.com/static/avatars/glauber-costa.jpg)
>
> Glauber CostaFounder and CEO at Turso

- > "Resend is email with simpler APIs, better webhooks, and best-in-class debugging."
>
> ![Inngest](https://cdn.resend.com/posts/logo-inngest.png)
>
> ![Dan Farrelly](https://resend.com/static/avatars/dan-farrelly.jpg)
>
> Dan FarrellyCTO and Co-Founder of Inngest


- > "Our team loves Resend. It makes email sending so easy and reliable. After we switched to Dedicated IPs, our deliverability improved tremendously and we don't hear complaints about emails landing on spam anymore."
>
> ![Infisical](https://cdn.resend.com/posts/logo-infisical.jpg)
>
> ![Vlad Matsiiako](https://resend.com/static/avatars/vlad-matsiiako.jpg)
>
> Vlad MatsiiakoCo-founder of Infisical

- > "As a developer I love the approach that the Resend team is taking. Its so refreshing. They are also extremely user-centric and helpful in terms of getting you up and running, sending beautiful emails that deliver."
>
> ![Mintlify](https://cdn.resend.com/posts/logo-mintlify.jpg)
>
> ![Hahnbee Lee](https://resend.com/static/avatars/hahnbee-lee.jpg)
>
> Hahnbee LeeCo-Founder at Mintlify

- > "We value tools that feel stable, well thought out, and aligned with the standards we expect across our stack. Resend meets those expectations. It lets our team stay focused on building the larger platform rather than getting pulled into the overhead that typically comes with legacy email infrastructure."
>
> ![MrBeast](https://cdn.resend.com/posts/logo-mrbeast.png)
>
> ![Bradley Greenwood](https://resend.com/static/avatars/bradley-greenwood.jpg)
>
> Bradley GreenwoodVP of Engineering at MrBeast

- > "Our partnership with Resend has been a great experience. They've made sure we can focus on what we do best—building our product and growing our business."
>
> ![Gumroad](https://cdn.resend.com/posts/logo-gumroad.png)
>
> ![Sahil Lavingia](https://resend.com/static/avatars/sahil-lavingia.jpg)
>
> Sahil LavingiaCEO of Gumroad

- > "Switching over to Resend from SendGrid marked a significant improvement in our email management. We started with a small test - waitlist emails for our iOS and Windows apps. Within 30 minutes, we were done."
>
> ![Raycast](https://cdn.resend.com/posts/logo-raycast.png)
>
> ![Thomas Mann](https://resend.com/static/avatars/thomas-mann.jpg)
>
> Thomas MannFounder & CEO of Raycast

- > "The simplicity and reliability of Resend allowed our engineers to focus on building features rather than troubleshooting email infrastructure."
>
> ![Replit](https://cdn.resend.com/posts/logo-replit.png)
>
> ![Amadeo Pellicce](https://resend.com/static/avatars/amadeo-pellicce.jpg)
>
> Amadeo PellicceConnectors, Agents and Automations Lead at Replit

- > "We're a small team with a lot on our plates. Email infrastructure is something we don't want to think about, and with Resend we don't have to."
>
> ![Tailwind](https://cdn.resend.com/posts/logo-tailwind.png)
>
> ![Peter Suhm](https://resend.com/static/avatars/peter-suhm.jpg)
>
> Peter SuhmOps at Tailwind

- > "The best part about taking Resend into production was that there was no friction at all."
>
> ![Braintrust](https://cdn.resend.com/posts/logo-braintrust.png)
>
> ![Tara Nagar](https://resend.com/static/avatars/tara-nagar.jpg)
>
> Tara NagarSoftware Engineer at Braintrust

- > "The flexibility of Resend is what we value most. It allows us to quickly adapt and refine our email communications as our products evolve."
>
> ![Turso](https://cdn.resend.com/posts/logo-turso.png)
>
> ![Glauber Costa](https://resend.com/static/avatars/glauber-costa.jpg)
>
> Glauber CostaFounder and CEO at Turso

- > "Resend is email with simpler APIs, better webhooks, and best-in-class debugging."
>
> ![Inngest](https://cdn.resend.com/posts/logo-inngest.png)
>
> ![Dan Farrelly](https://resend.com/static/avatars/dan-farrelly.jpg)
>
> Dan FarrellyCTO and Co-Founder of Inngest


## Email reimagined.  Available today.

[Get started](https://resend.com/signup)

2261 Market Street #5039

San Francisco, CA 94114

[![X](https://resend.com/static/footer-x.svg?dpl=dpl_7Lm9ZixRJFR2NzJGnMaQVYok6Jf9)](https://x.com/resend)[![GitHub](https://resend.com/static/footer-github.svg?dpl=dpl_7Lm9ZixRJFR2NzJGnMaQVYok6Jf9)](https://github.com/resend)[![LinkedIn](https://resend.com/static/footer-linkedin.svg?dpl=dpl_7Lm9ZixRJFR2NzJGnMaQVYok6Jf9)](https://linkedin.com/company/resend)[![Youtube](https://resend.com/static/footer-youtube.svg?dpl=dpl_7Lm9ZixRJFR2NzJGnMaQVYok6Jf9)](https://www.youtube.com/channel/UC0FkhoSz2kYqHVBk4L0QYIg)

[All systems operational](https://resend.com/status)

Features

- [Automations](https://resend.com/features/automations)
- [Audiences](https://resend.com/features/audiences)
- [Broadcasts](https://resend.com/features/broadcasts)
- [Inbound](https://resend.com/features/inbound)
- [Templates](https://resend.com/features/templates)
- [Webhooks](https://resend.com/features/webhooks)
- [Dedicated IPs](https://resend.com/features/dedicated-ips)

Resources

- [Changelog](https://resend.com/changelog)
- [Pricing](https://resend.com/pricing)
- [Enterprise](https://resend.com/enterprise)
- [Security](https://resend.com/security)
- [SOC 2](https://resend.com/security/soc-2)
- [GDPR](https://resend.com/security/gdpr)
- [Brand](https://resend.com/brand)

Company

- [About](https://resend.com/about)
- [Blog](https://resend.com/blog)
- [Careers](https://resend.com/careers)
- [Clubs](https://resend.com/clubs)
- [Customers](https://resend.com/customers)
- [Humans](https://resend.com/humans)
- [Philosophy](https://resend.com/philosophy)

Help

- [Support](https://resend.com/support)
- [Status](https://resend.com/status)
- [Migrate](https://resend.com/migrate)
- [Knowledge base](https://resend.com/docs/knowledge-base/introduction)
- [Legal policies](https://resend.com/legal)

Community

- [Events](https://resend.com/events)
- [Insiders](https://resend.com/insiders)
- [Open source](https://resend.com/open-source)
- [Wallpapers](https://resend.com/wallpapers)