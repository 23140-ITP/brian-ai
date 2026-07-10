import { ArrowLeft, Camera, Download, Mic, Sun } from 'lucide-react'
import { ChangeEvent, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import { Empty, EmptyHeader, EmptyTitle } from '@/components/ui/empty'
import { Field, FieldGroup, FieldLabel, FieldTitle } from '@/components/ui/field'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput
} from '@/components/ui/input-group'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import { api } from '../services/api'
import { useAppStore } from '../store/appStore'

type BrowserSpeechRecognition = {
  lang: string
  interimResults: boolean
  maxAlternatives: number
  start: () => void
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onerror: (() => void) | null
  onend: (() => void) | null
}

type SpeechRecognitionEventLike = {
  results: ArrayLike<ArrayLike<{ transcript: string }>>
}

type SpeechRecognitionConstructor = new () => BrowserSpeechRecognition

type SpeechRecognitionWindow = Window & {
  SpeechRecognition?: SpeechRecognitionConstructor
  webkitSpeechRecognition?: SpeechRecognitionConstructor
}

type FieldAnswerCacheEntry = {
  id: string
  tag: string
  answer: string
  savedAt: string
}

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

const FIELD_CACHE_KEY = 'brian-ai-field-answer-history-v1'
const LEGACY_FIELD_CACHE_KEY = 'brian-ai-last-field-answer'
const MAX_FIELD_CACHE_ENTRIES = 5

function isFieldAnswerCacheEntry(value: unknown): value is FieldAnswerCacheEntry {
  if (!value || typeof value !== 'object') return false
  const record = value as Record<string, unknown>
  return typeof record.id === 'string'
    && typeof record.tag === 'string'
    && typeof record.answer === 'string'
    && typeof record.savedAt === 'string'
}

function loadCachedFieldAnswers(): FieldAnswerCacheEntry[] {
  try {
    const raw = localStorage.getItem(FIELD_CACHE_KEY)
    if (raw) {
      const parsed: unknown = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        return parsed.filter(isFieldAnswerCacheEntry).slice(0, MAX_FIELD_CACHE_ENTRIES)
      }
    }
    const legacyAnswer = localStorage.getItem(LEGACY_FIELD_CACHE_KEY)
    return legacyAnswer
      ? [{ id: 'legacy-field-answer', tag: 'Cached', answer: legacyAnswer, savedAt: new Date().toISOString() }]
      : []
  } catch {
    return []
  }
}

