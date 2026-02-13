import { getToken } from './auth'
import { API_BASE_URL } from './config'

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  if (typeof window === 'undefined') return Promise.reject(new Error('API not available'))
  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include',
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error((data as any).error || (data as any).message || 'Request failed')
  }
  return data as T
}

export const api = {
  listJobs: (params?: { type?: string; destinationState?: string; limit?: number; offset?: number; sort?: string; includeNotInterested?: boolean; showOnlyNotInterested?: boolean }) => {
    const q = new URLSearchParams()
    if (params?.type) q.set('type', params.type)
    if (params?.destinationState) q.set('destinationState', params.destinationState)
    if (params?.limit != null) q.set('limit', String(params.limit))
    if (params?.offset != null) q.set('offset', String(params.offset))
    if (params?.sort) q.set('sort', params.sort)
    if (params?.includeNotInterested === true) q.set('includeNotInterested', 'true')
    if (params?.showOnlyNotInterested === true) q.set('showOnlyNotInterested', 'true')
    const qs = q.toString()
    return request<{ data: any[]; total: number; restricted?: boolean }>(`/freight-carrier/jobs${qs ? `?${qs}` : ''}`)
  },
  getJob: (id: string) =>
    request<Record<string, any>>(`/freight-carrier/jobs/${id}`),
  markJobViewed: (jobId: string) =>
    request<void>(`/freight-carrier/jobs/${jobId}/view`, { method: 'POST' }),
  markNotInterested: (jobId: string) =>
    request<{ success: boolean; status: string }>(`/freight-carrier/jobs/${jobId}/not-interested`, { method: 'POST' }),
  submitOffer: (jobId: string, body: { amount: number; currency?: string; notes?: string }) =>
    request(`/freight-carrier/jobs/${jobId}/offers`, { method: 'POST', body: JSON.stringify(body) }),
  updateOffer: (jobId: string, body: { amount: number; notes?: string }) =>
    request(`/freight-carrier/jobs/${jobId}/offer`, { method: 'PATCH', body: JSON.stringify(body) }),
  cancelOffer: (jobId: string) =>
    request(`/freight-carrier/jobs/${jobId}/offer/cancel`, { method: 'POST' }),
  listMyOffers: (params?: { status?: string }) => {
    const q = new URLSearchParams()
    if (params?.status) q.set('status', params.status)
    const qs = q.toString()
    return request<{ data: any[]; total: number }>(`/freight-carrier/offers${qs ? `?${qs}` : ''}`)
  },
  updateActiveJobDetails: (
    warehouseCode: string,
    jobId: string,
    body: {
      truckDescription?: string
      truckType?: string
      licensePlate?: string
      driverName?: string
      carrierJobStatus?: 'assigned' | 'dispatched' | 'in_transit' | 'delivered'
      carrierProposedPickupDate?: string
      carrierProposedPickupTime?: string
    }
  ) =>
    request<Record<string, any>>('/freight-carrier/active-jobs/details', {
      method: 'PATCH',
      body: JSON.stringify({ warehouseCode, jobId, ...body }),
    }),
  getProfile: () =>
    request<Record<string, any>>('/freight-carrier/profile'),
  updateProfile: (body: {
    statesServed?: string[]
    contactName?: string
    phone?: string
    companyName?: string
    contactEmail?: string
    profileImageUrl?: string
    fleetPerState?: { state: string; trucks: Record<string, number> }[]
    deliveryCoverage?: { state: string; mode: 'statewide' | 'zips'; zips?: string[] }[]
  }) =>
    request('/freight-carrier/profile', { method: 'PATCH', body: JSON.stringify(body) }),
  changePassword: (body: { currentPassword: string; newPassword: string }) =>
    request('/freight-carrier/change-password', { method: 'POST', body: JSON.stringify(body) }),
  getMyFeedback: () =>
    request<{ data: any[] }>('/freight-carrier/feedback'),
  getNotifications: (params?: { unreadOnly?: boolean; limit?: number }) => {
    const q = new URLSearchParams()
    if (params?.unreadOnly) q.set('unreadOnly', 'true')
    if (params?.limit != null) q.set('limit', String(params.limit))
    const qs = q.toString()
    return request<{ data: any[]; unreadCount: number }>(`/freight-carrier/notifications${qs ? `?${qs}` : ''}`)
  },
  markNotificationRead: (id: string) =>
    request(`/freight-carrier/notifications/${id}/read`, { method: 'PUT' }),
  listBusinessFiles: () =>
    request<{ data: any[] }>('/freight-carrier/business-files'),
  uploadBusinessFile: (body: { type: string; url?: string; fileId?: string; expiresAt?: string }) =>
    request('/freight-carrier/business-files', { method: 'POST', body: JSON.stringify(body) }),
}
