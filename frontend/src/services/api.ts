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
import { readWorkspace } from '@/lib/workspace'

const API_BASE = import.meta.env.VITE_API_URL || ''
export const dataMode: 'live' | 'demo' = API_BASE ? 'live' : 'demo'
export const API_STATUS_EVENT = 'brian-ai-api-status'
const WRITE_TOKEN_KEY = 'brian-ai-write-token'
const LIVE_ACCESS_REQUIRED = 'Live access key required. Open Settings, enter the Operator key, then select Verify Live access.'

function reportFailure(path: string, detail?: string) {
  if (dataMode === 'live') {
    window.dispatchEvent(new CustomEvent(API_STATUS_EVENT, { detail: detail || `${readWorkspace() === 'live' ? 'Live' : 'Demo'} workspace request failed: ${path}` }))
  }
}

function reportSuccess() {
  if (dataMode === 'live' && readWorkspace() === 'live') {
    window.dispatchEvent(new CustomEvent(API_STATUS_EVENT, { detail: '' }))
  }
}

export function getWriteToken() {
  try {
    return sessionStorage.getItem(WRITE_TOKEN_KEY) || ''
  } catch {
    return ''
  }
}

export function setWriteToken(token: string) {
  try {
    if (token) sessionStorage.setItem(WRITE_TOKEN_KEY, token)
    else sessionStorage.removeItem(WRITE_TOKEN_KEY)
  } catch {
    // Session-only access remains unavailable when browser storage is blocked.
  }
}

function requestHeaders(headers: Record<string, string> = {}) {
  const workspace = readWorkspace()
  const token = workspace === 'live' ? getWriteToken() : ''
  return {
    ...headers,
    'X-Brian-Workspace': workspace,
    ...(token ? { 'X-Brian-Write-Token': token } : {})
  }
}

function writeHeaders(headers: Record<string, string> = {}) {
  const token = getWriteToken()
  return requestHeaders(token ? { ...headers, 'X-Brian-Write-Token': token } : headers)
}