export function FieldPage() {
  const { sunlightMode, setSunlightMode } = useAppStore()
  const [tag, setTag] = useState('P-204B')
  const [manualTag, setManualTag] = useState('P-204B')
  const [answer, setAnswer] = useState('Last answers are cached for offline field reference.')
  const [busy, setBusy] = useState(false)
  const [voiceStatus, setVoiceStatus] = useState('Voice query uses browser speech recognition when available.')
  const [cachedAnswers, setCachedAnswers] = useState<FieldAnswerCacheEntry[]>(loadCachedFieldAnswers)
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [installStatus, setInstallStatus] = useState('Offline shell ready after first load.')
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', sunlightMode ? '#ffffff' : '#0f172a')
  }, [sunlightMode])

  useEffect(() => {
    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()
      setInstallPrompt(event as BeforeInstallPromptEvent)
      setInstallStatus('Install prompt ready for this device.')
    }
    const onAppInstalled = () => {
      setInstallPrompt(null)
      setInstallStatus('Brian AI Field is installed on this device.')
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    window.addEventListener('appinstalled', onAppInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
      window.removeEventListener('appinstalled', onAppInstalled)
    }
  }, [])

  const installFieldApp = async () => {
    if (!installPrompt) return
    await installPrompt.prompt()
    const choice = await installPrompt.userChoice
    setInstallPrompt(null)
    setInstallStatus(choice.outcome === 'accepted' ? 'Install accepted. Brian AI Field is available from the device launcher.' : 'Install dismissed. You can continue using Field Mode in the browser.')
  }

  const cacheFieldAnswer = (equipmentTag: string, nextAnswer: string) => {
    const entry = {
      id: `${Date.now()}-${equipmentTag}`,
      tag: equipmentTag,
      answer: nextAnswer,
      savedAt: new Date().toISOString()
    }
    setCachedAnswers((current) => {
      const next = [entry, ...current.filter((item) => item.answer !== nextAnswer)].slice(0, MAX_FIELD_CACHE_ENTRIES)
      try {
        localStorage.setItem(FIELD_CACHE_KEY, JSON.stringify(next))
        localStorage.setItem(LEGACY_FIELD_CACHE_KEY, nextAnswer)
      } catch {
        // Keep the in-memory cache usable when storage is unavailable or full.
      }
      return next
    })
  }

  const queryTag = async (equipmentTag: string, lead: string) => {
    const result = await api.ask(`${lead} ${equipmentTag} current risk and next action`, 'openai/gpt-4o-mini')
    setAnswer(result.answer)
    cacheFieldAnswer(equipmentTag, result.answer)
  }

  const scan = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    setBusy(true)
    try {
      const ocr = await api.ocrNameplate(file)
      const detectedTag = ocr.tag || 'P-204B'
      setTag(detectedTag)
      setManualTag(detectedTag)
      const result = await api.ask(`Field scan ${detectedTag} current risk and next action`, 'openai/gpt-4o-mini')
      const fieldAnswer = `OCR confidence ${(ocr.confidence * 100).toFixed(0)}%. ${result.answer}`
      setAnswer(fieldAnswer)
      cacheFieldAnswer(detectedTag, fieldAnswer)
    } catch {
      const fallback = cachedAnswers[0]?.answer || localStorage.getItem(LEGACY_FIELD_CACHE_KEY) || 'Unable to read the nameplate. Use manual tag search or retry with a clearer frame.'
      setAnswer(fallback)
    } finally {
      setBusy(false)
      event.target.value = ''
    }
  }

  const runVoiceTranscript = async (transcript: string) => {
    const spokenQuery = transcript.trim()
    if (!spokenQuery) {
      setVoiceStatus('No speech was captured. Try again or use manual lookup.')
      return
    }
    setBusy(true)
    setVoiceStatus(`Heard: "${spokenQuery}"`)
    try {
      await queryTag(tag, `Voice query: ${spokenQuery}. Use equipment context for`)
    } finally {
      setBusy(false)
    }
  }

  const runDefaultVoiceQuery = async (status: string) => {
    setVoiceStatus(status)
    setBusy(true)
    try {
      await queryTag(tag, 'Voice fallback: show safe restart steps and immediate risks for')
    } finally {
      setBusy(false)
    }
  }

  const voiceQuery = async () => {
    const SpeechRecognition = (window as SpeechRecognitionWindow).SpeechRecognition || (window as SpeechRecognitionWindow).webkitSpeechRecognition
    if (!SpeechRecognition) {
      await runDefaultVoiceQuery('Speech recognition is unavailable in this browser. Running the default field voice query.')
      return
    }

    const recognition = new SpeechRecognition()
    let fallbackStarted = false
    recognition.lang = 'en-IN'
    recognition.interimResults = false
    recognition.maxAlternatives = 1
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript || ''
      void runVoiceTranscript(transcript)
    }
    recognition.onerror = () => {
      fallbackStarted = true
      void runDefaultVoiceQuery('Speech capture failed. Running the default field voice query.')
    }
    recognition.onend = () => {
      if (!fallbackStarted) setBusy(false)
    }
    setBusy(true)
    setVoiceStatus('Listening for the field query...')
    try {
      recognition.start()
    } catch {
      await runDefaultVoiceQuery('Speech capture could not start. Running the default field voice query.')
    }
  }

  const manualQuery = async () => {
    const nextTag = manualTag.trim().toUpperCase()
    if (!nextTag) return
    setBusy(true)
    setTag(nextTag)
    try {
      await queryTag(nextTag, 'Manual field lookup')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className={cn(
      'min-h-screen bg-background p-4 text-foreground sm:p-6 lg:p-8',
      sunlightMode && 'sunlight-mode'
    )}>
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
        <header className="flex flex-col gap-4 rounded-xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-2">
            <Button asChild type="button" variant="ghost" size="icon" aria-label="Back to Command Center">
              <Link to="/">
                <ArrowLeft />
              </Link>
            </Button>
            <h1 className="min-w-0 text-xl font-semibold tracking-tight">Brian AI Field - {tag}</h1>
          </div>
          <div className="flex flex-col gap-3 sm:items-end">
            {installPrompt && (
              <Button type="button" variant="outline" onClick={installFieldApp}>
                <Download data-icon="inline-start" />
                Install Field PWA
              </Button>
            )}
            <Field orientation="horizontal" className="w-auto">
              <FieldLabel htmlFor="sunlight-mode-switch">
                <Sun aria-hidden="true" />
                Sunlight Mode
              </FieldLabel>
              <Switch
                id="sunlight-mode-switch"
                checked={sunlightMode}
                onCheckedChange={setSunlightMode}
                aria-label="Toggle sunlight mode"
              />
            </Field>
          </div>
        </header>

        <Alert aria-live="polite">
          <Download aria-hidden="true" />
          <AlertTitle>Field app status</AlertTitle>
          <AlertDescription>{installStatus}</AlertDescription>
        </Alert>

        <Card className="min-h-[42vh] justify-center">
          <CardHeader className="items-center text-center">
            <CardTitle>Equipment tag</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center">
            <p className="max-w-full break-words text-center text-5xl font-bold tracking-tight sm:text-7xl lg:text-8xl">{tag}</p>
          </CardContent>
          <CardFooter className="justify-center">
            <p className="text-center text-sm text-muted-foreground" aria-live="polite">
              {busy ? 'Reading nameplate and querying documents...' : 'Camera OCR ready'}
            </p>
          </CardFooter>
        </Card>

        <FieldGroup className="gap-3 sm:flex-row">
          <Field>
            <FieldLabel htmlFor="field-nameplate-upload" className="sr-only">Upload nameplate image</FieldLabel>
            <Input
              ref={fileInputRef}
              id="field-nameplate-upload"
              type="file"
              accept="image/*"
              capture="environment"
              onChange={scan}
              className="hidden"
            />
            <Button
              type="button"
              size="lg"
              className="w-full"
              onClick={() => fileInputRef.current?.click()}
              disabled={busy}
            >
              <Camera data-icon="inline-start" />
              Scan Nameplate
            </Button>
          </Field>
          <Field>
            <FieldTitle className="sr-only">Voice query</FieldTitle>
            <Button type="button" size="lg" className="w-full" onClick={voiceQuery} disabled={busy}>
              <Mic data-icon="inline-start" />
              Voice Query
            </Button>
          </Field>
        </FieldGroup>

        <Alert aria-live="polite">
          <Mic aria-hidden="true" />
          <AlertTitle>Voice query</AlertTitle>
          <AlertDescription>{voiceStatus}</AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle>Manual equipment tag</CardTitle>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="manual-equipment-tag" className="sr-only">Manual equipment tag</FieldLabel>
                <InputGroup>
                  <InputGroupInput
                    id="manual-equipment-tag"
                    aria-label="Manual equipment tag"
                    value={manualTag}
                    onChange={(event) => setManualTag(event.target.value)}
                    placeholder="Type tag manually"
                  />
                  <InputGroupAddon align="inline-end">
                    <InputGroupButton variant="secondary" size="sm" onClick={manualQuery} disabled={busy}>Lookup</InputGroupButton>
                  </InputGroupAddon>
                </InputGroup>
              </Field>
            </FieldGroup>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Answer</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="leading-relaxed text-muted-foreground" aria-live="polite">{answer}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Offline answer cache</CardTitle>
            <CardAction>
              <Badge variant="secondary">{cachedAnswers.length}/5 saved</Badge>
            </CardAction>
          </CardHeader>
          <CardContent>
            {cachedAnswers.length === 0 ? (
              <Empty>
                <EmptyHeader>
                  <EmptyTitle>No field answers cached yet.</EmptyTitle>
                </EmptyHeader>
              </Empty>
            ) : (
              <div className="flex flex-col gap-2">
                {cachedAnswers.map((item) => (
                  <Button
                    key={item.id}
                    type="button"
                    variant="outline"
                    className="h-auto w-full justify-start whitespace-normal p-0 text-left"
                    onClick={() => {
                      setTag(item.tag)
                      setManualTag(item.tag)
                      setAnswer(item.answer)
                    }}
                  >
                    <span className="flex min-w-0 flex-1 flex-col items-start gap-2 p-3">
                      <span className="flex w-full flex-wrap items-center justify-between gap-2">
                        <strong>{item.tag}</strong>
                        <Badge variant="outline">{new Date(item.savedAt).toLocaleString()}</Badge>
                      </span>
                      <span className="line-clamp-2 text-muted-foreground">{item.answer}</span>
                    </span>
                  </Button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
