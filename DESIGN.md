---
name: CiteRight
description: A playful violet, mint, and yellow digital library with a calm citation workspace.
colors:
  violet: '#7043c3'
  violet-hover: '#5f33b1'
  violet-soft: '#f0e9fc'
  mint: '#c4f1de'
  butter-yellow: '#f6da79'
  canvas: '#fcfbff'
  panel: '#ffffff'
  ink: '#272333'
  muted: '#696373'
  line: '#e6e0ed'
  soft: '#f5f2f9'
  error: '#b52742'
  error-soft: '#fff0f3'
  green: '#24724f'
  dark-violet: '#bc9aff'
  dark-violet-hover: '#d1b9ff'
  dark-violet-soft: '#35284d'
  dark-mint: '#294c40'
  dark-butter-yellow: '#594a23'
  dark-canvas: '#191724'
  dark-panel: '#232030'
  dark-ink: '#f3eff9'
  dark-muted: '#b8afc9'
  dark-line: '#40374f'
  dark-soft: '#2c263a'
  dark-error: '#ff9eb2'
  dark-error-soft: '#482432'
  dark-green: '#8bdbb4'
  dark-primary-ink: '#26133f'
typography:
  display:
    fontFamily: "'Manrope Variable', sans-serif"
    fontSize: 'clamp(50px, 6.2vw, 76px)'
    fontWeight: 800
    lineHeight: 1.07
    letterSpacing: '-0.04em'
  headline:
    fontFamily: "'Manrope Variable', sans-serif"
    fontSize: 'clamp(34px, 4vw, 48px)'
    fontWeight: 800
    lineHeight: 1.2
    letterSpacing: '-0.035em'
  title:
    fontFamily: "'Manrope Variable', sans-serif"
    fontSize: '17px'
    fontWeight: 800
    lineHeight: 1.2
    letterSpacing: '-0.035em'
  intro:
    fontFamily: "'Manrope Variable', sans-serif"
    fontSize: '15px'
    lineHeight: 1.8
  button:
    fontFamily: "'Manrope Variable', sans-serif"
    fontSize: '13px'
    fontWeight: 750
    lineHeight: 1.35
  guidance:
    fontFamily: "'Manrope Variable', sans-serif"
    fontSize: '12px'
  citation:
    fontFamily: "Georgia, 'Times New Roman', serif"
    fontSize: '16px'
    lineHeight: 1.9
rounded:
  tag: '5px'
  field: '8px'
  button: '10px'
  card: '12px'
  search: '14px'
  panel: '16px'
spacing:
  compact: '8px'
  control-inline: '18px'
  panel: '26px'
  page-inline: '40px'
components:
  button-primary:
    backgroundColor: '{colors.violet}'
    textColor: '{colors.panel}'
    rounded: '{rounded.button}'
    typography: '{typography.button}'
    padding: '11px 18px'
  button-primary-hover:
    backgroundColor: '{colors.violet-hover}'
  button-primary-dark:
    backgroundColor: '{colors.dark-violet}'
    textColor: '{colors.dark-primary-ink}'
  button-secondary:
    backgroundColor: '{colors.violet-soft}'
    textColor: '{colors.violet}'
    rounded: '{rounded.button}'
    padding: '11px 18px'
  button-outline:
    backgroundColor: '{colors.panel}'
    textColor: '{colors.ink}'
    rounded: '{rounded.button}'
    padding: '11px 18px'
  button-ghost:
    backgroundColor: 'transparent'
    textColor: '{colors.ink}'
    rounded: '{rounded.button}'
    padding: '11px 18px'
  button-danger:
    backgroundColor: '{colors.error}'
    textColor: '{colors.panel}'
    rounded: '{rounded.button}'
    padding: '11px 18px'
  input:
    backgroundColor: '{colors.panel}'
    textColor: '{colors.ink}'
    rounded: '{rounded.field}'
    padding: '11px 13px'
  tag:
    backgroundColor: '{colors.violet-soft}'
    textColor: '{colors.violet}'
    rounded: '{rounded.tag}'
    padding: '4px 6px'
  panel:
    backgroundColor: '{colors.panel}'
    rounded: '{rounded.panel}'
    padding: '26px'
