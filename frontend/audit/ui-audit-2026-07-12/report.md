# Brian AI UI/UX audit

Date: 2026-07-12
Scope: React/Vite frontend, all eight application routes
Mode: app UI, desktop + touch mobile

## Severity summary

### Critical

None found.

### High

- **H-01 Demo mode generated repeated 500 console errors.** When no `VITE_API_URL` is set, the app correctly renders bundled data but still attempted the live read/stream endpoints. Fixed at the shared API boundary in `frontend/src/services/api.ts`; demo reads and demo streams now return their bundled fallbacks without network calls.
- **H-02 Mobile controls were 28–32px.** Header actions and compact controls were below the recommended 44px touch target. Fixed in shared responsive CSS in `frontend/src/index.css` for buttons, sidebar triggers, select/dropdown triggers, and form controls.

### Medium

- **M-01 Knowledge Graph needs a clearer pan affordance on narrow screens.** The graph intentionally keeps a readable minimum width and is horizontally scrollable, but the first mobile viewport clips nodes without an obvious “pan” cue. Deferred because the current scroll container is usable and adding copy or decorative gradients would add noise; add a small visual affordance when the graph becomes a primary field workflow.
- **M-02 Dashboard uses a repeated card rhythm.** The cards are meaningful metrics and interaction surfaces, not a generic marketing feature grid, but the lower sections still read as a dense mosaic. A stronger hierarchy would require a product decision about which evidence block is primary, so no speculative layout rewrite was made.

### Polish

- Several progress and placeholder strings still use ASCII `...` instead of `…`.
- Desktop keeps compact 28–32px controls for density; the 44px rule is enforced at mobile widths. Expand desktop targets only if pointer-target research or user testing shows the density is hurting operation.

## Design-system changes made

- Reused the existing shadcn/Radix primitives and semantic tokens. No new UI dependency or parallel component system was added.
- Added balanced heading wrapping for `h1`–`h3`.
- Centralized mobile touch sizing at the shared CSS layer instead of adding page-specific overrides.
- Expanded the Knowledge Graph SVG hit areas without changing its visual geometry, so keyboard and touch selection targets remain usable on mobile.
- Centralized demo/live behavior in `services/api.ts` so pages keep the same loading, success, and error UI while the transport stays quiet in demo mode.
- Preserved the existing amber/cyan-adjacent industrial palette, Geist typography, radii, and surface hierarchy.

## Browser evidence

Route sweep: 8 routes × 2 viewports = 16 runs.

- Desktop: 1440×1000.
- Mobile: 390×844 with touch context.
- Routes: `/`, `/copilot`, `/knowledge-graph`, `/compliance`, `/documents`, `/capture`, `/settings`, `/field`.
- Final route sweep: 0 console errors, 0 console warnings, 0 failed requests, 0 horizontal body overflows, 1 H1 per route.
- Final shared interaction check: search dialog opened and closed.
- Flow check: client-side navigation to Copilot, Copilot submit, document upload error state, compliance progress/results, capture form advance, and mobile sidebar navigation all passed.
- Expected local-only exception: the document upload flow returns one `500 /api/ingest` because the backend is not running; the UI catches it and renders the specific `Document ingest` error alert. No backend code was changed.

Screenshots and machine-readable results are in this folder:

- `final-*-desktop.png` and `final-*-mobile.png`: route screenshots.
- `final-flow-*.png`: interaction screenshots.
- `final.json`: route DOM/console/overflow evidence.
- `flows.json`: interaction evidence.
- `baseline.json`: before-fix comparison.

## Verification

- `npm.cmd --prefix frontend run lint` passed.
- `npm.cmd --prefix frontend run build` passed.
- `python -m unittest discover -s backend/tests -v` passed: 9 tests.
- Playwright browser sweeps passed after the fixes.
