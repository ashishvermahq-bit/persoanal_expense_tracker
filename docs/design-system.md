# Paisa design system

Theme, components and motion for Paisa. **The code is the source of truth**:
tokens live in `app/globals.css`, primitives in `components/ui/*`, theme logic in
`lib/theme.ts` + `components/theme/*`. This document explains them.

Principles: trust and clarity (never gamified), speed (≤3-tap quick add,
instant feedback), quiet delight (motion rewards, never distracts),
Indian-first warmth, dark mode designed first.

---

## 1. Tokens (Tailwind 4)

Tailwind 4 has no `tailwind.config.js`; tokens are declared in CSS with
`@theme`. Semantic colours are CSS variables that swap per theme, exposed as
utilities: `bg-surface`, `text-ink-3`, `border-line`, `bg-primary/10`, …

### Colour roles

| Token | Use | Light | Dark |
|---|---|---|---|
| `plane` | page background | `#f9f9f7` | `#0d0d0d` |
| `surface` | cards, sheets, inputs | `#fcfcfb` | `#1a1a19` |
| `raised` | hover wash, meter tracks, table heads | `#f0efec` | `#232322` |
| `ink` | primary text | `#0b0b0b` | `#f0efec` |
| `ink-2` | secondary text, labels | `#52514e` | `#c3c2b7` |
| `ink-3` | muted text (hints, meta) | `#6b6a65` | `#a3a29a` |
| `muted` | decorative only: icons, axes, placeholders | `#898781` | `#898781` |
| `line` | hairline borders | `rgba(11,11,11,.1)` | `rgba(255,255,255,.1)` |
| `primary` | brand hue: marks, focus ring, active icons | `#2a78d6` | `#3987e5` |
| `primary-solid` (+`-hover`, `-active`) | filled buttons, FAB | `#256abf` / `#286fcb` / `#1c5cab` | `#3987e5` / `#5598e7` / `#2f7fdf` |
| `on-primary` | text on `primary-solid` | `#fcfcfb` | `#0b0b0b` |
| `primary-ink` | links, active nav text | `#256abf` | `#5598e7` |
| `success` / `success-ink` | income, savings, good deltas | `#0ca30c` / `#006300` | `#0ca30c` / `#0ca30c` |
| `warning` / `warning-ink` | ≥80% of budget | `#fab219` / `#8a5a00` | `#fab219` / `#fab219` |
| `danger` / `danger-ink` | ≥100% of budget, errors | `#e34948` / `#c02f2f` | `#e66767` / `#e66767` |
| `danger-solid` / `on-danger` | destructive buttons | `#c93a39` / `#fcfcfb` | `#e66767` / `#0b0b0b` |
| `series-1…8` | chart series (validated order) | blue, orange, aqua, yellow, magenta, green, violet, red | dark steps of the same |

**Fill vs ink.** Each status hue has a *fill* (bars, icons, dots) and an
*ink* (text). The spec's hues are kept for fills; text uses a darker (light
mode) step of the same hue so it passes WCAG AA. See §6 for the numbers.

**Neutral scale.** `zinc-50…950` is remapped to the warm neutrals above, so
existing `zinc-*` utilities follow the theme. New code should prefer the
semantic tokens. `white` is remapped to `#fcfcfb` (the light surface).

