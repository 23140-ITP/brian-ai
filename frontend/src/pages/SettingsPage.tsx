import { useEffect, useState } from 'react'
import { api } from '../services/api'
import { SystemStatus } from '../services/api'
import { useAppStore } from '../store/appStore'
import { RadixSelect } from '../components/ui/radixSelect'

const judgingCriteria = [
  'Relevance and problem understanding',
  'Innovation and creativity',
  'Technical implementation',
  'Potential impact and scalability',
  'Presentation and communication',
  'Business viability'
]

const submissionArtifacts = [
  { label: 'Working prototype', value: 'Brian AI web app' },
  { label: 'Pitch deck', value: 'docs/Brian_AI_pitch_deck.pptx' },
  { label: 'Demo video script', value: 'docs/DEMO_VIDEO_SCRIPT.md' },
  { label: 'Public links checklist', value: 'docs/PUBLIC_LINKS_CHECKLIST.md' },
  { label: 'Submission runbook', value: 'docs/SUBMISSION.md' },
  { label: 'Evidence audit', value: 'docs/IMPLEMENTATION_AUDIT.md' }
]

const MODEL_OPTIONS = [
  { value: 'openai/gpt-4o-mini', label: 'GPT-4o mini' },
  { value: 'anthropic/claude-3.5-sonnet', label: 'Claude Sonnet' },
  { value: 'google/gemini-flash-1.5', label: 'Gemini Flash' }
]

export function SettingsPage() {
  const { model, setModel } = useAppStore()
  const [health, setHealth] = useState('checking')
  const [status, setStatus] = useState<SystemStatus | null>(null)

  useEffect(() => {
    api.health().then((result) => setHealth(result.status))
    api.systemStatus().then(setStatus)
  }, [])

  return (
    <div className="page settings-page">
      <section className="page-heading compact">
        <div>
          <h1>Settings</h1>
          <p>Demo configuration, model selection, and architecture status.</p>
        </div>
      </section>
      <section className="settings-grid">
        <article className="panel">
          <p>Model selection</p>
          <label htmlFor="settings-model-select">AI model</label>
          <RadixSelect
            id="settings-model-select"
            value={model}
            options={MODEL_OPTIONS}
            onValueChange={setModel}
            ariaLabel="Select AI model"
          />
        </article>
        <article className="panel">
          <p>API connection</p>
          <h2 className={health === 'ok' ? 'ok-text' : ''}>{health}</h2>
          <span>Frontend falls back to local demo data when backend services are unavailable.</span>
        </article>
        <article className="panel">
          <p>Architecture</p>
          <h2>React + FastAPI</h2>
          <span>Designed for ChromaDB, Neo4j AuraDB, OpenRouter, OCR fallback, and Railway/Vercel deployment.</span>
        </article>
        <article className="panel">
          <p>RAG provider</p>
          <h2>{status?.rag.mode || 'checking'}</h2>
          <span>{status?.rag.openrouterConfigured ? 'OpenRouter live generation enabled.' : 'Using deterministic local retrieval until OPENROUTER_API_KEY is enabled.'}</span>
        </article>
        <article className="panel">
          <p>Graph provider</p>
          <h2>{status?.graph.mode || 'checking'}</h2>
          <span>
            {status?.graph.keepAliveEnabled
              ? `Neo4j AuraDB keep-alive enabled every ${status.graph.heartbeatIntervalMinutes} minutes.`
              : status?.graph.configured
                ? 'Neo4j credentials are present; install the driver in production to enable AuraDB keep-alive.'
                : 'Local corpus graph is active; Neo4j credentials can be added without frontend changes.'}
          </span>
        </article>
        <article className="panel">
          <p>Index cache</p>
          <h2>{status ? `${status.index.cache.chunks} chunks` : 'checking'}</h2>
          <span>{status ? `${status.index.mode} across ${status.index.cache.files} corpus files.` : 'Loading index status.'}</span>
        </article>
        <article className="panel">
          <p>Field OCR</p>
          <h2>{status?.ocr?.mode || 'checking'}</h2>
          <span>
            {status?.ocr?.visionConfigured
              ? 'OpenRouter vision is configured for nameplate reads.'
              : status?.ocr?.tesseractAvailable
                ? 'Using local Tesseract OCR with deterministic tag fallback.'
                : 'Using deterministic tag extraction until OpenRouter vision is enabled.'}
          </span>
        </article>
      </section>
      {status?.readiness && (
        <section className="panel production-readiness">
          <div>
            <p>Production readiness</p>
            <h2>{status.readiness.productionReady ? 'Ready for public submission' : 'Local demo ready, deployment steps remain'}</h2>
            <span>
              {status.deployment.frontendPublicUrl && status.deployment.backendPublicUrl
                ? `${status.deployment.frontendPublicUrl} connected to ${status.deployment.backendPublicUrl}.`
                : `Environment: ${status.deployment.environment}. Public URLs are recorded after Vercel and Railway deploys.`}
            </span>
          </div>
          <div className="readiness-list">
            {status.readiness.checks.map((check) => (
              <article className={`readiness-row ${check.status}`} key={check.id}>
                <div>
                  <strong>{check.label}</strong>
                  <span>{check.detail}</span>
                </div>
                <b>{check.status}</b>
              </article>
            ))}
          </div>
        </section>
      )}
      <section className="panel submission-readiness">
        <div>
          <p>Hackathon submission readiness</p>
          <h2>Brian AI is packaged around the judging story.</h2>
          <span>Working prototype, pitch deck, demo video script, and verification evidence are tracked as first-class submission artifacts for public-link submission.</span>
        </div>
        <div className="submission-columns">
          <div>
            <strong>Judging fit</strong>
            {judgingCriteria.map((item) => <span key={item}>{item}</span>)}
          </div>
          <div>
            <strong>Artifacts</strong>
            {submissionArtifacts.map((artifact) => (
              <span key={artifact.label}><b>{artifact.label}</b> {artifact.value}</span>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
