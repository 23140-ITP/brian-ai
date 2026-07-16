import { ArrowRight, ExternalLink } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useAppStore } from '@/store/appStore'

const capabilities = [
  ['01', 'Expert Knowledge Copilot', 'Ask operational questions across procedures, work orders, inspection records, and manuals with evidence citations.'],
  ['02', 'Incident-to-Action RCA', 'Connect new incidents to equipment history, recurring failure patterns, ranked hypotheses, and accountable next actions.'],
  ['03', 'Compliance Intelligence', 'Map OISD and PESO requirements to current plant evidence, surface gaps, and prepare audit-ready remediation.'],
  ['04', 'Industrial Knowledge Graph', 'Trace relationships between assets, documents, regulations, incidents, experts, and maintenance decisions.'],
  ['05', 'Field Knowledge Capture', 'Bring equipment context to technicians and preserve expert knowledge before it leaves the organisation.'],
]

const workflow = ['Ingest', 'Extract', 'Connect', 'Reason', 'Act']

const architecture = [
  ['Ingestion boundary', 'FastAPI accepts bounded PDF, CSV, and TXT uploads, validates file types, and isolates every operation by Demo or Live workspace.'],
  ['Document processing', 'Native PDF and CSV extraction feeds paragraph chunking, document classification, and deterministic equipment-tag and regulation-entity extraction.'],
  ['Vector indexing', 'OpenRouter embeddings are written in batches to SQLite, keyed by content SHA and embedding model so unchanged chunks reuse the local vector cache.'],
  ['Hybrid retrieval', 'Cosine similarity over persisted embeddings supplies semantic matches, with lexical token retrieval available when remote embeddings are not configured. Queries can also be scoped to one source file.'],
  ['Graph projection', 'Entities and typed relationships synchronize to Neo4j Aura under a workspaceId composite constraint, connecting assets, incidents, documents, experts, and governing clauses.'],
  ['Grounded reasoning', 'Retrieved evidence is passed to a low-temperature OpenRouter completion. Deterministic compliance, recurring-failure, and impact-receipt logic remains separate from generated narrative.'],
  ['Delivery', 'The React command center and field interface deploy on Vercel, while the FastAPI service runs on Railway and streams query, ingestion, and benchmark progress.'],
]

