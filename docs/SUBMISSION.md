# Brian AI Hackathon Submission Guide

This guide is the presenter runbook for the Brian AI hackathon submission. It maps the app to the expected working prototype, pitch deck, and demo-video artifacts.

## Submission Positioning

Brian AI is an industrial knowledge intelligence platform for Bharat Refinery, Jamnagar. It turns 20 disconnected plant documents into a single AI command center for evidence search, compliance checks, failure alerts, field lookups, and expert knowledge capture.

The prototype is built to demonstrate the judging criteria listed on the hackathon page:

- Relevance and problem understanding: refinery knowledge is fragmented across documents, workflows, and retiring experts.
- Innovation and creativity: one command center combines RAG, graph paths, compliance evidence, failure alerts, Field PWA, and expert capture.
- Technical implementation: React, FastAPI, streaming APIs, corpus ingestion, local cached retrieval, graph proxy, compliance SSE, optional OpenRouter/Gemini vision OCR with local fallback, and PWA field mode.
- Potential impact and scalability: time-to-answer reduction, proactive compliance gaps, failure-pattern alerts, warm index cache, provider readiness, and Railway/Vercel deployment path.
- Presentation and communication: the demo video script proves the system works with citations instead of describing a future product.
- Business viability: pilot path through plant corpus onboarding, provider enablement, deployment, and measurable operational KPIs.

## Demo Script

Use this 5-minute flow for the demo video or live walkthrough.

Dedicated recording script: `docs/DEMO_VIDEO_SCRIPT.md`.

1. Open the command center.

   URL:

   ```text
   Use the local URL printed by Vite, for example http://127.0.0.1:5173
   ```

   Show the six KPI cards, failure alert banner, ROI impact panel, and benchmark button. Emphasize that the dashboard is powered by the generated 20-document refinery corpus.

2. Prove time-to-answer.

   Click `Prove It` on the dashboard. The result should answer why P-204B failed and include evidence from the incident, vibration, and work-order records.

3. Show AI Copilot with citations.

   Navigate to `AI Copilot` and ask:

   ```text
   What caused the P-204B seal failure?
   ```

   Point out streaming text, citations, confidence, and document context.

4. Run compliance intelligence.

   Navigate to `Compliance`, click `Run Compliance Check`, and show progress across 18 OISD/PESO clauses. Open a non-compliant row, show clause quote, plant evidence, remediation, then click `Ask Copilot` to open a prefilled clause query.

5. Show proactive failure alerts and graph context.

   Navigate to `Knowledge Graph`, click an equipment node, open a related document in Copilot, then return and click `Shortest path to regulation`. Show linked documents, regulations, alerts, path records, and completeness score.

6. Show Expert Knowledge Capture.

   Navigate to `Expert Capture`, begin the interview, answer the five prompts, and show the review screen before `Submit & Ingest`.

7. Show Field PWA mode.

   Navigate to `/field`, show the scan button, manual tag fallback, voice query action, cached answer area, and sunlight mode. If browser speech recognition is unavailable during recording, click Voice Query to show the fallback lookup and offline cache update. Use `P-204B`, `HE-101`, or `V-301` as the manual tag.

8. Show technical readiness.

   Navigate to `Settings` and show:

   - RAG provider mode
   - Graph provider mode
   - Index cache chunk count
   - API health
   - Production readiness checks
   - Submission artifact checklist
   - The six hackathon judging criteria

   Explain that the demo runs locally without paid credentials, while OpenRouter, OpenRouter vision OCR, Neo4j, public CORS, and public links can be enabled by environment variables after Railway/Vercel deployment.

## Pitch Deck Outline

Generated deck:

- PowerPoint: `docs/Brian_AI_pitch_deck.pptx`
- Rendered preview PNGs: `docs/pitch-deck-preview-final/`
- Demo video script: `docs/DEMO_VIDEO_SCRIPT.md`
- Public links checklist: `docs/PUBLIC_LINKS_CHECKLIST.md`

Use 8 slides. Keep each slide visual and proof-oriented.

1. Title

   Brian AI: Industrial Knowledge Intelligence for Bharat Refinery, Jamnagar.

2. Problem

   Plant knowledge is split across P&IDs, safety procedures, work orders, inspection reports, OEM manuals, incident records, regulatory submissions, and retiring experts.

3. Solution

   Brian AI unifies the corpus into AI Copilot, Knowledge Graph, Compliance Intelligence, Failure Alerts, Field PWA, and Expert Capture.

4. Live Prototype

   Include screenshots of Dashboard, Copilot, Compliance, Knowledge Graph, and Field Mode.

