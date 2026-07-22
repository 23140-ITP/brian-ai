# Brian AI Demo Video Script

Use this as the recording script for the ET AI Hackathon submission video. Keep the video under five minutes and record the local production build or the deployed public URL.

## 0:00-0:20 - Opening

Show the Dashboard and say:

Brian AI is an industrial knowledge intelligence platform for Bharat Refinery, Jamnagar. It turns 20 disconnected plant documents into a command center for evidence search, compliance checks, failure alerts, field lookups, and expert knowledge capture.

## 0:20-0:55 - Business Impact

Show the KPI cards, ROI panel, failure alerts, and `Benchmark Mode`.

Call out:

- 20 plant documents unified.
- 3.5 hours saved per evidence search.
- Critical compliance gaps and recurring failure patterns surfaced before audit or shutdown work.

## 0:55-1:35 - AI Copilot

Open `AI Copilot` and ask:

```text
What caused the P-204B seal failure?
```

Show streaming answer, citations, confidence, and document context.

## 1:35-2:15 - Compliance Intelligence

Open `Compliance`, run the compliance check, select a non-compliant row, and show:

- Clause quote.
- Plant evidence.
- Remediation.
- `Ask Copilot` handoff with a prefilled clause query.

## 2:15-2:55 - Knowledge Graph

Open `Knowledge Graph`, select an equipment node, show related documents, open one in Copilot, then return and click `Shortest path to regulation`.

Call out that graph reads stay behind the FastAPI proxy, so Neo4j credentials are never exposed in the browser bundle.

## 2:55-3:35 - Expert Capture

Open `Expert Capture`, answer the five interview prompts, and pause on the review screen before `Submit & Ingest`.

Say:

Brian AI preserves retiring expert knowledge as a searchable corpus document instead of leaving it in hallway conversations.

## 3:35-4:15 - Field PWA

Open `/field`, show:

- Camera nameplate scan input.
- Manual tag lookup.
- Voice query fallback.
- Offline answer cache.
- Sunlight Mode.

## 4:15-4:45 - Technical Readiness

Open `Settings` and show provider readiness plus the submission artifact checklist.

Call out:

- React/Vite frontend.
- FastAPI backend with REST and SSE.
- Local cached retrieval with OpenRouter upgrade path.
- Local graph with Neo4j AuraDB upgrade path.
- Railway/Vercel deployment path.

## 4:45-5:00 - Close

Say:

Brian AI is built for a real refinery pilot: connect the plant document set, enable production providers, deploy the public links, and measure search time saved, compliance gaps closed, and recurring failures prevented.
