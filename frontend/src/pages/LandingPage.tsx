import {
  Activity,
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Database,
  FileSearch,
  GitBranch,
  LockKeyhole,
  Network,
  Radio,
  Server,
  ShieldCheck,
  Smartphone,
  Sparkles,
  UploadCloud,
  Wrench,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useAppStore } from '@/store/appStore'

const sources = [
  ['P&IDs', 'Drawings and asset relationships', FileSearch],
  ['Work orders', 'Maintenance history and open actions', Wrench],
  ['Inspections', 'Findings, readings, and evidence', ClipboardCheck],
  ['OISD and PESO', 'Clause-level compliance context', ShieldCheck],
  ['Expert notes', 'Operator experience made searchable', Sparkles],
  ['Knowledge graph', 'Every source connected to the asset', GitBranch],
] as const

const prototypeResults = [
  ['3.5 hrs', 'evidence-search time saved per scenario'],
  ['20/20', 'seeded benchmark checks passed'],
  ['18', 'OISD and PESO clauses evaluated'],
  ['2', 'critical compliance gaps surfaced'],
  ['3', 'recurring failure patterns made actionable'],
  ['107', 'indexed chunks across 20 files'],
] as const

const judgingProof = [
  ['Innovation', '25%', 'One evidence layer powers cited answers, failure intelligence, compliance checks, graph reasoning, field access, and expert capture.'],
  ['Business impact', '25%', 'The seeded scenario saves 3.5 hours of evidence search, surfaces two critical gaps, and makes three failure patterns actionable.'],
  ['Technical excellence', '20%', 'Hybrid retrieval, provenance, confidence scoring, entity extraction, graph traversal, streaming workflows, and deterministic fallbacks.'],
  ['Scalability', '15%', 'Provider-independent APIs, cached indexing, workspace isolation, batch processing, and an optional Neo4j adapter.'],
  ['User experience', '15%', 'A desktop command center and field PWA put source evidence beside every answer, warning, and remediation.'],
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
          <Button asChild variant="ghost" className="home-nav-link"><a href="#top">Overview</a></Button>
          <Button asChild variant="ghost" className="home-nav-link"><a href="#sources">Sources</a></Button>
          <Button asChild variant="ghost" className="home-nav-link"><a href="#platform">Platform</a></Button>
          <Button asChild variant="ghost" className="home-nav-link"><a href="#capabilities">Capabilities</a></Button>
          <Button asChild variant="ghost" className="home-nav-link"><a href="#impact">Impact</a></Button>
        </div>
        <Button type="button" className="home-button compact home-nav-cta" onClick={tryApp}>
          Open workspace <ArrowRight data-icon="inline-end" aria-hidden="true" />
        </Button>
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
                <a href="https://youtu.be/t_bUzOsV0ag" target="_blank" rel="noreferrer">Watch demo</a>
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

        <section id="sources" className="source-band" aria-labelledby="source-title">
          <header className="source-intro">
            <span>Connected inputs</span>
            <h2 id="source-title">One memory across every plant source</h2>
            <p>Brian keeps the original evidence attached while connecting every record to the work it informs.</p>
          </header>
          <div className="source-rail">
            {sources.map(([label, detail, Icon]) => (
              <div className="source-card" key={label}>
                <Icon size={20} aria-hidden="true" />
                <strong>{label}</strong>
                <span>{detail}</span>
              </div>
            ))}
          </div>
        </section>

        <section id="platform" className="home-section learns-section" aria-labelledby="learns-title">
          <header className="home-section-heading">
            <h2 id="learns-title">Brian learns while your plant works.</h2>
            <p>Every drawing, inspection, work order, and expert observation becomes usable memory with its source attached.</p>
          </header>
          <div className="knowledge-flow">
            <article>
              <span>Operations</span>
              <p><Radio size={14} aria-hidden="true" /> P-204B vibration above baseline</p>
              <p><Clock3 size={14} aria-hidden="true" /> Shift note added 12 minutes ago</p>
            </article>
            <article>
              <span>Maintenance</span>
              <p><Wrench size={14} aria-hidden="true" /> Seal replacement history linked</p>
              <p><FileSearch size={14} aria-hidden="true" /> OEM manual section matched</p>
            </article>
            <article>
              <span>Compliance</span>
              <p><ShieldCheck size={14} aria-hidden="true" /> 2 critical gaps surfaced</p>
              <p><ClipboardCheck size={14} aria-hidden="true" /> Evidence matrix refreshed</p>
            </article>
            <article>
              <span>Engineering</span>
              <p><GitBranch size={14} aria-hidden="true" /> 73 nodes connected</p>
              <p><CheckCircle2 size={14} aria-hidden="true" /> Failure pattern confirmed</p>
            </article>
            <div className="knowledge-node" aria-label="Brian unified memory"><BrainCircuit size={29} /></div>
          </div>
        </section>

        <section id="capabilities" className="home-section work-section" aria-labelledby="work-title">
          <header className="home-section-heading">
            <h2 id="work-title">Every answer, <span>one place.</span></h2>
            <p>Ask what happened, build on existing evidence, and catch problems before the next shift inherits them.</p>
          </header>

          <div className="feature-list">
            <article className="home-feature">
              <div className="feature-copy">
                <span>01</span>
                <h3>Query your plant</h3>
                <p>Ask in plain language. Brian traces the answer through incidents, manuals, work orders, and field notes before responding.</p>
                <Button type="button" variant="link" className="text-action" onClick={tryApp}>Run the evidence query <ArrowRight data-icon="inline-end" aria-hidden="true" /></Button>
              </div>
              <div className="product-canvas query-canvas">
                <div className="canvas-bar"><span><BrainCircuit size={15} aria-hidden="true" /> Brian</span><em>Evidence mode</em></div>
                <div className="message-row user-question">What caused the P-204B seal failure?</div>
                <div className="message-row brian-answer">
                  <strong>Brian</strong>
                  <p>A recurring seal degradation pattern followed elevated vibration and delayed alignment correction. Three linked records support this finding.</p>
                  <div className="citation-row"><span>Incident report</span><span>Work orders</span><span>Vibration analysis</span></div>
                </div>
              </div>
            </article>

            <article className="home-feature reverse">
              <div className="feature-copy">
                <span>02</span>
                <h3>Nothing stays siloed</h3>
                <p>Documents, equipment, regulations, and people resolve into one connected operating picture instead of separate folders.</p>
                <Button type="button" variant="link" className="text-action" onClick={tryApp}>Explore the knowledge graph <ArrowRight data-icon="inline-end" aria-hidden="true" /></Button>
              </div>
              <div className="product-canvas activity-canvas">
                <div className="canvas-bar"><span><Activity size={15} aria-hidden="true" /> Unified activity</span><em>Live</em></div>
                <div className="activity-row"><FileSearch size={17} aria-hidden="true" /><div><strong>PID-CDU-001.pdf</strong><span>Document indexed and linked</span></div><small>now</small></div>
                <div className="activity-row"><GitBranch size={17} aria-hidden="true" /><div><strong>P-204B failure chain</strong><span>47 evidence relationships</span></div><small>2m</small></div>
                <div className="activity-row"><ClipboardCheck size={17} aria-hidden="true" /><div><strong>OISD-116-4.2</strong><span>Fired Heater / Shutdown</span></div><small>8m</small></div>
              </div>
            </article>

            <article className="home-feature">
              <div className="feature-copy">
                <span>03</span>
                <h3>It flags the next problem</h3>
                <p>Brian connects recurring symptoms across years of plant history and puts the supporting evidence beside the alert.</p>
                <Button type="button" variant="link" className="text-action" onClick={tryApp}>Open the evidence matrix <ArrowRight data-icon="inline-end" aria-hidden="true" /></Button>
              </div>
              <div className="product-canvas alert-canvas">
                <div className="canvas-bar"><span><Radio size={15} aria-hidden="true" /> Open loops</span><em>3 active</em></div>
                <div className="priority-alert">
                  <span>High priority</span>
                  <strong>P-204B: Recurring seal degradation pattern</strong>
                  <p>Evidence links the current vibration signature to two previous seal failures and an overdue alignment action.</p>
                </div>
                <div className="alert-task"><CheckCircle2 size={16} aria-hidden="true" /><span>Review vibration trend before next shift</span></div>
                <div className="alert-task"><CheckCircle2 size={16} aria-hidden="true" /><span>Attach missing PSV test certificate</span></div>
              </div>
            </article>
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

        <section className="home-section proof-section" aria-labelledby="proof-title">
          <header className="home-section-heading">
            <span>Measured prototype results</span>
            <h2 id="proof-title">Evidence a judge can verify.</h2>
            <p>Every result below comes from Brian AI's seeded refinery corpus and repeatable evaluation suite.</p>
          </header>
          <div className="proof-grid">
            {prototypeResults.map(([value, label]) => (
              <article key={label}><strong>{value}</strong><span>{label}</span></article>
            ))}
          </div>
          <p className="prototype-note">Prototype indicators, not customer traction or production claims.</p>
        </section>

        <section className="home-section flagship-section" aria-labelledby="flagship-title">
          <header className="home-section-heading">
            <span>Evidence to action</span>
            <h2 id="flagship-title">Three workflows. One connected memory.</h2>
            <p>The same source evidence moves from investigation to compliance and stays current when a new document arrives.</p>
          </header>
          <div className="flagship-grid">
            <article>
              <div><BrainCircuit size={22} aria-hidden="true" /><span>Root-cause intelligence</span></div>
              <h3>Explain the failure, with receipts.</h3>
              <p>Brian links incident reports, vibration analysis, work orders, and OEM guidance before returning a cited hypothesis with confidence.</p>
              <Button type="button" variant="link" className="text-action" onClick={() => navigate('/copilot')}>Ask about P-204B <ArrowRight data-icon="inline-end" aria-hidden="true" /></Button>
            </article>
            <article>
              <div><ShieldCheck size={22} aria-hidden="true" /><span>Compliance intelligence</span></div>
              <h3>Turn clauses into an evidence matrix.</h3>
              <p>Each finding keeps the regulation text, matched plant evidence, status, confidence, and reviewer-ready remediation together.</p>
              <Button type="button" variant="link" className="text-action" onClick={() => navigate('/compliance')}>Inspect OISD-116-4.2 <ArrowRight data-icon="inline-end" aria-hidden="true" /></Button>
            </article>
            <article>
              <div><UploadCloud size={22} aria-hidden="true" /><span>Document impact receipt</span></div>
              <h3>Upload once. See what changed.</h3>
              <p>New evidence produces extracted facts, graph links, alerts, compliance impacts, RCA hypotheses, and source provenance.</p>
              <Button type="button" variant="link" className="text-action" onClick={() => navigate('/documents')}>View document intelligence <ArrowRight data-icon="inline-end" aria-hidden="true" /></Button>
            </article>
          </div>
        </section>

        <section className="home-section architecture-section" aria-labelledby="architecture-title">
          <div className="architecture-copy">
            <span>Technical architecture</span>
            <h2 id="architecture-title">One pipeline from plant file to verified action.</h2>
            <p>The browser talks to a normalized FastAPI layer. Retrieval, graph, compliance, OCR, and provider fallbacks remain replaceable behind one contract.</p>
            <Button asChild variant="outline" className="home-button secondary-light"><a href="https://github.com/23140-ITP/brian-ai/blob/main/brian-ai-technical-architecture.png" target="_blank" rel="noreferrer">View full architecture</a></Button>
          </div>
          <div className="pipeline" aria-label="Brian AI evidence-to-action pipeline">
            <div><FileSearch size={20} /><strong>Plant sources</strong><span>PDF, CSV, TXT, scans, expert notes</span></div>
            <ArrowRight aria-hidden="true" />
            <div><Database size={20} /><strong>Knowledge layer</strong><span>OCR, extraction, index, graph</span></div>
            <ArrowRight aria-hidden="true" />
            <div><Server size={20} /><strong>Reasoning services</strong><span>RAG, compliance, patterns, impact</span></div>
            <ArrowRight aria-hidden="true" />
            <div><CheckCircle2 size={20} /><strong>Verified action</strong><span>Citations, confidence, remediation</span></div>
          </div>
        </section>

        <section className="home-section field-capture-section" aria-labelledby="field-capture-title">
          <header className="home-section-heading">
            <span>Across every shift</span>
            <h2 id="field-capture-title">Knowledge at the asset. Knowledge that does not retire.</h2>
          </header>
          <div className="field-capture-grid">
            <article>
              <Smartphone size={25} aria-hidden="true" />
              <h3>Field-ready intelligence</h3>
              <p>Manual equipment lookup, camera nameplate capture, voice fallback, offline answer history, and a sunlight mode built for technicians.</p>
              <Button type="button" variant="link" className="text-action" onClick={() => navigate('/field')}>Open field mode <ArrowRight data-icon="inline-end" aria-hidden="true" /></Button>
            </article>
            <article>
              <Sparkles size={25} aria-hidden="true" />
              <h3>Expert knowledge capture</h3>
              <p>A five-question interview, human review, structured ingestion, and automatic graph refresh preserve experience before it leaves the plant.</p>
              <Button type="button" variant="link" className="text-action" onClick={() => navigate('/capture')}>Capture expert knowledge <ArrowRight data-icon="inline-end" aria-hidden="true" /></Button>
            </article>
          </div>
        </section>

        <section className="home-section judging-section" aria-labelledby="judging-title">
          <header className="home-section-heading">
            <span>Why Brian AI is different</span>
            <h2 id="judging-title">Built against the complete judging rubric.</h2>
          </header>
          <div className="judging-grid">
            {judgingProof.map(([criterion, weight, proof]) => (
              <article key={criterion}><div><strong>{criterion}</strong><span>{weight}</span></div><p>{proof}</p></article>
            ))}
          </div>
        </section>

        <section className="home-section trust-section" aria-labelledby="trust-title">
          <div>
            <span>Scale and trust</span>
            <h2 id="trust-title">Designed to grow without hiding uncertainty.</h2>
            <p>Brian separates evidence from hypotheses and keeps every operational claim traceable to its source.</p>
          </div>
          <div className="trust-grid">
            <p><LockKeyhole size={18} /><span><strong>Isolated workspaces</strong> Demo remains read-only while protected Live writes require a server-validated token.</span></p>
            <p><Network size={18} /><span><strong>Replaceable providers</strong> Local and hosted retrieval or graph services share the same API contracts.</span></p>
            <p><Database size={18} /><span><strong>Efficient indexing</strong> Content hashes prevent duplicate embedding work and batch processing controls load.</span></p>
            <p><CheckCircle2 size={18} /><span><strong>Visible provenance</strong> Citations, confidence, clause evidence, and remediation stay attached to decisions.</span></p>
          </div>
        </section>

        <section className="submission-links" aria-labelledby="submission-title">
          <div><span>Submission assets</span><h2 id="submission-title">See the complete case for Brian AI.</h2></div>
          <div>
            <Button asChild className="home-button"><a href="https://youtu.be/t_bUzOsV0ag" target="_blank" rel="noreferrer">Watch demo</a></Button>
            <Button asChild variant="outline" className="home-button secondary-light"><a href="https://github.com/23140-ITP/brian-ai/blob/main/brian-ai-technical-architecture.png" target="_blank" rel="noreferrer">Architecture</a></Button>
            <Button asChild variant="outline" className="home-button secondary-light"><a href="https://github.com/23140-ITP/brian-ai/blob/main/docs/Brian_AI_pitch_deck.pdf" target="_blank" rel="noreferrer">Pitch deck</a></Button>
            <Button asChild variant="outline" className="home-button secondary-light"><a href="https://github.com/23140-ITP/brian-ai" target="_blank" rel="noreferrer">Repository</a></Button>
          </div>
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