**Rules**
- Never hard-code hex in components. Use a token, or add one in `globals.css`.
- Status colour is never the only signal: pair it with an icon and a text label.
- Text never wears a series/status *fill* colour; use the `*-ink` token or `ink`.
- **Category colour** is entity data stored per category, and it shows wherever a category appears:
  icons (quick add, expense rows, recent, top categories, insight chips, category manager), dots (budget
  meters, filter chips, legends) and bars (top-categories split, Trends by category). Text stays in ink.
  - `CategoryIcon`: the category's own colour at full strength on an 18% tint of the same colour, both themes.
  - `lib/color.ts` → `categoryTones()` checks each colour against its own tint over the card surface and
    nudges it (darker on light, lighter on dark, 4% steps) **only if it fails 3:1** there. Of the 19 seed
    colours + picker palette, most are unchanged in each theme; nudges are small (e.g. `#16a34a` → `#149644`
    on light, `#4f46e5` → `#6b64e9` on dark). Unit-tested in `tests/unit/color.test.ts`.
  - Use it via `categoryStyle(color)` + the `cat` utility, then `var(--cat)` (`text-[var(--cat)]`,
    `bg-[var(--cat)]`, `cat-icon`). No colour → the muted token.
  - **Series hues as icon colour** (`hueStyle(1–8)` + `HueIcon`): section headings (Budgets violet, Top
    categories blue, Recent orange, Upcoming magenta, Trends aqua), bottom-nav tabs (Home blue, Expenses orange,
    Income green, Budgets violet: active icon + pill tint, label stays ink), income sources (salary green,
    freelance blue, …), login proof points, the theme toggle (sun yellow, moon violet). Dark: the token as-is.
    Light: the smallest darkening that clears 3:1 on its own tint (orange 10%, aqua 16%, yellow 26%, magenta
    18%); tested in `tests/unit/color.test.ts`.
  - Upcoming payments wear their rule's category icon + colour.
  - The login ledger card uses series hues the same way (Rent violet, Kirana aqua, UPI payments blue) via `hueStyle()`.

### Type

System UI stack only (`system-ui, -apple-system, "Segoe UI", Roboto, "Noto Sans"`).
No web fonts, so there's nothing to download and no layout shift.

| Role | Class | Size / weight |
|---|---|---|
| Hero number | `text-hero font-semibold` | 48px, proportional figures |
| Stat value | `text-stat font-semibold` | 28px, proportional figures |
| H1 (page / dialog title) | `text-2xl font-semibold` | 24px |
| H2 section label | `<SectionLabel>` | 14px, uppercase, `tracking-[0.05em]`, `ink-3` |
| Body | `text-sm` | 14px / 1.5 |
| Small | `text-xs text-ink-3` | 12px |
| Micro (nav labels, tags) | `text-micro` | 10px |
| Amounts in lists/tables | `tabular-nums` | aligned columns only |

Large standalone numbers use proportional figures; `tabular-nums` only where
numbers align vertically.

### Shape & elevation

Radius: 8px controls (`rounded-lg`), 12px cards (`rounded-xl`), 16px dialogs
(`rounded-2xl`), pills (`rounded-full`). Shadows: `shadow-card`
(`0 1px 3px` at 12% light / 30% dark) and `shadow-sheet` for bottom sheets.

---

## 2. Components

