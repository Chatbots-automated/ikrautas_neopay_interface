import jwt from 'jsonwebtoken'

/**
 * NeoPay Configuration
 * 
 * CRITICAL: These credentials are from the working IKRAUTASNEOPAYJWT repository.
 * DO NOT change without verifying with NeoPay.
 */
const NEOPAY_PROJECT_ID = 16155
const NEOPAY_SECRET = 'edEIbadNdqu5UumPqd7Ni9DvBRd8HEMX'
const NEOPAY_WIDGET_URL = 'https://psd2.neopay.lt/widget.html'

/**
 * Interface for advance payment generation
 */
export interface GenerateAdvancePaymentParams {
  amount: number
  transactionId: string
  singleProjectItemId: string
  clientRedirectUrl?: string
}

/**
 * Interface for final payment generation
 */
export interface GenerateFinalPaymentParams {
  amount: number
  leadId: string
  singleProjectItemId: string
  clientRedirectUrl?: string
}

/**
 * Result of payment URL generation
 */
export interface GeneratedPaymentUrl {
  token: string
  url: string
  payload: Record<string, unknown>
}

/**
 * Generates an advance payment URL with JWT token.
 * 
 * Ported from IKRAUTASNEOPAYJWT/api/generate-neopay-jwt.js
 * 
 * @param params - Advance payment parameters
 * @returns Generated token and full payment URL
 */
export function generateAdvancePaymentUrl(
  params: GenerateAdvancePaymentParams
): GeneratedPaymentUrl {
  const {
    amount,
    transactionId,
    singleProjectItemId,
    clientRedirectUrl = 'https://google.com',
  } = params

  if (!amount || !transactionId || !singleProjectItemId) {
    throw new Error('Missing required fields: amount, transactionId, or singleProjectItemId')
  }

  const payload = {
    projectId: NEOPAY_PROJECT_ID,
    amount,
    currency: 'EUR',
    transactionId,
    internalId: transactionId,
    singleProjectItemId,
    type: 'advance',
    paymentPurpose: `Avansinis mokėjimas ${transactionId}`,
    serviceType: 'pisp',
    clientRedirectUrl,
    defaultLocale: 'LT',
  }

  try {
    const token = jwt.sign(payload, NEOPAY_SECRET, {
      algorithm: 'HS256',
      noTimestamp: true,
    })

    const url = `${NEOPAY_WIDGET_URL}?${token}`

    return { token, url, payload }
  } catch (err) {
    const error = err as Error
    throw new Error(`JWT signing failed: ${error.message}`)
  }
}

/**
 * Generates a final payment URL with JWT token.
 * 
 * Ported from IKRAUTASNEOPAYJWT/api/generate-final-payment.js
 * 
 * @param params - Final payment parameters
 * @returns Generated token and full payment URL
 */
export function generateFinalPaymentUrl(
  params: GenerateFinalPaymentParams
): GeneratedPaymentUrl {
  const {
    amount,
    leadId,
    singleProjectItemId,
    clientRedirectUrl = 'https://google.com',
  } = params

  if (!amount || !leadId || !singleProjectItemId) {
    throw new Error('Missing required fields: amount, leadId, or singleProjectItemId')
  }

  const payload = {
    projectId: NEOPAY_PROJECT_ID,
    amount,
    currency: 'EUR',
    transactionId: singleProjectItemId, // Used for NeoPay uniqueness
    internalId: leadId, // Keeps original context
    type: 'final',
    paymentPurpose: `Galutinis mokėjimas ${leadId}`, // Shown in bank
    singleProjectItemId,
    serviceType: 'pisp',
    clientRedirectUrl,
    defaultLocale: 'LT',
  }

  try {
    const token = jwt.sign(payload, NEOPAY_SECRET, {
      algorithm: 'HS256',
      noTimestamp: true,
    })

    const url = `${NEOPAY_WIDGET_URL}?${token}`

    return { token, url, payload }
  } catch (err) {
    const error = err as Error
    throw new Error(`JWT signing failed: ${error.message}`)
  }
}

/**
 * Generates a payment URL based on payment type.
 * 
 * @param type - Payment type (advance or final)
 * @param params - Payment parameters
 * @returns Generated token and full payment URL
 */
export function generatePaymentUrl(
  type: 'advance' | 'final',
  params: Omit<GenerateAdvancePaymentParams, 'transactionId'> & {
    transactionId?: string
    leadId?: string
  }
): GeneratedPaymentUrl {
  if (type === 'advance') {
    const transactionId = params.transactionId || params.singleProjectItemId
    return generateAdvancePaymentUrl({
      amount: params.amount,
      transactionId,
      singleProjectItemId: params.singleProjectItemId,
      clientRedirectUrl: params.clientRedirectUrl,
    })
  } else {
    const leadId = params.leadId || params.transactionId || params.singleProjectItemId
    return generateFinalPaymentUrl({
      amount: params.amount,
      leadId,
      singleProjectItemId: params.singleProjectItemId,
      clientRedirectUrl: params.clientRedirectUrl,
    })
  }
}
