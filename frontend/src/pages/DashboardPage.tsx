import {
  Activity,
  Bot,
  ClipboardCheck,
  Clock3,
  FileSearch,
  GitBranch,
  IndianRupee,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { BenchmarkModal } from '../components/BenchmarkModal'
import {
  Alert as AlertRecord,
  BenchmarkResult,
  ComplianceRow,
  DocumentMeta,
  alerts as fallbackAlerts,
  benchmarkResults,
  complianceRows,
  documents,
  scaleData,
} from '../data/mock'
import { api } from '../services/api'
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/ui/alert'
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
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table'
import { chartTooltipStyle, complianceStatusVariant } from '@/lib/presentation'

export function DashboardPage() {
  const navigate = useNavigate()
  const [alertRows, setAlertRows] = useState<AlertRecord[]>(fallbackAlerts)
  const [docRows, setDocRows] = useState<DocumentMeta[]>(documents)
  const [compliance, setCompliance] = useState<ComplianceRow[]>(complianceRows)
  const [benchmark, setBenchmark] = useState<BenchmarkResult[]>(benchmarkResults)
  const [graphStats, setGraphStats] = useState({ totalTags: 73, linkedTags: 64, score: 0.877, nodes: 73, edges: 47 })
  const [benchmarkOpen, setBenchmarkOpen] = useState(false)
  const [proveIt, setProveIt] = useState('Ready')

  useEffect(() => {
    api.alerts().then(setAlertRows)
    api.documents().then(setDocRows)
    api.compliance().then(setCompliance)
    api.benchmark(setBenchmark).then(setBenchmark)
    api.graphCompleteness().then(setGraphStats)
  }, [])

  const compliant = compliance.filter((row) => row.status === 'COMPLIANT').length
  const criticalGaps = compliance.filter((row) => row.status === 'NON_COMPLIANT').length
  const correctBenchmark = benchmark.filter((row) => row.correct).length
  const benchmarkAccuracy = benchmark.length ? Math.round((correctBenchmark / benchmark.length) * 100) : 0
  const averageLatency = benchmark.length
    ? (benchmark.reduce((total, row) => total + row.latencyS, 0) / benchmark.length).toFixed(1)
    : '0.0'
  const primaryAlert = alertRows.find((alert) => alert.severity === 'HIGH') || alertRows[0]
  const kpis = [
    {
      icon: FileSearch,
      label: 'Documents unified',
      value: `${Math.min(docRows.length, 20)}/20`,
      detail: `${docRows.length} visible records`,
    },
    {
      icon: GitBranch,
      label: 'KG Completeness',
      value: `${(graphStats.score * 100).toFixed(1)}%`,
      detail: `${graphStats.nodes} nodes / ${graphStats.edges} edges`,
    },
    {
      icon: ClipboardCheck,
      label: 'OISD/PESO Compliance',
      value: `${compliant}/${compliance.length}`,
      detail: `${criticalGaps} critical gaps`,
    },
    {
      icon: Activity,
      label: 'Failure Alerts',
      value: `${alertRows.length}`,
      detail: '2 pattern-backed',
    },
    {
      icon: Clock3,
      label: 'Time to answer',
      value: `${averageLatency}s`,
      detail: 'vs. 3-4 hours manual',
    },
    {
      icon: Bot,
      label: 'Benchmark accuracy',
      value: `${benchmarkAccuracy}%`,
      detail: `${correctBenchmark}/${benchmark.length} cached checks`,
    },
  ]

  const prove = async () => {
    setProveIt('Running evidence query...')
    const start = performance.now()
    try {
      const result = await api.ask('What caused the P-204B seal failure?', 'openai/gpt-4o-mini')
      setProveIt(`${((performance.now() - start) / 1000).toFixed(1)}s: ${result.answer.slice(0, 96)}...`)
    } catch {
      setProveIt('Live backend unavailable. No demo answer was substituted.')
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight">Brian AI Command Center</h1>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Ask across 20 plant documents, compliance clauses, work orders, inspection records, and expert notes.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={prove}>Prove It</Button>
          <Button type="button" variant="outline" onClick={() => setBenchmarkOpen(true)}>Benchmark Mode</Button>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-label="Operational metrics">
        {kpis.map(({ icon: Icon, label, value, detail }) => (
          <Card key={label} size="sm">
            <CardHeader>
              <CardTitle>{label}</CardTitle>
              <CardAction>
                <Icon aria-hidden="true" />
              </CardAction>
            </CardHeader>
            <CardContent className="flex flex-col gap-1">
              <strong className="text-2xl font-semibold">{value}</strong>
              <p className="text-sm text-muted-foreground">{detail}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      {primaryAlert ? (
        <Alert variant="destructive" className="has-data-[slot=alert-action]:pr-2 sm:has-data-[slot=alert-action]:pr-18">
          <Activity aria-hidden="true" />
          <AlertTitle>Failure Alerts</AlertTitle>
          <AlertDescription>
            <span className="font-medium text-foreground">{primaryAlert.tag}: {primaryAlert.message}</span>
            <span className="block">{primaryAlert.evidence}</span>
          </AlertDescription>
          <AlertAction className="static col-span-full mt-2 justify-self-start sm:absolute sm:mt-0">
            <Button type="button" size="sm" variant="outline" onClick={() => navigate('/compliance')}>
              Open evidence
            </Button>
          </AlertAction>
        </Alert>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardDescription>AI Copilot</CardDescription>
            <CardTitle>Ask across 20 plant documents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex min-h-44 flex-col justify-center gap-4 rounded-lg border bg-muted/40 p-4">
              <p className="text-base font-medium">What caused the P-204B seal failure?</p>
              <p className="text-sm text-muted-foreground" aria-live="polite">{proveIt}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Business Impact</CardDescription>
            <CardTitle>ROI impact for Bharat Refinery</CardTitle>
            <CardAction>
              <IndianRupee aria-hidden="true" />
            </CardAction>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3">
            <div className="flex flex-col gap-1 rounded-lg border p-4">
              <strong className="text-2xl font-semibold">3.5 hrs</strong>
              <span className="text-sm text-muted-foreground">saved per evidence search</span>
            </div>
            <div className="flex flex-col gap-1 rounded-lg border p-4">
              <strong className="text-2xl font-semibold">2</strong>
              <span className="text-sm text-muted-foreground">critical gaps surfaced before audit</span>
            </div>
            <div className="flex flex-col gap-1 rounded-lg border p-4">
              <strong className="text-2xl font-semibold">3</strong>
              <span className="text-sm text-muted-foreground">failure patterns made actionable</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>OISD/PESO Compliance</CardDescription>
            <CardTitle>Evidence matrix preview</CardTitle>
          </CardHeader>
          <CardContent>
            <Table aria-label="Compliance evidence matrix preview">
              <TableBody>
                {compliance.slice(0, 4).map((row) => (
                  <TableRow key={row.clauseId}>
                    <TableCell className="text-muted-foreground">{row.clauseId}</TableCell>
                    <TableCell className="whitespace-normal font-medium">{row.title}</TableCell>
                    <TableCell className="text-right">
                      <Badge
                        variant={complianceStatusVariant(row.status)}
                      >
                        {row.status.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Scale Simulation</CardDescription>
            <CardTitle>Stable latency as corpus grows</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[230px] min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={scaleData}>
                  <defs>
                    <linearGradient id="latency" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="5%" stopColor="var(--chart-2)" stopOpacity={0.45} />
                      <stop offset="95%" stopColor="var(--chart-2)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="corpus" stroke="var(--muted-foreground)" tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--muted-foreground)" tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={chartTooltipStyle} />
                  <Area type="monotone" dataKey="latency" stroke="var(--chart-2)" fill="url(#latency)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </section>

      <BenchmarkModal open={benchmarkOpen} results={benchmark} onClose={() => setBenchmarkOpen(false)} />
    </div>
  )
}
