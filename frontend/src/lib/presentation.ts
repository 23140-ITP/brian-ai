import type { ComplianceRow } from '@/data/mock'

export const chartTooltipStyle = {
  backgroundColor: 'var(--popover)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius)',
  color: 'var(--popover-foreground)',
}

export function complianceStatusVariant(status: ComplianceRow['status']) {
  if (status === 'NON_COMPLIANT') return 'destructive' as const
  if (status === 'COMPLIANT') return 'secondary' as const
  return 'outline' as const
}
