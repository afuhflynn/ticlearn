[home](https://www.pencilandpaper.io/)

[Contact Us](https://www.pencilandpaper.io/contact-us)

![close](https://cdn.prod.website-files.com/65d32a145451f865e1ca2bbe/65e6e8739a35afe6e1583c3a_close%20(1).webp)

# Loading Feedback

May 24, 2022

![](https://cdn.prod.website-files.com/65d605a3b4417479c154329f/68cc8e9ebce12671fa1aa158_fanny-vassilatos02.webp)

Fanny Vassilatos

![](https://cdn.prod.website-files.com/65d605a3b4417479c154329f/68cc8e8c9183017ec362383c_ceara-crawshaw02.webp)

Ceara Crawshaw

![](https://cdn.prod.website-files.com/65d605a3b4417479c154329f/674f2a9cf099d5d1970c005d_hero-article-loading.webp)

![](https://cdn.prod.website-files.com/65d32a145451f865e1ca2bbe/665e2f9a8cc6f2fefef3de44_blob-big-s.svg)

On the Internet, loading is inevitable. There are so many factors at play that you may have the fastest software out there, there’s always a chance that your user will find themselves waiting in front of a screen.

In dreamworld, online systems have absolutely zero delays, everything is snappy as can be. (Imagine!) But in the real world, when loading happens, you get the chance to reduce the perceived wait time for your user and increase the perceived value of your system.

No longer can you get away with just slapping a loading spinner on the page, and hoping the user will not table flip. This article is meant to help designers, developers, QAs and product people consider both the user’s and the system’s context before building the appropriate loading pattern.

## Controlling the perception of time

Loading states are just that — small pockets of time that should be judiciously used to provide the user with visibility on what the system is doing. This is key in helping users feel in control, making them aware of the context at all times, and reassuring them that the right task is effectively being worked on.

A good way to approach loading states is to think of them as a way to play with users’ perception of time and turn it to your advantage.

Loading indicators are all about balancing perceived time and perceived value. In other words, the loading time should equate to the perceived value of the task at hand. For high-stakes operations that are done occasionally, you might consider making tasks seem longer, as if more important, than they actually are. Whereas for quick actions that are done regularly, your goal really should be to make the wait time seem as minimal as possible.

## Setting expectations with the UI

Loading states are also a good opportunity to set expectations of users in your product. They can be used as a communication device to reduce uncertainty for the user by explaining what’s happening or preparing them for what’s coming up next.

Before knowing which user expectations to set, you must be aware of the technical reality of how your data is likely to load. Here are some technical prompts to discuss with your team:

## Things to consider when designing loading feedback

Follow these prompts along with your team as you embark on tackling loading UX. These prompts should help you think about how you want to apply loading best practices to your specific scenario.

**Is the loading done upfront?** You might be dealing with an upfront loading situation, for example when the user first loads a page and expects to see existing content show up. Here, you need to set expectations as users might not be familiar with the page that’s about to be displayed.

**Is the loading user-triggered?** Or you might be creating a loading interaction that follows a user-initiated action like them submitting a form or requesting to export a large document. In this case, immediate feedback is primordial. You want to inform them that the request has been understood by the system before displaying an appropriate loading pattern to show progress.

**Do you need to block out the whole screen?** It’s important to ask yourself exactly how much space does this loading interaction deserve.

If it’s something unobtrusive that doesn’t require user input, they would naturally expect this to be done quietly in the background.

If it’s a critical task that, even if it’s easy for the system to manage, is a high-stake operation in the user’s context, then a full-page loading mechanism might bring a sense of security and trust for them.

**Can we predict the timing of the content to load?** How much visibility do you have on the amount of time the task requires to complete? Can you estimate it accurately? Is it valuable to communicate that to the user? What’s the expectation for how long it should take to load?

**Can we initiate different behaviours based on timing thresholds that we set?** You might want to consider breaking a long loading task into smaller chunks with different messaging or visuals.

**What is the range of objects that need to be loaded?** What’s the scope of the end result? A list of 3 cards requires a different reflection for the loading experience than a 10,000-item table that potentially involves pagination or a “Load More” button, etc.

**How does the server return the info to the page?** Ask yourself what makes the most sense to return to your user. Maybe it makes sense to bring the content up as it loads, one by one. It might make more sense to extend the loading experience until you have, say, 12 items ready to show. Keep typical user scenarios in mind when thinking about this. You know your users and your content best.

**Is data synchronized? Or do we need a refresh mechanism?** Something to factor in is how and when the data is fetched. Is it always kept in sync in the background? Does the page have to be manually refreshed by the user every now and then? Think of loading feedback mechanisms that are appropriate for the frequency and user involvement of the event.

**What’s the frequency of updates or changes?** Does your data tend to be updated every few seconds? Every few hours? Once a day? This affects the logic you want to put into your loading experience in terms of real estate and user flow interruption.

**Have you considered the mobile experience?**

Have you thought about how the mobile experience might be impacted? This can be a unique scenario because mobile devices have UI patterns and may have different connection speeds and data transfer rates depending on the location and moment in time.

## Deciding on your logic

You will need to spend time understanding how to best marry your data structure and your users’ expectations to figure out the logic of your page rendering. Loading states can be passive or active, and depending on the scope of those two factors, you want to design an appropriate feedback experience.

- **Passive loading** is when the system is loading stuff upfront. Such as when the system first loads a data-heavy page, opens a file, or displays search results.
- **Active loading** states are when the system is responding to a user-triggered action. Such as when they publish newly input data, export a large file, or run an automated task. (Actions might include a loading button (or read more button), scrolling in the content area etc).

The scope depends on the amount of data being processed and consequently, the perceived importance of the task.

Now that you’re more aware of the context of your desired loading experience, let’s dig into some common use cases:

### Scope

How large is the amount of data you’re loading? How large are the individual pieces of data? For example, loading a page of complex cards each containing images, icons, text and a button needs a different loading consideration than loading a table made of lightweight text-based rows.

#### Load items one by one

For more complex and richly formatted components, loading and showing them one by one makes sense in most cases. The goal is to reduce the perceived wait on the user’s side. If you can get away with one item at a time without it being confusing for the user, it’s a no brainer. You’re giving them something to work with right away.

![](https://cdn.prod.website-files.com/65d605a3b4417479c154329f/65ef09067e247c47c3212672_Load-1-by-1.gif)

#### Load items and show them all at once

For lighter components that exist better as a group, say, a table, it makes more sense to load and show them all at once or at least, in batches. Now for what happens while they’re still loading, we’ll touch on specific loading patterns shortly.

![](https://cdn.prod.website-files.com/65d605a3b4417479c154329f/65ef0906a03c2c4cedf04f25_Load-all-at-once-Webflow.gif)

_Webflow uses the approach to show all contents at once_

#### Lazy loading

No matter the complexity of your components, if you have a large number of them, you will want to opt for lazy loading. This reduces the amount of data needing to be loaded upfront. You only have to fill a bit more than your user’s viewport height can afford. At least until they hit the bottom and ask for more.

Lazy loading simply means you’re postponing the loading to trigger only when it’s needed.

This can happen in three ways.

**1\. Infinite scroll** is the automatic, or passive, way. When you detect your user has reached the end of the list or page or is close to reaching it, that’s your trigger to pull more content.

![animated gif depicting infinite scroll](https://cdn.prod.website-files.com/65d605a3b4417479c154329f/68e99cbcaa8115e7477193b5_Infinite-Scroll%20comp50%20fuzz4.gif)

**2.** Another way is to let the user decide by making them click something like a **“Load More” button**. That way you’re not unnecessarily bloating the page unless they expressly ask you to.

![](https://cdn.prod.website-files.com/65d605a3b4417479c154329f/65ef09069d4bf184f42a5dd1_Load-More.gif)

⚠️ Now you have to be careful with lazy loading because allowing the content to load on top of previous content forever risks affecting the page performance. Again, this depends on the scope of your data. Is it small units of data but lots of them? Or a few bigger units of data? How does that behave when you have 1,000+ units loaded on a given page?.

**3.** This is where **pagination** comes in. Pagination is lazy loading happening on different pages. You’re letting users decide when they want to view more content and also limiting its scope to a reasonable amount visible per page.

![](https://cdn.prod.website-files.com/65d605a3b4417479c154329f/65ef0952985391c7719ab9ac_Pagination.gif)

Pagination also creates a sense of place for the user. In time, they start building a mental map of which object is on which page and this is helpful for findability and future reference.  Another advantage there is that the user can link a ‘place’ with an object – ex. “My favorite option was on page 3”.

### Frequency

How often does this upfront loading occur?

#### Very frequent

If your content is always kept in sync automatically, you want your loading feedback to be very minimal.

![Saved to drive success indicator in Google Docs](https://cdn.prod.website-files.com/65d605a3b4417479c154329f/65eb31bd048f7245c280aa35_GDoc-Saved-to-Drive.webp)

_Google Drive uses a very subtle indicator to constantly inform users that the document is syncing or up to date_

#### Rare

When changes on the page are more rare, and refreshing has to be initiated by the user, make sure you communicate it as soon as something new is available.

This type of loading interaction needs a bit more real estate than with automatic syncing, so something like a full-width top banner or a toast can effectively catch your user’s attention.

![Jira guide user towards next action](https://cdn.prod.website-files.com/65d605a3b4417479c154329f/65eb31bddf1222354971fd13_Jira-Passive-Refresh.webp)

_Jira uses a notification toast to inform users that the page needs refreshing_

## Loading patterns

In the world of loading patterns, there are basically two types of loading indicators that serve a variety of use cases.

**Determinate** progress indicators communicate a sense of duration. They have a start point and an end point. They give users more information on how much time they can expect to wait.

**Indeterminate** progress indicators have an uncertain duration. A common example is a looping animation, or a spinner. They are less informative, but are sometimes inevitable.

(TL;DR) Core principles

- Always give immediate feedback right after receiving the request

- For waits longer than 2 seconds, use a looped animation (indeterminate)

- For waits longer than 10 seconds, use a percent-done indicator (determinate)

- Don’t use static loading messages, make sure they are dynamic and contextual


Now let’s look at the wide array of loading patterns you can use for different use cases of active loading — i.e. loading triggered by user actions.

### Below 0.1 second

When you manage to get stuff loading in less than 0.1 second, this is considered instantaneous and not noticeable to the user.

Good job, display the result.

However, if it’s a task that represents the final step of a tedious workflow, you might want to consider this pattern:

#### Fake loader **(determinate)**

_Also known as the_ [_labor illusion_](https://www.jstor.org/stable/41261916?seq=1) _or_ [_benevolent deception_](http://www.cond.org/deception.pdf)

It’s an opportunity to create a bit of breathing room to appreciate the effort that has been put in the task. This gives the impression of the machine “working hard” for large tasks or saving content even though it’s practically instantaneous. (Read more about this [here](https://uxmag.com/articles/let-your-users-wait))

It is considered a determinate progress indicator because you get to set the delay that makes the most sense for the scale of the task. You can also factor in typical user reaction times if you provide an undo mechanism. This is often seen when sending emails where you get a 5 second window to reverse your action.

![gmail undo send UX pattern example](https://cdn.prod.website-files.com/65d605a3b4417479c154329f/65eb317a1a4da703f94eaff8_GMail-Undo-Send.webp)

_When sending an email, Google forces a 5 second wait to allow users to undo_

### Between 0.1 and 1 second

This delay is expected for online software and is barely noticeable for the user. Make sure you do not try to “fill that time” with a spinner or an animation. Chances are your users will end up more confused than not.

> “ _For anything that takes less than 1 second to load, it is distracting to use a looped animation, because users cannot keep up with what happened and might feel anxious about whatever flashed on the screen_” — via [NN Group](https://www.nngroup.com/articles/progress-indicators/)

### Above 1 second

As soon as you pass the 1 second mark, the wait becomes noticeable to the user. Consider your options.

#### Loading spinner

Full page loading spinners are to avoid as they provide no sense of progress especially because they are looped and indeterminate. If you are aware that the task at hand is going to take more than a few milliseconds, consider using another loading pattern.

However, spinners can work well on a smaller scale. You can use it for more concise components like the contents of a table row or on a button after it’s just been clicked.

![](https://cdn.prod.website-files.com/65d605a3b4417479c154329f/65ef0975c41b587da36b941e_In-Component-Loader.gif)

#### Skeleton loader screen

_Also known as Ghost elements or Greeking._ Skeleton screens are indeterminate and are the new norm for full-page loading situations. They consist of immediately showing a wireframe-type loading screen before real content shows up. You’ve probably already seen this on the websites and apps you use daily.

Skeleton loading screens give users something to look at while they wait, it sets the expectation of what the screen will broadly look like. This loading feedback takes up all the space compared to a loading spinner, it’s an entire loading screen.

![](https://assets-global.website-files.com/65d32a145451f865e1ca2bbe/65ef0bbdb1a4b76978b1d807_Skeleton-Screen-With.svg)

![](https://assets-global.website-files.com/65d32a145451f865e1ca2bbe/65ef0bbd1d04dd18bee98340_Skeleton-Screen-Without.svg)

![](https://assets-global.website-files.com/65d32a145451f865e1ca2bbe/65e5a167a255aaed032418d9_left-arrow%20(1).png)![](https://assets-global.website-files.com/65d32a145451f865e1ca2bbe/65e5a1205437037e29ee0634_right-arrow.png)

**Optional:** Shimmer effect (by Facebook)

You can add a shimmer effect to your skeleton screens. The added movement takes users’ attention away from the wait and effectively reduces perceived wait.

![](https://cdn.prod.website-files.com/65d605a3b4417479c154329f/65ef0998c41b587da36ba455_Shimmer.gif)

**Optional:** Pulsing animation

An equally effective animation device is pulsing. It also plays a role similar to what a typical spinner is meant for. An added distraction, you might say.

![](https://cdn.prod.website-files.com/65d605a3b4417479c154329f/65ef0998d32fdb877001cb9a_Pulsing.gif)

**Optional:** Use of dominant colour

Another variant of the skeleton screen is the use of dominant colour. If your UI allows for it, why not let images guide the colour palette? This brings some eye-catching dynamism to the page.

Of course, don’t just pull random colours if your UI is mainly text-based.

_Unsplash uses a blurred dominant colour effect_

### Between 2 and 10 seconds

After 2 seconds, we enter the realm of more informative progress indicators. Here are some options.

#### Time indicator **(determinate)**

On the development side of things, it’s hard to estimate loading times precisely in minutes and seconds. You also don’t want to set expectations you can’t guarantee you’ll meet. Instead, go with something general like “This can take a few minutes” just to set expectations and let the user decide if this is a good time to quickly switch apps to check something else.

![](https://cdn.prod.website-files.com/65d605a3b4417479c154329f/65ef099859fd3a97f3d4773b_Time-Remaining.gif)

#### Progress bar

Progress bars are a go-to and they are determinate. They work well both inside components as well as at the page level.

![](https://cdn.prod.website-files.com/65d605a3b4417479c154329f/65ef0998f325eb6107a8ab82_Page-Level-Progress-Bar.gif)

🔥 Hot tip

Use an ease-in animation to make the progress seem like it’s accelerating.

#### Step indicator

For the user, this breaks down the wait into smaller chunks. They might not know exactly how long each step takes, but it’ll help them estimate the total. This pattern is indeterminate.

If the system is processing multiple items, give the user visibility on how many items have been completed.

If you don’t have such granular visibility or it’s not relevant to the user, go with more general messaging explaining what’s currently happening. “Cleaning up duplicates”, “Connecting to server”

![](https://cdn.prod.website-files.com/65d605a3b4417479c154329f/65eb0f45ffa18c457d06b7e5_Step-Indicator-New.gif)

💡 If the process takes a bit longer to complete, you might want to consider offering your user the option to abort the task so they don’t feel stuck in a position where they are forced to wait.

### 10 seconds and over

For these larger scale tasks, you really want to give control to the user. Whether that be clear visibility on how much is done, or the ability for them to switch to another task with the guarantee that the system will keep working. Here are some options.

#### Percent-done indicator **(determinate)**

Showing a percentage of completion might not give users the exact amount of minutes until the task is done, but it effectively gives them a sense of scale so they are able to estimate the total duration and then act on it.

Examples of this are progress bars or circles filling up.

![](https://cdn.prod.website-files.com/65d605a3b4417479c154329f/65ef09f1d0d867bb7a4ac5e3_WeTransfer.gif)

_WeTransfer’s upload percent-done loader_

‍

‍

⚠️ Don’t stop progress at 99% If you can’t estimate the length of the task precisely, use another approach. #microsoft.

#### Notify when done (large tasks) **(indeterminate)**

For even larger tasks, you might consider a “Come back later” type of interaction. A huge benefit of this is that there is no in-app perceived wait at all on the user side.

These are good for when you cannot approximately estimate the loading time. You give users total control of what they do with their time and they’ll trust that they can pick up from where they left off later in the day.

The notification itself can be done in-app or prompted via email.

![](https://cdn.prod.website-files.com/65d605a3b4417479c154329f/65ef0a1436581f5511e70979_Notify-When-Done-1.svg)

#### Task running “in the background” **(determinate)**

Another way to deal with large tasks is to give the running task visibility in a smaller part of the screen without interrupting the user’s workflow.

A good example of this is when you upload a large file or set of files in Google Drive. The system gives you immediate feedback and executes the task in a drawer that lets you navigate the rest of the app.

Instant feedback, progress visibility, uninterrupted workflow; the perfect trifecta!

![](https://cdn.prod.website-files.com/65d605a3b4417479c154329f/65ef0a14e003f2b5d2554cc6_GDrive-Passive-Drawer.webp)

_Google Drive’s file upload passive drawer_

## Wrapping up

The key thing to keep in mind is that loading states give users visibility on the system status. To decide on the best way to do that, you need to take into account the way your data is structured, the context of your user’s workflow, and the perceived value of the task being executed.

Loading patterns are essentially communication devices for various user scenarios. Make sure you leverage these opportunities to provide tailored feedback, infuse some brand personality and cultivate a sense of trust in your system.

## Data-rich design, but easier

## Our secret methodology for features that hinge on data.

Our **Data Mapping Workshop** sets you up to design any dashboard, filter, data table or search experience like a total pro, creating better initial designs off the bat and iterating higher quality end results. Stop struggling to understand the material you're working with, take control and make better design!

## Data Mapping Workshop

$499 USD

[Learn More](https://www.pencilandpaper.io/product/enterprise-data-mapping-workshop)

## Continue Reading...

[![](https://cdn.prod.website-files.com/65d605a3b4417479c154329f/67472041233438303869f0bb_hero-article-filters.webp)\\
\\
**Filter UX Design Patterns** \\
\\
Is it just us, or do all resources about filtering UX revolve around e-commerce? It might be “easier” to document the ins and outs of an interaction where you have control over the...](https://www.pencilandpaper.io/articles/ux-pattern-analysis-enterprise-filtering)

[![](https://cdn.prod.website-files.com/65d605a3b4417479c154329f/6740a422493215ccfa5e1a88_hero-article-success.webp)\\
\\
**Success Message UX Examples & Best Practices** \\
\\
In the absence of positive success feedback, people are at risk to assume the worst (a classic human move). Success, high fives, and affirmations are the...](https://www.pencilandpaper.io/articles/success-ux)

[![](https://cdn.prod.website-files.com/65d605a3b4417479c154329f/65eaf5f2bd7eb019b4772c1f_Cover-image-new-pencils.webp)\\
\\
**5 Enterprise UX Examples That Increase Flexibility** \\
\\
Call it whatever you want, enterprise software AKA complex software AKA SAAS products, whichever is...](https://www.pencilandpaper.io/articles/enterprise-ux-patterns)

[![](https://cdn.prod.website-files.com/65d605a3b4417479c154329f/65e891dee6efd7812961f75d_Cover-image-Beta-groups.webp)\\
\\
**Learning UX with Real Products & Beta Communities: Tips for Success** \\
\\
We talk a lot about how to grow as a UX designer, develop your skills...](https://www.pencilandpaper.io/articles/learning-ux-with-real-products-and-beta-communities)

## Download our Table UX Audit Checklist

Do a mini UX audit on your table views & find your trouble spots with this free guide.

Available in a printable version (pdf).

_Please fill in the form below and it will be in your inbox shortly after._

Whats your name?

Whats your email?\*

Can we email you?

Yes, I'd like to receive marketing emails from Pencil & Paper

This form collects your name and email so we can add you to our email list and send you our newsletter full of helpful insights and updates. Please read our [privacy policy](https://www.pencilandpaper.io/privacy-policy) to understand how we protect and manage your data.

Thank you! Your submission has been received!

Oops! Something went wrong while submitting the form.

![letters](https://cdn.prod.website-files.com/65d32a145451f865e1ca2bbe/65eede2a0f31509011751e08_letters.png)

## Want to dig deeper on flow diagrams?

Be the first to know about our upcoming release!

_If you found this intro content useful and find yourself needing to express yourself more efficiently on your software team, this training is for you. Our new flowchart training includes real-life enterprise stories and examples for using flowcharts for UX. You’ll get tips on how to make your diagramming efforts successful, how to derive info for the flow charts, and how to get others to use and participate in the diagramming process._

Whats your name?\*

Whats your role?\*

RoleDeveloperDesignerProductDev Team LeadQASalesMarketingCustomer SupportOther

Whats your email?\*

Would you like to join our newsletter?

Yes, sign me up!

This form collects your name and email so we can add you to our email list and send you our newsletter full of helpful insights and updates. Please read our [privacy policy](https://www.pencilandpaper.io/privacy-policy) to understand how we protect and manage your data.

Thank you! Your submission has been received!

Oops! Something went wrong while submitting the form.

 [Contact Us](https://www.pencilandpaper.io/contact-us)

[![](https://cdn.prod.website-files.com/65d32a145451f865e1ca2bbe/66621b3c8194cdd9acfeed5c_card-intro-ux.webp)\\
![](https://cdn.prod.website-files.com/65d32a145451f865e1ca2bbe/66393cde85ac29c0a83583bf_white-swave.svg)\\
\\
![](https://cdn.prod.website-files.com/65d32a145451f865e1ca2bbe/6667999bbad0589ef07d8bab_prod-type-tv.svg)\\
\\
**Intro to UX for Teams**  **A fun, high-impact injection that levels up your entire team and gets UX alignment without all the fluff. We cover everything from the basics of UX to real-life, enterprise examples that you might just sound a little familiar.** \\
\\
For up to 20 team members\\
\\
7 Videos\\
\\
55 min\\
\\
**$1000 USD**](https://www.pencilandpaper.io/product/intro-to-ux-for-teams-masterclass)

![](https://cdn.prod.website-files.com/65d32a145451f865e1ca2bbe/666cb9d4f373b6ead411f7ce_blue-icon-team.webp)

### Explore our UX/UI Services

### Curious about the possibility of working with the P&P crew on your enterprise software project? Check out our services.

[Our services](https://www.pencilandpaper.io/services-2024)

![](https://cdn.prod.website-files.com/65d32a145451f865e1ca2bbe/666cb4a737fa4432a754c7e6_blue-icon-mail.svg)

### Join our newsletter

### Bringing enterprise-grade UX resources into the world to help you think better and have more interesting conversations with your crew!

[Newsletter sign up](https://www.pencilandpaper.io/newsletter)

[![](https://cdn.prod.website-files.com/65d32a145451f865e1ca2bbe/666730a100e30c29cd88be49_card-tables-checklist.webp)\\
![](https://cdn.prod.website-files.com/65d32a145451f865e1ca2bbe/66393cde85ac29c0a83583bf_white-swave.svg)\\
\\
![](https://cdn.prod.website-files.com/65d32a145451f865e1ca2bbe/6667999bab02242b05d5f531_prod-type-download.svg)\\
\\
**Data Tables Checklist**  **This free checklist lets you double check your data tables for their UX quality and assess various aspects which make or break the data table experience for your users.** \\
\\
PDF\\
\\
**Free**](https://www.pencilandpaper.io/product/data-tables-ux-checklist-download) [![](https://cdn.prod.website-files.com/65d32a145451f865e1ca2bbe/666748efbf81ce11ac40b99b_card-datatables.webp)\\
![](https://cdn.prod.website-files.com/65d32a145451f865e1ca2bbe/66393cde85ac29c0a83583bf_white-swave.svg)\\
\\
![](https://cdn.prod.website-files.com/65d32a145451f865e1ca2bbe/6667999bbad0589ef07d8bab_prod-type-tv.svg)\\
\\
**Data Tables Masterclass**  **We’ve crafted the masterclass to enrich and expand upon your experience reading our article. Peppering in design principles, more examples and workflow nuances that’ll help you deliver high quality UX.** \\
\\
90 MIN\\
\\
**$149**  **$99 USD**](https://www.pencilandpaper.io/product/data-tables-masterclass)

[![](https://cdn.prod.website-files.com/65d32a145451f865e1ca2bbe/666730a100e30c29cd88be49_card-tables-checklist.webp)\\
![](https://cdn.prod.website-files.com/65d32a145451f865e1ca2bbe/66393cde85ac29c0a83583bf_white-swave.svg)\\
\\
![](https://cdn.prod.website-files.com/65d32a145451f865e1ca2bbe/6667999bab02242b05d5f531_prod-type-download.svg)\\
\\
**Data Tables Checklist**  **This free checklist lets you double check your data tables for their UX quality and assess various aspects which make or break the data table experience for your users.** \\
\\
PDF\\
\\
**Free**](https://www.pencilandpaper.io/product/data-tables-ux-checklist-download) [![](https://cdn.prod.website-files.com/65d32a145451f865e1ca2bbe/665fa8becc9e4a74f1a60b04_card-handbook-outline.webp)\\
![](https://cdn.prod.website-files.com/65d32a145451f865e1ca2bbe/66393cde85ac29c0a83583bf_white-swave.svg)\\
\\
![](https://cdn.prod.website-files.com/65d32a145451f865e1ca2bbe/6667999bab02242b05d5f531_prod-type-download.svg)\\
\\
**Design Handbook Outline**  **This outline gives you a framework for how to build your own design handbook. It’s the stuff you want to include in your handbook, or at least consider in the process. Take this as a starting point, and adjust it to fit your team’s size, culture, and design maturity.** \\
\\
PDF\\
\\
**Free**](https://www.pencilandpaper.io/product/design-handbook-outline-download) [![](https://cdn.prod.website-files.com/65d32a145451f865e1ca2bbe/66688ce59bc6c97647cda233_card-interaction-design-masterclass.webp)\\
![](https://cdn.prod.website-files.com/65d32a145451f865e1ca2bbe/66393cde85ac29c0a83583bf_white-swave.svg)\\
\\
![](https://cdn.prod.website-files.com/65d32a145451f865e1ca2bbe/6667999bbad0589ef07d8bab_prod-type-tv.svg)\\
\\
**Enterprise Interaction Design Masterclass**  **Learn the foundation that P&P uses to think through interaction patterns, reframe what UX quality to aim for and discover states beyond the basics like hover and disabled...** \\
\\
55 min\\
\\
**$150 USD**](https://www.pencilandpaper.io/product/interaction-design-masterclass)

[![](https://cdn.prod.website-files.com/65d32a145451f865e1ca2bbe/666730a100e30c29cd88be49_card-tables-checklist.webp)\\
![](https://cdn.prod.website-files.com/65d32a145451f865e1ca2bbe/66393cde85ac29c0a83583bf_white-swave.svg)\\
\\
![](https://cdn.prod.website-files.com/65d32a145451f865e1ca2bbe/6667999bab02242b05d5f531_prod-type-download.svg)\\
\\
**Data Tables Checklist**  **This free checklist lets you double check your data tables for their UX quality and assess various aspects which make or break the data table experience for your users.** \\
\\
PDF\\
\\
**Free**](https://www.pencilandpaper.io/product/data-tables-ux-checklist-download) [![](https://cdn.prod.website-files.com/65d32a145451f865e1ca2bbe/665fa8becc9e4a74f1a60b04_card-handbook-outline.webp)\\
![](https://cdn.prod.website-files.com/65d32a145451f865e1ca2bbe/66393cde85ac29c0a83583bf_white-swave.svg)\\
\\
![](https://cdn.prod.website-files.com/65d32a145451f865e1ca2bbe/6667999bab02242b05d5f531_prod-type-download.svg)\\
\\
**Design Handbook Outline**  **This outline gives you a framework for how to build your own design handbook. It’s the stuff you want to include in your handbook, or at least consider in the process. Take this as a starting point, and adjust it to fit your team’s size, culture, and design maturity.** \\
\\
PDF\\
\\
**Free**](https://www.pencilandpaper.io/product/design-handbook-outline-download) [![](https://cdn.prod.website-files.com/65d32a145451f865e1ca2bbe/66688ce59bc6c97647cda233_card-interaction-design-masterclass.webp)\\
![](https://cdn.prod.website-files.com/65d32a145451f865e1ca2bbe/66393cde85ac29c0a83583bf_white-swave.svg)\\
\\
![](https://cdn.prod.website-files.com/65d32a145451f865e1ca2bbe/6667999bbad0589ef07d8bab_prod-type-tv.svg)\\
\\
**Enterprise Interaction Design Masterclass**  **Learn the foundation that P&P uses to think through interaction patterns, reframe what UX quality to aim for and discover states beyond the basics like hover and disabled...** \\
\\
55 min\\
\\
**$150 USD**](https://www.pencilandpaper.io/product/interaction-design-masterclass)

![](https://cdn.prod.website-files.com/65d32a145451f865e1ca2bbe/666cb4a7ff7a65fee96857f7_blue-icon-book.svg)

### Curious about our Products for Enterprise software?

### Check out what other goodies we have for you and your team

[Explore products](https://www.pencilandpaper.io/products)

[![](https://cdn.prod.website-files.com/65d32a145451f865e1ca2bbe/666730a100e30c29cd88be49_card-tables-checklist.webp)\\
![](https://cdn.prod.website-files.com/65d32a145451f865e1ca2bbe/66393cde85ac29c0a83583bf_white-swave.svg)\\
\\
![](https://cdn.prod.website-files.com/65d32a145451f865e1ca2bbe/6667999bab02242b05d5f531_prod-type-download.svg)\\
\\
**Data Tables Checklist**  **This free checklist lets you double check your data tables for their UX quality and assess various aspects which make or break the data table experience for your users.** \\
\\
PDF\\
\\
**Free**](https://www.pencilandpaper.io/product/data-tables-ux-checklist-download)

![](https://cdn.prod.website-files.com/65d32a145451f865e1ca2bbe/666cb9d4f373b6ead411f7ce_blue-icon-team.webp)

### Explore our UX/UI Services

### Curious about the possibility of working with the P&P crew on your enterprise software project? Check out our services.

[Our services](https://www.pencilandpaper.io/services-2024)

![](https://cdn.prod.website-files.com/65d32a145451f865e1ca2bbe/666cb4a737fa4432a754c7e6_blue-icon-mail.svg)

### Join our newsletter

### Bringing enterprise-grade UX resources into the world to help you think better and have more interesting conversations with your crew!

[Newsletter sign up](https://www.pencilandpaper.io/newsletter)

![](https://cdn.prod.website-files.com/65d32a145451f865e1ca2bbe/66d8e7475098f9b50752b640_icon-pink-video.svg)

## Interaction Design Masterclass

Ready to level up with a 1 hour masterclass full of real, enterprise-grade examples?

[Check out the Masterclass](https://www.pencilandpaper.io/product/interaction-design-masterclass)

![](https://cdn.prod.website-files.com/65d32a145451f865e1ca2bbe/672146d306b1b6631d3e9877_icon-pink-person-chat.svg)

## Need expert ux help?

Explore your needs and possible solutions in a free, 30 minute session with us.

[Book Free Session](https://pencilpaper.pipedrive.com/scheduler/PPdJwPHB/30-minute-ux-session)

![](https://cdn.prod.website-files.com/65d32a145451f865e1ca2bbe/66d8e74dd8f00a4a0be05db6_icon-pink-list-pencil.svg)

## Get your free Redesign Assessment Checklist!

We've put together a 14 page PDF with situational questions in a variety of focus areas to help you figure out what kind of needs and solutions you can explore for your software.

[Get the Redesign Assement Checklist](https://www.pencilandpaper.io/software-redesign-assessment-checklist)

![](https://cdn.prod.website-files.com/65d32a145451f865e1ca2bbe/6671efc51ff997aee954764a_icon-pink-vector-ruler-pencil.svg)

## Get your Heuristic Report Template Kit

Spend your time and life force actually doing your heuristic evaluation, rather than endless visual fiddling. Complete with a easy to customize Figma file and comprehensive how to videos!

[Check out the Heuristic Report Template Kit](https://www.pencilandpaper.io/product/ux-heuristic-report-template-kit-download)

[![](https://cdn.prod.website-files.com/65d32a145451f865e1ca2bbe/666730a100e30c29cd88be49_card-tables-checklist.webp)\\
![](https://cdn.prod.website-files.com/65d32a145451f865e1ca2bbe/66393cde85ac29c0a83583bf_white-swave.svg)\\
\\
![](https://cdn.prod.website-files.com/65d32a145451f865e1ca2bbe/6667999bab02242b05d5f531_prod-type-download.svg)\\
\\
**Data Tables Checklist**  **This free checklist lets you double check your data tables for their UX quality and assess various aspects which make or break the data table experience for your users.** \\
\\
PDF\\
\\
**Free**](https://www.pencilandpaper.io/product/data-tables-ux-checklist-download) [![](https://cdn.prod.website-files.com/65d32a145451f865e1ca2bbe/665fa8becc9e4a74f1a60b04_card-handbook-outline.webp)\\
![](https://cdn.prod.website-files.com/65d32a145451f865e1ca2bbe/66393cde85ac29c0a83583bf_white-swave.svg)\\
\\
![](https://cdn.prod.website-files.com/65d32a145451f865e1ca2bbe/6667999bab02242b05d5f531_prod-type-download.svg)\\
\\
**Design Handbook Outline**  **This outline gives you a framework for how to build your own design handbook. It’s the stuff you want to include in your handbook, or at least consider in the process. Take this as a starting point, and adjust it to fit your team’s size, culture, and design maturity.** \\
\\
PDF\\
\\
**Free**](https://www.pencilandpaper.io/product/design-handbook-outline-download) [![](https://cdn.prod.website-files.com/65d32a145451f865e1ca2bbe/66688ce59bc6c97647cda233_card-interaction-design-masterclass.webp)\\
![](https://cdn.prod.website-files.com/65d32a145451f865e1ca2bbe/66393cde85ac29c0a83583bf_white-swave.svg)\\
\\
![](https://cdn.prod.website-files.com/65d32a145451f865e1ca2bbe/6667999bbad0589ef07d8bab_prod-type-tv.svg)\\
\\
**Enterprise Interaction Design Masterclass**  **Learn the foundation that P&P uses to think through interaction patterns, reframe what UX quality to aim for and discover states beyond the basics like hover and disabled...** \\
\\
55 min\\
\\
**$150 USD**](https://www.pencilandpaper.io/product/interaction-design-masterclass)

[![](https://cdn.prod.website-files.com/65d32a145451f865e1ca2bbe/6667397619c43e6fc4da13d5_card-loading.webp)\\
![](https://cdn.prod.website-files.com/65d32a145451f865e1ca2bbe/66393cde85ac29c0a83583bf_white-swave.svg)\\
\\
![](https://cdn.prod.website-files.com/65d32a145451f865e1ca2bbe/6667999bbad0589ef07d8bab_prod-type-tv.svg)\\
\\
**Loading Masterclass**  **Dive into the nuances around representing loading in enterprise software. We explore how to adapt to technical constraints and deliver a great experience regardless of how long it takes to load.** \\
\\
50 Min\\
\\
**Free**](https://www.pencilandpaper.io/product/loading-masterclass) [![](https://cdn.prod.website-files.com/65d32a145451f865e1ca2bbe/66688ce59bc6c97647cda233_card-interaction-design-masterclass.webp)\\
![](https://cdn.prod.website-files.com/65d32a145451f865e1ca2bbe/66393cde85ac29c0a83583bf_white-swave.svg)\\
\\
![](https://cdn.prod.website-files.com/65d32a145451f865e1ca2bbe/6667999bbad0589ef07d8bab_prod-type-tv.svg)\\
\\
**Enterprise Interaction Design Masterclass**  **Learn the foundation that P&P uses to think through interaction patterns, reframe what UX quality to aim for and discover states beyond the basics like hover and disabled...** \\
\\
55 min\\
\\
**$150 USD**](https://www.pencilandpaper.io/product/interaction-design-masterclass)

![](https://cdn.prod.website-files.com/65d32a145451f865e1ca2bbe/666cb4a7ff7a65fee96857f7_blue-icon-book.svg)

### Curious about our Products for Enterprise software?

### Check out what other goodies we have for you and your team

[Explore products](https://www.pencilandpaper.io/archive/products-old)

[![](https://cdn.prod.website-files.com/65d32a145451f865e1ca2bbe/66621b3c8194cdd9acfeed5c_card-intro-ux.webp)\\
![](https://cdn.prod.website-files.com/65d32a145451f865e1ca2bbe/66393cde85ac29c0a83583bf_white-swave.svg)\\
\\
![](https://cdn.prod.website-files.com/65d32a145451f865e1ca2bbe/6667999bbad0589ef07d8bab_prod-type-tv.svg)\\
\\
**Intro to UX for Teams**  **Learn the foundation that P&P uses to think through all interaction patterns, including errors, success and warnings** \\
\\
55 min\\
\\
**$90 USD**](https://www.pencilandpaper.io/product/intro-to-ux-for-teams-masterclass) [![](https://cdn.prod.website-files.com/65d32a145451f865e1ca2bbe/66621b3c37ae9322cd10c619_card-heuristic-kit.webp)\\
![](https://cdn.prod.website-files.com/65d32a145451f865e1ca2bbe/66393cde85ac29c0a83583bf_white-swave.svg)\\
\\
![](https://cdn.prod.website-files.com/65d32a145451f865e1ca2bbe/6668977bfeb7b2638d5e868f_prod-type-figma.svg)\\
\\
**Heuristic Report Template Kit**  **Spend your time and life force actually doing your heuristic evaluation, rather than endless visual fiddling. Complete with a easy to customize Figma file and comprehensive how to videos to guide you the whole way.** \\
\\
Figma\\
\\
**$79**  **$59 USD**](https://www.pencilandpaper.io/product/ux-heuristic-report-template-kit-download)

![](https://cdn.prod.website-files.com/65d32a145451f865e1ca2bbe/666cb4a7ff7a65fee96857f7_blue-icon-book.svg)

### Curious about our Products for Enterprise software?

### Check out what other goodies we have for you and your team

[Explore products](https://www.pencilandpaper.io/products)

[![](https://cdn.prod.website-files.com/65d32a145451f865e1ca2bbe/66621b3c37ae9322cd10c619_card-heuristic-kit.webp)\\
![](https://cdn.prod.website-files.com/65d32a145451f865e1ca2bbe/66393cde85ac29c0a83583bf_white-swave.svg)\\
\\
![](https://cdn.prod.website-files.com/65d32a145451f865e1ca2bbe/6668977bfeb7b2638d5e868f_prod-type-figma.svg)\\
\\
**Heuristic Report Template Kit**  **Complete with a easy to customize Figma file and comprehensive how to videos to guide you the whole way.** \\
\\
Figma\\
\\
**$79**  **$59 USD**](https://www.pencilandpaper.io/product/ux-heuristic-report-template-kit-download) [![](https://cdn.prod.website-files.com/65d32a145451f865e1ca2bbe/667da6088a6cf46913671672_service-ux-audit-card.webp)\\
![](https://cdn.prod.website-files.com/65d32a145451f865e1ca2bbe/66393cde85ac29c0a83583bf_white-swave.svg)\\
\\
![](https://cdn.prod.website-files.com/65d32a145451f865e1ca2bbe/667da7a95afc3e929f4c98fc_icon-type-sparkle-service.svg)\\
\\
**UX Audit Service**  **Not sure where to start tackling your UX debt and need a path forward? The P&P crew has all the know how on where to get started.** \\
\\
Custom UX Audit\\
\\
**Get in touch**](https://www.pencilandpaper.io/services/ux-audit)

![](https://cdn.prod.website-files.com/65d32a145451f865e1ca2bbe/666cb4a7ff7a65fee96857f7_blue-icon-book.svg)

### Curious about our Products for Enterprise software?

### Check out what other goodies we have for you and your team

[Explore products](https://www.pencilandpaper.io/archive/products-old)

[![pencil & paper Logo](https://cdn.prod.website-files.com/65d32a145451f865e1ca2bbe/65d33e9e42ee14a5d6108b79_logowhite.svg)](https://www.pencilandpaper.io/)

We strive to make people’s lives easier by designing satisfying interactions that help bridge the human/computer divide.

[Learn more about us.](https://www.pencilandpaper.io/about)

![love canada logo](https://cdn.prod.website-files.com/65d32a145451f865e1ca2bbe/65d33fbf017d17ecbcf89998_lovecanada.svg)

A proudly Canadian Design Company

3 Fan Tan Alley Suite 400, Victoria, BC, V8W 3G9

[Write us](https://www.pencilandpaper.io/contact-us)

Shortcuts

[About](https://www.pencilandpaper.io/about) [Services](https://www.pencilandpaper.io/services) [Products](https://www.pencilandpaper.io/products) [Articles](https://www.pencilandpaper.io/articles) [Login](https://labs.pencilandpaper.io/login/)

Connect

[Youtube](https://www.youtube.com/@pencilpaperlabs) [LinkedIn](https://www.linkedin.com/company/pencil-and-paper)

[Join Our Newsletter](https://www.pencilandpaper.io/newsletter)

© 2026 Pencil & Paper Design Company.

[Terms & Conditions](https://www.pencilandpaper.io/terms-conditions) [Privacy Policy](https://www.pencilandpaper.io/privacy-policy) [Cookie Policy](https://www.pencilandpaper.io/cookie-policy)

[![linkedin](https://cdn.prod.website-files.com/65d32a145451f865e1ca2bbe/65e5d3b2c04ed8dbfea5eb9c_linkedin%20(1).webp)](https://www.pencilandpaper.io/articles/ux-pattern-analysis-loading-feedback#)[![twitter](https://cdn.prod.website-files.com/65d32a145451f865e1ca2bbe/65e5d3b2ec23f1f40ff2d59e_twitter.webp)](https://www.pencilandpaper.io/articles/ux-pattern-analysis-loading-feedback#)[![facebook](https://cdn.prod.website-files.com/65d32a145451f865e1ca2bbe/65e5d3b2600cf437a7ab4b1c_facebook-app-symbol.webp)](https://www.pencilandpaper.io/articles/ux-pattern-analysis-loading-feedback#)

![share icon](https://cdn.prod.website-files.com/65d32a145451f865e1ca2bbe/65e5d30a85966f69c54075aa_share.webp)

## Be the first to know

Join our newsletter

Thank you! Your submission has been received!

Oops! Something went wrong while submitting the form.

This form collects your name and email so we can add you to our email list and send you our newsletter full of helpful insights and updates.  Please read our [Privacy Policy](https://www.pencilandpaper.io/privacy-policy) to understand how we protect and manage your data.

![close](https://cdn.prod.website-files.com/65d32a145451f865e1ca2bbe/65e6e8739a35afe6e1583c3a_close%20(1).webp)