---

# Design System: CiteRight

## Journal article extension

The homepage now places a two-button source selector above the search field: Books and Research papers. It uses the existing violet, soft-surface, border, and focus tokens with 44px minimum control height. Paper mode supports journals and published conference proceedings, with a labeled DOI input, clear Google Scholar-to-publisher guidance, manual entry, and a metadata review card. Loading and errors are announced. Switching source modes cancels obsolete requests. Conference papers have distinct proceedings-title, publisher, page-range, and optional credited-editor fields.

The citation studio keeps its established layout while displaying fields appropriate to the selected source. Journal title, volume, issue, full page range, and article number are separate from quotation page locators. Article records have a visible source-type tag in the shared library. Existing animation and reduced-motion rules apply; no new decorative motion was added.

## Overview

**Creative North Star: "The Playful Digital Library"**

Violet identity, mint and butter-yellow book objects, pale lavender surfaces, and rounded controls make an approachable academic workspace. Manrope gives navigation and metadata a consistent voice; serif citation output makes the finished reference easy to distinguish.

Discovery is expressive while editing stays calm and compact. This document captures the completed, user-approved code-led direction in `src/styles.css`; `.impeccable/surface.md` records the concept-launcher limitation. Render references live in `docs/screenshots/`. The independent finishing review resolved both typography findings and returned **ship**.

**Key Characteristics:**

- Playful geometric books with bounded decorative motion.
- Violet actions, mint reassurance, and yellow accents.
- Calm editing surfaces with readable citation guidance.
- Responsive layouts and equivalent light/dark roles.

## Colors

The frontmatter records exact light values and their `dark-` counterparts; the stylesheet switches semantic variables through `:root.dark`.

### Primary

Library violet marks actions, active navigation, selected controls, and focus. Soft violet supplies selection and supporting surfaces. Dark-mode primary controls use dark purple ink rather than white.

### Secondary

Mint supports reassuring badges and geometric books; green supplies their readable foreground and readiness indicators.

### Tertiary

Butter yellow adds warmth to step numbers and the headline underline. Decorative book covers use their own fixed art colors and retain these colors in dark mode.

### Neutral

Canvas is pale lavender, panel is white, and ink is deep plum. Muted text, fine lines, and soft fills distinguish supporting material without excessive borders. Dark mode keeps the same hierarchy with plum surfaces and light text. Error and error-soft are reserved for actionable problems.

## Typography

**Display and body font:** locally bundled Manrope Variable, sans-serif fallback. **Citation font:** Georgia, Times New Roman, serif. The quote-shaped brand mark also uses Georgia.

The frontmatter records reusable roles; local page headings intentionally vary. General second-level headings are 25px. The desktop editor heading is 33px, library heading 45px, and About heading 60px. Body copy generally ranges from 12–15px; paragraph line-height defaults to 1.75.

**The Readable Guidance Rule.** Keep field hints, optional-label guidance, readiness text, and suggested-search text at the final 12px size across breakpoints. These trailing stylesheet overrides deliberately supersede earlier smaller declarations.

Headings use tight tracking and balanced wrapping. Labels and controls use weights around 700–800. Citation output has generous leading and a 1.4em hanging indent; mobile main preview text becomes 15px. At 580px and below, search, editor text inputs, and library filter inputs are 16px. Smaller metadata and library-grid citation previews remain compact; the guidance rule does not imply a global text minimum.

## Layout

The main container is at most 1240px with 40px horizontal padding; the header reaches 1320px. The desktop hero divides into 1.6:1 columns, results into four columns, and editor into 1.15:1 columns with a 30px gap. The library uses a 220px sidebar and flexible content with a 40px gap. Its card view starts at three columns.

| Breakpoint      | Actual changes                                                                                                                                                                                                                                |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| At least 1440px | Hero vertical padding grows to 85px/70px.                                                                                                                                                                                                     |
| At most 1100px  | Page gutters become 28px; hero type becomes 61px; book art scales to .85; editor gap becomes 22px; library sidebar becomes 185px and cards two columns.                                                                                       |
| At most 800px   | Navigation wraps to a second header row; hero type becomes 51px and art scales to .66; results use three columns; editor and library become single-column layouts; collection controls wrap horizontally and library cards use three columns. |
| At most 580px   | Gutters become 20px; hero stacks with art below copy at .68 scale; hero type becomes 57px; results and library cards use two columns; About stacks; header style switch hides; footer links stack.                                            |

