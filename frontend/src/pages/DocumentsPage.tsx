import { AlertTriangle, CheckCircle2, Eye, FileText, GitBranch, Info, LoaderCircle, SearchCheck, ShieldCheck, UploadCloud, Wrench } from 'lucide-react'
import { ChangeEvent, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle
} from '@/components/ui/empty'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { DocumentMeta, documents } from '../data/mock'
import { api, ImpactReceipt } from '../services/api'
import { useAppStore } from '../store/appStore'

const ingestSteps = ['Extracting text', 'Chunking', 'Indexing vectors', 'Extracting entities', 'Running pattern detection']
type IngestStatus = 'idle' | 'progress' | 'success' | 'error'

export function DocumentsPage() {
  const { setActiveDocumentId, setCopilotDraftQuery, workspace } = useAppStore()
  const demo = workspace === 'demo'
  const [steps, setSteps] = useState<string[]>([])
  const [library, setLibrary] = useState<DocumentMeta[]>(demo ? documents : [])
  const [message, setMessage] = useState('')
  const [ingestStatus, setIngestStatus] = useState<IngestStatus>('idle')
  const [receipt, setReceipt] = useState<ImpactReceipt | null>(null)
  const [receiptLoading, setReceiptLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const ingestInFlight = useRef(false)

  useEffect(() => {
    setReceipt(null)
    api.documents().then(setLibrary)
  }, [workspace])

  const inspectReceipt = async (filename: string) => {
    setReceiptLoading(true)
    try {
      setReceipt(await api.impactReceipt(filename))
    } catch (error) {
      setIngestStatus('error')
      setMessage(error instanceof Error ? error.message : 'Impact analysis is unavailable.')
    } finally {
      setReceiptLoading(false)
    }
  }

  const ingest = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (ingestInFlight.current) {
      event.target.value = ''
      return
    }
    ingestInFlight.current = true
    setSteps([])
    setIngestStatus('progress')
    setMessage(`Uploading ${file.name}...`)
    try {
      const result = await api.ingestDocument(file, ({ current, total, step }) => {
        setSteps((currentSteps) => currentSteps.includes(step) ? currentSteps : [...currentSteps, step])
        setMessage(`Ingesting ${file.name}: ${current}/${total} ${step}`)
      })
      setSteps(ingestSteps)
      setIngestStatus('success')
      setMessage(`Ingested ${result.doc_id}: ${result.chunks} chunks, ${result.entities} entities, ${result.alerts_triggered} alert.`)
      setReceipt(result.impact_receipt)
      if (demo) {
        setLibrary((current) => [{ id: `demo-${file.name}`, filename: file.name, docType: result.impact_receipt.document.docType, chunks: result.chunks, ingestedAt: result.ingested_at || '2026-07-22' }, ...current])
      } else {
        setLibrary(await api.documents())
      }
    } catch (error) {
      setIngestStatus('error')
      setMessage(error instanceof Error ? error.message : 'Backend ingest is unavailable. Check the operator key and retry.')
    } finally {
      ingestInFlight.current = false
      event.target.value = ''
    }
  }

  const ingesting = ingestStatus === 'progress'
  const uploadDisabled = ingesting

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">Document Intelligence</h1>
        <p className="text-sm text-muted-foreground">{demo ? 'Explore the seeded refinery corpus and simulate document ingestion locally.' : 'Upload PDFs or CSVs and Brian AI updates RAG, graph links, compliance evidence, and alerts.'}</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Ingest a document</h2>
          </CardTitle>
            <CardDescription>{demo ? 'Uploads produce a local, hard-coded impact response without changing live data.' : 'Add source material to the Live knowledge corpus.'}</CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field>
              <FieldLabel
                htmlFor="document-ingest"
                role="button"
                tabIndex={uploadDisabled ? -1 : 0}
                aria-disabled={uploadDisabled}
                aria-controls="document-ingest"
                className="block w-full cursor-pointer rounded-lg transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 aria-disabled:cursor-not-allowed aria-disabled:opacity-60"
                onClick={(event) => {
                  if (uploadDisabled) event.preventDefault()
                }}
                onKeyDown={(event) => {
                  if (!uploadDisabled && (event.key === 'Enter' || event.key === ' ')) {
                    event.preventDefault()
                    fileInputRef.current?.click()
                  }
                }}
              >
                <Empty className="border">
                  <EmptyHeader>
                    <EmptyMedia variant="icon"><UploadCloud /></EmptyMedia>
                    <EmptyTitle>Drop files or click to ingest</EmptyTitle>
                    <EmptyDescription>{demo ? 'PDF, CSV, and text files return a simulated Demo result' : 'PDF, CSV, and text files supported'}</EmptyDescription>
                  </EmptyHeader>
                </Empty>
              </FieldLabel>
              <Input
                ref={fileInputRef}
                id="document-ingest"
                type="file"
                accept=".pdf,.csv,.txt"
                onChange={ingest}
                disabled={uploadDisabled}
                className="hidden"
                tabIndex={-1}
                aria-label="Upload document for ingestion"
              />
            </Field>
          </FieldGroup>
          {demo && (
            <div className="mt-4 flex justify-center">
              <Button
                type="button"
                variant="outline"
                onClick={() => inspectReceipt('Incident-2023-07-15-P204B-Seal-Failure.pdf')}
                disabled={receiptLoading}
              >
                {receiptLoading ? <LoaderCircle data-icon="inline-start" className="animate-spin" /> : <Eye data-icon="inline-start" />}
                {receiptLoading ? 'Building receipt' : 'Inspect sample impact receipt'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {steps.length > 0 && (
        <Card size="sm" aria-live="polite">
          <CardHeader>
            <CardTitle>
              <h2>Ingestion pipeline</h2>
            </CardTitle>
            <CardDescription>{steps.length} of {ingestSteps.length} processing stages complete.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Progress
              value={(steps.length / ingestSteps.length) * 100}
              aria-label={`${steps.length} of ${ingestSteps.length} document ingestion stages complete`}
            />
            <div className="flex flex-wrap gap-2">
              {ingestSteps.map((step) => (
                <Badge key={step} variant={steps.includes(step) ? 'secondary' : 'outline'}>
                  {steps.includes(step) && <CheckCircle2 data-icon="inline-start" />}
                  {step}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {message && (
        <Alert variant={ingestStatus === 'error' ? 'destructive' : 'default'} aria-live="polite">
          {ingestStatus === 'error' ? <AlertTriangle /> : <Info />}
          <AlertTitle>Document ingest</AlertTitle>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}

      {receipt && (
        <Card aria-labelledby="impact-receipt-heading">
          <CardHeader>
            <CardTitle>
              <h2 id="impact-receipt-heading">Incident-to-action receipt</h2>
            </CardTitle>
            <CardDescription>{receipt.document.filename} - {receipt.provenance.method}</CardDescription>
            <CardAction><Badge variant="secondary">Evidence backed</Badge></CardAction>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border bg-border lg:grid-cols-4">
              {[
                { label: 'Entities', value: receipt.entities.length, Icon: SearchCheck },
                { label: 'Graph links', value: receipt.graphChanges.relationshipsAdded, Icon: GitBranch },
                { label: 'Related sources', value: receipt.provenance.relatedSources.length, Icon: FileText },
                { label: 'Compliance impacts', value: receipt.complianceImpacts.length, Icon: ShieldCheck }
              ].map(({ label, value, Icon }) => (
                <div key={label} className="bg-background px-3 py-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground"><Icon className="size-4" />{label}</div>
                  <div className="mt-1 font-heading text-xl font-semibold tabular-nums">{value}</div>
                </div>
              ))}
            </div>

            <section className="grid gap-3" aria-labelledby="verified-facts-heading">
              <div>
                <h3 id="verified-facts-heading" className="font-heading text-sm font-semibold">Verified facts</h3>
                <p className="text-xs text-muted-foreground">Directly extracted from the selected evidence.</p>
              </div>
              {receipt.facts.length ? (
                <ul className="grid gap-2 text-sm">
                  {receipt.facts.map((fact) => <li key={fact} className="border-l-2 border-primary pl-3">{fact}</li>)}
                </ul>
              ) : <p className="text-sm text-muted-foreground">No explicit failure fact was extracted. Review the source before drawing conclusions.</p>}
            </section>

            <section className="grid gap-3" aria-labelledby="rca-heading">
              <div>
                <h3 id="rca-heading" className="font-heading text-sm font-semibold">RCA hypotheses</h3>
                <p className="text-xs text-muted-foreground">Ranked inferences, kept separate from extracted facts.</p>
              </div>
              <div className="divide-y rounded-lg border">
                {receipt.rca.hypotheses.map((hypothesis) => (
                  <div key={hypothesis.title} className="grid gap-2 p-3 md:grid-cols-[1fr_auto]">
                    <div className="min-w-0">
                      <div className="font-medium">{hypothesis.title}</div>
                      <p className="mt-1 text-sm text-muted-foreground">{hypothesis.basis}</p>
                      <p className="mt-1 break-words text-xs text-muted-foreground">Evidence: {hypothesis.evidence.join(', ')}</p>
                    </div>
                    <Badge variant={hypothesis.classification === 'insufficient-evidence' ? 'outline' : 'secondary'} className="h-fit">
                      {Math.round(hypothesis.confidence * 100)}% confidence
                    </Badge>
                  </div>
                ))}
              </div>
            </section>

            <section className="grid gap-3" aria-labelledby="timeline-heading">
              <div>
                <h3 id="timeline-heading" className="font-heading text-sm font-semibold">Cross-document evidence timeline</h3>
                <p className="text-xs text-muted-foreground">The new source is compared with related operational history.</p>
              </div>
              <div className="grid gap-3">
                {receipt.rca.timeline.map((item, index) => (
                  <div key={`${item.filename}-${index}`} className="grid grid-cols-[auto_1fr] gap-3">
                    <div className="mt-1 size-2 rounded-full bg-primary" aria-hidden="true" />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
                        <span className="break-all">{item.filename}</span>
                        {item.isNewEvidence && <Badge variant="secondary">New evidence</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground">{item.excerpt}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="grid gap-3" aria-labelledby="impact-heading">
              <div>
                <h3 id="impact-heading" className="font-heading text-sm font-semibold">Compliance and failure impact</h3>
                <p className="text-xs text-muted-foreground">Affected controls and recurring patterns derived from the same evidence.</p>
              </div>
              <div className="divide-y rounded-lg border">
                {receipt.complianceImpacts.map((row) => (
                  <div key={row.clauseId} className="flex flex-col gap-2 p-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="font-medium">{row.clauseId} - {row.title}</div>
                      <p className="text-sm text-muted-foreground">{row.remediation}</p>
                    </div>
                    <Badge variant={row.status === 'NON_COMPLIANT' ? 'destructive' : 'outline'}>{row.status.replace('_', ' ')}</Badge>
                  </div>
                ))}
                {receipt.alerts.map((alert) => (
                  <div key={alert.id} className="flex flex-col gap-2 p-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="font-medium">{alert.tag} recurring pattern</div>
                      <p className="text-sm text-muted-foreground">{alert.message}</p>
                    </div>
                    <Badge variant={alert.severity === 'HIGH' ? 'destructive' : 'outline'}>{alert.severity}</Badge>
                  </div>
                ))}
                {!receipt.complianceImpacts.length && !receipt.alerts.length && (
                  <p className="p-3 text-sm text-muted-foreground">No direct compliance gap or recurring failure alert was linked. This is not a compliance clearance.</p>
                )}
              </div>
            </section>

            <section className="grid gap-3" aria-labelledby="actions-heading">
              <div>
                <h3 id="actions-heading" className="font-heading text-sm font-semibold">Recommended actions</h3>
                <p className="text-xs text-muted-foreground">Human approval remains required before operational execution.</p>
              </div>
              <ol className="grid gap-2 text-sm">
                {receipt.recommendedActions.map((action, index) => (
                  <li key={action} className="grid grid-cols-[auto_1fr] gap-2">
                    <span className="font-medium tabular-nums text-muted-foreground">{index + 1}.</span>
                    <span>{action}</span>
                  </li>
                ))}
              </ol>
              <div className="flex flex-wrap gap-2 pt-1">
                {receipt.questionsUnlocked.map((question) => (
                  <Button key={question} type="button" variant="outline" asChild>
                    <Link
                      to="/copilot"
                      onClick={() => {
                        setActiveDocumentId(library.find((doc) => doc.filename === receipt.document.filename)?.id || null)
                        setCopilotDraftQuery(question)
                      }}
                    >
                      <Wrench data-icon="inline-start" />
                      Investigate in Copilot
                    </Link>
                  </Button>
                ))}
              </div>
            </section>
          </CardContent>
        </Card>
      )}

      <section className="flex flex-col gap-4" aria-labelledby="document-library-heading">
        <div className="flex flex-col gap-1">
          <h2 id="document-library-heading" className="font-heading text-lg font-medium">Document library</h2>
          <p className="text-sm text-muted-foreground">Open an ingested source in Copilot for grounded analysis.</p>
        </div>
        {library.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {library.map((doc) => (
              <Link
                key={doc.id}
                to="/copilot"
                className="block h-full rounded-xl outline-none transition-shadow hover:ring-1 hover:ring-border focus-visible:ring-3 focus-visible:ring-ring/50"
                aria-label={`Open ${doc.filename} in Copilot`}
                onClick={() => setActiveDocumentId(doc.id)}
              >
                <Card className="h-full">
                  <CardHeader>
                    <CardTitle>
                      <h3 className="break-words">{doc.filename}</h3>
                    </CardTitle>
                    <CardDescription>{doc.chunks} chunks - ingested {doc.ingestedAt}</CardDescription>
                    <CardAction>
                      <Badge variant="outline">{doc.docType}</Badge>
                    </CardAction>
                  </CardHeader>
                  <CardFooter>
                    <span className="text-sm text-muted-foreground">Open in Copilot</span>
                  </CardFooter>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <Empty className="border">
            <EmptyHeader>
              <EmptyMedia variant="icon"><FileText /></EmptyMedia>
              <EmptyTitle>No documents found</EmptyTitle>
              <EmptyDescription>Upload a PDF or CSV to begin building the document library.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </section>
    </div>
  )
}
