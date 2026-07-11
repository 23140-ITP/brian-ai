import { LoaderCircle, Route } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { DocumentMeta, GraphEdge, GraphNode, documents as fallbackDocuments, graphEdges as fallbackEdges, graphNodes as fallbackNodes, scaleData } from '../data/mock'
import { GraphPathRecord, api } from '../services/api'
import { useAppStore } from '../store/appStore'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Empty, EmptyHeader, EmptyTitle } from '@/components/ui/empty'
import { Separator } from '@/components/ui/separator'
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { chartTooltipStyle } from '@/lib/presentation'

const GRAPH_MAX_COLUMNS = 4
const graphNodeFill: Record<GraphNode['type'], string> = {
  Equipment: 'fill-primary',
  Document: 'fill-chart-2',
  Regulation: 'fill-destructive',
  Person: 'fill-chart-3',
  Alert: 'fill-chart-4',
}

const graphColumns: Record<number, number[]> = {
  1: [75],
  2: [54, 96],
  3: [36, 75, 114],
  4: [18, 56, 94, 132],
}

function graphLabelLines(label: string) {
  if (label.length <= 16) return [label]
  const words = label.replace(/[-_]/g, ' ').split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let current = ''

  words.forEach((word) => {
    const next = current ? `${current} ${word}` : word
    if (next.length > 16 && current) {
      lines.push(current)
      current = word
    } else {
      current = next
    }
  })
  if (current) lines.push(current)

  if (lines.length <= 3) return lines
  return [...lines.slice(0, 2), `${lines.slice(2).join(' ').slice(0, 15)}…`]
}

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

  const positioned = useMemo(() => nodes.map((node, index) => {
    const row = Math.floor(index / GRAPH_MAX_COLUMNS)
    const column = index % GRAPH_MAX_COLUMNS
    const rowStart = row * GRAPH_MAX_COLUMNS
    const rowCount = Math.min(GRAPH_MAX_COLUMNS, nodes.length - rowStart)
    return {
      ...node,
      x: graphColumns[rowCount][column],
      y: 22 + row * 44,
    }
  }), [nodes])

  const positionedById = useMemo(
    () => new Map(positioned.map((node) => [node.id, node])),
    [positioned]
  )
  const graphViewBoxHeight = Math.max(106, 42 + (Math.ceil(positioned.length / GRAPH_MAX_COLUMNS) - 1) * 44)

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
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">Knowledge Graph</h1>
        <p className="text-sm text-muted-foreground">
          {completeness.totalTags} nodes - KG Completeness: {(completeness.score * 100).toFixed(1)}%
        </p>
      </header>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <Card>
          <CardHeader>
            <CardTitle>Equipment relationship graph</CardTitle>
          </CardHeader>
          <CardContent className="max-h-[36rem] overflow-auto lg:max-h-[48rem]">
            <svg className="min-w-[36rem] w-full lg:min-w-0" viewBox={`0 0 150 ${graphViewBoxHeight}`} role="img" aria-label="Equipment relationship graph">
              {edges.map((edge) => {
                const source = positionedById.get(edge.source)
                const target = positionedById.get(edge.target)
                if (!source || !target) return null
                return (
                  <line
                    key={`${edge.source}-${edge.target}`}
                    x1={source.x}
                    y1={source.y}
                    x2={target.x}
                    y2={target.y}
                    className="stroke-border"
                    strokeWidth={0.6}
                  />
                )
              })}
              {positioned.map((node) => (
                <g
                  key={node.id}
                  onClick={() => setSelected(node)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      setSelected(node)
                    }
                  }}
                  className="cursor-pointer outline-none hover:[&_circle]:stroke-ring hover:[&_circle]:stroke-[1] focus-visible:[&_circle]:stroke-ring focus-visible:[&_circle]:stroke-[1.5]"
                  tabIndex={0}
                  role="button"
                  aria-label={`Select ${node.label}`}
                >
                  <rect
                    x={node.x - 10}
                    y={node.y - 10}
                    width={20}
                    height={20}
                    fill="transparent"
                    pointerEvents="all"
                  />
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={4 + node.score * 0.4}
                    className={cn('stroke-background transition-colors', graphNodeFill[node.type])}
                    strokeWidth={selected.id === node.id ? 1.2 : 0.5}
                  />
                  <text
                    x={node.x}
                    y={node.y + 11}
                    textAnchor="middle"
                    className="pointer-events-none fill-foreground"
                    fontSize={3.25}
                  >
                    {graphLabelLines(node.label).map((line, lineIndex) => (
                      <tspan key={line} x={node.x} dy={lineIndex === 0 ? 0 : 4}>
                        {line}
                      </tspan>
                    ))}
                  </text>
                </g>
              ))}
            </svg>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{selected.label}</CardTitle>
            <CardAction>
              <Badge variant="secondary">{selected.type}</Badge>
            </CardAction>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Table aria-label={`${selected.label} details`}>
              <TableBody>
                {Object.entries(selected.details).map(([key, value]) => (
                  <TableRow key={key}>
                    <TableCell className="capitalize text-muted-foreground">{key}</TableCell>
                    <TableCell className="whitespace-normal text-right font-medium">{value}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <Separator />

            <div className="flex flex-col gap-2">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Related documents</span>
              {relatedDocuments.length ? relatedDocuments.map((doc) => (
                <Button
                  key={doc.id}
                  type="button"
                  variant="outline"
                  size="lg"
                  className="h-auto min-h-12 w-full justify-start whitespace-normal text-left"
                  onClick={() => openDocumentContext(doc.id)}
                >
                  <span className="flex min-w-0 flex-col gap-1">
                    <strong className="truncate font-medium">{doc.filename}</strong>
                    <span className="text-xs text-muted-foreground">
                      {doc.docType}{doc.chunks ? ` - ${doc.chunks} chunks` : ''}
                    </span>
                  </span>
                </Button>
              )) : (
                <Empty className="border">
                  <EmptyHeader>
                    <EmptyTitle>No directly linked documents for this node.</EmptyTitle>
                  </EmptyHeader>
                </Empty>
              )}
            </div>

            <Button type="button" onClick={resolvePath} disabled={pathLoading}>
              {pathLoading
                ? <LoaderCircle data-icon="inline-start" className="animate-spin" aria-hidden="true" />
                : <Route data-icon="inline-start" aria-hidden="true" />}
              {selected.type === 'Regulation' ? 'Find evidence documents' : 'Shortest path to regulation'}
            </Button>

            <div className="flex flex-col gap-2" aria-live="polite">
              <Alert>
                <Route aria-hidden="true" />
                <AlertDescription>{pathStatus}</AlertDescription>
              </Alert>
              {pathRecords.map((record) => {
                const path = Array.isArray(record.path) ? record.path : []
                const relationships = Array.isArray(record.relationships) ? record.relationships : []
                return (
                  <Alert key={`${record.source}-${record.target}-${record.depth}`}>
                    <Route aria-hidden="true" />
                    <AlertTitle>
                      {path.length ? path.map((node) => node.label).join(' -> ') : `${selected.label} -> ${record.target}`}
                    </AlertTitle>
                    <AlertDescription>
                      {relationships.length ? relationships.join(' -> ') : 'RELATED'} | {record.depth} hop{record.depth === 1 ? '' : 's'}
                    </AlertDescription>
                  </Alert>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardDescription>Scale-up Simulator</CardDescription>
          <CardTitle>SQLite vectors to managed vector search, AuraDB Free to Enterprise</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[220px] min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={scaleData}>
                <XAxis dataKey="corpus" stroke="var(--muted-foreground)" tickLine={false} axisLine={false} />
                <YAxis stroke="var(--muted-foreground)" tickLine={false} axisLine={false} />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Line dataKey="latency" stroke="var(--chart-2)" strokeWidth={2} dot />
                <Line dataKey="accuracy" stroke="var(--chart-4)" strokeWidth={2} dot />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
