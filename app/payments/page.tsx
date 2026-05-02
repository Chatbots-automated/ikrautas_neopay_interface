'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/payments/StatusBadge'
import { PaymentTypeBadge } from '@/components/payments/PaymentTypeBadge'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { PaymentWithDetails, PaymentType, PaymentStatus } from '@/types/payment'

export default function PaymentsPage() {
  const [payments, setPayments] = useState<PaymentWithDetails[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [paymentType, setPaymentType] = useState<PaymentType | 'all'>('all')
  const [status, setStatus] = useState<PaymentStatus | 'all'>('all')

  useEffect(() => {
    fetchPayments()
  }, [search, paymentType, status])

  async function fetchPayments() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.append('search', search)
      if (paymentType !== 'all') params.append('paymentType', paymentType)
      if (status !== 'all') params.append('status', status)

      const response = await fetch(`/api/payments?${params}`)
      const data = await response.json()

      if (response.ok) {
        setPayments(data.payments)
        setTotal(data.total)
      } else {
        console.error('Failed to fetch payments:', data.error)
      }
    } catch (error) {
      console.error('Error fetching payments:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Mokėjimai</CardTitle>
              <p className="text-sm text-slate-600 mt-1">
                Iš viso: {total} mokėjimų
              </p>
            </div>
            <Button variant="primary" size="md">
              + Naujas mokėjimas
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Paieška
                </label>
                <Input
                  type="text"
                  placeholder="Klientas, el. paštas, Lead ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Mokėjimo tipas
                </label>
                <Select
                  value={paymentType}
                  onChange={(e) => setPaymentType(e.target.value as PaymentType | 'all')}
                >
                  <option value="all">Visi</option>
                  <option value="advance">Avansas</option>
                  <option value="final">Galutinis</option>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Būsena
                </label>
                <Select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as PaymentStatus | 'all')}
                >
                  <option value="all">Visos</option>
                  <option value="created">Sukurta</option>
                  <option value="sent">Išsiųsta</option>
                  <option value="resent">Išsiųsta iš naujo</option>
                  <option value="paid">Apmokėta</option>
                  <option value="failed">Nepavyko</option>
                  <option value="expired">Pasibaigė</option>
                </Select>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-12 text-slate-500">Kraunama...</div>
            ) : payments.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                Mokėjimų nerasta
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200 text-left">
                      <th className="pb-3 text-sm font-medium text-slate-700">Klientas</th>
                      <th className="pb-3 text-sm font-medium text-slate-700">El. paštas</th>
                      <th className="pb-3 text-sm font-medium text-slate-700">Lead ID</th>
                      <th className="pb-3 text-sm font-medium text-slate-700">Item ID</th>
                      <th className="pb-3 text-sm font-medium text-slate-700">Tipas</th>
                      <th className="pb-3 text-sm font-medium text-slate-700">Suma</th>
                      <th className="pb-3 text-sm font-medium text-slate-700">Būsena</th>
                      <th className="pb-3 text-sm font-medium text-slate-700">Sukurta</th>
                      <th className="pb-3 text-sm font-medium text-slate-700"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((payment) => {
                      const detail = Array.isArray(payment.payment_request_detail)
                        ? payment.payment_request_detail[0]
                        : payment.payment_request_detail

                      return (
                        <tr
                          key={payment.id}
                          className="border-b border-slate-100 hover:bg-slate-50"
                        >
                          <td className="py-3 text-sm">
                            {detail?.client_name || (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="py-3 text-sm">
                            {detail?.client_email || (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="py-3 text-sm font-mono text-xs">
                            {payment.lead_id}
                          </td>
                          <td className="py-3 text-sm font-mono text-xs">
                            {payment.single_project_item_id}
                          </td>
                          <td className="py-3">
                            <PaymentTypeBadge type={payment.payment_type} />
                          </td>
                          <td className="py-3 text-sm font-medium">
                            {detail?.amount ? (
                              formatCurrency(detail.amount, detail.currency || 'EUR')
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="py-3">
                            {detail?.status ? (
                              <StatusBadge status={detail.status} />
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="py-3 text-sm text-slate-600">
                            {formatDate(payment.created_at)}
                          </td>
                          <td className="py-3 text-right">
                            <Link href={`/payments/${payment.id}`}>
                              <Button variant="ghost" size="sm">
                                Žiūrėti
                              </Button>
                            </Link>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
