import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ComplianceRow, complianceRows } from '../data/mock'
import { api } from '../services/api'
import { useAppStore } from '../store/appStore'

export function CompliancePage() {
  const navigate = useNavigate()
  const { setCopilotDraftQuery } = useAppStore()
  const [rows, setRows] = useState<ComplianceRow[]>(complianceRows)
  const [selected, setSelected] = useState<ComplianceRow | null>(complianceRows[0])
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [total, setTotal] = useState(18)

  useEffect(() => {
    api.compliance().then((nextRows) => {
      setRows(nextRows)
      setSelected(nextRows[0] || null)
      setTotal(nextRows.length || 18)
    })
  }, [])

  const runCheck = () => {
    setRunning(true)
    setProgress(0)
    const nextRows = new Map(rows.map((row) => [row.clauseId, row]))
    api.runComplianceCheck(
      (current, nextTotal) => {
        setProgress(current)
        setTotal(nextTotal)
      },
      (row) => {
        nextRows.set(row.clauseId, row)
        const updated = Array.from(nextRows.values())
        setRows(updated)
        setSelected((current) => current?.clauseId === row.clauseId ? row : current)
      }
    ).finally(() => setRunning(false))
  }

  const askCopilot = (row: ComplianceRow) => {
    setCopilotDraftQuery(`Explain ${row.clauseId} (${row.title}) for Bharat Refinery. Use the clause quote, plant evidence, current status ${row.status}, and recommend the next remediation step.`)
    navigate('/copilot')
  }

  return (
    <div className="page compliance-page">
      <section className="page-heading compact">
        <div>
          <h1>OISD/PESO Compliance Matrix</h1>
          <p>Bharat Refinery, Jamnagar - Last run: July 7, 2026</p>
        </div>
        <button type="button" onClick={runCheck} disabled={running}>{running ? 'Checking...' : 'Run Compliance Check'}</button>
      </section>
      {running && (
        <div className="progress-panel">
          <span>Checking clause {progress} / {total}...</span>
          <div><i style={{ width: `${(progress / total) * 100}%` }} /></div>
        </div>
      )}
      <section className="table-with-drawer">
        <div className="panel compliance-table">
          <div className="table-head">
            <span>Clause ID</span>
            <span>Title</span>
            <span>Status</span>
            <span>Confidence</span>
          </div>
          {rows.map((row) => (
            <button key={row.clauseId} type="button" className="table-row" onClick={() => setSelected(row)}>
              <span>{row.clauseId}</span>
              <strong>{row.title}</strong>
              <em className={`status ${row.status.toLowerCase()}`}>{row.status.replace('_', ' ')}</em>
              <span>{Math.round(row.confidence * 100)}%</span>
            </button>
          ))}
        </div>
        {selected && (
          <aside className="panel clause-drawer">
            <p>{selected.clauseId}</p>
            <h2>{selected.title}</h2>
            <em className={`status ${selected.status.toLowerCase()}`}>{selected.status.replace('_', ' ')}</em>
            <h3>Clause Quote</h3>
            <p>{selected.clauseQuote}</p>
            <h3>Plant Evidence</h3>
            <p>{selected.plantEvidence}</p>
            <h3>Remediation</h3>
            <p>{selected.remediation}</p>
            <button type="button" onClick={() => askCopilot(selected)}>Ask Copilot</button>
          </aside>
        )}
      </section>
    </div>
  )
}