export function LandingPage() {
  const navigate = useNavigate()
  const setWorkspace = useAppStore((state) => state.setWorkspace)

  const tryApp = () => {
    setWorkspace('demo')
    navigate('/app')
  }

  return (
    <div className="landing-light min-h-svh bg-white text-slate-950">
      <a href="#main-content" className="sr-only fixed top-2 left-2 z-50 bg-slate-950 px-3 py-2 text-white focus:not-sr-only">
        Skip to content
      </a>

      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-6 lg:px-8">
          <a href="#top" className="font-heading text-lg font-semibold">Brian AI</a>
          <nav aria-label="Website navigation" className="ml-auto hidden items-center gap-6 text-sm text-slate-600 md:flex">
            <a className="hover:text-slate-950" href="#problem">Problem</a>
            <a className="hover:text-slate-950" href="#platform">Platform</a>
            <a className="hover:text-slate-950" href="#architecture">Architecture</a>
            <a className="inline-flex items-center gap-1.5 hover:text-slate-950" href="https://github.com/23140-ITP/brian-ai" target="_blank" rel="noreferrer">
              View source <ExternalLink className="size-3.5" aria-hidden="true" />
            </a>
          </nav>
          <Button type="button" size="sm" onClick={tryApp} className="ml-auto md:ml-0">
            Try App <ArrowRight data-icon="inline-end" aria-hidden="true" />
          </Button>
        </div>
      </header>

      <main id="main-content" tabIndex={-1} className="outline-none">
        <section id="top" className="border-b border-slate-200">
          <div className="mx-auto flex min-h-[72svh] max-w-7xl flex-col justify-between px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
            <div className="max-w-4xl">
              <p className="mb-6 text-sm font-medium text-emerald-700">Industrial Knowledge Intelligence</p>
              <h1 className="font-heading text-5xl font-semibold sm:text-6xl lg:text-7xl">Brian AI</h1>
              <p className="mt-6 max-w-3xl text-xl leading-8 text-slate-600 sm:text-2xl sm:leading-9">
                Unified industrial knowledge, from evidence to action.
              </p>
              <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600">
                Brian AI connects engineering documents, maintenance history, compliance obligations, and field expertise so industrial teams can investigate faster and act with traceable evidence.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button type="button" size="lg" onClick={tryApp}>
                  Try App <ArrowRight data-icon="inline-end" aria-hidden="true" />
                </Button>
                <Button type="button" size="lg" variant="outline" asChild>
                  <a href="#architecture">See architecture</a>
                </Button>
              </div>
            </div>

          </div>
        </section>

        <section id="problem" className="border-b border-slate-200 bg-slate-50">
          <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:px-8 lg:py-24">
            <div>
              <p className="text-sm font-medium text-emerald-700">The operational gap</p>
              <h2 className="mt-3 max-w-md font-heading text-3xl font-semibold sm:text-4xl">Industrial knowledge is fragmented when decisions cannot be.</h2>
            </div>
            <div className="grid gap-8 text-base leading-7 text-slate-600 sm:grid-cols-2">
              <div>
                <h3 className="font-semibold text-slate-950">Disconnected evidence</h3>
                <p className="mt-2">Drawings, procedures, work orders, inspections, and regulatory submissions live in separate systems with no shared equipment context.</p>
              </div>
              <div>
                <h3 className="font-semibold text-slate-950">Slow investigation</h3>
                <p className="mt-2">Engineers spend critical time locating records and rebuilding history instead of resolving the operational question in front of them.</p>
              </div>
              <div>
                <h3 className="font-semibold text-slate-950">Incomplete decisions</h3>
                <p className="mt-2">Maintenance and compliance teams act without a complete view of recurring failures, current evidence, or linked requirements.</p>
              </div>
              <div>
                <h3 className="font-semibold text-slate-950">Knowledge loss</h3>
                <p className="mt-2">Experienced operators retire with practical knowledge that was never captured, structured, or connected to the assets they understood.</p>
              </div>
            </div>
          </div>
        </section>

        <section id="platform" className="border-b border-slate-200">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
            <p className="text-sm font-medium text-emerald-700">From source to decision</p>
            <h2 className="mt-3 max-w-2xl font-heading text-3xl font-semibold sm:text-4xl">One evidence chain across the industrial knowledge lifecycle.</h2>
            <ol className="mt-12 grid border-y border-slate-200 sm:grid-cols-5">
              {workflow.map((step, index) => (
                <li key={step} className="flex min-h-24 items-center justify-between border-b border-slate-200 py-5 sm:border-b-0 sm:border-r sm:px-5 sm:last:border-r-0">
                  <div>
                    <span className="text-xs tabular-nums text-slate-400">0{index + 1}</span>
                    <div className="mt-1 font-medium">{step}</div>
                  </div>
                  {index < workflow.length - 1 && <ArrowRight className="size-4 text-slate-400 sm:hidden" aria-hidden="true" />}
                </li>
              ))}
            </ol>

            <div className="mt-16 border-t border-slate-200">
              {capabilities.map(([number, title, description]) => (
                <article key={number} className="grid gap-3 border-b border-slate-200 py-7 sm:grid-cols-[4rem_1fr_1.3fr] sm:items-start">
                  <span className="text-sm tabular-nums text-slate-400">{number}</span>
                  <h3 className="font-heading text-lg font-semibold">{title}</h3>
                  <p className="max-w-2xl text-sm leading-6 text-slate-600">{description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="architecture" className="border-b border-slate-200 bg-slate-50">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
            <p className="text-sm font-medium text-emerald-700">Architecture</p>
            <h2 className="mt-3 max-w-3xl font-heading text-3xl font-semibold sm:text-4xl">A grounded RAG pipeline with graph context and workspace isolation.</h2>
            <p className="mt-5 max-w-3xl text-base leading-7 text-slate-600">
              The system keeps deterministic extraction, retrieval, graph projection, and compliance logic inspectable, then uses generation only after relevant evidence has been selected.
            </p>
            <div className="mt-12 border-t border-slate-200">
              {architecture.map(([stage, detail], index) => (
                <div key={stage} className="grid gap-3 border-b border-slate-200 py-6 sm:grid-cols-[3rem_12rem_1fr] sm:items-start">
                  <span className="text-xs tabular-nums text-slate-400">0{index + 1}</span>
                  <h3 className="font-semibold">{stage}</h3>
                  <p className="text-sm leading-6 text-slate-600">{detail}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-white">
          <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-16 sm:px-6 lg:flex-row lg:items-end lg:justify-between lg:px-8 lg:py-24">
            <div>
              <p className="text-sm font-medium text-emerald-700">See the evidence chain</p>
              <h2 className="mt-3 max-w-2xl font-heading text-3xl font-semibold sm:text-4xl">Turn fragmented records into operational context.</h2>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button type="button" size="lg" onClick={tryApp}>
                Try App <ArrowRight data-icon="inline-end" aria-hidden="true" />
              </Button>
              <Button type="button" size="lg" variant="outline" asChild>
                <a href="https://github.com/23140-ITP/brian-ai" target="_blank" rel="noreferrer">
                  View source <ExternalLink data-icon="inline-end" aria-hidden="true" />
                </a>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-7 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <span>Brian AI</span>
          <span>Industrial Knowledge Intelligence</span>
        </div>
      </footer>
    </div>
  )
}
