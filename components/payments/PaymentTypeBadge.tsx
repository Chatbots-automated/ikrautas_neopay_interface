import { Badge } from '@/components/ui/badge'
import type { PaymentType } from '@/types/payment'

interface PaymentTypeBadgeProps {
  type: PaymentType
}

const typeConfig: Record<PaymentType, { label: string; variant: 'amber' | 'indigo' }> = {
  advance: { label: 'Avansas', variant: 'amber' },
  final: { label: 'Galutinis', variant: 'indigo' },
}

export function PaymentTypeBadge({ type }: PaymentTypeBadgeProps) {
  const config = typeConfig[type]

  return <Badge variant={config.variant}>{config.label}</Badge>
}
