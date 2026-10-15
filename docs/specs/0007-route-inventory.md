# Route inventory: URL state convention (spec 0007)

Thin thread status plus every dashboard and admin route reviewed. Converted
rows name each literal set and default. Unchanged rows name the reason.
Planned rows are the rollout order for the runs after this one.

## Converted in the thin thread

### Dashboard leaderboard (`app/(dashboard)/leaderboard/page.tsx`)

Descriptor: `nuqs/leaderboard.ts`, server cache:
`nuqs/leaderboard-server.ts`.

| Key | Parser | Default | History |
| --- | --- | --- | --- |
| `page` | integer | `1` | push, corrections use replace |
| `limit` | integer | `20` | fixed in UI, shareable in links |

Page floors at 1 through `clampPage`. An out of range page shows the
empty result. Page changes push history, so back and forward step through
visited pages.

### Admin users (`app/(admin)/admin/users/page.tsx`)

Descriptor: `nuqs/admin-users.ts`, server cache:
`nuqs/admin-users-server.ts`. Search input: `components/url-search-input.tsx`.

| Key | Parser | Default | History |
| --- | --- | --- | --- |
| `q` | text | empty | replace, trailing 300 ms pause |
| `role` | `USER`, `ADMIN`, `all` | `USER` | push, resets page to 1 in the same update |
| `onboarding` | `completed`, `not_completed`, `skipped`, `all` | `all` | push, resets page to 1 in the same update |
| `page` | integer | `1` | push, corrections use replace |
| `limit` | integer | `20` | fixed in UI, shareable in links |
| `modal` | `invite`, empty | empty | open pushes, close replaces |
| `selectedId` | text | empty | reserved for a future row dialog |

Enter and blur flush a pending search value. Escape reverts the input to
the URL value. A new search resets to the first page with replace history.
The invite email stays a local form draft and never enters the URL.

### Admin metrics (`app/(admin)/admin/metrics/page.tsx`)

Descriptor: `nuqs/admin-metrics.ts`, server cache:
`nuqs/admin-metrics-server.ts`. Search input: `components/url-search-input.tsx`.

| Key | Parser | Default | History |
| --- | --- | --- | --- |
| `tab` | 7 literals (overview, engagement, learning, growth, monetization, retention, data) | `overview` | push, resets page to 1 in the same update |
| `from` | date text `YYYY-MM-DD` | 30 days ago | replace, resets page to 1 in the same update |
| `to` | date text `YYYY-MM-DD` | today | replace, resets page to 1 in the same update |
| `granularity` | `daily`, `monthly`, `yearly` | `daily` | push, resets page to 1 in the same update |
| `metric` | `all` plus 14 metric names | `all` | push, resets page to 1 in the same update |
| `q` | text | empty | replace, trailing 300 ms pause, resets page |
| `page` | integer | `1` | push, corrections use replace |
| `limit` | integer | `50` | fixed in UI, shareable in links |
| `sort` | `date`, `metric`, `value` | `date` | push, resets page to 1 in the same update |
| `order` | `asc`, `desc` | `desc` | push, resets page to 1 in the same update |

Deliberate behavior changes from the old local state, all per the
convention: sort, date, and metric changes now reset to the first page
(the old code only reset on tab, granularity, and search). Date edits
use replace history since they are typed. This screen has no modal.

### Admin affiliates (`app/(admin)/admin/affiliates/page.tsx`)

Descriptor: `nuqs/admin-affiliates.ts`, server cache:
`nuqs/admin-affiliates-server.ts`. Search input: `components/url-search-input.tsx`.

| Key | Parser | Default | History |
| --- | --- | --- | --- |
| `q` | text | empty | replace, trailing 300 ms pause, resets page |
| `page` | integer | `1` | push, corrections use replace |
| `limit` | integer | `20` | fixed in UI, shareable in links |
| `modal` | `create`, `details`, `pay`, `suspend`, empty | empty | open pushes, close replaces |
| `selectedId` | text (affiliate id) | empty | reserved, travels with the modal |

The details dialog reuses the existing detail fetch by id. A modal
with a missing id closes and corrects the URL. Create form drafts stay
local.

### Admin subscriptions (`app/(admin)/admin/subscriptions/page.tsx`)

