import { API_BASE_URL } from './config'
import { getToken } from './auth'

function authHeaders(): Record<string, string> {
  const token = getToken()
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  return headers
}

export async function fetchMailbox(params?: {
  unreadOnly?: boolean
  limit?: number
  offset?: number
  context?: 'freight' | 'disputes'
  threadId?: string
}) {
  const query = new URLSearchParams()
  if (params?.unreadOnly) query.append('unreadOnly', 'true')
  if (params?.limit) query.append('limit', String(params.limit ?? 50))
  if (params?.offset) query.append('offset', String(params.offset ?? 0))
  if (params?.context === 'freight') query.append('context', 'freight')
  if (params?.context === 'disputes') query.append('context', 'disputes')
  if (params?.threadId) query.append('threadId', params.threadId)
  const res = await fetch(`${API_BASE_URL}/mailbox?${query.toString()}`, { headers: authHeaders() })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as any).error || 'Failed to load mailbox')
  }
  return res.json()
}

export async function sendMailboxEmail(payload: {
  to?: string
  subject: string
  body: string
  threadId?: string
  inReplyTo?: string
  warehouseId?: string
  freightJobId?: string
}) {
  const res = await fetch(`${API_BASE_URL}/mailbox/send`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as any).error || 'Failed to send email')
  }
  return res.json()
}

export async function markMessageRead(id: string) {
  const res = await fetch(`${API_BASE_URL}/mailbox/read`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({ id }),
  })
  if (!res.ok) throw new Error('Failed to mark as read')
  return res.json()
}