| Component | File | Notes |
|---|---|---|
| Button (`primary`, `secondary`, `ghost`, `danger`) | `ui/button.tsx` | 8px radius, semibold. Hover: 1px lift + card shadow; press: `scale(.96)` 100ms; loading: spinner + `aria-busy` + wait cursor. `buttonClassName()` styles links. |
| Card | `ui/page-header.tsx` → `Card` | surface, hairline border, 12px radius, card shadow. Callers set padding (`p-4`). |
| SectionLabel, Skeleton | `ui/page-header.tsx` | H2 style; skeleton pulses 0.6→1 over 1.5s. |
| Input / Select / Textarea / MoneyInput | `ui/*`, shared `ui/field-styles.ts` | surface bg, `line` border, 2px primary focus edge (border + 1px ring, no layout shift), 2px danger edge + message on error. |
| Chip (toggle pill) | `ui/chip.tsx` | selected = `primary/10` fill + 2px primary edge + `aria-pressed`. Ripple on tap. |
| Dialog / ConfirmDialog | `ui/dialog.tsx` | native `<dialog>`. Mobile: bottom sheet with grab handle, slides up. ≥640px: centred card. 40% backdrop + 4px blur, sticky header, scrolling body, actions stacked on mobile. |
| EmptyState | `ui/empty-state.tsx`, `ui/empty-art.tsx` | original line illustration (`art="ledger" | "receipt" | "gauge"`, token strokes) or icon bubble; breathes (the only loop allowed). |
| Segmented | `ui/segmented.tsx` | radiogroup, one tab stop, arrow keys; 40px tall on touch. |
| Quick-add sheet | `expenses/quick-add-sheet*.tsx`, `quick-add-link.tsx` | Global bottom sheet mounted in the (app) layout. `QuickAddLink` (FAB, header, empty states) opens it when ready, else is a plain link to `/add` (deep links, no-JS). Save is pinned to the sheet bottom; success = tick pop + haptic squeeze, then the page underneath refreshes. |
| Swipe row | `expenses/swipe-row.tsx` | Swipe left (touch/pen) for Edit / Delete; keyboard: Tab to the actions (focus slides the row open). Delete is immediate with a 5s Undo toast (soft delete + `POST /api/expenses/[id]/restore`). The detail page keeps its confirm dialog. |
| Budget ring | `budgets/budget-meter.tsx` (`layout="adaptive"`) | ring on phones, bar from `sm`; one `role="meter"` around both. |
| Dashboard glance | `dashboard/glance.tsx`, `lib/insights.ts` | Hero (48px figure, pace vs the same point last month, safe-to-spend/day, month progress), insight chips, budgets (max 3), recent (Today/Yesterday/This week), upcoming. All numbers computed from MonthlySummary + budgets; unit-tested. |
| Trends | `dashboard/trends-panel.tsx` | collapsed by default; one chart chosen by Spend/Category/Mode × Week/Month/FY; table twin. |
| Bottom nav + FAB | `layout/nav.tsx` | 64px + home-bar inset; 24px icons, 10px labels; active = primary. 56px FAB bounces in once. |
| Header | `layout/app-header.tsx` | theme toggle, preferences, sign out; respects the notch. |
| Stat tile | dashboard `Stat` | icon + label, 28px value, delta (arrow icon + text, good/bad by meaning), 5% primary tint. |
| Budget meter | `budgets/budget-meter.tsx` | 6px bar, 3px radius, same-hue track; status icon + label (“On track”, “85% used”, “Over by ₹1,200”); `role="meter"`. |
| Charts | `dashboard/*` | ranked bars (one hue, ≤24px, 4px data-end), line with crosshair; every chart has a “Show as table” twin. |
| Theme controls | `theme/theme-toggle.tsx` | `ThemeSegmented` (System / Light / Dark) and the header `ThemeToggleButton`. |

---

## 3. Motion spec

All motion is CSS (`@theme` keyframes in `globals.css`). No animation library.