Descriptor: `nuqs/admin-subscriptions.ts`, server cache:
`nuqs/admin-subscriptions-server.ts`.

| Key | Parser | Default | History |
| --- | --- | --- | --- |
| `status` | `all`, `PENDING`, `ACTIVE`, `FAILED` | `all` | push, resets page to 1 in the same update |
| `page` | integer | `1` | push, corrections use replace |
| `limit` | integer | `20` | fixed in UI, shareable in links |
| `modal` | `change`, empty | empty | open pushes, close replaces |
| `selectedId` | text (subscription id) | empty | reserved, travels with the modal |

Deliberate behavior change from the old local state, per the
convention: status changes now reset to the first page (the old code
did not). The picked plan stays a local draft. A modal with a missing
id closes and corrects the URL.

### Admin feedback (`app/(admin)/admin/feedback/page.tsx`)

Descriptor: `nuqs/admin-feedback.ts`, server cache:
`nuqs/admin-feedback-server.ts`.

| Key | Parser | Default | History |
| --- | --- | --- | --- |
| `status` | `ALL`, `OPEN`, `IN_REVIEW`, `RESOLVED` | `ALL` | push, resets page to 1 in the same update |
| `type` | `ALL`, `EXAM`, `CHAT`, `BUG`, `FEATURE`, `GENERAL` | `ALL` | push, resets page to 1 in the same update |
| `page` | integer | `1` | push, corrections use replace |
| `limit` | integer | `20` | fixed in UI, shareable in links |

The old code used an empty string for the all state; the canonical
form now uses the explicit `ALL` literal, with identical filtering.
This screen has no modal.

### Admin plan upgrades (`app/(admin)/admin/plan-upgrades/page.tsx`)

Descriptor: `nuqs/admin-plan-upgrades.ts`, server cache:
`nuqs/admin-plan-upgrades-server.ts`. Search input:
`components/url-search-input.tsx`.

| Key | Parser | Default | History |
| --- | --- | --- | --- |
| `q` | text | empty | replace, trailing 300 ms pause, resets page |
| `role` | `USER`, `ADMIN`, `all` | `USER` | push, resets page to 1 in the same update |
| `onboarding` | `completed`, `not_completed`, `skipped`, `all` | `all` | push, resets page to 1 in the same update |
| `plan` | `FREE`, `STARTER`, `STANDARD`, `PREMIUM`, `PRO`, `all` | `all` | push, resets page to 1 in the same update |
| `status` | `all`, `ACTIVE`, `PENDING`, `FAILED` | `all` | push, resets page to 1 in the same update |
| `page` | integer | `1` | push, corrections use replace |
| `limit` | integer | `20` | fixed in UI, shareable in links |
| `modal` | `change`, empty | empty | open pushes, close replaces |
| `selectedId` | text (user id) | empty | reserved, travels with the modal |

The dialog renders its row from the loaded list by id, so a shared
link reproduces it whenever the row sits on the current view. The
picked plan and the reason stay local drafts, reseeded per dialog row.
A modal with no row behind it closes and corrects the URL once the
list loads.

### Dashboard quizzes (`app/(dashboard)/quizzes/page.tsx`)

Descriptor: `nuqs/quizzes.ts`, server cache:
`nuqs/quizzes-server.ts`. Search input: `components/url-search-input.tsx`.

| Key | Parser | Default | History |
| --- | --- | --- | --- |
| `q` | text | empty | replace, trailing 300 ms pause |

Filtering stays client side over the loaded list; the key is shareable
even without server reads.

### Note detail (`app/(dashboard)/notes/[id]/page.tsx`)

Descriptor: `nuqs/note-detail.ts`, server cache:
`nuqs/note-detail-server.ts`.

| Key | Parser | Default | History |
| --- | --- | --- | --- |
| `tab` | `overview`, `text`, `topics` | `overview` | push |

The previously uncontrolled tab set is now controlled by the URL.

### Upload (`app/(dashboard)/upload/page.tsx`)

Descriptor: `nuqs/upload.ts`, server cache:
`nuqs/upload-server.ts`.

| Key | Parser | Default | History |
| --- | --- | --- | --- |
| `modal` | `edit`, `quiz`, empty | empty | open pushes, close replaces |
| `selectedId` | text (note id) | empty | reserved, travels with the modal |

