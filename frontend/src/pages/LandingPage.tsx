import {
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  ClipboardCheck,
  FileSearch,
  GitBranch,
  ShieldCheck,
  Sparkles,
  Wrench,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useAppStore } from '@/store/appStore'

const sources = [
  ['P&IDs', FileSearch],
  ['Work orders', Wrench],
  ['Inspections', ClipboardCheck],
  ['OISD and PESO', ShieldCheck],
  ['Expert notes', Sparkles],
  ['Knowledge graph', GitBranch],
] as const

const capabilities = [
  {
    icon: FileSearch,
    title: 'Ask across plant evidence',
    body: 'Brian retrieves the records behind an answer, not just the nearest paragraph.',
  },
  {
    icon: GitBranch,
    title: 'Connect equipment history',
    body: 'Assets, incidents, regulations, and expert knowledge resolve into one traceable context.',
  },
  {
    icon: ShieldCheck,
    title: 'Act with the source attached',
    body: 'Each recommendation carries citations your operations and compliance teams can inspect.',
  },
] as const

export function LandingPage() {
  const navigate = useNavigate()
  const setWorkspace = useAppStore((state) => state.setWorkspace)

  const tryApp = () => {
    setWorkspace('demo')
    navigate('/app')
  }

  return (
    <div className="brian-home landing-shell">
      <a href="#main-content" className="sr-only fixed top-2 left-2 z-50 bg-slate-950 px-3 py-2 text-white focus:not-sr-only">
        Skip to content
      </a>

      <nav className="home-nav" aria-label="Primary navigation">
        <a className="home-brand" href="#top" aria-label="Brian AI home">
          <span><BrainCircuit size={19} aria-hidden="true" /></span>
          Brian AI
        </a>
        <div className="home-nav-links">
          <Button asChild variant="ghost" className="home-nav-link"><a href="#platform">Platform</a></Button>
          <Button asChild variant="ghost" className="home-nav-link"><a href="#impact">Impact</a></Button>
          <Button type="button" className="home-button compact" onClick={tryApp}>
            Open workspace <ArrowRight data-icon="inline-end" aria-hidden="true" />
          </Button>
        </div>
      </nav>

      <main id="main-content" tabIndex={-1} className="home-main outline-none">
        <section id="top" className="home-hero" aria-labelledby="home-title">
          <div className="home-hero-copy">
            <div className="home-eyebrow">Built for refinery teams</div>
            <h1 id="home-title">Know what happened across your refinery.</h1>
            <p>Brian connects plant records and expert knowledge, then returns evidence your team can verify and act on.</p>
            <div className="home-hero-actions">
              <Button type="button" className="home-button" onClick={tryApp}>
                Open demo <ArrowRight data-icon="inline-end" aria-hidden="true" />
              </Button>
              <Button asChild variant="outline" className="home-button secondary-light">
                <a href="#platform">See how it works</a>
              </Button>
            </div>
          </div>
          <figure className="home-hero-visual">
            <img
              src="/brand/brian-knowledge-map.webp"
              width="1400"
              height="1046"
              fetchPriority="high"
              alt="Refinery records feeding a connected knowledge core and a verified action"
            />
          </figure>
        </section>

        <section className="source-band" aria-labelledby="source-title">
          <h2 id="source-title">One memory across every plant source</h2>
          <div className="source-rail">
            {sources.map(([label, Icon]) => (
              <span key={label}><Icon size={15} aria-hidden="true" /> {label}</span>
            ))}
          </div>
        </section>

        <section id="platform" className="home-section evidence-section" aria-labelledby="evidence-title">
          <header className="home-section-heading align-left">
            <h2 id="evidence-title">From fragmented records to one verified action.</h2>
            <p>Brian combines retrieval, graph context, and deterministic checks before it presents an answer.</p>
          </header>
          <figure className="evidence-visual">
            <img
              src="/brand/brian-evidence-flow.webp"
              width="1600"
              height="900"
              loading="lazy"
              decoding="async"
              alt="Plant documents flowing through a knowledge engine into a verified maintenance action"
            />
            <figcaption>Source evidence stays visible from the first query to the final action.</figcaption>
          </figure>
        </section>

        <section className="home-section capability-section" aria-labelledby="capability-title">
          <div className="capability-intro">
            <h2 id="capability-title">Built for questions with consequences.</h2>
            <p>Operational answers must be fast, but they also need to survive review.</p>
            <Button type="button" variant="link" className="text-action" onClick={tryApp}>
              Ask Brian <ArrowRight data-icon="inline-end" aria-hidden="true" />
            </Button>
          </div>
          <div className="capability-ledger">
            {capabilities.map(({ icon: Icon, title, body }) => (
              <article key={title}>
                <Icon aria-hidden="true" />
                <div><h3>{title}</h3><p>{body}</p></div>
                <CheckCircle2 aria-label="Included" />
              </article>
            ))}
          </div>
        </section>

        <section id="impact" className="impact-band" aria-labelledby="impact-title">
          <div>
            <span>Operational impact</span>
            <h2 id="impact-title">Move from evidence search to verified action.</h2>
          </div>
          <div className="impact-stat"><strong>Faster</strong><span>incident investigation</span></div>
          <div className="impact-stat"><strong>Traceable</strong><span>answers and decisions</span></div>
          <Button type="button" className="home-button inverse" onClick={tryApp}>
            Explore demo <ArrowRight data-icon="inline-end" aria-hidden="true" />
          </Button>
        </section>

        <section className="home-final-cta">
          <BrainCircuit size={34} aria-hidden="true" />
          <h2>Put your plant knowledge to work.</h2>
          <p>Ask the question your next shift needs answered.</p>
          <Button type="button" className="home-button" onClick={tryApp}>
            Open workspace <ArrowRight data-icon="inline-end" aria-hidden="true" />
          </Button>
        </section>
      </main>

      <footer className="home-footer">
        <a className="home-brand" href="#top"><span><BrainCircuit size={17} aria-hidden="true" /></span>Brian AI</a>
        <p>Industrial knowledge intelligence for refinery teams.</p>
        <div><a href="#platform">Platform</a><a href="#impact">Impact</a></div>
      </footer>
    </div>
  )
}
