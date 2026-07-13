import { Download, RotateCw, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { BenchmarkResult } from '../data/mock'
import { api, BenchmarkSummary } from '../services/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

type BenchmarkModalProps = {
  open: boolean
  results: BenchmarkResult[]
  onClose: () => void
}

export function BenchmarkModal({ open, results, onClose }: BenchmarkModalProps) {
  const [checking, setChecking] = useState<number | null>(null)
  const [spotChecks, setSpotChecks] = useState<Record<number, string>>({})
  const [summary, setSummary] = useState<BenchmarkSummary | null>(null)

  useEffect(() => {
    if (open) api.benchmarkSummary().then(setSummary)
  }, [open])

  const correct = results.filter((row) => row.correct).length
  const avg = results.length
    ? results.reduce((sum, row) => sum + row.latencyS, 0) / results.length
    : 0

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
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="max-w-[min(72rem,calc(100%-2rem))] sm:max-w-[min(72rem,calc(100%-2rem))]">
        <DialogHeader>
          <DialogTitle>Benchmark mode</DialogTitle>
          <DialogDescription>
            {correct}/{results.length} correct with {avg.toFixed(1)}s average cached latency. Run a live spot-check on any row.
          </DialogDescription>
        </DialogHeader>
        {summary && (
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border bg-border md:grid-cols-4" aria-label="Evaluation summary">
            {[
              ['Fixture pass rate', `${Math.round(summary.questionAccuracy * 100)}%`],
              ['Entity F1', `${Math.round(summary.entityExtraction.f1 * 100)}%`],
              ['Safe abstentions', `${summary.adversarialAbstentions}`],
              ['Average latency', `${summary.averageLatencyS.toFixed(1)}s`]
            ].map(([label, value]) => (
              <div key={label} className="bg-background px-3 py-2">
                <div className="text-xs text-muted-foreground">{label}</div>
                <div className="font-heading text-lg font-semibold tabular-nums">{value}</div>
              </div>
            ))}
          </div>
        )}
        <ScrollArea className="max-h-[65vh] rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Question and cached answer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Latency</TableHead>
                <TableHead className="text-right">Verification</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.map((row, index) => (
                <TableRow key={`${row.question}-${index}`}>
                  <TableCell className="max-w-xl whitespace-normal">
                    <div className="flex flex-col gap-1">
                      <span className="font-medium">{row.question}</span>
                      <span className="text-sm text-muted-foreground">{row.answer}</span>
                      {spotChecks[index] && <span className="text-xs text-info">{spotChecks[index]}</span>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={row.correct ? 'secondary' : 'destructive'}>
                      {row.correct ? 'Correct' : 'Review'}
                    </Badge>
                  </TableCell>
                  <TableCell className="tabular-nums">{row.latencyS.toFixed(1)}s</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      type="button"
                      onClick={() => spotCheck(index)}
                      disabled={checking === index}
                    >
                      <RotateCw data-icon="inline-start" className={cn(checking === index && 'animate-spin')} />
                      {checking === index ? 'Checking' : 'Spot-check'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
        <DialogFooter className="sm:justify-between">
          <Button variant="outline" type="button" onClick={onClose}>
            <X data-icon="inline-start" />
            Close
          </Button>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button type="button" onClick={exportCsv}>
                <Download data-icon="inline-start" />
                Export CSV
              </Button>
            </TooltipTrigger>
            <TooltipContent>Download all benchmark rows</TooltipContent>
          </Tooltip>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
