import { AlertTriangle, CheckCircle2, FileText, Info, UploadCloud } from 'lucide-react'
import { ChangeEvent, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
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
import { api } from '../services/api'
import { useAppStore } from '../store/appStore'

const ingestSteps = ['Extracting text', 'Chunking', 'Indexing vectors', 'Extracting entities', 'Running pattern detection']
type IngestStatus = 'idle' | 'progress' | 'success' | 'error'

export function DocumentsPage() {
  const { setActiveDocumentId, workspace } = useAppStore()
  const demo = workspace === 'demo'
  const [steps, setSteps] = useState<string[]>([])
  const [library, setLibrary] = useState<DocumentMeta[]>(demo ? documents : [])
  const [message, setMessage] = useState('')
  const [ingestStatus, setIngestStatus] = useState<IngestStatus>('idle')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const ingestInFlight = useRef(false)

  useEffect(() => {
    api.documents().then(setLibrary)
  }, [workspace])

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
      setLibrary(await api.documents())
    } catch (error) {
      setIngestStatus('error')
      setMessage(error instanceof Error ? error.message : 'Backend ingest is unavailable. Check the operator key and retry.')
    } finally {
      ingestInFlight.current = false
      event.target.value = ''
    }
  }

  const ingesting = ingestStatus === 'progress'
  const uploadDisabled = demo || ingesting

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">Document Intelligence</h1>
        <p className="text-sm text-muted-foreground">{demo ? 'Explore the seeded refinery corpus. Switch to Live to upload evidence.' : 'Upload PDFs or CSVs and Brian AI updates RAG, graph links, compliance evidence, and alerts.'}</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Ingest a document</h2>
          </CardTitle>
            <CardDescription>{demo ? 'The Demo workspace is read-only.' : 'Add source material to the Live knowledge corpus.'}</CardDescription>
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
                    <EmptyTitle>{demo ? 'Demo evidence is locked' : 'Drop files or click to ingest'}</EmptyTitle>
                    <EmptyDescription>{demo ? 'Switch to Live to create an isolated evidence library.' : 'PDF, CSV, and text files supported'}</EmptyDescription>
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
