import { Bot, ClipboardCheck, LoaderCircle, ShieldCheck } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle
} from '@/components/ui/empty'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { ComplianceRow, complianceRows } from '../data/mock'
import { api } from '../services/api'
import { useAppStore } from '../store/appStore'
import { complianceStatusVariant } from '@/lib/presentation'

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
    ).catch(() => undefined).finally(() => setRunning(false))
  }

  const askCopilot = (row: ComplianceRow) => {
    setCopilotDraftQuery(`Explain ${row.clauseId} (${row.title}) for Bharat Refinery. Use the clause quote, plant evidence, current status ${row.status}, and recommend the next remediation step.`)
    navigate('/copilot')
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-2xl font-semibold tracking-tight">OISD/PESO Compliance Matrix</h1>
          <p className="text-sm text-muted-foreground">Bharat Refinery, Jamnagar - Last run: July 7, 2026</p>
        </div>
        <Button type="button" onClick={runCheck} disabled={running}>
          {running ? (
            <LoaderCircle data-icon="inline-start" className="animate-spin" />
          ) : (
            <ShieldCheck data-icon="inline-start" />
          )}
          {running ? 'Checking...' : 'Run Compliance Check'}
        </Button>
      </header>

      {running && (
        <Card size="sm" aria-live="polite">
          <CardHeader>
            <CardTitle>
              <h2>Checking clause {progress} / {total}...</h2>
            </CardTitle>
            <CardDescription>Reviewing regulation evidence against the current plant corpus.</CardDescription>
          </CardHeader>
          <CardContent>
            <Progress
              value={(progress / total) * 100}
              aria-label={`Compliance check progress: ${progress} of ${total} clauses`}
            />
          </CardContent>
        </Card>
      )}

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>
              <h2>Clause register</h2>
            </CardTitle>
            <CardDescription>Select a clause to review its evidence and remediation guidance.</CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            {rows.length > 0 ? (
              <>
                <div className="flex flex-col md:hidden">
                  {rows.map((row) => (
                    <Button
                      key={row.clauseId}
                      type="button"
                      variant="ghost"
                      aria-pressed={selected?.clauseId === row.clauseId}
                      className="h-auto w-full flex-col items-stretch gap-3 rounded-none border-b px-(--card-spacing) py-4 text-left last:border-b-0"
                      onClick={() => setSelected(row)}
                    >
                      <span className="flex w-full flex-wrap items-center justify-between gap-2">
                        <span className="font-medium">{row.clauseId}</span>
                        <Badge variant={complianceStatusVariant(row.status)}>{row.status.replace('_', ' ')}</Badge>
                      </span>
                      <span className="w-full whitespace-normal text-sm text-muted-foreground">{row.title}</span>
                      <span className="flex w-full items-center gap-2">
                        <Progress value={row.confidence * 100} aria-label={`${Math.round(row.confidence * 100)}% confidence`} />
                        <span className="w-10 text-right text-xs text-muted-foreground">{Math.round(row.confidence * 100)}%</span>
                      </span>
                    </Button>
                  ))}
                </div>
                <div className="hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="pl-(--card-spacing)">Clause ID</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="pr-(--card-spacing)">Confidence</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((row) => (
                        <TableRow
                          key={row.clauseId}
                          tabIndex={0}
                          aria-label={`Review ${row.clauseId}: ${row.title}`}
                          aria-selected={selected?.clauseId === row.clauseId}
                          data-state={selected?.clauseId === row.clauseId ? 'selected' : undefined}
                          className="cursor-pointer focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                          onClick={() => setSelected(row)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault()
                              setSelected(row)
                            }
                          }}
                        >
                          <TableCell className="pl-(--card-spacing) font-medium">{row.clauseId}</TableCell>
                          <TableCell className="whitespace-normal">{row.title}</TableCell>
                          <TableCell>
                            <Badge variant={complianceStatusVariant(row.status)}>{row.status.replace('_', ' ')}</Badge>
                          </TableCell>
                          <TableCell className="pr-(--card-spacing)">
                            <div className="flex min-w-28 items-center gap-2">
                              <Progress value={row.confidence * 100} aria-label={`${Math.round(row.confidence * 100)}% confidence`} />
                              <span className="w-10 text-right text-muted-foreground">{Math.round(row.confidence * 100)}%</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            ) : (
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon"><ClipboardCheck /></EmptyMedia>
                  <EmptyTitle>No compliance clauses found</EmptyTitle>
                  <EmptyDescription>Run a compliance check to populate the clause register.</EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}
          </CardContent>
        </Card>

        {selected && (
          <Card>
            <CardHeader>
              <CardDescription>{selected.clauseId}</CardDescription>
              <CardTitle>
                <h2>{selected.title}</h2>
              </CardTitle>
              <CardAction>
                <Badge variant={complianceStatusVariant(selected.status)}>{selected.status.replace('_', ' ')}</Badge>
              </CardAction>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <section className="flex flex-col gap-1" aria-labelledby="clause-quote-heading">
                <h3 id="clause-quote-heading" className="text-sm font-medium">Clause Quote</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{selected.clauseQuote}</p>
              </section>
              <Separator />
              <section className="flex flex-col gap-1" aria-labelledby="plant-evidence-heading">
                <h3 id="plant-evidence-heading" className="text-sm font-medium">Plant Evidence</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{selected.plantEvidence}</p>
              </section>
              <Separator />
              <section className="flex flex-col gap-1" aria-labelledby="remediation-heading">
                <h3 id="remediation-heading" className="text-sm font-medium">Remediation</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{selected.remediation}</p>
              </section>
            </CardContent>
            <CardFooter className="justify-end">
              <Button type="button" onClick={() => askCopilot(selected)}>
                <Bot data-icon="inline-start" />
                Ask Copilot
              </Button>
            </CardFooter>
          </Card>
        )}
      </div>
    </div>
  )
}