| Name | Class | Timing | Effect | Where |
|---|---|---|---|---|
| Page fade | `animate-fade-in` | 0.2s ease-out | opacity 0→1 | `app/(app)/template.tsx` (replays on every navigation) |
| Slide up | `animate-slide-up` | 0.3s ease-out | translateY(24px)→0 + fade | dialogs / bottom sheets, auth card |
| Scale in | `animate-scale-in` | 0.2s ease-out | scale .98→1 + fade | available for cards/popovers |
| Button press | `active:scale-[0.96]` | 0.1s ease-out | press + darker fill | all buttons |
| Ripple | `data-ripple` attribute | 0.6s ease-out | radial pulse from tap point, 18%→0 | chips, list rows, nav items (`theme/motion.tsx`, one delegated listener) |
| Bounce in | `animate-bounce-in` | 0.4s `cubic-bezier(.68,-.55,.27,1.55)` | scale 0→1.2→1 | FAB on first load, auth logo |
| Budget fill | width transition | 0.8s ease-out | fill animates on *update* only (static on first render) | budget meters |
| Threshold flash | Web Animations API | 0.3s ease-out | brightness/saturation pulse when status worsens | budget meters |
| Value pop | `animate-value-pop` | 0.3s ease-out | scale 1.05→1 with green flash, on value change | stat tiles (`dashboard/value-pop.tsx`) |
| List entry | `animate-list-in` + `style={{"--i": n}}` | 0.2s ease-out, +20ms per item (cap 12) | translateY(8px)→0 + fade | expense list, budgets, top categories |
| Breathe | `animate-breathe` | 2s ease-in-out ∞ | translateY 0→4px→0 | empty-state icon |
| Spinner | `animate-spin` | 1s linear ∞ | 360° | button loading |
| Skeleton | `animate-pulse` | 1.5s ease-in-out ∞ | opacity 0.6↔1 | Suspense fallbacks |
| Toast | Sonner | Sonner's built-in slide from top, 3s duration | | `theme/app-toaster.tsx` |
| Check pop | `animate-check-pop` | 0.5s ease-out | scale 0→1.3→1 | success toast icon |
| Drift | `animate-drift` | 48s ease-in-out ∞ alternate | translate ≤3px | auth guilloche background |
| Draw | `animate-draw` (path needs `pathLength="1"` + `stroke-dasharray="1"`) | 0.9s ease-out, 0.25s delay, once | stroke-dashoffset 1→0 | one-off line draws |
| Page in | `animate-page-in` | 0.22s ease-out-soft | fade + 6px rise; ends at `transform: none` | `app/(app)/template.tsx` on every navigation |
| Success pop | `animate-success-pop` | 0.36s ease-back | scale 0.6→1.12→1 | quick-add saved tick (with `navigator.vibrate(12)` where supported) |
| Nav pill | transform + background transition | 0.3s ease-out-soft | one pill slides between tab slots, its tint cross-fading to the tab's hue | mobile bottom nav |
| Tab pop | `animate-tab-pop` | 0.32s ease-back | scale 0.8→1.12→1, once when a tab becomes active | bottom-nav icons |
| Rise | `animate-rise` + `--i` | 0.32s ease-out-soft, +70ms per section | fade + 8px rise | dashboard sections (hero → cards → trends) |
| Grow x | `animate-grow-x` | 0.7s ease-out-soft, once | clip-path reveal left→right | Top-categories split bar |
| Welcome count-up | `WelcomeCountUp` (JS) | 900ms ease-out, once | hero figure counts ₹0 → spent, width reserved | only the first dashboard view after sign-in/sign-up (one-time sessionStorage flag) |
| Swipe | transform transition (none while dragging) | 0.2s | row snaps open/closed | expense list |

Easings: `--ease-out-soft: cubic-bezier(0.22, 1, 0.36, 1)`, `--ease-back`
(the bounce curve above).

**Reduced motion.** Under `prefers-reduced-motion: reduce`, every animation and
transition resolves instantly to its end state, the ripple is removed, and the
threshold flash is skipped in JS. Nothing that carries meaning is
animation-only.

---

## 4. Auth screens ("Har rupaye ka hisaab")

`components/auth/*`. Phones: compact brand header over a faded strip of
linework, then the form card (above the fold at 390×844). ≥1024px: split
screen, brand panel 55% / form 45%.

| Piece | File | Notes |
|---|---|---|
| Guilloche | `guilloche.tsx` | Original abstract rosettes + sine band (no currency, emblem or logo). Nested `<use>` keeps it ~1.5 KB; `text-primary` at 9% (light) / 14% (dark). Needs a unique `idPrefix` per instance. Drifts ≤3px over 48s. |
| ₹ medallion | `rupee-medallion.tsx` | Primary-tinted coin with a dotted "milled" edge; bounces in once, then breathes. |
| Ledger strip (phones) | `ledger-preview.tsx` → `LedgerStrip` | one line under the form: "Example · ₹24,350 spent this month · Kirana 82% used" (warning icon + label); never pushes the form down. |
| Ledger preview | `ledger-preview.tsx` | "Example: your month at a glance" + "Sample data"; `role="img"` one-line summary. ₹0 → ₹24,350 count-up (~900ms, width reserved by a pseudo-element), 2px sparkline draw-in, rows Rent / Kirana / UPI payments with thin bars in their hues (`animate-list-in` stagger), Kirana budget meter at "82% used". Runs once, never loops. (Briefly replaced by a "passbook" card; restored to follow the auth brief exactly.) |
| Password field | `ui/password-input.tsx` | Show/hide (`aria-pressed`, one toggle can drive several fields), Caps Lock warning, optional requirements checklist that mirrors `passwordSchema` (icon + text + sr-only state). |

