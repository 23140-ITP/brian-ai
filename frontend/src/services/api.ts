import {
  Alert,
  BenchmarkResult,
  ComplianceRow,
  DocumentMeta,
  GraphEdge,
  GraphNode,
  alerts,
  answerTemplates,
  benchmarkResults,
  complianceRows,
  documents,
  graphEdges,
  graphNodes
} from '../data/mock'

const API_BASE = import.meta.env.VITE_API_URL || ''
export const dataMode: 'live' | 'demo' = import.meta.env.VITE_DATA_MODE === 'demo' || !API_BASE ? 'demo' : 'live'
export const API_STATUS_EVENT = 'brian-ai-api-status'
const WRITE_TOKEN_KEY = 'brian-ai-write-token'

function reportFailure(path: string) {
  if (dataMode === 'live') {
    window.dispatchEvent(new CustomEvent(API_STATUS_EVENT, { detail: `Live backend request failed: ${path}` }))
  }
}

export function getWriteToken() {
  return sessionStorage.getItem(WRITE_TOKEN_KEY) || ''
}

export function setWriteToken(token: string) {
  if (token) sessionStorage.setItem(WRITE_TOKEN_KEY, token)
  else sessionStorage.removeItem(WRITE_TOKEN_KEY)
}

function writeHeaders(headers: Record<string, string> = {}) {
  const token = getWriteToken()
  return token ? { ...headers, 'X-Brian-Write-Token': token } : headers
}

export type SystemStatus = {
  api: string
  rag: {
    mode: string
    openrouterConfigured: boolean
    modelRouting: string
  }
  graph: {
    configured: boolean
    driverAvailable: boolean
    driverInitialized?: boolean
    keepAliveEnabled?: boolean
    adapterActive?: boolean
    lastSyncAt?: string
    lastError?: string
    heartbeatIntervalMinutes?: number
    mode: string
  }
  index: {
    mode: string
    vectorPath: string
    cache: { chunks: number; files: number; path: string; model: string }
  }
  ocr?: {
    mode: string
    visionConfigured: boolean
    tesseractAvailable: boolean
  }
  deployment: {
    environment: string
    corsOrigins: string[]
    frontendPublicUrl?: string
    backendPublicUrl?: string
  }
  readiness?: {
    productionReady: boolean
    checks: Array<{
      id: string
      label: string
      status: 'ready' | 'missing' | 'local' | 'manual'
      detail: string
    }>
  }
}

export type GraphPathRecord = {
  source: string
  target: string
  targetType: string
  depth: number
  path: Array<{ id: string; label: string; type: string }>
  relationships: string[]
}

async function getJson<T>(path: string, fallback: T): Promise<T> {
  try {
    const response = await fetch(`${API_BASE}${path}`)
    if (!response.ok) throw new Error(response.statusText)
    return (await response.json()) as T
  } catch {
    reportFailure(path)
    return fallback
  }
}

async function streamBenchmarkRows(onRows?: (rows: BenchmarkResult[]) => void): Promise<BenchmarkResult[]> {
  const response = await fetch(`${API_BASE}/api/benchmark`, { headers: { Accept: 'text/event-stream' } })
  if (!response.ok || !response.body) throw new Error(response.statusText)

  const contentType = response.headers.get('content-type') || ''
  if (!contentType.includes('text/event-stream')) return (await response.json()) as BenchmarkResult[]

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  const rows: BenchmarkResult[] = []
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const events = buffer.split('\n\n')
    buffer = events.pop() || ''
    for (const event of events) {
      const eventLine = event.split('\n').find((line) => line.startsWith('event: '))
      const dataLine = event.split('\n').find((line) => line.startsWith('data: '))
      if (eventLine?.slice(7) !== 'result' || !dataLine) continue
      const payload = JSON.parse(dataLine.slice(6)) as { row: BenchmarkResult }
      rows.push(payload.row)
      onRows?.([...rows])
    }
  }

  if (!rows.length) throw new Error('Benchmark stream returned no rows')
  return rows
}

type IngestResult = { doc_id: string; chunks: number; entities: number; alerts_triggered: number; ingested_at?: string }
type IngestProgress = { current: number; total: number; step: string }

