import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { api, getWriteToken, setWriteToken, SystemStatus } from '../services/api'
import { useAppStore } from '../store/appStore'

const judgingCriteria = [
  'Relevance and problem understanding',
  'Innovation and creativity',
  'Technical implementation',
  'Potential impact and scalability',
  'Presentation and communication',
  'Business viability'
]

const submissionArtifacts = [
  { label: 'Working prototype', value: 'Open Brian AI', href: 'https://brian-ai-app.vercel.app' },
  { label: 'Pitch deck', value: 'Open pitch deck', href: 'https://github.com/23140-ITP/brian-ai/blob/main/docs/Brian_AI_pitch_deck.pdf' },
  { label: 'Demo video script', value: 'Open recording script', href: 'https://github.com/23140-ITP/brian-ai/blob/main/docs/DEMO_VIDEO_SCRIPT.md' },
  { label: 'Public links checklist', value: 'Open checklist', href: 'https://github.com/23140-ITP/brian-ai/blob/main/docs/PUBLIC_LINKS_CHECKLIST.md' },
  { label: 'Submission runbook', value: 'Open runbook', href: 'https://github.com/23140-ITP/brian-ai/blob/main/docs/SUBMISSION.md' },
  { label: 'Evidence audit', value: 'Open audit', href: 'https://github.com/23140-ITP/brian-ai/blob/main/docs/IMPLEMENTATION_AUDIT.md' }
]

const MODEL_OPTIONS = [
  { value: 'openai/gpt-4o-mini', label: 'GPT-4o mini' },
  { value: 'anthropic/claude-3.5-sonnet', label: 'Claude Sonnet' },
  { value: 'google/gemini-flash-1.5', label: 'Gemini Flash' }
]

type StatusCardProps = {
  label: string
  value: string
  description: string
}

function StatusCard({ label, value, description }: StatusCardProps) {
  return (
    <Card className="min-h-44">
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle>{value}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  )
}

type ReadinessStatus = NonNullable<SystemStatus['readiness']>['checks'][number]['status']

function readinessBadgeVariant(status: ReadinessStatus) {
  if (status === 'missing') return 'destructive' as const
  if (status === 'ready') return 'default' as const
  return 'secondary' as const
}

