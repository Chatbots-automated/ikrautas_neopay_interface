import { Badge } from '@/components/ui/badge'
import type { PaymentStatus } from '@/types/payment'

interface StatusBadgeProps {
  status: PaymentStatus
}

const statusConfig: Record<PaymentStatus, { label: string; variant: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple' }> = {
  created: { label: 'Sukurta', variant: 'default' },
  sent: { label: 'Išsiųsta', variant: 'info' },
  resent: { label: 'Išsiųsta iš naujo', variant: 'purple' },
  paid: { label: 'Apmokėta', variant: 'success' },
  failed: { label: 'Nepavyko', variant: 'danger' },
  expired: { label: 'Pasibaigė', variant: 'warning' },
  cancelled: { label: 'Atšaukta', variant: 'default' },
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.created

  return <Badge variant={config.variant}>{config.label}</Badge>
}
