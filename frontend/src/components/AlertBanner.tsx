import { AlertTriangle } from 'lucide-react'
import { Alert } from '../data/mock'

type AlertBannerProps = {
  alerts: Alert[]
}

export function AlertBanner({ alerts }: AlertBannerProps) {
  const primary = alerts.find((alert) => alert.severity === 'HIGH') || alerts[0]

  if (!primary) return null

  return (
    <section className="alert-banner">
      <div className="alert-banner-icon"><AlertTriangle size={20} /></div>
      <div>
        <p>Failure Alerts</p>
        <strong>{primary.tag}: {primary.message}</strong>
        <span>{primary.evidence}</span>
      </div>
      <button type="button">Open evidence</button>
    </section>
  )
}
