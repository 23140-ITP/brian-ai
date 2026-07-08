import { Download, RotateCw, X } from 'lucide-react'
import { useState } from 'react'
import { BenchmarkResult } from '../data/mock'
import { api } from '../services/api'
import { UiTooltip } from './ui/radixTooltip'
import { UiDialog } from './ui/radixDialog'

type BenchmarkModalProps = {
  open: boolean
  results: BenchmarkResult[]
  onClose: () => void
}

export function BenchmarkModal({ open, results, onClose }: BenchmarkModalProps) {
  const [checking, setChecking] = useState<number | null>(null)
  const [spotChecks, setSpotChecks] = useState<Record<number, string>>({})

  const correct = results.filter((row) => row.correct).length
  const avg = results.reduce((sum, row) => sum + row.latencyS, 0) / results.length

  const exportCsv = () => {
    const header = ['question', 'expected', 'cached_answer', 'correct', 'latency_s']
    const rows = results.map((row) => [row.question, row.expected, row.answer, `${row.correct}`, `${row.latencyS}`])
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'brian-ai-benchmark.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  const spotCheck = async (index: number) => {
    setChecking(index)
    try {
      const result = await api.benchmarkSpotCheck(index)
      setSpotChecks((current) => ({
        ...current,
        [index]: `${result.cacheDelta}. Live ${result.liveLatencyS.toFixed(1)}s, confidence ${Math.round(result.liveConfidence * 100)}%.`
      }))
    } catch {
      setSpotChecks((current) => ({ ...current, [index]: 'Spot-check endpoint unavailable.' }))
    } finally {
      setChecking(null)
    }
  }

  return (
    <UiDialog open={open} onClose={onClose}>
      <section
        className="modal"
        aria-describedby="benchmark-description"
        aria-labelledby="benchmark-title"
      >
        <header className="modal-header">
          <div>
            <p>Benchmark Mode</p>
            <h2 id="benchmark-title">{correct}/{results.length} correct, {avg.toFixed(1)}s avg latency</h2>
            <p id="benchmark-description" className="sr-only">Benchmark results and live spot-check controls.</p>
          </div>
          <div className="modal-actions">
            <UiTooltip content="Export benchmark CSV">
              <button className="icon-button" type="button" onClick={exportCsv} aria-label="Export benchmark CSV">
                <Download size={18} />
              </button>
            </UiTooltip>
            <button className="icon-button" type="button" onClick={onClose} aria-label="Close benchmark modal">
              <X size={18} />
            </button>
          </div>
        </header>
        <div className="benchmark-table">
          {results.map((row, index) => (
            <article key={`${row.question}-${index}`} className="benchmark-row">
              <div>
                <strong>{row.question}</strong>
                <span>{row.answer}</span>
                {spotChecks[index] && <small className="spot-check-result">{spotChecks[index]}</small>}
              </div>
              <em className={row.correct ? 'ok' : 'bad'}>{row.correct ? 'Correct' : 'Review'}</em>
              <small>{row.latencyS.toFixed(1)}s</small>
              <button className="row-action" type="button" onClick={() => spotCheck(index)} disabled={checking === index}>
                <RotateCw size={14} />
                {checking === index ? 'Checking' : 'Spot-check'}
              </button>
            </article>
          ))}
        </div>
      </section>
    </UiDialog>
  )
}
