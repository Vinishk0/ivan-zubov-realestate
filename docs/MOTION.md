# Motion system

The site stays on native HTML/CSS/ES modules. `motion.mjs` provides the shared Web Animations API helpers and one-time IntersectionObserver reveals; `motion.css` holds tokens and interaction states. No animation framework or scroll interception is added.

## Motion vocabulary

- Feedback: 180 ms. State changes: 360 ms. Section entrances: 850 ms. Image reveals: 1200 ms. Stagger: 85 ms.
- Ease out: `cubic-bezier(.16,1,.3,1)`. Symmetric transitions: `cubic-bezier(.65,0,.35,1)`.
- Hero: photographic reveal, staggered name/copy, existing slide cycle, slow zoom with a real paused state. Offscreen/hidden tabs pause the slide timer and zoom.
- Scroll: explicit heading lines use masks, portrait uses a photo wipe, cards use an opacity/translation entrance, decorative rules scale from their origin. Observers unobserve after entrance; important content is visible without motion initialization.
- Pointer: fine pointers get at most 2.5 px button attraction and 5 px photo displacement. No tilt. Touch gets press/focus feedback without pointer listeners doing layout work.
- Scroll progress/portrait depth update on demand in requestAnimationFrame, not a perpetual render loop. Only visible hero/portrait geometry is read. Reduced motion and touch disable depth effects.
- Dialogs preserve native modal focus and Escape semantics. Closing keeps the dialog modal until its exit ends, then native focus returns to the trigger.
- Reviews and district cards cancel stale swaps; the latest selected state wins. Their changing height is animated to avoid a snap. Leaflet owns map transforms; only SVG colors/opacities/line width transition.
- FAQ and approach details animate measured height, including interrupted toggles. Native details remain usable when motion is disabled. Height animation is limited to the affected panel.
- Form keeps existing delivery/retry behavior and adds sending/success/error presentation. Browser tests intercept delivery and never send test messages.
- Footer theme selection uses existing theme variables, persists only the chosen theme, and gracefully tolerates disabled localStorage.

## Accessibility and performance

`prefers-reduced-motion` disables CSS motion and finishes active finite WAAPI effects, including live preference changes. Pointer effects reset when the preference/input changes. Keyboard focus finishes pending entrances. No global opacity-zero gate, overlay loader, smooth-scroll library, permanently promoted full-page layers or infinite scroll effect is used. Focus styles remain explicit. The motion-only scroll indicator is aria-hidden; review updates remain atomic live announcements.

## Verification

```sh
npm ci
npm run check
npm test
npm run build
npx playwright install chromium
npm run test:browser
```

The optional `BROWSER_EXECUTABLE` variable points browser checks at an installed Chromium. Tests cover widths 1440/768/390/320, every case/service dialog, menu, reviews, repeated FAQ/map clicks, theme persistence, slideshow pause/offscreen behavior, live reduced-motion changes, mock form failure/retry/success, local images and JavaScript errors. The external map tile provider is blocked during tests to exercise its existing fallback while local district boundaries and selectors remain functional. Screenshots go to ignored `artifacts/motion/`. The Node 24 CI job runs these browser checks.

Production publication requires the owner's approval. This branch is intended for a preview and pull request only.

## Preview feedback revisions

The hero photograph is visible from the first frame; the covering clip-path entrance has been removed. Only name/copy entrances remain. Slide numbers and text labels are removed; the pause/resume icon keeps an accessible name. Navigation uses «Кейсы» and «Округа».

Cases are a native scroll-snap rail: two visible cards on desktop, one on mobile, all four cases available with arrow buttons, touch scrolling and keyboard arrows on the rail. There is no case testimonial screenshot. Metric values and UI counters/prices use Manrope with lining/tabular numerals; experience has its own lead column and six larger, clearly labelled measurements.

Reviews reserve the measured maximum height of their short excerpts at the current width, remeasure after fonts load and on width changes, and swap only the quote without a height animation. Navigation and footer geometry remain fixed across all twelve reviews. Author names and customer IDs are absent from both summary and detail views; original review wording and original review images remain. Image attribution captions are removed.

FAQ uses a single centred column. The request section puts a two-column form beneath its short introduction, with one column on phones. The following contact section uses the existing dark contact color. Marketing/service/FAQ copy is shortened; client review quotations, prices, transaction figures and conditions are preserved.

Browser regressions additionally check the two-case rail, first-frame image visibility, numeric typography, stable review/frame/footer/section dimensions across every review at desktop and mobile widths, hidden customer IDs and different request/contact backgrounds.