export type SystemStatus = {
  api: string
  workspace?: 'demo' | 'live'
  readOnly?: boolean
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

export type ImpactReceipt = {
  document: { filename: string; docType: string }
  entities: Array<{ type: string; id: string; confidence: number; properties: Record<string, string> }>
  facts: string[]
  graphChanges: {
    relationshipsAdded: number
    linkedNodes: Array<{ id: string; label: string; type: string }>
    links: Array<{ source: string; target: string; relationship: string }>
  }
  alerts: Alert[]
  complianceImpacts: Array<Pick<ComplianceRow, 'clauseId' | 'title' | 'status' | 'confidence' | 'remediation'>>
  rca: {
    hypotheses: Array<{ title: string; confidence: number; basis: string; evidence: string[]; classification: string }>
    timeline: Array<{ filename: string; excerpt: string; isNewEvidence: boolean }>
  }
  recommendedActions: string[]
  questionsUnlocked: string[]
  provenance: { newEvidence: string; relatedSources: string[]; method: string }
}

export type BenchmarkSummary = {
  suiteSize: number
  questionAccuracy: number
  averageLatencyS: number
  adversarialAbstentions: number
  entityExtraction: { fixtures: number; precision: number; recall: number; f1: number }
  method: string
}

export type IngestResult = {
  doc_id: string
  chunks: number
  entities: number
  alerts_triggered: number
  ingested_at?: string
  impact_receipt: ImpactReceipt
}

async function getJson<T>(path: string, demoFallback: T, liveFallback: T): Promise<T> {
  const workspace = readWorkspace()
  if (dataMode === 'demo') {
    if (workspace === 'live') reportFailure(path)
    return workspace === 'demo' ? demoFallback : liveFallback
  }

  if (workspace === 'live' && !getWriteToken()) {
    reportFailure(path, LIVE_ACCESS_REQUIRED)
    return liveFallback
  }

  try {
    const response = await fetch(`${API_BASE}${path}`, { headers: requestHeaders() })
    if (!response.ok) {
      reportFailure(path, response.status === 401 ? LIVE_ACCESS_REQUIRED : undefined)
      return workspace === 'demo' ? demoFallback : liveFallback
    }
    const result = (await response.json()) as T
    reportSuccess()
    return result
  } catch {
    reportFailure(path)
    return workspace === 'demo' ? demoFallback : liveFallback
  }
}

async function streamBenchmarkRows(onRows?: (rows: BenchmarkResult[]) => void): Promise<BenchmarkResult[]> {
  if (dataMode === 'demo') {
    const rows = readWorkspace() === 'demo' ? benchmarkResults : []
    onRows?.(rows)
    return rows
  }

  if (readWorkspace() === 'live' && !getWriteToken()) {
    reportFailure('/api/benchmark', LIVE_ACCESS_REQUIRED)
    onRows?.([])
    return []
  }

  const response = await fetch(`${API_BASE}/api/benchmark`, { headers: requestHeaders({ Accept: 'text/event-stream' }) })
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
  reportSuccess()
  return rows
}

type IngestProgress = { current: number; total: number; step: string }

const demoImpactReceipt: ImpactReceipt = {
  document: { filename: 'Incident-2023-07-15-P204B-Seal-Failure.pdf', docType: 'Incident Report' },
  entities: [{ type: 'Equipment', id: 'P-204B', confidence: 0.98, properties: { tag: 'P-204B' } }],
  facts: ['P-204B seal failure followed elevated vibration and delayed bearing replacement.'],
  graphChanges: {
    relationshipsAdded: 4,
    linkedNodes: [
      { id: 'P-204B', label: 'P-204B', type: 'Equipment' },
      { id: 'OISD-116-4.2', label: 'OISD-116-4.2', type: 'Regulation' }
    ],
    links: [
      { source: 'P-204B', target: 'Incident-2023-07-15-P204B-Seal-Failure.pdf', relationship: 'MENTIONED_IN' }
    ]
  },
  alerts: alerts.filter((alert) => alert.tag === 'P-204B'),
  complianceImpacts: complianceRows.filter((row) => row.clauseId === 'OISD-116-4.2'),
  rca: {
    hypotheses: [{
      title: 'Recurring vibration-driven seal damage',
      confidence: 0.86,
      basis: 'The incident, vibration analysis, and work-order history independently connect elevated vibration, bearing wear, and seal damage.',
      evidence: ['Incident-2023-07-15-P204B-Seal-Failure.pdf', 'Pump-P204-Vibration-Analysis-2024.pdf', 'work-orders-2022-2024.csv'],
      classification: 'inference'
    }],
    timeline: [
      { filename: 'work-orders-2022-2024.csv', excerpt: 'January 2022 work order records an earlier P-204B seal event.', isNewEvidence: false },
      { filename: 'Incident-2023-07-15-P204B-Seal-Failure.pdf', excerpt: 'July 2023 incident records elevated vibration before seal failure.', isNewEvidence: true },
      { filename: 'Pump-P204-Vibration-Analysis-2024.pdf', excerpt: 'Vibration analysis recommends bearing inspection and alignment verification.', isNewEvidence: false }
    ]
  },
  recommendedActions: ['Inspect bearings and verify shaft alignment.', 'Pre-stage the approved seal kit.', 'Attach completed evidence to the OISD review record.'],
  questionsUnlocked: ['What changed for P-204B after the July 2023 incident?'],
  provenance: {
    newEvidence: 'Incident-2023-07-15-P204B-Seal-Failure.pdf',
    relatedSources: ['Pump-P204-Vibration-Analysis-2024.pdf', 'work-orders-2022-2024.csv'],
    method: 'Deterministic entity extraction, corpus retrieval, graph linkage, and rule-based hypothesis ranking'
  }
}

export const api = {
  health: () => getJson('/health', { status: 'local demo', version: '1.0.0' }, { status: 'unavailable', version: '1.0.0' }),
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
  }, {
    api: 'unavailable',
    workspace: 'live',
    readOnly: false,
    rag: { mode: 'unavailable', openrouterConfigured: false, modelRouting: 'disabled' },
    graph: { configured: false, driverAvailable: false, mode: 'unavailable' },
    index: { mode: 'unavailable', vectorPath: '', cache: { chunks: 0, files: 0, path: '', model: '' } },
    deployment: { environment: 'unavailable', corsOrigins: [] }
  }),
  alerts: () => getJson<Alert[]>('/api/alerts', alerts, []),
  documents: () => getJson<DocumentMeta[]>('/api/documents', documents, []),
  impactReceipt: async (filename: string) => {
    const workspace = readWorkspace()
    if (dataMode === 'demo') {
      if (workspace === 'demo') return demoImpactReceipt
      reportFailure(`/api/documents/${encodeURIComponent(filename)}/impact`)
      throw new Error('Live impact analysis requires the backend service.')
    }

    const response = await fetch(`${API_BASE}/api/documents/${encodeURIComponent(filename)}/impact`, { headers: requestHeaders() })
    if (!response.ok) {
      reportFailure(`/api/documents/${encodeURIComponent(filename)}/impact`)
      throw new Error(response.status === 404 ? 'Document impact is not available.' : response.statusText)
    }
    return (await response.json()) as ImpactReceipt
  },
  compliance: () => getJson<ComplianceRow[]>('/api/compliance/results', complianceRows, []),
  runComplianceCheck: async (
    onProgress: (current: number, total: number) => void,
    onClause: (row: ComplianceRow) => void
  ) => {
    if (dataMode === 'demo') {
      if (readWorkspace() === 'live') throw new Error('Live backend unavailable')
      complianceRows.forEach((row, index) => {
        onProgress(index + 1, complianceRows.length)
        onClause(row)
      })
      return
    }

    try {
      const response = await fetch(`${API_BASE}/api/compliance/check`, { headers: requestHeaders() })
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
      if (readWorkspace() === 'live') throw new Error('Live compliance check unavailable')
      complianceRows.forEach((row, index) => { onProgress(index + 1, complianceRows.length); onClause(row) })
    }
  },
  ingestDocument: async (file: File, onProgress?: (progress: IngestProgress) => void) => {
    if (readWorkspace() === 'demo') {
      const steps = ['Extracting text', 'Chunking', 'Indexing vectors', 'Extracting entities', 'Running pattern detection']
      steps.forEach((step, index) => onProgress?.({ current: index + 1, total: steps.length, step }))
      return {
        doc_id: file.name,
        chunks: 12,
        entities: 3,
        alerts_triggered: 1,
        ingested_at: '2026-07-22',
        impact_receipt: {
          ...demoImpactReceipt,
          document: { filename: file.name, docType: file.name.toLowerCase().endsWith('.csv') ? 'Work Orders' : 'Demo Upload' },
          provenance: { ...demoImpactReceipt.provenance, newEvidence: file.name }
        }
      }
    }
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
    let streamError = ''

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
        if (type === 'error') streamError = payload.detail || 'Document ingestion failed'
      }
    }

    if (streamError) throw new Error(streamError)
    if (!result) throw new Error('Ingest stream ended without a result')
    return result
  },
  ocrNameplate: async (file: File) => {
    if (readWorkspace() === 'demo') {
      const detectedTag = file.name.toUpperCase().match(/(?:P|V|HE|K|T)[-_ ]?\d{3}[A-Z]?/)?.[0]?.replace(/[_ ]/, '-') || 'P-204B'
      return { tag: detectedTag, confidence: 0.96, provider: 'demo-simulator' }
    }
    const body = new FormData()
    body.append('file', file)
    const response = await fetch(`${API_BASE}/api/ocr/nameplate`, { method: 'POST', headers: requestHeaders(), body })
    if (!response.ok) throw new Error(response.statusText)
    return (await response.json()) as { tag: string | null; confidence: number; provider?: string }
  },
  captureQuestions: () => getJson<string[]>('/api/capture/questions', [
    'Describe a critical failure you have seen and how it was resolved.',
    'Which early warning signs are easy for new engineers to miss?',
    'Which document or checklist should be updated after this interview?',
    'What spare parts should always be ready before a shutdown?',
    'What would you tell the next shift engineer before handing over?'
  ], [
    'Describe a critical failure you have seen and how it was resolved.',
    'Which early warning signs are easy for new engineers to miss?',
    'Which document or checklist should be updated after this interview?',
    'What spare parts should always be ready before a shutdown?',
    'What would you tell the next shift engineer before handing over?'
  ]),
  captureExpertKnowledge: async (payload: { session_id: string; expert_name: string; topic: string; answers: Array<{ question: string; answer: string }> }) => {
    if (readWorkspace() === 'demo') {
      return {
        doc_id: `Expert-Interview-${payload.expert_name.trim().replace(/[^a-z0-9]+/gi, '-') || 'Demo'}.md`,
        status: 'simulated',
        linked_entities: ['P-204B', 'A. Rao', 'Incident-P204']
      }
    }
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
      const rows = await getJson<BenchmarkResult[]>('/api/benchmark', benchmarkResults, [])
      onRows?.(rows)
      return rows
    }
  },
  benchmarkSummary: () => getJson<BenchmarkSummary>('/api/benchmark/summary', {
    suiteSize: benchmarkResults.length,
    questionAccuracy: benchmarkResults.filter((row) => row.correct).length / benchmarkResults.length,
    averageLatencyS: benchmarkResults.reduce((sum, row) => sum + row.latencyS, 0) / benchmarkResults.length,
    adversarialAbstentions: 5,
    entityExtraction: { fixtures: 3, precision: 1, recall: 1, f1: 1 },
    method: 'Labelled cached QA plus deterministic entity-extraction fixtures; live rows can be spot-checked independently.'
  }, {
    suiteSize: 0,
    questionAccuracy: 0,
    averageLatencyS: 0,
    adversarialAbstentions: 0,
    entityExtraction: { fixtures: 0, precision: 0, recall: 0, f1: 0 },
    method: 'No live benchmark suite is configured.'
  }),
  benchmarkSpotCheck: async (index: number) => {
    if (readWorkspace() === 'demo') {
      const row = benchmarkResults[index] || benchmarkResults[0]
      return {
        ...row,
        liveAnswer: row.answer,
        liveLatencyS: Math.max(0.8, row.latencyS - 0.4),
        liveCitations: ['Incident-2023-07-15-P204B-Seal-Failure.pdf', 'work-orders-2022-2024.csv'],
        liveConfidence: row.correct ? 0.94 : 0.72,
        cacheDelta: 'Demo replay matched the cached evaluation'
      }
    }
    const response = await fetch(`${API_BASE}/api/benchmark/spot-check/${index}`, { method: 'POST', headers: requestHeaders() })
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
    nodes: await getJson<GraphNode[]>('/api/graph/nodes', graphNodes, []),
    edges: await getJson<GraphEdge[]>('/api/graph/edges', graphEdges, [])
  }),
  graphCompleteness: () => getJson('/api/graph/completeness', { totalTags: 73, linkedTags: 64, score: 0.877, nodes: 73, edges: 47 }, { totalTags: 0, linkedTags: 0, score: 0, nodes: 0, edges: 0 }),
  graphPath: async (source: string, targetType: string) => {
    if (readWorkspace() === 'demo') {
      const sourceNode = graphNodes.find((node) => node.id === source) || graphNodes[0]
      const targetNode = graphNodes.find((node) => node.type === targetType && node.id !== source) || graphNodes[4]
      return {
        source,
        targetType,
        records: [{
          source,
          target: targetNode.id,
          targetType,
          depth: 1,
          path: [sourceNode, targetNode].map(({ id, label, type }) => ({ id, label, type })),
          relationships: ['DEMO_EVIDENCE_LINK']
        }]
      }
    }
    if (dataMode === 'demo') {
      throw new Error('Live backend unavailable')
    }

    const response = await fetch(`${API_BASE}/api/graph/query`, {
      method: 'POST',
      headers: requestHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ source, targetType })
    })
    if (!response.ok) throw new Error(response.statusText)
    return (await response.json()) as { source: string; targetType: string; records: GraphPathRecord[] }
  },
  ask: async (query: string, model: string, sourceFile?: string) => {
    const lower = query.toLowerCase()
    const key = lower.includes('p-204') || lower.includes('seal') ? 'p204' : lower.includes('oisd') ? 'oisd' : lower.includes('v-301') ? 'v301' : 'default'
    if (dataMode === 'demo' && readWorkspace() === 'demo') {
      return {
        answer: answerTemplates[key],
        citations: key === 'oisd'
          ? ['OISD-116-Fired-Heater-Procedure.pdf', 'Emergency-Response-Plan.pdf']
          : ['Incident-2023-07-15-P204B-Seal-Failure.pdf', 'work-orders-2022-2024.csv'],
        confidence: key === 'default' ? 0.78 : 0.91
      }
    }

    try {
      const response = await fetch(`${API_BASE}/api/query`, {
        method: 'POST',
        headers: requestHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ query, model, scope: 'rag', source_file: sourceFile || null })
      })
      if (!response.ok) throw new Error(response.statusText)
      return (await response.json()) as { answer: string; citations: string[]; confidence: number }
    } catch {
      reportFailure('/api/query')
      if (readWorkspace() === 'live') throw new Error('Live backend unavailable; no demo answer was substituted.')
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
    onError?: (error: string) => void,
    sourceFile?: string
  ) => {
    if (dataMode === 'demo' && readWorkspace() === 'demo') {
      const fallback = await api.ask(query, model, sourceFile)
      onToken(fallback.answer)
      onDone({ citations: fallback.citations, confidence: fallback.confidence })
      return
    }

    try {
      const response = await fetch(`${API_BASE}/api/query/stream`, {
        method: 'POST',
        headers: requestHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ query, model, scope: 'rag', source_file: sourceFile || null })
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
      if (readWorkspace() === 'live') {
        onError?.('ERR_BACKEND_UNAVAILABLE')
        return
      }
      const fallback = await api.ask(query, model, sourceFile)
      onToken(fallback.answer)
      onDone({ citations: fallback.citations, confidence: fallback.confidence })
    }
  }
}
