# Brian AI Implementation Audit

This audit tracks the current local build against `implementation_plan.md`.

## Proven Locally

- React/Vite app shell with routes for Dashboard, AI Copilot, Knowledge Graph, Compliance, Documents, Field Mode, Expert Capture, and Settings.
- Frontend routes are code-split with `React.lazy`; the production build now emits separate page chunks and keeps the main app chunk under Vite's 500 kB warning threshold.
- FastAPI backend with health, query, streaming query, ingest, graph proxy, compliance, alerts, benchmark, OCR, capture, and provider-status endpoints.
- 20 generated refinery corpus files in `data/corpus/`.
- Warm local cache in `data/cache.db` and seed manifest in `data/chroma_index/manifest.json`.
- Unified local RAG path with citations and an `ERR_EMPTY_KB` SSE error contract.
- Copilot UI handles `ERR_EMPTY_KB` with a knowledge-base initializing message and 30-second auto-retry.
- Compliance checks stream clause progress in batches of 3.
- Compliance evidence drawer `Ask Copilot` opens `/copilot` with a clause-specific draft query containing clause ID, title, status, evidence context, and remediation intent.
- Benchmark Mode supports both cached JSON and `Accept: text/event-stream` SSE delivery on `GET /api/benchmark`; the dashboard progressively consumes streamed rows and keeps live spot-check reruns.
- Document ingestion supports both JSON and `Accept: text/event-stream` SSE on `POST /api/ingest`, emitting the five planned progress steps before returning the ingested document result.
- Document library cards are keyboard/click targets that set Copilot document context and navigate to `/copilot`; Copilot loads its document tree from `/api/documents`.
- Knowledge Graph detail panel lists directly related documents, hands selected evidence into Copilot context, and resolves nearest evidence/regulation paths through `POST /api/graph/query`; browser QA verifies the production bundle renders three K-101 regulation paths and the graph-to-Copilot handoff without route errors or horizontal overflow.
- Mobile app shell collapses the desktop sidebar into an accessible bottom navigation at 375px with no page-level horizontal overflow.
- Field PWA route includes camera capture, browser speech-recognition voice query with fallback lookup, manual tag fallback, a five-answer offline history in `localStorage`, install prompt handling through `beforeinstallprompt`, and Sunlight Mode.
- Field nameplate OCR has an optional OpenRouter/Gemini vision provider path behind config, with filename, local Tesseract, byte-pattern, and demo fallback providers returned in API metadata.
- PWA manifest is served with 192px and 512px PNG install icons, plus `/sw.js` for the Field Mode offline shell, static-asset runtime caching, GET API network-first caching, and navigation fallback.
- Expert Knowledge Capture writes an expert-session corpus file and registers it in `/api/documents` as `Expert Knowledge`.
- Expert Knowledge Capture now includes the planned review step after five interview answers, showing expert, topic, all Q&A pairs, Previous, and Submit & Ingest before writing to the corpus.
- All React routes are wrapped in page-level error boundaries with a friendly retry view instead of a white-screen failure.
- Neo4j production path has an optional async driver singleton, schema constraints, FastAPI lifespan cleanup, and a 60-minute AuraDB heartbeat task that no-ops safely without credentials.
- Railway Docker startup now runs `/startup.sh`, which seeds `/data/chroma`, `/data/corpus`, benchmark cache, and SQLite cache on a fresh persistent volume.
- Generated PowerPoint pitch deck and rendered slide previews.
- Demo video script exists at `docs/DEMO_VIDEO_SCRIPT.md` and maps the app routes to a five-minute recording flow.
- Public links checklist exists at `docs/PUBLIC_LINKS_CHECKLIST.md` and covers Railway backend, Vercel frontend, pitch deck, and demo video URL handoff.
- Settings includes production-readiness checks for OpenRouter, field vision OCR, Neo4j, public CORS, persistent index storage, and public URLs, plus a submission-readiness panel mapping Brian AI to the working prototype, pitch deck, demo-video script, public links checklist, submission runbook, evidence audit, and the six hackathon judging criteria.

## Verified Commands

```powershell
python -m compileall backend
python scripts\prebuild_index.py
python scripts\prebuild_benchmark.py
python scripts\smoke_backend.py
node scripts\smoke_frontend.mjs
npm.cmd run build
sh -n scripts/startup.sh
```

Backend smoke checks currently cover:

- `/health`
- `/api/documents`
- `/api/alerts`
- `/api/graph/completeness`
- `/api/graph/query` shortest-path records
- `/api/system/status`, including production-readiness checks
- OCR provider status, including vision configuration, local Tesseract availability, and local fallback mode
- Browser QA on the production bundle for Documents -> Copilot context handoff, Compliance -> Copilot clause query handoff, Knowledge Graph related-document handoff, Knowledge Graph path lookup, Knowledge Capture review flow, Settings production/submission-readiness panels, Field PWA service worker/cache/offline route, and Field voice fallback lookup, with no console errors and no horizontal overflow.
- Neo4j local no-credential mode, including no-op schema and keep-alive checks
- `/api/benchmark` cached JSON and SSE result stream
- `/api/ingest` JSON response and five-step SSE progress stream
- `/api/query`
- `/api/capture` expert-session registration into `/api/documents`
- empty-knowledge-base streaming error event

`scripts/smoke_backend.py` packages the backend smoke checks as a repeatable pre-recording/pre-deploy command and removes its temporary ingest artifact from both `data/corpus` and `data/cache.db`.

`scripts/smoke_frontend.mjs` packages browser smoke checks for the built frontend. It launches Edge/Chrome through CDP, visits all eight routes, checks for route error boundaries and horizontal overflow, verifies Compliance -> Copilot handoff, Knowledge Graph path results, and Field PWA service worker cache population.

Latest frontend build emits 12 JavaScript chunks, including separate route chunks such as `DashboardPage-*`, `KnowledgeGraphPage-*`, `FieldPage-*`, and a main `index-*` chunk of about 246 kB. The previous Vite large-chunk warning is no longer present.

## Remaining External Gaps

- OpenRouter live generation and live Gemini vision OCR calls require real `OPENROUTER_API_KEY`, `BRIAN_AI_USE_OPENROUTER=1`, and representative nameplate images.
- Neo4j AuraDB write/read and heartbeat verification requires real `NEO4J_URI`, `NEO4J_USER`, and `NEO4J_PASSWORD`.
- ChromaDB is represented by a committed seed manifest and local lexical retrieval path; a production ChromaDB collection has not been verified in this workspace.
- Railway backend deployment, persistent `/data` volume seeding in Railway, and Vercel frontend deployment have not been executed against live cloud services.
- Real mobile-device PWA install prompt verification has not been performed; local browser QA verifies service worker registration, Field shell cache population, and offline `/field` navigation under network emulation.
