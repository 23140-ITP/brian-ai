import { useEffect, useState } from 'react'
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { AlertBanner } from '../components/AlertBanner'
import { BenchmarkModal } from '../components/BenchmarkModal'
import { KpiCard } from '../components/KpiCard'
import { Alert, BenchmarkResult, ComplianceRow, DocumentMeta, alerts as fallbackAlerts, benchmarkResults, complianceRows, documents, scaleData } from '../data/mock'
import { api } from '../services/api'
import { Activity, Bot, ClipboardCheck, Clock3, FileSearch, GitBranch, IndianRupee } from 'lucide-react'

export function DashboardPage() {
  const [alertRows, setAlertRows] = useState<Alert[]>(fallbackAlerts)
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

  const prove = async () => {
    setProveIt('Running evidence query...')
    const start = performance.now()
    const result = await api.ask('What caused the P-204B seal failure?', 'openai/gpt-4o-mini')
    setProveIt(`${((performance.now() - start) / 1000).toFixed(1)}s: ${result.answer.slice(0, 96)}...`)
  }

  return (
    <div className="page dashboard-page">
      <section className="page-heading">
        <div>
          <h1>Brian AI Command Center</h1>
          <p>Ask across 20 plant documents, compliance clauses, work orders, inspection records, and expert notes.</p>
        </div>
        <div className="heading-actions">
          <button type="button" onClick={prove}>Prove It</button>
          <button type="button" className="secondary" onClick={() => setBenchmarkOpen(true)}>Benchmark Mode</button>
        </div>
      </section>

      <div className="kpi-grid">
        <KpiCard icon={FileSearch} label="Documents unified" value={`${Math.min(docRows.length, 20)}/20`} detail={`${docRows.length} visible records`} tone="cyan" />
        <KpiCard icon={GitBranch} label="KG Completeness" value={`${(graphStats.score * 100).toFixed(1)}%`} detail={`${graphStats.nodes} nodes / ${graphStats.edges} edges`} tone="green" />
        <KpiCard icon={ClipboardCheck} label="OISD/PESO Compliance" value={`${compliant}/${compliance.length}`} detail={`${criticalGaps} critical gaps`} tone="amber" />
        <KpiCard icon={Activity} label="Failure Alerts" value={`${alertRows.length}`} detail="2 pattern-backed" tone="red" />
        <KpiCard icon={Clock3} label="Time to answer" value={`${averageLatency}s`} detail="vs. 3-4 hours manual" tone="cyan" />
        <KpiCard icon={Bot} label="Benchmark accuracy" value={`${benchmarkAccuracy}%`} detail={`${correctBenchmark}/${benchmark.length} cached checks`} tone="green" />
      </div>

      <AlertBanner alerts={alertRows} />

      <section className="dashboard-grid">
        <article className="panel query-panel">
          <div className="panel-header">
            <div>
              <p>AI Copilot</p>
              <h2>Ask across 20 plant documents</h2>
            </div>
          </div>
          <div className="query-demo">
            <span>What caused the P-204B seal failure?</span>
            <strong>{proveIt}</strong>
          </div>
        </article>

        <article className="panel roi-panel">
          <div className="panel-header">
            <div>
              <p>Business Impact</p>
              <h2>ROI impact for Bharat Refinery</h2>
            </div>
            <IndianRupee size={22} />
          </div>
          <div className="impact-grid">
            <div>
              <strong>3.5 hrs</strong>
              <span>saved per evidence search</span>
            </div>
            <div>
              <strong>2</strong>
              <span>critical gaps surfaced before audit</span>
            </div>
            <div>
              <strong>3</strong>
              <span>failure patterns made actionable</span>
            </div>
          </div>
        </article>

        <article className="panel">
          <div className="panel-header">
            <div>
              <p>OISD/PESO Compliance</p>
              <h2>Evidence matrix preview</h2>
            </div>
          </div>
          <div className="matrix-list">
            {compliance.slice(0, 4).map((row) => (
              <div key={row.clauseId} className="matrix-row">
                <span>{row.clauseId}</span>
                <strong>{row.title}</strong>
                <em className={`status ${row.status.toLowerCase()}`}>{row.status.replace('_', ' ')}</em>
              </div>
            ))}
          </div>
        </article>

        <article className="panel">
          <div className="panel-header">
            <div>
              <p>Scale Simulation</p>
              <h2>Stable latency as corpus grows</h2>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={230}>
            <AreaChart data={scaleData}>
              <defs>
                <linearGradient id="latency" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.45} />
                  <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="corpus" stroke="#748093" tickLine={false} axisLine={false} />
              <YAxis stroke="#748093" tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ background: '#101722', border: '1px solid #263244', borderRadius: 8 }} />
              <Area type="monotone" dataKey="latency" stroke="#22d3ee" fill="url(#latency)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </article>
      </section>

      <BenchmarkModal open={benchmarkOpen} results={benchmark} onClose={() => setBenchmarkOpen(false)} />
    </div>
  )
}
