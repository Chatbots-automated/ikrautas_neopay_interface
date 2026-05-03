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

interface ClientGroup {
  clientName: string
  clientEmail: string | null
  leadId: string
  payments: PaymentWithDetails[]
}

interface DecodedUrlInfo {
  amount?: number
  currency?: string
  transactionId?: string
  singleProjectItemId?: string
  error?: string
}

function decodePaymentUrlClient(url: string | null | undefined): DecodedUrlInfo {
  if (!url) return {}
  
  try {
    const qIndex = url.indexOf('?')
    if (qIndex === -1) return { error: 'Invalid URL format' }
    
    const token = url.slice(qIndex + 1).trim()
    if (!token || token.split('.').length < 3) return { error: 'Invalid JWT' }
    
    const parts = token.split('.')
    const payloadBase64 = parts[1]
    const payloadJson = atob(payloadBase64.replace(/-/g, '+').replace(/_/g, '/'))
    const payload = JSON.parse(payloadJson)
    
    let amount = payload.amount
    let transactionId = payload.transactionId
    let singleProjectItemId = payload.singleProjectItemId
    
    if (payload.transactions && typeof payload.transactions === 'object') {
      const txIds = Object.keys(payload.transactions)
      if (txIds.length > 0) {
        const txId = txIds[0]
        const txData = payload.transactions[txId]
        if (!amount && txData?.amount) amount = txData.amount
        if (!transactionId) transactionId = txId
      }
    }
    
    return {
      amount: amount ? Number(amount) : undefined,
      currency: payload.currency || 'EUR',
      transactionId,
      singleProjectItemId
    }
  } catch (error) {
    return { error: 'Failed to decode' }
  }
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<PaymentWithDetails[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [search, setSearch] = useState('')
  const [paymentType, setPaymentType] = useState<PaymentType | 'all'>('all')
  const [status, setStatus] = useState<PaymentStatus | 'all'>('all')
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [expandedClient, setExpandedClient] = useState<string | null>(null)

  useEffect(() => {
    // Only fetch if there's a search term or filters applied
    if (search || paymentType !== 'all' || status !== 'all') {
      fetchPayments()
    } else {
      // Clear payments when no search
      setPayments([])
      setTotal(0)
      setLoading(false)
    }
  }, [search, paymentType, status])

  // Auto-refresh every hour if enabled
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      console.log('Auto-refreshing payments from Monday.com...')
      handleSyncFromMonday()
    }, 60 * 60 * 1000) // 1 hour

    return () => clearInterval(interval)
  }, [autoRefresh])

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

  async function handleSyncFromMonday() {
    if (!confirm('Ar tikrai norite sinchronizuoti visus mokėjimus iš Monday.com? Tai gali užtrukti kelias minutes.')) {
      return
    }

    setSyncing(true)
    try {
      const response = await fetch('/api/sync/monday', {
        method: 'POST',
      })

      const data = await response.json()

      if (response.ok) {
        alert(
          `Sinchronizacija baigta!\n\n` +
          `Iš viso: ${data.results.total} Monday įrašų\n` +
          `Avanso mokėjimų: ${data.results.advanceSynced}\n` +
          `Galutinių mokėjimų: ${data.results.finalSynced}\n` +
          `Klaidų: ${data.results.errors}`
        )
        await fetchPayments() // Refresh the list
      } else {
        alert(`Klaida: ${data.error}`)
      }
    } catch (error) {
      console.error('Error syncing from Monday:', error)
      alert('Nepavyko sinchronizuoti mokėjimų')
    } finally {
      setSyncing(false)
    }
  }

  // Group payments by client
  function groupPaymentsByClient(): ClientGroup[] {
    const grouped = new Map<string, ClientGroup>()
    
    for (const payment of payments) {
      const detail = Array.isArray(payment.payment_request_detail)
        ? payment.payment_request_detail[0]
        : payment.payment_request_detail
      
      const clientName = detail?.client_name || 'Nežinomas klientas'
      const clientEmail = detail?.client_email || null
      const key = `${clientName}-${payment.lead_id}`
      
      if (!grouped.has(key)) {
        grouped.set(key, {
          clientName,
          clientEmail,
          leadId: payment.lead_id,
          payments: []
        })
      }
      
      grouped.get(key)!.payments.push(payment)
    }
    
    // Sort payments within each group: advance first, then final
    for (const group of grouped.values()) {
      group.payments.sort((a, b) => {
        if (a.payment_type === 'advance' && b.payment_type === 'final') return -1
        if (a.payment_type === 'final' && b.payment_type === 'advance') return 1
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      })
    }
    
    return Array.from(grouped.values())
  }

  const clientGroups = groupPaymentsByClient()

  return (
    <div className="container mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Klientai ir Mokėjimai</CardTitle>
              <p className="text-sm text-slate-600 mt-1">
                {!search && paymentType === 'all' && status === 'all' 
                  ? 'Naudokite paiešką, kad rastumėte klientus'
                  : `Iš viso: ${clientGroups.length} klientų (${total} mokėjimų)`
                }
              </p>
            </div>
            <div className="flex gap-2">
              <div className="flex items-center gap-2 mr-2">
                <input
                  type="checkbox"
                  id="autoRefresh"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="autoRefresh" className="text-sm text-slate-700">
                  Auto-atnaujinimas (1h)
                </label>
              </div>
              <Button
                variant="outline"
                size="md"
                onClick={handleSyncFromMonday}
                disabled={syncing}
              >
                {syncing ? '🔄 Sinchronizuojama...' : '🔄 Sinchronizuoti iš Monday'}
              </Button>
            </div>
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
            ) : !search && paymentType === 'all' && status === 'all' ? (
              <div className="text-center py-12">
                <div className="text-slate-400 mb-2">
                  <svg className="mx-auto h-12 w-12 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <p className="text-lg font-medium text-slate-700 mb-1">
                  Ieškokite kliento
                </p>
                <p className="text-sm text-slate-500">
                  Įveskite kliento vardą, el. paštą arba Lead ID paieškos lauke
                </p>
              </div>
            ) : clientGroups.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                Mokėjimų nerasta
              </div>
            ) : (
              <div className="space-y-4">
                {clientGroups.map((group) => {
                  const key = `${group.clientName}-${group.leadId}`
                  const isExpanded = expandedClient === key
                  const advancePayment = group.payments.find(p => p.payment_type === 'advance')
                  const finalPayment = group.payments.find(p => p.payment_type === 'final')
                  
                  return (
                    <Card 
                      key={key}
                      className="cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => setExpandedClient(isExpanded ? null : key)}
                    >
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-lg font-semibold text-slate-900">
                                {group.clientName}
                              </h3>
                              <span className="text-sm font-mono text-slate-500">
                                Lead ID: {group.leadId}
                              </span>
                            </div>
                            
                            {group.clientEmail && (
                              <p className="text-sm text-slate-600 mb-3">
                                {group.clientEmail}
                              </p>
                            )}
                            
                                    <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4 text-sm">
                                <div className="flex items-center gap-2">
                                  <span className="text-slate-600">Mokėjimai:</span>
                                  <span className="font-medium">{group.payments.length}</span>
                                </div>
                                {advancePayment && (
                                  <div className="flex items-center gap-2">
                                    <PaymentTypeBadge type="advance" />
                                    {(() => {
                                      const detail = Array.isArray(advancePayment.payment_request_detail)
                                        ? advancePayment.payment_request_detail[0]
                                        : advancePayment.payment_request_detail
                                      return detail?.status && <StatusBadge status={detail.status} />
                                    })()}
                                  </div>
                                )}
                                {finalPayment && (
                                  <div className="flex items-center gap-2">
                                    <PaymentTypeBadge type="final" />
                                    {(() => {
                                      const detail = Array.isArray(finalPayment.payment_request_detail)
                                        ? finalPayment.payment_request_detail[0]
                                        : finalPayment.payment_request_detail
                                      return detail?.status && <StatusBadge status={detail.status} />
                                    })()}
                                  </div>
                                )}
                              </div>
                              <Link href={`/clients/${group.leadId}`} onClick={(e) => e.stopPropagation()}>
                                <Button variant="outline" size="sm">
                                  Žiūrėti detaliau
                                </Button>
                              </Link>
                            </div>
                          </div>
                          
                          <div className="text-slate-400">
                            {isExpanded ? '▼' : '▶'}
                          </div>
                        </div>
                        
                        {isExpanded && (
                          <div className="mt-6 pt-6 border-t border-slate-200" onClick={(e) => e.stopPropagation()}>
                            <div className="space-y-4">
                              {group.payments.map((payment) => {
                                const detail = Array.isArray(payment.payment_request_detail)
                                  ? payment.payment_request_detail[0]
                                  : payment.payment_request_detail
                                
                                const decodedUrl = decodePaymentUrlClient(detail?.payment_url)
                                
                                return (
                                  <div 
                                    key={payment.id}
                                    className="bg-slate-50 rounded-lg p-4"
                                  >
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                                      <div>
                                        <div className="text-xs text-slate-500 mb-1">Tipas</div>
                                        <PaymentTypeBadge type={payment.payment_type} />
                                      </div>
                                      <div>
                                        <div className="text-xs text-slate-500 mb-1">Būsena</div>
                                        {detail?.status ? (
                                          <StatusBadge status={detail.status} />
                                        ) : (
                                          <span className="text-slate-400">—</span>
                                        )}
                                      </div>
                                      <div>
                                        <div className="text-xs text-slate-500 mb-1">Suma</div>
                                        <div className="text-sm font-medium">
                                          {decodedUrl.amount ? (
                                            <span className="text-blue-600">
                                              {formatCurrency(decodedUrl.amount, decodedUrl.currency || 'EUR')}
                                              <span className="text-xs text-slate-500 ml-1">(iš URL)</span>
                                            </span>
                                          ) : detail?.amount ? (
                                            formatCurrency(detail.amount, detail.currency || 'EUR')
                                          ) : (
                                            <span className="text-slate-400">—</span>
                                          )}
                                        </div>
                                      </div>
                                      <div>
                                        <div className="text-xs text-slate-500 mb-1">Sukurta</div>
                                        <div className="text-sm text-slate-600">
                                          {formatDate(payment.created_at)}
                                        </div>
                                      </div>
                                    </div>
                                    
                                    {detail?.payment_url && (
                                      <div className="mb-3 p-3 bg-blue-50 rounded border border-blue-200">
                                        <div className="text-xs font-medium text-blue-900 mb-2">Dekuotas URL</div>
                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                          {decodedUrl.amount && (
                                            <div>
                                              <span className="text-blue-700">Suma:</span>
                                              <span className="ml-2 font-mono text-blue-900">
                                                {decodedUrl.amount} {decodedUrl.currency}
                                              </span>
                                            </div>
                                          )}
                                          {decodedUrl.transactionId && (
                                            <div>
                                              <span className="text-blue-700">Transaction ID:</span>
                                              <span className="ml-2 font-mono text-blue-900">
                                                {decodedUrl.transactionId}
                                              </span>
                                            </div>
                                          )}
                                          {decodedUrl.singleProjectItemId && (
                                            <div>
                                              <span className="text-blue-700">Item ID:</span>
                                              <span className="ml-2 font-mono text-blue-900">
                                                {decodedUrl.singleProjectItemId}
                                              </span>
                                            </div>
                                          )}
                                          {decodedUrl.error && (
                                            <div className="col-span-2 text-red-600">
                                              {decodedUrl.error}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    )}
                                    
                                    <div className="grid grid-cols-2 gap-4 mb-3">
                                      <div>
                                        <div className="text-xs text-slate-500 mb-1">Item ID</div>
                                        <div className="text-xs font-mono text-slate-700">
                                          {payment.single_project_item_id}
                                        </div>
                                      </div>
                                      <div>
                                        <div className="text-xs text-slate-500 mb-1">Transaction ID</div>
                                        <div className="text-xs font-mono text-slate-700">
                                          {payment.transaction_id}
                                        </div>
                                      </div>
                                    </div>
                                    
                                    {detail?.sent_at && (
                                      <div className="text-xs text-slate-600 mb-2">
                                        Išsiųsta: {formatDate(detail.sent_at)}
                                      </div>
                                    )}
                                    
                                    <div className="flex justify-end gap-2">
                                      <Link href={`/clients/${group.leadId}`}>
                                        <Button variant="outline" size="sm">
                                          Visi mokėjimai
                                        </Button>
                                      </Link>
                                      <Link href={`/payments/${payment.id}`}>
                                        <Button variant="outline" size="sm">
                                          Pilna istorija
                                        </Button>
                                      </Link>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