The rename title and the quiz setup stay local drafts, reseeded per
dialog row behind a guard so a background refetch never clobbers
typing. A modal with no row behind it closes and corrects the URL
once the list loads. Picked file and upload title stay local.

### Subscription (`app/(dashboard)/subscription/page.tsx`)

Descriptor: `nuqs/subscription.ts`, server cache:
`nuqs/subscription-server.ts`.

| Key | Parser | Default | History |
| --- | --- | --- | --- |
| `tab` | `auto`, `manual` | `auto` | push |
| `modal` | `upgrade`, empty | empty | open pushes, close replaces |

Plan picks, payment drafts, transaction ids, purchase setup, and the
existing payment recovery keys stay out of view state.

## Shared plumbing

`nuqs/index.ts` owns page, page size, search text, and sort direction:

| Key | Parser | Default |
| --- | --- | --- |
| `page` | integer | `1` |
| `limit` | integer | `10` |
| `q` | text | empty |
| `order` | `asc`, `desc` | `desc` |

`clampPage` floors at 1. `clampLimit` clamps from 1 to 100. Before this
run, page and limit parsed as text while typed as numbers, which forced
casts at the call site. That mismatch is now gone, and the two auth casts
are gone with it.

Auth keys (`callbackUrl`, `ref__`, `token`, `checkout_id`,
`conversationId`, `email`, `error`, `search`, `tab`, `archived`) keep
their current route behavior and stay outside generic shareable view
state.

## Dashboard routes reviewed

| Route | View state found | Status |
| --- | --- | --- |
| `/dashboard` | none (readiness and loading only) | no change |
| `/upload` | editing note panel, quiz dialog open, quiz setup draft | converted, see above |
| `/affiliate` | none (forms only) | no change |
| `/community` | composer draft (not a shareable view) | no change |
| `/quizzes` | search text | converted, see above |
| `/quizzes/[id]` | question position, answers, result (exam progress) | no change, exam state stays local |
| `/leaderboard` | page | converted, see thin thread |
| `/progress` | none | no change |
| `/settings` | preferences and password forms | no change, form drafts never enter the URL |
| `/notes/[id]` | tab set (uncontrolled) | converted, see above |
| `/attempts/[id]` | none | no change |
| `/subscription` | upgrade dialog open, payment recovery query | converted, see above; recovery keys stay as they are |
| `/feedback` | type, subject, message, flag (form draft) | no change, form drafts never enter the URL |

## Admin routes reviewed

| Route | View state found | Status |
| --- | --- | --- |
| `/admin` | none | no change |
| `/admin/users` | search, role filter, onboarding filter, page, invite dialog | converted, see thin thread |
| `/admin/affiliates` | search, page, create and detail and pay and suspend dialogs | converted, see above |
| `/admin/subscriptions` | status filter, page, change plan dialog | converted, see above |
| `/admin/feedback` | status filter, type filter, page | converted, see above |
| `/admin/plan-upgrades` | search, role, onboarding, plan, and status filters, page, selected user dialog | converted, see above |
| `/admin/metrics` | tab set of 7, date range, granularity, metric filter, page, sort column, sort direction, search | converted, see metrics section |
| `/admin/platform-settings` | settings forms | no change |
| `/admin/payment-settings` | settings forms | no change |
| `/admin/accept-invite` | one time token | no change, tokens stay outside view state |

## Notes for the next runs

1. Every converted screen must include the canonical correction pass,
   not just the clamp pass. Verify proved that `nuqs` returns defaults
   for unparsable input while leaving raw keys in the URL, so a pass
   that compares parsed values only is blind to it. The shared helper
   is `correctionsForKeys` in `nuqs/index.ts`, fed by raw params from
   `useSearchParams` plus safe values plus the area defaults object.
   It is the only place that reads the raw address, and only as a
   desync sensor.
2. Metrics is converted. Next in queue is admin affiliates, then
   subscriptions, feedback, and plan upgrades.
3. Quizzes search and notes tabs are small and independent. Either is a
   good starter for a parallel run.
4. Exam and quiz taking state, form drafts, passwords, tokens, payment
   identifiers, and error codes never enter view state.