Inline SVG on an auth page, icons included, is 4.1 KB (login) / 4.9 KB (signup):
one guilloche instance serves both layouts (phone strip and desktop panel). Claims on the panel are limited to
features that exist (Indian number formatting, FY reports and 80C/80D tags,
3-tap quick add).

## 5. Dark mode

- Designed dark-first: dark steps are chosen for the dark surface, not inverted.
- `<html data-theme="light|dark">` is set by an inline script in `<head>`
  (`THEME_BOOT_SCRIPT`, `lib/theme.ts`) **before first paint**, so there's no flash.
- Choice = `system | light | dark`. Stored per device in `localStorage`
  (`paisa-theme`) and saved to `preferences.theme` on the server. "System"
  follows OS changes live.
- `dark:` utilities use a custom variant: explicit `data-theme` wins; with no
  attribute (JS off) the OS preference applies.
- Toasts and charts follow the resolved theme (charts read CSS variables).

Limitation: a new device starts on "System" until the user picks a theme
there. The saved server value is not yet pushed down on login.

---

## 6. iOS safe areas

`viewport-fit=cover` is set in `app/layout.tsx`. With the
`black-translucent` status bar (installed PWA), content runs under the notch
unless padded.

| Utility | CSS | Applied to |
|---|---|---|
| `pt-safe` | `padding-top: env(safe-area-inset-top)` | sticky header |
| `pb-safe` | `padding-bottom: env(safe-area-inset-bottom)` | bottom nav |
| `px-safe` | left/right insets | header, bottom nav (landscape) |
| `pb-[calc(6rem+env(safe-area-inset-bottom))]` | | `<main>`, so content clears nav + FAB |
| `pb-[max(1.5rem,env(safe-area-inset-bottom))]` | | bottom-sheet body |

Toasts offset by `env(safe-area-inset-top)`. Don't combine `px-safe` with
`px-*` on the same element; the physical and logical properties fight.

---

## 7. Accessibility checklist (WCAG 2.1 AA)

Contrast, measured on the card surface (`#fcfcfb` light / `#1a1a19` dark):

| Pair | Light | Dark |
|---|---|---|
| ink / ink-2 / ink-3 | 19.2 / 7.7 / 5.3 | 15.2 / 9.7 / 6.8 |
| primary-ink, success-ink, warning-ink, danger-ink | 5.3, 7.4, 5.8, 5.6 | 5.8, 5.2, 9.5, 5.4 |
| Primary button text (rest / hover / active) | 5.3 / 4.8 / 6.5 | 5.4 / 6.6 / 4.9 |
| Danger button text | 4.9 | 6.1 |
| Focus ring (`primary`) vs page (non-text, ≥3) | 4.2 | 5.3 |

- [x] Text ≥ 4.5:1; UI parts and focus indicators ≥ 3:1 (table above).
- [x] Touch targets ≥ 44px on touch screens (`pointer-coarse:min-h-11` on buttons, chips, fields, icon buttons); compact sizes kept for mouse.
- [x] Colour never alone: budget status = icon + label + `data-status`; deltas = arrow + text; selected chips = edge + `aria-pressed`.
- [x] Visible focus on every interactive element (`focus-visible` ring, offset against the page).
- [x] `prefers-reduced-motion` honoured globally.
- [x] Inputs: labelled, `aria-invalid` + `aria-describedby` to the error/hint, `role="alert"` on errors; 16px text on small screens (stops iOS zoom-on-focus).
- [x] Dialogs: native `<dialog>` (focus trap, Esc), titled via `aria-labelledby`.
- [x] Meters: `role="meter"` with `aria-valuetext` (“85% of budget used. 85% used”).
- [x] Charts: `role="img"` + description, legends for multi-series, and a table view for every chart.
- [x] Dark mode keeps AA (table above); no pure black.
- [ ] Manual screen-reader pass (VoiceOver iOS, TalkBack) — not yet done.
- [ ] Hindi (`hi-IN`) strings: check line-height and truncation once translations land.

