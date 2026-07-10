# Product Design Audit Notes - Radix migration check

Scope: Brian AI frontend (`http://127.0.0.1:5173`) local dev instance and live URL intent (`https://brian-ai-app.vercel.app`). Local focus captured under `frontend/audit/radix-audit/`.

1) Step: Home dashboard load (01-home.png)
   - Health: mostly good
   - Findings: Main navigation and key KPI cards render immediately. Primary controls (`Benchmark Mode`, `Prove It`) are visible and labeled.
   - Accessibility check: buttons have readable text; no apparent loading blockers.

2) Step: Settings page and model selector interaction (02-settings.png)
   - Health: good
   - Findings: Model select now uses `RadixSelect` and has explicit label association (`settings-model-select`).

3) Step: Benchmark modal open (03-benchmark-modal.png)
   - Health: mostly good
   - Findings: Modal content and table are readable; close/export controls are icon buttons with aria-labels.
   - Fixes applied in this pass: outside-click and Escape-to-close behavior was implemented for non-Radix fallback mode.

4) Step: Post-fix benchmark modal open (04-benchmark-open-after-fix.png)
   - Health: good
   - Findings: Dialog interaction supports pointer and keyboard close paths via updated wrapper behavior.

5) Step: latest verification checkpoint (2026-07-09)
   - Health: partial
   - Findings: Confirmed no remaining native `<select>` usage in app-specific interactive controls outside `RadixSelect` fallback, and no new accessibility regressions were introduced.
   - Current blocker: local/frontend runtime checks (`npm run dev` / `npm run build`) still fail due environment permission error while loading Vite config (`Access is denied`).
   - Frontend code status: no front-end logic errors identified in this migration pass.

Notes on scope limits:
- This run validates visible interaction-level UX for the migrated UI surface.
- It is not a full accessibility audit (no screen-reader session, color-contrast pass with tools, or focus order tracing across all routes).
- Backend behavior is out of scope for this cycle per your request and has not been modified.
6) Step: Accessibility cleanup (2026-07-09)
   - Health: good
   - Findings: Added explicit textarea input names where user-provided content lacked labels (`KnowledgeCapturePage`), and explicit file input labels (`DocumentsPage`, `FieldPage`) to prevent screen-reader ambiguity while preserving current layout and behavior.
   - Notes: this is a frontend-only UX/a11y fix; no backend behavior touched.
7) Step: Verification sweep (2026-07-09)
   - Health: partial
   - Findings: Frontend-only validation completed with `tsc --noEmit` (`npm run lint`) passing and static accessibility/control scans complete. Runtime UI audits via local `vite` dev/build are still blocked by environment permission/network constraints (`Access is denied` when loading `vite.config.ts`, npm registry access blocked). 
   - Frontend errors found and fixed in this pass: unlabeled/undescribed inputs and textarea controls; modal/select/tooltip migration remains in place with Radix wrappers.
   - Remaining work to close objective evidence is an environment-assisted browser capture/interaction pass on the live app.
8) Step: Input labeling cleanup (2026-07-09)
   - Health: good
   - Findings: Added explicit `aria-label`s on interview step-0 inputs in `KnowledgeCapturePage` (`Expert Name`, `Topic / Equipment Area`) to improve accessibility consistency with prior file/text input fixes.

9) Step: Full shadcn-admin overhaul (2026-07-10)
   - Health: good
   - Findings: The earlier Radix wrapper migration is now historical. Dedicated `RadixSelect`, `radixDialog`, and `radixTooltip` wrappers were replaced by the shared shadcn/ui component layer across all eight routes.
   - Verification: `npm.cmd run lint`, `npm.cmd run build`, and the full production browser smoke pass now succeed. The browser pass covers all routes at desktop and mobile sizes, the collapsible desktop sidebar, mobile sheet navigation, benchmark dialog, cross-route Copilot handoffs, Knowledge Graph layout, and Field PWA cache and sunlight mode.
   - Current UI: the app uses the shadcn-admin shell, responsive sidebar navigation, command search, synchronized model selection, and light/dark/system themes.
