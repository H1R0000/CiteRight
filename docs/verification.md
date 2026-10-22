# Verification record

## Pre-release polish — 23 October 2026

Clean `npm ci` succeeded after stopping the Vite process that held a Windows native-module lock. Dependency audit reported zero vulnerabilities at installation time. Lint, TypeScript/build, 43 unit tests, and all 22 desktop/mobile browser tests passed. A regression test covers ambiguous imported surnames without altering the supplied names. The development server was restarted afterward.

Refreshed desktop, mobile, dark-mode, and editor screenshots. Capture checks reported no page errors or horizontal overflow. Native form popups use progressive `base-select` styling where supported and the active color scheme otherwise; their appearance can still vary by browser.

Cold browser-context measurements on the local production preview: homepage heading ready at 281 ms, editor at 437 ms, library at 459 ms. These single local samples are not internet performance or Core Web Vitals measurements. Main JavaScript was approximately 554 KB minified / 177 KB gzip; the lazy citation bundle was 868 KB / 193 KB gzip. Keep the bundle advisory visible; collect hosted measurements before optimizing further. Reproduce diagnostics with `scripts/performance-smoke.mjs` while the production preview runs on port 4173.

Clipboard tests verify HTML italics/hanging-indent payloads and honest fallback behavior. Actual pasted output in Microsoft Word and Google Docs has not been verified in this session. The new editor guide describes checking destination formatting rather than guaranteeing it.

Publication remains pending: the user has not created a GitHub repository, so its link remains unset. Enable private vulnerability reporting once the repository exists. No GitHub upload or Vercel deployment was performed.

## Conference paper correction — 23 October 2026

The reported DOI `10.1109/ICSSAS66150.2025.11080972` resolves in Crossref as a `proceedings-article`, explaining the earlier journal-only rejection. Lookup now supports that type explicitly, preserving the paper's six credited authors, 2025 publication year, IEEE publisher, proceedings title, and pages 141–148. The real DOI was loaded successfully in the user's local application and its citation preview was inspected. A screenshot is saved as `screenshots/conference-editor.png`.

Published proceedings are formatted as collected-work contributions for both APA and MLA. This explicit CSL mapping avoids the bundled styles' serial-publication inference for `paper-conference` records without editors, which would otherwise omit IEEE. The stored type remains `paper-conference`, and BibTeX exports `@inproceedings`. Editors remain editable and are never invented. The official APA Bedenel proceedings example verifies editor and page formatting.

Final validation passed: `npm run check` (lint, 42 unit tests across eight files, TypeScript, production build), all 22 Playwright tests across desktop/mobile, and formatting checks. New browser coverage verifies the exact reported DOI, proceedings fields, editor changes, save/reopen, source-type labels, and accessibility. Unsupported DOI types remain rejected with their actual Crossref classification in the message.

## Journal article update — 23 October 2026

The journal article update passed `npm run check`: lint, 39 unit tests across seven files, TypeScript compilation, and the static production build. The 14 existing desktop/mobile book tests passed unchanged, followed by all six new article browser tests (20 passing cases in total). The new accessibility tests use reduced motion to measure settled theme colors rather than intermediate transition frames.

Article checks cover DOI/link parsing, explicit rejection of Scholar URLs and unsupported source types, metadata normalization without invented dates, caching, cancellation, rate-limit cooldowns, DOI identity, missing metadata, legacy JSON compatibility, mixed-reference import/deduplication, APA/MLA formatting against official examples, article numbers, and BibTeX output. Browser flows cover lookup, review, save, reopen, import, duplicate skipping, manual entry, draft protection, light/dark accessibility, and mobile overflow.

`scripts/live-article-smoke.mjs` succeeded against the static production preview with DOI `10.1037/ppm0000185`. Crossref returned HTTP 200 directly in the browser. The editor showed publication year **2019**, journal **Psychology of Popular Media Culture**, volume **8**, issue **3**, and pages **207–217**, and rendered the APA Grady reference without browser page errors. No Vercel backend, API key, or Google Scholar scraping was used.

The original verification record below describes the initial book release.

Verified locally on 23 October 2026 on Windows, using Microsoft Edge through Playwright. This records the checks performed; it is not a guarantee of complete accessibility or third-party API availability.

## Automated checks

- `npm install` completed successfully; the dependency audit reported no vulnerabilities at installation time.
- `npm run check` passed: ESLint, 26 unit tests across five files, TypeScript compilation, and the Vite production build.
- `npm run test:e2e` passed 14 browser tests across desktop and mobile projects, using the production build served by Vite preview.
- Browser coverage includes edition selection, APA/MLA generation, draft recovery and replacement, duplicate handling, collections, selection, JSON import/export, deletion and undo, malformed/corrupt data, rate-limit recovery, rich clipboard payloads, and clipboard failure reporting.
- Automated axe scans cover the light and dark homepage and citation editor. Responsive checks and reduced-motion behavior are included. These are not a substitute for a complete screen-reader audit.
- Unit citation fixtures use official APA and MLA examples, with additional cases for author names, absent metadata, locators, ordering, disambiguation, and unsafe input. Metadata tests ensure selected-edition fields remain separate from work-level publication dates and incomplete author retrieval is disclosed.
- Request tests cover queue spacing, queued duplicate reuse, cancellation, and `Retry-After` handling.

## Live API check

The development server and static production preview both completed this flow directly in the browser without a backend:

1. Search ISBN `9780140328721` through Open Library's ISBN endpoint.
2. Resolve the edition `/books/OL7353617M` and its author record.
3. Open the editor with **Fantastic Mr. Fox**, **1988**, **Puffin**.
4. Produce APA output: Dahl, R. (1988). _Fantastic Mr. Fox_. Puffin.

The final production check returned an ISBN redirect followed by successful edition and author responses. Canonical-URL caching avoided an additional edition request.

## Visual checks

The screenshots in this folder were captured from the running application at 1440 × 1000 desktop and 390 × 844 mobile viewports, including light mode, dark mode, and the populated citation editor. Capture checks reported no horizontal document overflow or browser page errors. A bounded visual review found two readability fixes; both were applied and approved. Decorative animation stops after a short cycle and respects reduced-motion preferences.

## Deployment status and remaining limits

The same static build runs locally and is configured for Vercel with output in `dist`. GitHub publication and a hosted Vercel deployment have **not** been performed. Set the repository URL in `src/config.ts` when publishing.

Vite reports a chunk-size advisory for the lazy-loaded citation processor and bundled CSL styles (approximately 897 KB minified / 204 KB gzip). This does not prevent the build, but the first editor or library load must fetch that bundle. Open Library availability, browser storage capacity, and formatting retained by the destination clipboard application remain external constraints. See the README for supported source types and other limitations.
