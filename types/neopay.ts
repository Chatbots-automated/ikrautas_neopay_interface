export interface NeoPayTokenPayload {
  type?: string
  amount?: number
  currency?: string
  transactionId?: string
  internalId?: string
  leadId?: string
  singleProjectItemId?: string
  paymentPurpose?: string
  projectId?: number
  serviceType?: string
  clientRedirectUrl?: string
  defaultLocale?: string
  transactions?: Record<string, {
    amount?: number
    [key: string]: unknown
  }>
  [key: string]: unknown
}

export interface ExtractedPaymentData {
  type?: string
  amount?: number
  currency?: string
  transactionId?: string
  internalId?: string
  leadId?: string
  singleProjectItemId?: string
  paymentPurpose?: string
}

export interface DecodedNeoPayUrl {
  token: string
  payload: NeoPayTokenPayload
  extracted: ExtractedPaymentData
}
