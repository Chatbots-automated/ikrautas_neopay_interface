'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/payments/StatusBadge'
import { PaymentTypeBadge } from '@/components/payments/PaymentTypeBadge'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { PaymentWithDetails } from '@/types/payment'

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

export default function ClientDetailPage() {
  const params = useParams()
  const router = useRouter()
  const leadId = params.leadId as string
  
  const [payments, setPayments] = useState<PaymentWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [clientName, setClientName] = useState<string>('')
  const [clientEmail, setClientEmail] = useState<string | null>(null)

  useEffect(() => {
    fetchClientPayments()
  }, [leadId])

  async function fetchClientPayments() {
    setLoading(true)
    try {
      // Fetch all payments and filter client-side
      const response = await fetch(`/api/payments?limit=1000`)
      const data = await response.json()

      if (response.ok) {
        // Filter by exact lead_id match
        const clientPayments = data.payments.filter((p: PaymentWithDetails) => {
          return p.lead_id === leadId
        })
        
        // Sort: advance first, then by date
        clientPayments.sort((a: PaymentWithDetails, b: PaymentWithDetails) => {
          if (a.payment_type === 'advance' && b.payment_type === 'final') return -1
          if (a.payment_type === 'final' && b.payment_type === 'advance') return 1
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        })
        
        setPayments(clientPayments)
        
        if (clientPayments.length > 0) {
          const firstPayment = clientPayments[0]
          const detail = Array.isArray(firstPayment.payment_request_detail)
            ? firstPayment.payment_request_detail[0]
            : firstPayment.payment_request_detail
          
          setClientName(detail?.client_name || 'Nežinomas klientas')
          setClientEmail(detail?.client_email || null)
        }
      } else {
        console.error('Failed to fetch payments:', data.error)
      }
    } catch (error) {
      console.error('Error fetching payments:', error)
    } finally {
      setLoading(false)
    }
  }

  const advancePayments = payments.filter(p => p.payment_type === 'advance')
  const finalPayments = payments.filter(p => p.payment_type === 'final')

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/payments')}
          className="mb-4"
        >
          ← Atgal į klientų sąrašą
        </Button>
        
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">
              {clientName}
            </h1>
            {clientEmail && (
              <p className="text-lg text-slate-600 mb-2">{clientEmail}</p>
            )}
            <p className="text-sm font-mono text-slate-500">
              Lead ID: {leadId}
            </p>
          </div>
          
          <div className="text-right">
            <div className="text-sm text-slate-600">Mokėjimų:</div>
            <div className="text-3xl font-bold text-slate-900">{payments.length}</div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-500">Kraunama...</div>
      ) : payments.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          Mokėjimų nerasta šiam klientui
        </div>
      ) : (
        <div className="space-y-6">
          {advancePayments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PaymentTypeBadge type="advance" />
                  <span>Avanso Mokėjimai</span>
                  <span className="text-sm font-normal text-slate-500">
                    ({advancePayments.length})
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {advancePayments.map((payment) => {
                    const detail = Array.isArray(payment.payment_request_detail)
                      ? payment.payment_request_detail[0]
                      : payment.payment_request_detail
                    
                    const decodedUrl = decodePaymentUrlClient(detail?.payment_url)
                    
                    return (
                      <div 
                        key={payment.id}
                        className="border border-slate-200 rounded-lg p-4 hover:border-slate-300 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            {detail?.status && <StatusBadge status={detail.status} />}
                            {decodedUrl.amount && (
                              <span className="text-lg font-semibold text-slate-900">
                                {formatCurrency(decodedUrl.amount, decodedUrl.currency || 'EUR')}
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-slate-600">
                            {formatDate(payment.created_at)}
                          </div>
                        </div>

                        {detail?.payment_url && (
                          <div className="mb-4 p-3 bg-blue-50 rounded border border-blue-200">
                            <div className="text-xs font-medium text-blue-900 mb-2">
                              Dekuotas URL
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
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
                                  <span className="ml-2 font-mono text-blue-900 text-xs">
                                    {decodedUrl.transactionId}
                                  </span>
                                </div>
                              )}
                              {decodedUrl.singleProjectItemId && (
                                <div>
                                  <span className="text-blue-700">Item ID:</span>
                                  <span className="ml-2 font-mono text-blue-900 text-xs">
                                    {decodedUrl.singleProjectItemId}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
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
                          {detail?.sent_at && (
                            <div>
                              <div className="text-xs text-slate-500 mb-1">Išsiųsta</div>
                              <div className="text-xs text-slate-700">
                                {formatDate(detail.sent_at)}
                              </div>
                            </div>
                          )}
                          {detail?.paid_at && (
                            <div>
                              <div className="text-xs text-slate-500 mb-1">Apmokėta</div>
                              <div className="text-xs text-slate-700">
                                {formatDate(detail.paid_at)}
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="flex justify-end">
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
              </CardContent>
            </Card>
          )}

          {finalPayments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PaymentTypeBadge type="final" />
                  <span>Galutiniai Mokėjimai</span>
                  <span className="text-sm font-normal text-slate-500">
                    ({finalPayments.length})
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {finalPayments.map((payment) => {
                    const detail = Array.isArray(payment.payment_request_detail)
                      ? payment.payment_request_detail[0]
                      : payment.payment_request_detail
                    
                    const decodedUrl = decodePaymentUrlClient(detail?.payment_url)
                    
                    return (
                      <div 
                        key={payment.id}
                        className="border border-slate-200 rounded-lg p-4 hover:border-slate-300 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            {detail?.status && <StatusBadge status={detail.status} />}
                            {decodedUrl.amount && (
                              <span className="text-lg font-semibold text-slate-900">
                                {formatCurrency(decodedUrl.amount, decodedUrl.currency || 'EUR')}
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-slate-600">
                            {formatDate(payment.created_at)}
                          </div>
                        </div>

                        {detail?.payment_url && (
                          <div className="mb-4 p-3 bg-green-50 rounded border border-green-200">
                            <div className="text-xs font-medium text-green-900 mb-2">
                              Dekuotas URL
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                              {decodedUrl.amount && (
                                <div>
                                  <span className="text-green-700">Suma:</span>
                                  <span className="ml-2 font-mono text-green-900">
                                    {decodedUrl.amount} {decodedUrl.currency}
                                  </span>
                                </div>
                              )}
                              {decodedUrl.transactionId && (
                                <div>
                                  <span className="text-green-700">Transaction ID:</span>
                                  <span className="ml-2 font-mono text-green-900 text-xs">
                                    {decodedUrl.transactionId}
                                  </span>
                                </div>
                              )}
                              {decodedUrl.singleProjectItemId && (
                                <div>
                                  <span className="text-green-700">Item ID:</span>
                                  <span className="ml-2 font-mono text-green-900 text-xs">
                                    {decodedUrl.singleProjectItemId}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
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
                          {detail?.sent_at && (
                            <div>
                              <div className="text-xs text-slate-500 mb-1">Išsiųsta</div>
                              <div className="text-xs text-slate-700">
                                {formatDate(detail.sent_at)}
                              </div>
                            </div>
                          )}
                          {detail?.paid_at && (
                            <div>
                              <div className="text-xs text-slate-500 mb-1">Apmokėta</div>
                              <div className="text-xs text-slate-700">
                                {formatDate(detail.paid_at)}
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="flex justify-end">
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
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