export const api = {
  health: () => getJson('/health', { status: 'local demo', version: '1.0.0' }),
  systemStatus: () => getJson<SystemStatus>('/api/system/status', {
    api: 'local demo',
    rag: { mode: 'local-lexical-rag', openrouterConfigured: false, modelRouting: 'enabled' },
    graph: { configured: false, driverAvailable: false, driverInitialized: false, keepAliveEnabled: false, heartbeatIntervalMinutes: 60, mode: 'local-corpus-graph' },
    index: { mode: 'lexical-fallback', vectorPath: 'data/vectors.db', cache: { chunks: 0, files: 0, path: 'data/vectors.db', model: 'openai/text-embedding-3-small' } },
    ocr: { mode: 'local-ocr-fallback', visionConfigured: false, tesseractAvailable: false },
    deployment: { environment: 'development', corsOrigins: ['http://localhost:5173'], frontendPublicUrl: '', backendPublicUrl: '' },
    readiness: {
      productionReady: false,
      checks: [
        { id: 'openrouter', label: 'OpenRouter generation', status: 'local', detail: 'Local lexical retrieval is active; add OpenRouter credentials for live generation.' },
        { id: 'vision', label: 'Field vision OCR', status: 'local', detail: 'Nameplate OCR falls back to filename, local OCR, byte-pattern, and demo extraction.' },
        { id: 'neo4j', label: 'Neo4j AuraDB graph', status: 'local', detail: 'Local corpus graph is active; add AuraDB credentials for live graph storage.' },
        { id: 'cors', label: 'Public CORS origins', status: 'local', detail: 'Set ALLOW_ORIGINS to the deployed Vercel URL before public submission.' },
        { id: 'vector-index', label: 'Vector retrieval', status: 'local', detail: 'Lexical retrieval is active until embeddings are indexed.' },
        { id: 'write-access', label: 'Protected write access', status: 'missing', detail: 'Set BRIAN_AI_WRITE_TOKEN before public ingestion.' },
        { id: 'public-links', label: 'Public app links', status: 'manual', detail: 'Deploy to Vercel/Railway and set FRONTEND_PUBLIC_URL and BACKEND_PUBLIC_URL.' }
      ]
    }
  }),
  alerts: () => getJson<Alert[]>('/api/alerts', alerts),
  documents: () => getJson<DocumentMeta[]>('/api/documents', documents),
  compliance: () => getJson<ComplianceRow[]>('/api/compliance/results', complianceRows),
  runComplianceCheck: async (
    onProgress: (current: number, total: number) => void,
    onClause: (row: ComplianceRow) => void
  ) => {
    try {
      const response = await fetch(`${API_BASE}/api/compliance/check`)
      if (!response.ok || !response.body) throw new Error(response.statusText)
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const events = buffer.split('\n\n')
        buffer = events.pop() || ''
        for (const event of events) {
          const eventLine = event.split('\n').find((line) => line.startsWith('event: '))
          const dataLine = event.split('\n').find((line) => line.startsWith('data: '))
          if (!eventLine || !dataLine) continue
          const type = eventLine.slice(7)
          const payload = JSON.parse(dataLine.slice(6))
          if (type === 'progress') onProgress(payload.current, payload.total)
          if (type === 'clause') onClause(payload)
        }
      }
    } catch {
      reportFailure('/api/compliance/check')
      if (dataMode === 'live') throw new Error('Live compliance check unavailable')
      complianceRows.forEach((row, index) => {
        onProgress(index + 1, complianceRows.length)
        onClause(row)
      })
    }
  },
  ingestDocument: async (file: File, onProgress?: (progress: IngestProgress) => void) => {
    const body = new FormData()
    body.append('file', file)
    const response = await fetch(`${API_BASE}/api/ingest`, { method: 'POST', headers: writeHeaders({ Accept: 'text/event-stream' }), body })
    if (!response.ok) throw new Error(response.statusText)
    const contentType = response.headers.get('content-type') || ''
    if (!response.body || !contentType.includes('text/event-stream')) return (await response.json()) as IngestResult

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let result: IngestResult | null = null

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const events = buffer.split('\n\n')
      buffer = events.pop() || ''
      for (const event of events) {
        const eventLine = event.split('\n').find((line) => line.startsWith('event: '))
        const dataLine = event.split('\n').find((line) => line.startsWith('data: '))
        if (!eventLine || !dataLine) continue
        const type = eventLine.slice(7)
        const payload = JSON.parse(dataLine.slice(6))
        if (type === 'progress') onProgress?.(payload)
        if (type === 'done') result = payload
      }
    }

    if (!result) throw new Error('Ingest stream ended without a result')
    return result
  },
  ocrNameplate: async (file: File) => {
    const body = new FormData()
    body.append('file', file)
    const response = await fetch(`${API_BASE}/api/ocr/nameplate`, { method: 'POST', body })
    if (!response.ok) throw new Error(response.statusText)
    return (await response.json()) as { tag: string | null; confidence: number; provider?: string }
  },
  captureQuestions: () => getJson<string[]>('/api/capture/questions', [
    'Describe a critical failure you have seen and how it was resolved.',
    'Which early warning signs are easy for new engineers to miss?',
    'Which document or checklist should be updated after this interview?',
    'What spare parts should always be ready before a shutdown?',
    'What would you tell the next shift engineer before handing over?'
  ]),
  captureExpertKnowledge: async (payload: { session_id: string; expert_name: string; topic: string; answers: Array<{ question: string; answer: string }> }) => {
    const response = await fetch(`${API_BASE}/api/capture`, {
      method: 'POST',
      headers: writeHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(payload)
    })
    if (!response.ok) throw new Error(response.statusText)
    return (await response.json()) as { doc_id: string; status: string; linked_entities: string[] }
  },
  benchmark: async (onRows?: (rows: BenchmarkResult[]) => void) => {
    try {
      return await streamBenchmarkRows(onRows)
    } catch {
      const rows = await getJson<BenchmarkResult[]>('/api/benchmark', benchmarkResults)
      onRows?.(rows)
      return rows
    }
  },
  benchmarkSpotCheck: async (index: number) => {
    const response = await fetch(`${API_BASE}/api/benchmark/spot-check/${index}`, { method: 'POST' })
    if (!response.ok) throw new Error(response.statusText)
    return (await response.json()) as BenchmarkResult & {
      liveAnswer: string
      liveLatencyS: number
      liveCitations: string[]
      liveConfidence: number
      cacheDelta: string
    }
  },
  graph: async () => ({
    nodes: await getJson<GraphNode[]>('/api/graph/nodes', graphNodes),
    edges: await getJson<GraphEdge[]>('/api/graph/edges', graphEdges)
  }),
  graphCompleteness: () => getJson('/api/graph/completeness', { totalTags: 73, linkedTags: 64, score: 0.877, nodes: 73, edges: 47 }),
  graphPath: async (source: string, targetType: string) => {
    const response = await fetch(`${API_BASE}/api/graph/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source, targetType })
    })
    if (!response.ok) throw new Error(response.statusText)
    return (await response.json()) as { source: string; targetType: string; records: GraphPathRecord[] }
  },
  ask: async (query: string, model: string) => {
    const lower = query.toLowerCase()
    const key = lower.includes('p-204') || lower.includes('seal') ? 'p204' : lower.includes('oisd') ? 'oisd' : lower.includes('v-301') ? 'v301' : 'default'
    try {
      const response = await fetch(`${API_BASE}/api/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, model, scope: 'rag' })
      })
      if (!response.ok) throw new Error(response.statusText)
      return (await response.json()) as { answer: string; citations: string[]; confidence: number }
    } catch {
      reportFailure('/api/query')
      if (dataMode === 'live') throw new Error('Live backend unavailable; no demo answer was substituted.')
      return {
        answer: answerTemplates[key],
        citations: key === 'oisd'
          ? ['OISD-116-Fired-Heater-Procedure.pdf', 'Emergency-Response-Plan.pdf']
          : ['Incident-2023-07-15-P204B-Seal-Failure.pdf', 'work-orders-2022-2024.csv'],
        confidence: key === 'default' ? 0.78 : 0.91
      }
    }
  },
  askStream: async (
    query: string,
    model: string,
    onToken: (token: string) => void,
    onDone: (result: { citations: string[]; confidence: number }) => void,
    onError?: (error: string) => void
  ) => {
    try {
      const response = await fetch(`${API_BASE}/api/query/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, model, scope: 'rag' })
      })
      if (!response.ok || !response.body) throw new Error(response.statusText)

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let citations: string[] = []
      let confidence = 0.78

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const events = buffer.split('\n\n')
        buffer = events.pop() || ''
        for (const event of events) {
          const dataLine = event.split('\n').find((line) => line.startsWith('data: '))
          if (!dataLine) continue
          const payload = JSON.parse(dataLine.slice(6))
          if (payload.error) {
            onError?.(payload.error)
            return
          }
          if ('text' in payload) onToken(payload.text)
          if ('citations' in payload) {
            citations = payload.citations
            confidence = payload.confidence
          }
        }
      }
      onDone({ citations, confidence })
    } catch {
      reportFailure('/api/query/stream')
      if (dataMode === 'live') {
        onError?.('ERR_BACKEND_UNAVAILABLE')
        return
      }
      const fallback = await api.ask(query, model)
      onToken(fallback.answer)
      onDone({ citations: fallback.citations, confidence: fallback.confidence })
    }
  }
}
