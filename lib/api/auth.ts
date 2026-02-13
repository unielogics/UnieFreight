import { API_BASE_URL } from './config'

export interface FreightCarrierUser {
  id: string
  email: string
  name?: string
  role: 'freight-carrier'
  warehouseCode?: string
  freightCarrierId?: string
  grade?: number
  gradeStatus?: string
  profileImageUrl?: string
}

export interface LoginResponse {
  token: string
  user: FreightCarrierUser
}

const FREIGHT_CARRIER_LOGIN_URL = `${API_BASE_URL}/auth/freight-carrier/login`

export async function login(email: string, password: string): Promise<LoginResponse> {
  const payload = {
    email: (email || '').trim().toLowerCase(),
    password: password || '',
  }
  if (!payload.email || !payload.password) {
    throw new Error('Email and password are required')
  }

  let response: Response
  try {
    response = await fetch(FREIGHT_CARRIER_LOGIN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  } catch (err: any) {
    if (err?.name === 'TypeError' && err?.message?.includes('fetch')) {
      throw new Error('Cannot reach server. Is the backend running on port 8000?')
    }
    throw err
  }

  const data = await response.json().catch(() => ({} as Record<string, unknown>))
  const errMsg = (data as any).error || (data as any).message

  if (!response.ok) {
    throw new Error(errMsg || `Login failed (${response.status})`)
  }
  if (!(data as any).token || !(data as any).user) {
    throw new Error(errMsg || 'Invalid response from server')
  }
  if ((data as any).user?.role !== 'freight-carrier') {
    throw new Error('This login is for freight carriers only. Use the warehouse dashboard for other roles.')
  }
  return data as LoginResponse
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null
  const fromStorage = localStorage.getItem('uniefreight_token')
  if (fromStorage) return fromStorage
  // Fallback: cookie (set on login so API requests have token even if storage differs)
  const match = document.cookie.match(/uniefreight_token=([^;]+)/)
  return match ? decodeURIComponent(match[1].trim()) : null
}

export function getUser(): FreightCarrierUser | null {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem('uniefreight_user')
  return raw ? JSON.parse(raw) : null
}

export function logout(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('uniefreight_token')
    localStorage.removeItem('uniefreight_user')
    document.cookie = 'uniefreight_token=; path=/; max-age=0'
  }
}
