import { getMondayApiToken } from './config'

/**
 * Monday.com GraphQL client.
 * 
 * Ported from api/index.js lines 242-255
 * CRITICAL: This logic is working and must be preserved.
 * 
 * SERVER-SIDE ONLY - Never call from client components.
 */

interface MondayGraphQLError {
  message: string
  [key: string]: unknown
}

interface MondayGraphQLResponse {
  data?: unknown
  errors?: MondayGraphQLError[]
}

/**
 * Executes a GraphQL query/mutation against Monday.com API.
 * 
 * @param query - GraphQL query or mutation string
 * @param variables - Optional variables object
 * @returns Response data
 * @throws Error if request fails or API returns errors
 */
export async function mondayGraphQL<T = unknown>(
  query: string,
  variables?: Record<string, unknown>
): Promise<T> {
  const token = getMondayApiToken()

  const response = await fetch('https://api.monday.com/v2', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: token,
    },
    body: JSON.stringify({ query, variables }),
  })

  const json: MondayGraphQLResponse = await response.json()

  if (!response.ok || json.errors) {
    const errorMessages = json.errors?.map((e) => e.message).join('; ') || response.statusText
    throw new Error(`Monday API error: ${errorMessages}`)
  }

  return json.data as T
}