The body supports a minimum width of 320px. Fields generally retain a two-column grid; labels wrap on mobile. Dialogs have a 16px viewport margin, scroll internally, and use 480px or 850px maximum widths. Maximum dialog height is 85dvh, changing to 88dvh on mobile. Spacing is contextual rather than a strict universal scale.

## Elevation & Depth

Most work surfaces rely on soft fills and fine borders. Shadows establish physical book depth and lift temporary feedback. The ambient shadow is `0 12px 40px -20px rgba(54,31,83,.22)` in light mode and `0 12px 40px -20px #0008` in dark mode. Dialogs use `0 30px 90px -20px #130b2766`; toasts use `0 10px 40px -12px #0008`. Do not add elevation to every panel.

## Shapes

Gently rounded controls and panels use the frontmatter radius vocabulary. Book covers use asymmetric 3px/6px or 3px/8px corners, exposed page edges, and rotated silhouettes. Circular orbits and small geometric marks belong to the decorative library illustration. Inputs and panels retain visible borders; citation blocks use soft tonal fills.

## Components

### Buttons

Tactile and compact: default minimum height 44px, small variants 40px, with an 8px icon gap. Primary is violet, secondary is soft violet, outline is panel-colored with a fine border, ghost is transparent, and danger uses error. Hover lifts by 2px; active returns to baseline and scales to .98. Background, transform, and shadow transitions last 180ms. Disabled controls have .48 opacity and a not-allowed cursor. General keyboard focus is a 3px violet outline offset by 4px.

### Chips

Collection tags use soft violet, violet text, compact padding, and small corners. Reassurance badges use mint and green. Tags are informational; segmented switches and collection navigation expose selected state through color and their native accessibility state.

### Cards / Containers

Editor panels are bordered with 26px padding, reduced to 20px at narrower widths. Result covers sit on soft 14px-radius stages; the entire result is a button. Hover lifts the cover 7px and rotates it -3 degrees. Library list rows use dividers; grid rows gain 12px corners and a border. Selection uses soft violet.

### Inputs / Fields

Fields use a 1px line border, 44px minimum height, and an 8px radius. Focus uses a 2px violet outline offset by 1px; invalid fields use the error border and adjacent text. Search has a larger 14px shell with a 1.5px border, changing to violet with a 3px soft-violet halo on focus.

### Navigation

The sticky header uses the canvas color and a bottom divider. Muted links turn violet on hover or selection; the active route also receives a 3px underline. Counts use tabular numerals. The mobile navigation occupies a full second row; the theme control remains available.

### Books, feedback, and motion

Decorative books enter over 1s, then float for one 3.6s cycle after a 1s delay. They do not loop indefinitely. Search results enter over 400ms with 45ms staggering capped at 315ms. Save feedback flies toward the library over 850ms and is removed after 900ms. Preview changes take 250ms; dialogs take 200ms. Spinners and skeleton pulses repeat only while loading.

**The Reduced Motion Rule.** Under `prefers-reduced-motion: reduce`, animation and transition durations become .01ms, animation delays become zero, iteration counts become one, and scrolling becomes immediate. The flying book is hidden, and button/cover hover movement is suppressed. Readiness links also choose immediate scrolling. Maintain textual feedback so motion never carries the outcome alone.

## Do's and Don'ts

### Do:

- Do reuse semantic colors so light and dark modes preserve the same hierarchy.
- Do keep citation guidance and suggested-search text at 12px across breakpoints.
- Do preserve visible focus, wrapping labels, and reduced-motion feedback.
- Do keep decorative animation bounded and the editor calm.

### Don't:

- Don't invent publication details, statistics, or accuracy claims as visual filler.
- Don't turn the finite book float into an endless decorative loop.
- Don't replace readable citation output with decorative display lettering.
- Don't use external raster artwork for the geometric book illustration; it is implemented in CSS and SVG.
