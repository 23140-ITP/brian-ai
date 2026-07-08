import { Camera, Download, Mic, Sun } from 'lucide-react'
import { ChangeEvent, useEffect, useState } from 'react'
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

function loadCachedFieldAnswers(): FieldAnswerCacheEntry[] {
  try {
    const raw = localStorage.getItem(FIELD_CACHE_KEY)
    if (raw) return JSON.parse(raw).slice(0, MAX_FIELD_CACHE_ENTRIES)
  } catch {
    return []
  }
  const legacyAnswer = localStorage.getItem(LEGACY_FIELD_CACHE_KEY)
  return legacyAnswer
    ? [{ id: 'legacy-field-answer', tag: 'Cached', answer: legacyAnswer, savedAt: new Date().toISOString() }]
    : []
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

  useEffect(() => {
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', sunlightMode ? '#ffffff' : '#0a0d12')
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
      localStorage.setItem(FIELD_CACHE_KEY, JSON.stringify(next))
      localStorage.setItem(LEGACY_FIELD_CACHE_KEY, nextAnswer)
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
    <main className={`field-page ${sunlightMode ? 'sunlight-mode' : ''}`}>
      <header>
        <div className="field-header-line">
          <strong>Brian AI Field - {tag}</strong>
        </div>
        {installPrompt && (
          <button type="button" className="secondary" onClick={installFieldApp}><Download size={18} /> Install Field PWA</button>
        )}
        <button type="button" onClick={() => setSunlightMode(!sunlightMode)}><Sun size={18} /> Sunlight Mode</button>
      </header>
      <p className="install-status">{installStatus}</p>
      <section className="field-card">
        <p>Equipment tag</p>
        <h1>{tag}</h1>
        <span>{busy ? 'Reading nameplate and querying documents...' : 'Camera OCR ready'}</span>
      </section>
      <div className="field-actions">
        <label>
          <Camera size={22} />
          Scan Nameplate
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={scan}
            aria-label="Upload nameplate image"
          />
        </label>
        <button type="button" onClick={voiceQuery} disabled={busy}><Mic size={22} /> Voice Query</button>
      </div>
      <p className="voice-status">{voiceStatus}</p>
      <div className="manual-tag-row">
        <input
          aria-label="Manual equipment tag"
          value={manualTag}
          onChange={(event) => setManualTag(event.target.value)}
          placeholder="Type tag manually"
        />
        <button type="button" onClick={manualQuery} disabled={busy}>Lookup</button>
      </div>
      <article className="field-answer">
        <strong>Answer</strong>
        <p>{answer}</p>
      </article>
      <section className="field-cache">
        <div>
          <strong>Offline answer cache</strong>
          <span>{cachedAnswers.length}/5 saved</span>
        </div>
        {cachedAnswers.length === 0 ? (
          <p>No field answers cached yet.</p>
        ) : (
          cachedAnswers.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setTag(item.tag)
                setManualTag(item.tag)
                setAnswer(item.answer)
              }}
            >
              <strong>{item.tag}</strong>
              <span>{new Date(item.savedAt).toLocaleString()}</span>
              <p>{item.answer}</p>
            </button>
          ))
        )}
      </section>
    </main>
  )
}
