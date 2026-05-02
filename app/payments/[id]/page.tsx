'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/payments/StatusBadge'
import { PaymentTypeBadge } from '@/components/payments/PaymentTypeBadge'
import { JsonViewer } from '@/components/payments/JsonViewer'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { PaymentDetailView } from '@/types/payment'

export default function PaymentDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const [paymentDetail, setPaymentDetail] = useState<PaymentDetailView | null>(null)
  const [loading, setLoading] = useState(true)
  const [resending, setResending] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [showResendForm, setShowResendForm] = useState(false)
  const [newAmount, setNewAmount] = useState('')
  const [generateNew, setGenerateNew] = useState(false)

  useEffect(() => {
    if (id) {
      fetchPaymentDetail()
    }
  }, [id])

  async function fetchPaymentDetail() {
    setLoading(true)
    try {
      const response = await fetch(`/api/payments/${id}`)
      const data = await response.json()

      if (response.ok) {
        setPaymentDetail(data)
      } else {
        console.error('Failed to fetch payment detail:', data.error)
      }
    } catch (error) {
      console.error('Error fetching payment detail:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleResend() {
    setResending(true)
    try {
      const body: Record<string, unknown> = {
        sentBy: 'dashboard_user',
      }

      // Add amount override if provided
      if (newAmount && parseFloat(newAmount) > 0) {
        body.amountOverride = parseFloat(newAmount)
      }

      // Add generate new flag if checked
      if (generateNew) {
        body.generateNew = true
      }

      const response = await fetch(`/api/payments/${id}/resend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (response.ok) {
        alert('Mokėjimo nuoroda išsiųsta sėkmingai!')
        setShowResendForm(false)
        setNewAmount('')
        setGenerateNew(false)
        await fetchPaymentDetail()
      } else {
        const data = await response.json()
        alert(`Klaida: ${data.error}`)
      }
    } catch (error) {
      console.error('Error resending payment:', error)
      alert('Nepavyko išsiųsti mokėjimo nuorodos')
    } finally {
      setResending(false)
    }
  }

  async function handleSyncMonday() {
    setSyncing(true)
    try {
      const response = await fetch(`/api/payments/${id}/sync-monday`, {
        method: 'POST',
      })

      if (response.ok) {
        alert('Duomenys sinchronizuoti iš Monday.com!')
        await fetchPaymentDetail()
      } else {
        const data = await response.json()
        alert(`Klaida: ${data.error}`)
      }
    } catch (error) {
      console.error('Error syncing from Monday:', error)
      alert('Nepavyko sinchronizuoti duomenų')
    } finally {
      setSyncing(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12 text-slate-500">Kraunama...</div>
      </div>
    )
  }

  if (!paymentDetail) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12 text-slate-500">Mokėjimas nerastas</div>
      </div>
    )
  }

  const { payment, details, events, emailLogs } = paymentDetail

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          ← Atgal
        </Button>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle>Mokėjimo informacija</CardTitle>
                <div className="flex items-center gap-2 mt-2">
                  <PaymentTypeBadge type={payment.payment_type} />
                  {details?.status && <StatusBadge status={details.status} />}
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSyncMonday}
                  disabled={syncing}
                >
                  {syncing ? 'Sinchronizuojama...' : 'Sinchronizuoti iš Monday'}
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setShowResendForm(!showResendForm)}
                  disabled={details?.status === 'paid'}
                >
                  {showResendForm ? 'Uždaryti' : 'Išsiųsti mokėjimą'}
                </Button>
              </div>
            </div>
          </CardHeader>

          {showResendForm && (
            <div className="px-6 py-4 bg-blue-50 border-b border-blue-100">
              <h4 className="text-sm font-semibold text-slate-900 mb-3">
                Išsiųsti {payment.payment_type === 'advance' ? 'avanso' : 'galutinį'} mokėjimą
              </h4>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Suma (EUR) {details?.amount && <span className="text-slate-500">- dabartinė: {details.amount}€</span>}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={newAmount}
                    onChange={(e) => setNewAmount(e.target.value)}
                    placeholder={details?.amount ? `${details.amount}` : 'Įveskite sumą'}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Palikite tuščią, kad naudotų esamą sumą
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="generateNew"
                    checked={generateNew}
                    onChange={(e) => setGenerateNew(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="generateNew" className="text-sm text-slate-700">
                    Generuoti naują mokėjimo nuorodą
                  </label>
                </div>

                <div className="bg-blue-100 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs text-blue-800">
                    <strong>Webhook:</strong> https://n8n-up8s.onrender.com/webhook/...
                  </p>
                  <p className="text-xs text-blue-700 mt-1">
                    Mokėjimo nuoroda bus išsiųsta klientui per n8n webhook
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleResend}
                    disabled={resending}
                    className="flex-1"
                  >
                    {resending ? 'Siunčiama...' : '📧 Siųsti mokėjimo nuorodą'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowResendForm(false)
                      setNewAmount('')
                      setGenerateNew(false)
                    }}
                    disabled={resending}
                  >
                    Atšaukti
                  </Button>
                </div>
              </div>
            </div>
          )}

          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-semibold text-slate-700 mb-3">
                  Kliento informacija
                </h4>
                <dl className="space-y-2">
                  <div>
                    <dt className="text-xs text-slate-500">Vardas</dt>
                    <dd className="text-sm font-medium">
                      {details?.client_name || '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">El. paštas</dt>
                    <dd className="text-sm font-medium">
                      {details?.client_email || '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Telefonas</dt>
                    <dd className="text-sm font-medium">
                      {details?.client_phone || '—'}
                    </dd>
                  </div>
                </dl>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-slate-700 mb-3">
                  Mokėjimo duomenys
                </h4>
                <dl className="space-y-2">
                  <div>
                    <dt className="text-xs text-slate-500">Suma</dt>
                    <dd className="text-sm font-medium">
                      {details?.amount
                        ? formatCurrency(details.amount, details.currency || 'EUR')
                        : '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Transaction ID</dt>
                    <dd className="text-sm font-mono text-xs">
                      {payment.transaction_id}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Lead ID</dt>
                    <dd className="text-sm font-mono text-xs">{payment.lead_id}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Single Project Item ID</dt>
                    <dd className="text-sm font-mono text-xs">
                      {payment.single_project_item_id}
                    </dd>
                  </div>
                </dl>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-slate-700 mb-3">Laikai</h4>
                <dl className="space-y-2">
                  <div>
                    <dt className="text-xs text-slate-500">Sukurta</dt>
                    <dd className="text-sm">{formatDate(payment.created_at)}</dd>
                  </div>
                  {details?.sent_at && (
                    <div>
                      <dt className="text-xs text-slate-500">Išsiųsta</dt>
                      <dd className="text-sm">{formatDate(details.sent_at)}</dd>
                    </div>
                  )}
                  {details?.last_resent_at && (
                    <div>
                      <dt className="text-xs text-slate-500">Paskutinį kartą išsiųsta</dt>
                      <dd className="text-sm">{formatDate(details.last_resent_at)}</dd>
                    </div>
                  )}
                  {details?.paid_at && (
                    <div>
                      <dt className="text-xs text-slate-500">Apmokėta</dt>
                      <dd className="text-sm">{formatDate(details.paid_at)}</dd>
                    </div>
                  )}
                </dl>
              </div>

              {details?.error_message && (
                <div>
                  <h4 className="text-sm font-semibold text-red-700 mb-3">Klaida</h4>
                  <p className="text-sm text-red-600">{details.error_message}</p>
                </div>
              )}
            </div>

            {details?.payment_url && (
              <div className="mt-6">
                <h4 className="text-sm font-semibold text-slate-700 mb-2">
                  Mokėjimo nuoroda
                </h4>
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                  <a
                    href={details.payment_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline break-all"
                  >
                    {details.payment_url}
                  </a>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Įvykių istorija</CardTitle>
          </CardHeader>
          <CardContent>
            {events.length === 0 ? (
              <div className="text-sm text-slate-500">Įvykių nėra</div>
            ) : (
              <div className="space-y-3">
                {events.map((event) => (
                  <div
                    key={event.id}
                    className="border-l-2 border-blue-300 pl-4 py-2"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-sm font-medium text-slate-900">
                          {event.event_type}
                        </div>
                        {event.message && (
                          <div className="text-sm text-slate-600 mt-1">
                            {event.message}
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-slate-500">
                        {formatDate(event.created_at)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>El. laiškų istorija</CardTitle>
          </CardHeader>
          <CardContent>
            {emailLogs.length === 0 ? (
              <div className="text-sm text-slate-500">El. laiškų nėra</div>
            ) : (
              <div className="space-y-3">
                {emailLogs.map((log) => (
                  <div key={log.id} className="border border-slate-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="text-sm font-medium text-slate-900">
                          {log.recipient_email}
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          {log.subject}
                        </div>
                      </div>
                      <div className="text-xs text-slate-500">
                        {formatDate(log.sent_at)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">
                        Siuntėjas: {log.provider || 'n8n'}
                      </span>
                      {log.status && (
                        <span className="text-xs text-slate-500">• {log.status}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {details?.monday_snapshot && (
          <Card>
            <CardHeader>
              <CardTitle>Monday.com duomenys</CardTitle>
            </CardHeader>
            <CardContent>
              <JsonViewer data={details.monday_snapshot} />
            </CardContent>
          </Card>
        )}

        {details?.neopay_payload && (
          <Card>
            <CardHeader>
              <CardTitle>NeoPay duomenys</CardTitle>
            </CardHeader>
            <CardContent>
              <JsonViewer data={details.neopay_payload} />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
