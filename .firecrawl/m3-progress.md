[Skip to main content](https://m3.material.io/components/progress-indicators/guidelines#main_content)[search](https://m3.material.io/search.html) [material\_design\\
Home](https://m3.material.io/) [apps\\
Get started](https://m3.material.io/get-started) [code\\
Develop](https://m3.material.io/develop) [book\\
Foundations](https://m3.material.io/foundations) [palette\\
Styles](https://m3.material.io/styles) [add\_circle\\
Components](https://m3.material.io/components) [pages\\
Blog](https://m3.material.io/blog)

play\_arrow

pause

dark\_mode

light\_mode

[Components overview](https://m3.material.io/components)[App bars](https://m3.material.io/components/app-bars)[Badges](https://m3.material.io/components/badges)

Buttons
arrow\_drop\_down


[All buttons](https://m3.material.io/components/all-buttons) [Button groups](https://m3.material.io/components/button-groups) [Buttons](https://m3.material.io/components/buttons) [Extended FABs](https://m3.material.io/components/extended-fab) [FAB menu](https://m3.material.io/components/fab-menu) [FABs](https://m3.material.io/components/floating-action-button) [Icon buttons](https://m3.material.io/components/icon-buttons) [Segmented buttons](https://m3.material.io/components/segmented-buttons) [Split button](https://m3.material.io/components/split-button)

[Cards](https://m3.material.io/components/cards)[Carousel](https://m3.material.io/components/carousel)[Checkbox](https://m3.material.io/components/checkbox)[Chips](https://m3.material.io/components/chips)

Date & time pickers
arrow\_drop\_down


[Date pickers](https://m3.material.io/components/date-pickers) [Time pickers](https://m3.material.io/components/time-pickers)

[Dialogs](https://m3.material.io/components/dialogs)[Divider](https://m3.material.io/components/divider)[Lists](https://m3.material.io/components/lists)

Loading & progress
arrow\_drop\_up


[Loading indicator](https://m3.material.io/components/loading-indicator) [Progress indicators](https://m3.material.io/components/progress-indicators)

[Menus](https://m3.material.io/components/menus)

Navigation
arrow\_drop\_down


[Navigation bar](https://m3.material.io/components/navigation-bar) [Navigation drawer](https://m3.material.io/components/navigation-drawer) [Navigation rail](https://m3.material.io/components/navigation-rail)

[Radio button](https://m3.material.io/components/radio-button)[Search](https://m3.material.io/components/search)

Sheets
arrow\_drop\_down


[Bottom sheets](https://m3.material.io/components/bottom-sheets) [Side sheets](https://m3.material.io/components/side-sheets)

[Sliders](https://m3.material.io/components/sliders)[Snackbar](https://m3.material.io/components/snackbar)[Switch](https://m3.material.io/components/switch)[Tabs](https://m3.material.io/components/tabs)[Text fields](https://m3.material.io/components/text-fields)[Toolbars](https://m3.material.io/components/toolbars)[Tooltips](https://m3.material.io/components/tooltips)

# Progress indicators

Progress indicators show the status of a process in real time

Resourcesandroidandroid+4

[infoOverview](https://m3.material.io/components/progress-indicators/overview) [styleSpecs](https://m3.material.io/components/progress-indicators/specs) [design\_servicesGuidelines](https://m3.material.io/components/progress-indicators/guidelines) [accessibility\_newAccessibility](https://m3.material.io/components/progress-indicators/accessibility)

On this page

## Progress indicators

- Usage
- Anatomy
- Placement
- Responsive layout

link

Copy linkLink copied

pause

Progress indicators communicate the status of an ongoing process

link

Copy linkLink copied

## Usage

link

Copy linkLink copied

Use progress indicators to show the status of ongoing processes, such as loading an app, submitting a form, or saving updates.

When multiple items are loading, use a single progress indicator to show progress for the group. Don’t add progress indicators to every activity.

pause

check Do
Indicate overall progress of a group of items

pause

close Don’t
Don’t show the progress of each activity in a group

link

Copy linkLink copied

Choose a loading
Loading indicators show the progress of a process with a short wait time.
[More on loading indicators](https://m3.material.io/m3/pages/loading-indicator/overview) or progress indicator
Progress indicators show the status of a process in real time.
[More on progress indicators](https://m3.material.io/m3/pages/progress-indicators/overview) that corresponds to the expected wait time and kind of process.

If the wait is very long, consider allowing people to navigate away from the page while the process finishes up.

| **Expected wait time** | **Recommendation** |
| --- | --- |
| Instant (under 200ms) | No indicator |
| Short (between 200ms and 5s) | Loading indicator |
| Long (Over 5s) | Progress indicator |

link

Copy linkLink copied

pause

**Instant (under 200ms):** Display the content immediately

pause

**Short (between 200ms and 5s):** Use a loading indicator

pause

**Long (over 5s):** Use a progress indicator

link

Copy linkLink copied

There are two variants of progress indicators:

1. Linear

2. Circular


**Linear** indicators are best when placed on the edge of a container.

**Circular** indicators are best when centered in an element.

A process should be represented by the same variant of progress indicator throughout the product. For example, if refreshing uses a circular indicator in one place, it should use circular indicators everywhere.

![1. A primary colored horizontal line fills a contrasting track from left to right. 2. A circle appears from 0 to 360 degrees.](https://firebasestorage.googleapis.com/v0/b/design-spec/o/projects%2Fgoogle-material-3%2Fimages%2Fmlep5ivu-07.png?alt=media&token=4c51b00b-6b08-4638-a331-1e6340c7d5ea)

1. Linear indicator
2. Circular indicator

link

Copy linkLink copied

Progress indicators behave differently based on the time of progress being tracked:

- **Determinate**: Known progress and wait time
- **Indeterminate**: Unknown progress and wait time

When using a **determinate** indicator, the indicator must accurately represent the progress of what it's measuring.

Use **indeterminate** indicators to show that a process is happening, but the wait time is unknown.

pause

1. Determinate progress indicators fill from 0% to 100%
2. Indeterminate progress indicators move along a fixed track, growing and shrinking in size

link

Copy linkLink copied

As more information about a process becomes available, a progress indicator should change from **indeterminate** to **determinate**.

pause

A linear progress indicator changes from indeterminate to determinate while loading a screen

link

Copy linkLink copied

## Anatomy

link

Copy linkLink copied

pause

1. Active indicator
2. Track
3. Stop indicator

link

Copy linkLink copied

### Active indicator

The active indicator shows the progress that has been made so far.

In indeterminate processes, it grows and shrinks along the track repeatedly.

pause

Linear indicators animate from the leading to the trailing edge along the track. Circular indicators animate from the top of the track, clockwise by default.

link

Copy linkLink copied

The active indicator appears as soon as progress begins. At low percentages where space is limited, this should appear as a dot to help people understand that there’s progress underway.

![A linear and circular progress indicator at 1% progress, where the active indicator has only just appeared.](https://firebasestorage.googleapis.com/v0/b/design-spec/o/projects%2Fgoogle-material-3%2Fimages%2Fmlep6b3j-12.png?alt=media&token=8aa71e47-95c1-48b7-9949-1b12b43093f6)

When progress first begins, the active indicator appears as a dot

link

Copy linkLink copied

The active indicator has two shape options: **flat** and **wavy**. Use the shape that best fits the product’s tone.

The wavy shape can make longer processes feel less static and is best used when a more expressive style is appropriate.

When using the wavy shape, the overall height of the component changes. At very small sizes, the wavy shape may not be as visible.

pause

Wavy linear indicators increase the height of the overall container

link

Copy linkLink copied

### Stop indicator

The stop indicator is a 4dp circle that marks the end of a linear determinate progress indicator to meet Material's accessibility standards.

It's not used for indeterminate or circular progress indicators.

The stop indicator is required if the track has a contrast below 3:1 with its container or the surface behind the container.

![A primary colored horizontal  line fills a contrasting line from left to right.](https://firebasestorage.googleapis.com/v0/b/design-spec/o/projects%2Fgoogle-material-3%2Fimages%2Fmlep7pxt-16.png?alt=media&token=9f8c2fcb-6249-4ff4-bd3c-d8ee67658bf7)

check Do
Use a stop indicator when placing the progress indicator inside a container with low contrast

![An invisible circular track fills with color from 0 to 360 degrees.](https://firebasestorage.googleapis.com/v0/b/design-spec/o/projects%2Fgoogle-material-3%2Fimages%2Fmlep87pn-17.png?alt=media&token=c35ef411-e39f-4bc4-abe8-f4372b570d19)

exclamation Caution
Only remove the end stop indicator if there's a visual contrast of at least 3:1 with surrounding surfaces

link

Copy linkLink copied

## Placement

link

Copy linkLink copied

Place a linear progress indicator along the edge of a container that’s loading. If the container changes shape, place it on the edge that animates. It can also be placed in the middle of a container.

Use a single progress indicator at the top of a page to show progress of the whole group. Don’t add one for every element unless they’re activated independently.

pause

When at the top of a screen, a progress indicator shows that all of the page content is loading

pause

When attached to a card, a progress indicator shows that just the card content is loading

link

Copy linkLink copied

pause

A progress indicator on the expanding edge of a card shows that the edge may expand to show the loaded content

link

Copy linkLink copied

Circular progress indicators should be centered directly on the container or page that's loading, such as a button or card.

When loading more items on a page, place the circular progress indicator in the empty space where the new content will appear, not overlapping existing content.

However, if the content does not take long to load, consider using a loading indicator instead.

pause

A circular progress indicator can show that the page is loading

pause

A circular progress indicator can show where new items will appear on a page. A loading indicator also works well in this space.

link

Copy linkLink copied

### Progress indicators in buttons

A circular indicator can be placed in a button to show that the button’s action is currently in progress.

In very small buttons, use the flat shape since the wavy shape is not as visible at that size.

To ensure a minimum 3:1 contrast ratio, change the active indicator color to be the same color as the button’s icon or label text, and remove the track.

pause

check Do
Use circular indicators for short, indeterminate activities under 5 seconds

pause

close Don’t
Avoid applying progress indicators to every button in a list

link

Copy linkLink copied

## Responsive layout

link

Copy linkLink copied

### Right-to-left languages

Linear progress indicators should be mirrored horizontally for products using right-to-left (RTL) languages.

Circular progress indicators don’t need to be mirrored.

![Mirrored right-to-left progress indicator.](https://firebasestorage.googleapis.com/v0/b/design-spec/o/projects%2Fgoogle-material-3%2Fimages%2Fmlep96rs-25.png?alt=media&token=75581f65-e1d4-4ac1-99a3-e8c371691127)

Linear progress indicators can flow from right to left in right-to-left (RTL) languages

link

Copy linkLink copied

### Large screens

Circular progress indicators have flexible sizes. They can range from 24dp to 240dp, depending on the placement and the breakpoint. Avoid exceeding the minimum and maximum sizes.

Reserve very large progress indicators for large and extra-large windows, such as desktop.

![Circular progress indicators can range in size from 24dps to 240dps.](https://firebasestorage.googleapis.com/v0/b/design-spec/o/projects%2Fgoogle-material-3%2Fimages%2Fmlep9qg1-26.png?alt=media&token=3406dfaa-947f-4dec-8e16-66b6c3da848f)

The waveform should scale with the size so the proportions look the same across sizes

link

Copy linkLink copied

Linear progress indicators dynamically adjust to fit the width of the window or element they’re placed within, such as a card. They shouldn’t be used in any elements smaller than 40dp.

The padding on each end should be 4dp minimum, but can be modified.

![Linear progress indicators can dynamically adjust to any width.](https://firebasestorage.googleapis.com/v0/b/design-spec/o/projects%2Fgoogle-material-3%2Fimages%2Fmlepa8w9-27.png?alt=media&token=b5dada5d-07ab-408a-a520-1eee7956020e)

The linear progress indicator should always span the width of the UI element it’s placed within

[arrow\_left\_alt PreviousProgress indicators: Specs](https://m3.material.io/components/progress-indicators/specs)[Up next arrow\_right\_altProgress indicators: Accessibility](https://m3.material.io/components/progress-indicators/accessibility)

vertical\_align\_top

[material\_design](https://m3.material.io/)

Material Design is an adaptable system of guidelines, components, and tools that support the best practices of user interface design. Backed by open-source code, Material Design streamlines collaboration between designers and developers, and helps teams quickly build beautiful products.

- ### Social

- [GitHub](https://www.github.com/material-components)
- [X](https://x.com/googledesign)
- [YouTube](https://www.youtube.com/@googledesign)
- [Blog RSS](https://material.io/feed.xml)

- ### Libraries

- [Android](https://m3.material.io/develop/android/mdc-android)
- [Compose](https://m3.material.io/develop/android/jetpack-compose)
- [Flutter](https://m3.material.io/develop/flutter)
- [Web](https://m3.material.io/develop/web)

- ### More Google sites

- [Google Design](https://design.google/?home=)

- ### Archived versions

- [Material Design 1](https://m1.material.io/)
- [Material Design 2](https://m2.material.io/)

[Google](https://www.google.com/)

- [Privacy Policy](https://policies.google.com/privacy)
- [Terms of Service](https://policies.google.com/terms)
- [Join research studies](https://google.qualtrics.com/jfe/form/SV_3NMIMtX0F2zkakR?utm_source=Website&Q_Language=en&utm_campaign=Q2&campaignDate=June2022&referral_code=UXRgbtM2422655&productTag=b2d)
- Feedback