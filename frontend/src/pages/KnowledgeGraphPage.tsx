import { useEffect, useMemo, useState } from 'react'
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useNavigate } from 'react-router-dom'
import { DocumentMeta, GraphEdge, GraphNode, documents as fallbackDocuments, graphEdges as fallbackEdges, graphNodes as fallbackNodes, scaleData } from '../data/mock'
import { GraphPathRecord, api } from '../services/api'
import { useAppStore } from '../store/appStore'

export function KnowledgeGraphPage() {
  const navigate = useNavigate()
  const { setActiveDocumentId } = useAppStore()
  const [nodes, setNodes] = useState<GraphNode[]>(fallbackNodes)
  const [edges, setEdges] = useState<GraphEdge[]>(fallbackEdges)
  const [documents, setDocuments] = useState<DocumentMeta[]>(fallbackDocuments)
  const [selected, setSelected] = useState<GraphNode>(fallbackNodes[0])
  const [completeness, setCompleteness] = useState({ totalTags: 73, linkedTags: 64, score: 0.877 })
  const [pathRecords, setPathRecords] = useState<GraphPathRecord[]>([])
  const [pathStatus, setPathStatus] = useState('Select a node, then resolve its nearest regulation or evidence path.')
  const [pathLoading, setPathLoading] = useState(false)

  useEffect(() => {
    api.graph().then((graph) => {
      setNodes(graph.nodes)
      setEdges(graph.edges)
      setSelected(graph.nodes[0] || fallbackNodes[0])
    })
    api.graphCompleteness().then(setCompleteness)
    api.documents().then(setDocuments)
  }, [])

  const positioned = useMemo(() => nodes.map((node, index) => ({
    ...node,
    x: 50 + (index % 3) * 34,
    y: 22 + Math.floor(index / 3) * 28
  })), [nodes])

  const relatedDocuments = useMemo(() => {
    const normalize = (value: string) => value.toLowerCase().replace(/\.(pdf|csv|txt)$/i, '').replace(/[^a-z0-9]/g, '')
    const documentNodes = nodes.filter((node) => node.type === 'Document')
    const linkedIds = new Set<string>()

    if (selected.type === 'Document') linkedIds.add(selected.id)
    edges.forEach((edge) => {
      const candidateId = edge.source === selected.id ? edge.target : edge.target === selected.id ? edge.source : ''
      if (candidateId && documentNodes.some((node) => node.id === candidateId)) linkedIds.add(candidateId)
    })

    return [...linkedIds].slice(0, 5).map((nodeId) => {
      const node = documentNodes.find((item) => item.id === nodeId)
      const match = documents.find((doc) => {
        const nodeFile = node?.details.file || node?.id || ''
        return normalize(doc.filename) === normalize(nodeFile) || normalize(doc.filename) === normalize(node?.label || '')
      })
      return {
        id: match?.id || nodeId,
        filename: match?.filename || node?.details.file || node?.label || nodeId,
        docType: match?.docType || node?.details.docType || 'Document',
        chunks: match?.chunks || Number(node?.details.chunks) || 0,
      }
    })
  }, [documents, edges, nodes, selected])

  const openDocumentContext = (documentId: string) => {
    setActiveDocumentId(documentId)
    navigate('/copilot')
  }

  const resolvePath = async () => {
    const targetType = selected.type === 'Regulation' ? 'Document' : 'Regulation'
    setPathLoading(true)
    setPathStatus(`Resolving nearest ${targetType.toLowerCase()} path from ${selected.label}...`)
    try {
      const result = await api.graphPath(selected.id, targetType)
      const records = Array.isArray(result.records) ? result.records : []
      setPathRecords(records)
      setPathStatus(records.length
        ? `${records.length} path${records.length === 1 ? '' : 's'} found to ${targetType.toLowerCase()} evidence.`
        : `No ${targetType.toLowerCase()} path found for ${selected.label}.`)
    } catch {
      setPathRecords([])
      setPathStatus('Graph query endpoint is unavailable. Local graph display remains usable.')
    } finally {
      setPathLoading(false)
    }
  }

  return (
    <div className="page graph-page">
      <section className="page-heading compact">
        <div>
          <h1>Knowledge Graph</h1>
          <p>{completeness.totalTags} nodes - KG Completeness: {(completeness.score * 100).toFixed(1)}%</p>
        </div>
      </section>
      <section className="graph-layout">
        <div className="panel graph-canvas">
          <svg viewBox="0 0 150 96" role="img" aria-label="Equipment relationship graph">
            {edges.map((edge) => {
              const source = positioned.find((node) => node.id === edge.source)
              const target = positioned.find((node) => node.id === edge.target)
              if (!source || !target) return null
              return <line key={`${edge.source}-${edge.target}`} x1={source.x} y1={source.y} x2={target.x} y2={target.y} />
            })}
            {positioned.map((node) => (
              <g key={node.id} onClick={() => setSelected(node)} className={`node node-${node.type.toLowerCase()}`} tabIndex={0}>
                <circle cx={node.x} cy={node.y} r={4 + node.score * 0.4} />
                <text x={node.x + 7} y={node.y + 1}>{node.label}</text>
              </g>
            ))}
          </svg>
        </div>
        <aside className="panel detail-panel">
          <p>{selected.type}</p>
          <h2>{selected.label}</h2>
          {Object.entries(selected.details).map(([key, value]) => (
            <div key={key} className="detail-row"><span>{key}</span><strong>{value}</strong></div>
          ))}
          <div className="related-documents">
            <span>Related documents</span>
            {relatedDocuments.length ? relatedDocuments.map((doc) => (
              <button key={doc.id} type="button" onClick={() => openDocumentContext(doc.id)}>
                <strong>{doc.filename}</strong>
                <small>{doc.docType}{doc.chunks ? ` - ${doc.chunks} chunks` : ''}</small>
              </button>
            )) : <small>No directly linked documents for this node.</small>}
          </div>
          <button type="button" onClick={resolvePath} disabled={pathLoading}>
            {selected.type === 'Regulation' ? 'Find evidence documents' : 'Shortest path to regulation'}
          </button>
          <div className="graph-path-results" aria-live="polite">
            <span>{pathStatus}</span>
            {pathRecords.map((record) => {
              const path = Array.isArray(record.path) ? record.path : []
              const relationships = Array.isArray(record.relationships) ? record.relationships : []
              return (
                <article key={`${record.source}-${record.target}-${record.depth}`}>
                  <strong>{path.length ? path.map((node) => node.label).join(' -> ') : `${selected.label} -> ${record.target}`}</strong>
                  <small>{relationships.length ? relationships.join(' -> ') : 'RELATED'} | {record.depth} hop{record.depth === 1 ? '' : 's'}</small>
                </article>
              )
            })}
          </div>
        </aside>
      </section>
      <section className="panel scale-panel">
        <div className="panel-header">
          <div>
            <p>Scale-up Simulator</p>
            <h2>ChromaDB to Pinecone, AuraDB Free to Enterprise</h2>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={scaleData}>
            <XAxis dataKey="corpus" stroke="#748093" tickLine={false} axisLine={false} />
            <YAxis stroke="#748093" tickLine={false} axisLine={false} />
            <Tooltip contentStyle={{ background: '#101722', border: '1px solid #263244', borderRadius: 8 }} />
            <Line dataKey="latency" stroke="#22d3ee" strokeWidth={2} dot />
            <Line dataKey="accuracy" stroke="#f59e0b" strokeWidth={2} dot />
          </LineChart>
        </ResponsiveContainer>
      </section>
    </div>
  )
}