export function SettingsPage() {
  const { model, setModel, workspace } = useAppStore()
  const demo = workspace === 'demo'
  const [health, setHealth] = useState('checking')
  const [status, setStatus] = useState<SystemStatus | null>(null)
  const [writeToken, setWriteTokenValue] = useState(getWriteToken)

  const refreshStatus = () => {
    setHealth('checking')
    setStatus(null)
    api.health().then((result) => setHealth(result.status))
    api.systemStatus().then(setStatus)
  }

  useEffect(() => {
    refreshStatus()
  }, [workspace])

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">{demo ? 'Demo configuration, model selection, and architecture status.' : 'Live workspace configuration and provider status.'}</p>
      </header>

      <section aria-label="System configuration" className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Card className="min-h-44">
          <CardHeader>
            <CardTitle>Model selection</CardTitle>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="settings-model-select">AI model</FieldLabel>
                <Select value={model} onValueChange={setModel}>
                  <SelectTrigger id="settings-model-select" className="w-full" aria-label="Select AI model">
                    <SelectValue placeholder="Select AI model" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {MODEL_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
            </FieldGroup>
          </CardContent>
        </Card>

        <StatusCard
          label="API connection"
          value={health}
          description="Live failures are disclosed and AI answers are never replaced silently."
        />
        <StatusCard
          label="Architecture"
          value="React + FastAPI"
          description="SQLite vector retrieval, Neo4j AuraDB, OpenRouter, OCR fallback, and Railway/Vercel deployment."
        />
        <StatusCard
          label="RAG provider"
          value={status?.rag.mode || 'checking'}
          description={status?.rag.openrouterConfigured
            ? 'OpenRouter live generation enabled.'
            : 'Using deterministic local retrieval until OPENROUTER_API_KEY is enabled.'}
        />
        <StatusCard
          label="Graph provider"
          value={status?.graph.mode || 'checking'}
          description={status?.graph.adapterActive
            ? `Neo4j is serving the graph; last sync ${status.graph.lastSyncAt || 'complete'}.`
            : status?.graph.configured
              ? `Neo4j is configured but graph sync is inactive (${status.graph.lastError || 'not synced'}).`
              : 'Local corpus graph is active until Neo4j credentials are configured.'}
        />
        <StatusCard
          label="Index cache"
          value={status ? `${status.index.cache.chunks} chunks` : 'checking'}
          description={status ? `${status.index.mode} across ${status.index.cache.files} corpus files.` : 'Loading index status.'}
        />
        <StatusCard
          label="Field OCR"
          value={status?.ocr?.mode || 'checking'}
          description={status?.ocr?.visionConfigured
            ? 'OpenRouter vision is configured for nameplate reads.'
            : status?.ocr?.tesseractAvailable
              ? `Using local Tesseract OCR${demo ? ' with deterministic tag fallback' : ''}.`
              : demo ? 'Using deterministic tag extraction until OpenRouter vision is enabled.' : 'Unreadable images return no equipment tag.'}
        />
        {!demo ? <Card className="min-h-44">
          <CardHeader>
            <CardTitle>Write access</CardTitle>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="write-access-token">Operator key</FieldLabel>
                <Input
                  id="write-access-token"
                  type="password"
                  autoComplete="off"
                  value={writeToken}
                  onChange={(event) => {
                    setWriteTokenValue(event.target.value)
                    setWriteToken(event.target.value)
                  }}
                />
                <Button type="button" variant="outline" onClick={refreshStatus}>Verify Live access</Button>
              </Field>
            </FieldGroup>
          </CardContent>
        </Card> : (
          <StatusCard label="Write access" value="Read-only" description="The Demo workspace cannot modify its seeded evidence." />
        )}
      </section>

      {status?.readiness && (
        <Card>
          <CardHeader>
            <CardDescription>Production readiness</CardDescription>
            <CardTitle>{status.readiness.productionReady ? 'Providers ready' : demo ? 'Demo ready, provider steps remain' : 'Live workspace setup remains'}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-sm leading-relaxed text-muted-foreground">
              {status.deployment.frontendPublicUrl && status.deployment.backendPublicUrl
                ? `${status.deployment.frontendPublicUrl} connected to ${status.deployment.backendPublicUrl}.`
                : `Environment: ${status.deployment.environment}. Public URLs are recorded after Vercel and Railway deploys.`}
            </p>
            <div className="grid gap-3 md:grid-cols-2">
              {status.readiness.checks.map((check) => (
                <Card key={check.id} size="sm">
                  <CardHeader>
                    <CardTitle>{check.label}</CardTitle>
                    <CardAction>
                      <Badge variant={readinessBadgeVariant(check.status)}>{check.status}</Badge>
                    </CardAction>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm leading-relaxed text-muted-foreground">{check.detail}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {demo && <Card>
        <CardHeader>
          <CardDescription>Hackathon submission readiness</CardDescription>
          <CardTitle>Brian AI is packaged around the judging story.</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm leading-relaxed text-muted-foreground">Working prototype, pitch deck, recording script, and verification evidence are tracked as first-class submission artifacts for public-link submission.</p>
          <div className="grid gap-4 md:grid-cols-2">
            <Card size="sm">
              <CardHeader>
                <CardTitle>Judging fit</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
                  {judgingCriteria.map((item) => <li key={item}>{item}</li>)}
                </ul>
              </CardContent>
            </Card>
            <Card size="sm">
              <CardHeader>
                <CardTitle>Artifacts</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="flex flex-col gap-2 text-sm">
                  {submissionArtifacts.map((artifact) => (
                    <li key={artifact.label} className="flex flex-col gap-0.5">
                      <strong className="font-medium">{artifact.label}</strong>
                      <a className="text-primary underline-offset-4 hover:underline" href={artifact.href} target="_blank" rel="noreferrer">
                        {artifact.value}
                      </a>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>}
    </div>
  )
}
