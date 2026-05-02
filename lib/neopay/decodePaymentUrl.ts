import type { DecodedNeoPayUrl, ExtractedPaymentData, NeoPayTokenPayload } from '@/types/neopay'
import jwt from 'jsonwebtoken'

/**
 * Decodes a NeoPay payment URL containing a JWT token.
 * 
 * Enhanced version that handles both simple and transaction-based payloads.
 * Supports both advance and final payment formats.
 * 
 * @param link - The full NeoPay payment URL (e.g., https://psd2.neopay.lt/widget.html?eyJhbGci...)
 * @returns Decoded payload with extracted payment data
 * @throws Error if URL format is invalid or token cannot be decoded
 */
export function decodeNeoPayUrl(link: string): DecodedNeoPayUrl {
  const qIndex = link.indexOf('?')
  
  if (qIndex === -1) {
    throw new Error('URL does not contain a token query part.')
  }

  const token = link.slice(qIndex + 1).trim()
  
  if (!token || token.split('.').length < 3) {
    throw new Error('Token not found or invalid JWT format.')
  }

  // Decode using jsonwebtoken library for complete decode
  const decoded = jwt.decode(token, { complete: true })
  
  if (!decoded || !decoded.payload) {
    throw new Error('Failed to decode JWT token')
  }

  const payload = decoded.payload as NeoPayTokenPayload

  // Handle transaction-based payloads (from webhook/n8n responses)
  if (payload.transactions && typeof payload.transactions === 'object') {
    const txIds = Object.keys(payload.transactions)
    if (txIds.length > 0) {
      const txId = txIds[0]
      const txData = payload.transactions[txId]

      // Inject extracted data from transactions object
      if (!payload.leadId) payload.leadId = txId
      if (!payload.amount && txData?.amount) payload.amount = txData.amount
      if (!payload.transactionId) payload.transactionId = txId
    }
  }

  const extracted: ExtractedPaymentData = {
    type: payload.type || undefined,
    amount: payload.amount ? Number(payload.amount) : undefined,
    currency: payload.currency || undefined,
    transactionId: payload.transactionId || undefined,
    internalId: payload.internalId || payload.leadId || undefined,
    singleProjectItemId: payload.singleProjectItemId || undefined,
    paymentPurpose: payload.paymentPurpose || undefined,
    leadId: payload.leadId || payload.internalId || undefined,
  }

  return { token, payload, extracted }
}

/**
 * Extracts just the transaction ID from a NeoPay URL.
 * Useful for quick lookups without full decode.
 */
export function extractTransactionId(link: string): string | undefined {
  try {
    const { extracted } = decodeNeoPayUrl(link)
    return extracted.transactionId
  } catch {
    return undefined
  }
}

/**
 * Extracts the single project item ID from a NeoPay URL.
 * Useful for Monday.com lookups.
 */
export function extractSingleProjectItemId(link: string): string | undefined {
  try {
    const { extracted } = decodeNeoPayUrl(link)
    return extracted.singleProjectItemId
  } catch {
    return undefined
  }
}
