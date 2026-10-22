# Contributing to CiteRight

Install Node.js 22.12+ and run `npm ci`, then `npm run dev`.

Before proposing a change, run `npm run check` and `npm run test:e2e` (install Chromium with `npx playwright install chromium` first). Keep changes focused and describe the user-visible outcome and validation in your pull request.

Citation changes need an independently verified reference example, its authoritative source, and a regression test. Preserve supplied author order and edition identity. Never invent missing metadata or silently reinterpret personal names. Review both APA and MLA output, including rich-text copying.

UI changes should work with keyboard navigation, mobile screens, light/dark themes, and reduced motion. API changes must preserve caching, cancellation, timeouts, and respectful rate limiting.

Do not attach private library exports, credentials, or unpublished research to public issues. Use a minimal fictional example or public DOI instead.
