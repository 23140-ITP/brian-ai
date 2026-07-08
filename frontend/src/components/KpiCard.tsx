import { LucideIcon } from 'lucide-react'

type KpiCardProps = {
  label: string
  value: string
  detail: string
  tone: 'amber' | 'cyan' | 'green' | 'red'
  icon: LucideIcon
}

export function KpiCard({ label, value, detail, tone, icon: Icon }: KpiCardProps) {
  return (
    <article className={`kpi-card tone-${tone}`}>
      <div className="kpi-icon"><Icon size={18} /></div>
      <div>
        <p className="kpi-label">{label}</p>
        <strong>{value}</strong>
        <span>{detail}</span>
      </div>
    </article>
  )
}
