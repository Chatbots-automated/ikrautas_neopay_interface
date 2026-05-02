/**
 * n8n Webhook Client
 * 
 * Sends payment resend requests to the existing n8n webhook.
 * Ported from api/index.js lines 319-374
 * 
 * This preserves backward compatibility with the current resend flow.
 */

import type { ExtractedPaymentData, NeoPayTokenPayload } from '@/types/neopay'
import { MONDAY_CONFIG } from '@/lib/monday/config'

const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || 'https://n8n-up8s.onrender.com/webhook/77724b7f-99f9-4512-b94f-927d958beb27'

export interface N8nWebhookPayload {
  event: string
  sentAt: string
  link: string
  extracted: ExtractedPaymentData
  rawPayload: NeoPayTokenPayload
  overrides: {
    advanceAmount?: number | null
    finalAmount?: number | null
  }
  monday: {
    boardId: number
    singleProjectItemId: string
    columns: {
      leadId: string
      advanceLink: string
      finalLink: string
      advanceAmount: string
      finalAmount?: string
    }
  }
  meta: {
    uiVersion: string
    source: string
  }
}

/**
 * Sends a payment resend request to the n8n webhook.
 * 
 * @param link - Full NeoPay payment URL
 * @param singleProjectItemId - Monday item ID
 * @param extracted - Extracted payment data from URL
 * @param payload - Raw NeoPay JWT payload
 * @param advanceOverride - Optional override for advance amount
 * @param finalOverride - Optional override for final amount
 */
export async function sendToN8nWebhook(
  link: string,
  singleProjectItemId: string,
  extracted: ExtractedPaymentData,
  payload: NeoPayTokenPayload,
  advanceOverride?: number,
  finalOverride?: number
): Promise<void> {
  const webhookPayload: N8nWebhookPayload = {
    event: 'resend_payment_link',
    sentAt: new Date().toISOString(),
    link,
    extracted,
    rawPayload: payload,
    overrides: {
      advanceAmount:
        typeof advanceOverride === 'number' && !Number.isNaN(advanceOverride)
          ? Math.round(advanceOverride * 100) / 100
          : null,
      finalAmount:
        typeof finalOverride === 'number' && !Number.isNaN(finalOverride)
          ? Math.round(finalOverride * 100) / 100
          : null,
    },
    monday: {
      boardId: MONDAY_CONFIG.BOARD_ID,
      singleProjectItemId,
      columns: {
        leadId: MONDAY_CONFIG.COLUMNS.LEAD_ID,
        advanceLink: MONDAY_CONFIG.COLUMNS.ADVANCE_LINK,
        finalLink: MONDAY_CONFIG.COLUMNS.FINAL_LINK,
        advanceAmount: MONDAY_CONFIG.COLUMNS.ADVANCE_AMOUNT,
        finalAmount: MONDAY_CONFIG.COLUMNS.FINAL_AMOUNT,
      },
    },
    meta: {
      uiVersion: '2.0.0',
      source: 'nextjs-payment-dashboard',
    },
  }

  const response = await fetch(N8N_WEBHOOK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(webhookPayload),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`n8n webhook error: ${response.status} ${text}`)
  }
}
