# Brian AI — Text-Only Hackathon Pitch Deck

## Slide 1 — Company Purpose

### Brian AI

**The evidence intelligence layer for industrial operations.**

Brian AI turns fragmented plant documents and expert knowledge into cited answers, compliance evidence, and early failure signals—available in the control room or in the field.

---

## Slide 2 — Problem

### Critical plant knowledge exists. It just cannot be reached when it matters.

- Operating procedures, P&IDs, work orders, inspection reports, OEM manuals, incident records, and regulatory filings live in disconnected systems.
- Engineers spend hours finding and reconciling evidence before they can act.
- Compliance gaps are often discovered during audits, not before them.
- Recurring failure patterns remain buried across maintenance history.
- Experienced operators retire, taking undocumented knowledge with them.

**Today’s alternatives—manual search, shared drives, spreadsheets, and general-purpose chatbots—either move too slowly or cannot prove their answers.**

---

## Slide 3 — Solution

### One command center. Every answer traceable to plant evidence.

Brian AI unifies industrial knowledge into six connected capabilities:

1. **AI Copilot** — answers operational questions with citations and confidence.
2. **Compliance Intelligence** — maps OISD/PESO clauses to plant evidence, gaps, and remediation.
3. **Knowledge Graph** — connects equipment, documents, incidents, and regulations.
4. **Failure Alerts** — surfaces recurring patterns before the next shutdown or incident.
5. **Field PWA** — supports tag lookup, nameplate scanning, voice queries, and offline access.
6. **Expert Capture** — converts structured interviews into searchable institutional knowledge.

**The shift: from searching for documents to acting on verified evidence.**

---

## Slide 4 — Why Now / Market

### Industrial AI is finally deployable—but trust is the adoption barrier.

- Modern language and vision models can understand technical documents and equipment imagery.
- Knowledge graphs and retrieval systems can ground AI in plant-specific context.
- Browser-based field tools make intelligence available without specialized hardware.
- Aging workforces make expert-knowledge loss urgent.
- Stricter safety and compliance expectations increase the cost of missing evidence.

**Beachhead:** refinery operations, maintenance, safety, and compliance teams.

**Expansion:** petrochemicals, power, manufacturing, mining, and other document-heavy process industries.

---

## Slide 5 — Working Prototype

### Built to prove the complete evidence-to-action loop.

The deployed prototype unifies a 20-document refinery corpus and demonstrates:

- A cited root-cause answer for the P-204B seal failure.
- Automated checks across 18 OISD/PESO clauses.
- Evidence and regulation paths across the knowledge graph.
- Proactive failure-pattern alerts.
- Mobile field lookup with offline caching and OCR/voice fallbacks.
- Expert interviews submitted back into the searchable corpus.

**Prototype impact indicators:** 3.5 hours saved per evidence search, 2 critical compliance gaps surfaced, and 3 failure patterns made actionable.

*These are prototype results on the hackathon corpus, not production customer traction.*

---

## Slide 6 — Technical Architecture

### Grounded AI, built for traceability and deployment flexibility.

- **Experience layer:** React 19, TypeScript, Vite, Tailwind CSS, shadcn/ui, and an installable field PWA.
- **API layer:** FastAPI services over REST and Server-Sent Events for streaming answers, ingestion, benchmarks, and compliance progress.
- **Knowledge ingestion:** document classification, PDF text extraction, entity extraction, chunking, and corpus registration.
- **Retrieval and generation:** cached vector retrieval, OpenRouter embeddings/generation, cited RAG responses, confidence, and document context.
- **Knowledge graph:** equipment-document-regulation relationships through a FastAPI proxy, with Neo4j AuraDB support.
- **Compliance engine:** deterministic evaluation of 18 OISD/PESO clauses with evidence, status, and remediation.
- **Field intelligence:** Gemini-compatible vision OCR with local fallbacks, browser speech recognition, and offline answer caching.
- **Deployment and controls:** Vercel frontend, Railway backend, protected write routes, server-side provider credentials, CORS controls, and persistent index storage.

---

## Slide 7 — Business Value / Right to Win

### Brian AI closes the gap between generic AI and plant-grade trust.

| Alternative | Limitation | Brian AI advantage |
|---|---|---|
| Shared drives and manual search | Slow and fragmented | One evidence layer across plant knowledge |
| General-purpose AI chat | Answers without operational proof | Citations, confidence, graph context, and compliance evidence |
| Point compliance tools | Siloed from maintenance and field work | Compliance, failures, field access, and expert knowledge in one workflow |
| Custom one-off analytics | Expensive to repeat across sites | Reusable ingestion and provider architecture |

**Business model:** annual enterprise software license per plant, plus onboarding for corpus ingestion and system integrations.

**Pilot success metrics:** time-to-evidence, cited-answer accuracy, compliance gaps closed, repeat failures prevented, and expert knowledge captured.

---

## Slide 8 — Vision / Ask

### Make every industrial decision evidence-backed.

In five years, Brian AI becomes the trusted knowledge and reasoning layer connecting every document, asset, regulation, incident, and expert across industrial operations.

**Next step:** run a refinery pilot with a real plant document set.

We are asking for:

- Access to a representative, permissioned plant corpus.
- Collaboration with operations, maintenance, and HSE subject-matter experts.
- Integration access to approved DMS and SAP exports.
- A measured pilot against search time, compliance closure, and failure-prevention KPIs.

**Brian AI: find the evidence, understand the risk, act before failure.**

---

## Optional Appendix — Team

Add one line per member:

**[Name] — [Role]:** [Most relevant experience or unfair advantage for building industrial AI].

Close with one sentence explaining why this team understands both the technology and the operating environment.

## Optional Appendix — Traction

Use this slide only when real external validation exists. Include verified items such as:

- Pilot discussions or signed design partners.
- User interviews with plant engineers or HSE teams.
- Results on a permissioned real-world corpus.
- Measured answer accuracy, adoption, or workflow time saved.

Do not present prototype corpus metrics as customer traction.