---

## 8. Deviations from the original brief (and why)

| Brief said | Shipped | Why |
|---|---|---|
| Primary button `#2a78d6` with white text | `#256abf` rest (brand `#2a78d6` stays for marks/focus) | white on `#2a78d6` is 4.42:1, just under AA |
| Dark primary button with white text | near-black text on `#3987e5` | white is 3.6:1; near-black is 5.4:1 |
| Muted text `#898781` in both modes | `#6b6a65` light, `#a3a29a` dark for text; `#898781` kept for icons/axes | `#898781` on light is 3.5:1 |
| Warning / danger hues as text | darker `*-ink` steps in light mode | `#fab219` on light is 1.8:1; `#e34948` is 3.9:1 |
| White text on danger buttons | `#c93a39` light; near-black on `#e66767` dark | AA for button labels |
| Inputs 14px | 16px on phones, 14px from `sm` | iOS Safari zooms the page on focus below 16px |
| Picker chips 12px | 14px | they're the primary tap targets in quick add |
| Category donut | ranked horizontal bars, one hue | easier to compare parts; colour-by-rank repaints entities |
| Bottom-sheet footer sticky | header sticky, actions at the end of the scrolling body | form actions live inside each form; making them sticky needs a slot API |
| Framer Motion | CSS keyframes + one Web Animations call | no runtime dependency needed for these effects |
| Figma file | not produced | needs Figma itself; tokens above map 1:1 to Figma variables |

### Mobile-app redesign deviations

| Brief said | Shipped | Why |
|---|---|---|
| Insight example "Food 18% less than Oct" (per category) | spending pace for the whole month on the hero chip, vs the *same point* last month | MonthlySummary has per-category totals only for whole months; comparing a half month with a full one would be untrue |
| Pace as a chip too | pace only on the hero | chips should add information, not repeat it |
| "Rent paid" | shown when a Rent expense is logged this month | it's what the data can confirm |
| Trends with a segmented control on mobile | same on desktop, plus a Spend/Category/Mode switch | one chart at a time everywhere keeps the page short |
| Swipe actions on every list | expense list only; dashboard rows are tap-to-open | the dashboard is for glancing; edits happen in the list |
| Undo instead of confirm "where safe" | list delete = undo; detail-page delete keeps its confirm | the detail page is a deliberate destructive action (and the e2e spec asserts it) |
| Upcoming (rent/EMI/SIP) | shown only when recurring rules exist | there's no UI to create rules yet (API only), so an always-empty card would mislead |
| Count-up on the hero | value-pop on change only | real money shouldn't count up from ₹0 on every visit |

### Auth-screen brief deviations

| Brief said | Shipped | Why |
|---|---|---|
| Autofocus email on desktop | email on login; Full name on signup (desktop only) | it's the first field of the signup form |
| SVG < 6 KB | custom art ~4 KB; Lucide icons add ~2.5 KB more | icons are the shared icon set used app-wide |
| Keep "Forgot password?" | removed | it linked to `#`; password reset isn't built (needs an email provider) |
| Welcome toasts after sign-in/up | removed | auth now ends in a full page load (which would wipe the toast); the dashboard greets by name |
| `router.replace` + `router.refresh` after auth | full navigation; logout is a native form post → 303 | the refresh could abort the navigation (stuck on /signup); a hard load also drops the previous session's client cache; logout works before hydration |