5. Technical Architecture

   Browser to FastAPI over REST/SSE. Backend services cover ingestion, cached retrieval, graph proxy, compliance checker, OpenRouter-ready OCR fallback, benchmark, alerts, and expert capture. Provider upgrade path: local retrieval to ChromaDB/OpenRouter, local graph to Neo4j AuraDB, and local nameplate reads to OpenRouter/Gemini vision.

6. Business Impact

   Use the app's impact panel: 3.5 hours saved per evidence search, 2 critical compliance gaps surfaced, 3 failure patterns made actionable.

7. Scalability

   Warm index cache, seed artifacts, provider status, Railway/Vercel deployment path, and API contracts that avoid exposing Neo4j credentials in the browser.

8. Ask / Next Steps

   Pilot with a real plant document set, connect DMS/SAP exports, enable production providers, run security review, deploy to Railway/Vercel.

## Technical Reference

For the current completion status and remaining external provider/deployment gaps, see `docs/IMPLEMENTATION_AUDIT.md`.

Backend modules:

- `backend/ingestion/`: document classification, entity extraction, local cache, and ingest pipeline.
- `backend/rag/`: unified query engine and SSE token streaming.
- `backend/compliance/`: 18-clause compliance definitions and progress events.
- `backend/knowledge_graph/`: graph service proxy.
- `backend/ocr/`: optional OpenRouter/Gemini nameplate tag extraction with deterministic local fallbacks.
- `backend/benchmark.py`: cached benchmark and live spot-check rerun.
- `backend/system_status.py`: provider readiness for the Settings page.

Frontend routes:

- `/`: command center and ROI impact.
- `/copilot`: streaming Q&A with citations.
- `/knowledge-graph`: graph explorer and scale simulator.
- `/compliance`: OISD/PESO compliance matrix.
- `/documents`: upload and ingestion flow.
- `/field`: mobile PWA field experience with camera, voice query, fallback lookup, offline answer cache, and sunlight mode.
- `/capture`: expert interview flow.
- `/settings`: provider and deployment readiness.

## Verification Checklist

Run these before recording:

```powershell
cd "C:\Users\yashd\Documents\Brian AI\backend"
python -m compileall .
```

Refresh seed artifacts:

```powershell
cd "C:\Users\yashd\Documents\Brian AI"
python scripts\prebuild_index.py
python scripts\prebuild_benchmark.py
```

```powershell
cd "C:\Users\yashd\Documents\Brian AI\frontend"
npm.cmd run build
```

The production build should emit separate route chunks and no Vite large-chunk warning.

If the built frontend is served locally at `http://127.0.0.1:5182`, run browser smoke checks:

```powershell
cd "C:\Users\yashd\Documents\Brian AI"
node scripts\smoke_frontend.mjs
```

Check deployment/PWA readiness:

```powershell
cd "C:\Users\yashd\Documents\Brian AI"
& "C:\Users\yashd\.cache\codex-runtimes\codex-primary-runtime\dependencies\native\git\usr\bin\sh.exe" -n scripts/startup.sh
Invoke-WebRequest -Uri "http://127.0.0.1:5173/manifest.json" -UseBasicParsing
Invoke-WebRequest -Uri "http://127.0.0.1:5173/icon-192.png" -UseBasicParsing
Invoke-WebRequest -Uri "http://127.0.0.1:5173/icon-512.png" -UseBasicParsing
Invoke-WebRequest -Uri "http://127.0.0.1:5173/sw.js" -UseBasicParsing
```

Before submitting public URLs, complete `docs/PUBLIC_LINKS_CHECKLIST.md`.

Run backend API smoke checks:

```powershell
cd "C:\Users\yashd\Documents\Brian AI"
python scripts\smoke_backend.py
```

## Provider Enablement

Local demo mode works without paid credentials. To enable live providers:

```text
OPENROUTER_API_KEY=sk-or-...
BRIAN_AI_USE_OPENROUTER=1
OPENROUTER_VISION_MODEL=google/gemini-2.5-flash
NEO4J_URI=neo4j+s://xxxx.databases.neo4j.io
NEO4J_USER=neo4j
NEO4J_PASSWORD=...
ALLOW_ORIGINS=https://your-vercel-url.vercel.app,http://localhost:5173
FRONTEND_PUBLIC_URL=https://your-vercel-url.vercel.app
BACKEND_PUBLIC_URL=https://your-railway-url.up.railway.app
```

After setting credentials, open `Settings` and verify the RAG, Field OCR, graph provider modes, and production-readiness checks. With Neo4j credentials and the production Python dependencies installed, the graph card should report AuraDB keep-alive readiness.
