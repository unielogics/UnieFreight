'use client'

import { useState, useEffect } from 'react'
import { User, Loader2, Lock } from 'lucide-react'
import { api } from '@/lib/api/client'
import { getUser } from '@/lib/api/auth'

export default function AccountPage() {
  const [profile, setProfile] = useState<Record<string, any> | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [profileImageUrl, setProfileImageUrl] = useState('')
  const [pwCurrent, setPwCurrent] = useState('')
  const [pwNew, setPwNew] = useState('')
  const [pwConfirm, setPwConfirm] = useState('')
  const [pwSaving, setPwSaving] = useState(false)
  const [pwMessage, setPwMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const user = getUser()

  useEffect(() => {
    let cancelled = false
    api.getProfile()
      .then((p) => {
        if (!cancelled) {
          setProfile(p)
          setProfileImageUrl((p as any).profileImageUrl || '')
        }
      })
      .catch(() => {
        if (!cancelled) setProfile(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setPwMessage(null)
    try {
      await api.updateProfile({ profileImageUrl: profileImageUrl || undefined })
      const p = await api.getProfile()
      setProfile(p)
      if (typeof window !== 'undefined' && user) {
        const stored = localStorage.getItem('uniefreight_user')
        if (stored) {
          const parsed = JSON.parse(stored)
          parsed.profileImageUrl = (p as any).profileImageUrl
          localStorage.setItem('uniefreight_user', JSON.stringify(parsed))
        }
      }
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPwMessage(null)
    if (pwNew !== pwConfirm) {
      setPwMessage({ type: 'error', text: 'New passwords do not match' })
      return
    }
    if (pwNew.length < 8) {
      setPwMessage({ type: 'error', text: 'New password must be at least 8 characters' })
      return
    }
    setPwSaving(true)
    try {
      await api.changePassword({ currentPassword: pwCurrent, newPassword: pwNew })
      setPwMessage({ type: 'success', text: 'Password updated. Use the new password next time you log in.' })
      setPwCurrent('')
      setPwNew('')
      setPwConfirm('')
    } catch (err: any) {
      setPwMessage({ type: 'error', text: err?.message || 'Failed to change password' })
    } finally {
      setPwSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-12 text-gray-500">
        <Loader2 className="w-6 h-6 animate-spin" />
        Loading…
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Account</h1>
        <p className="text-gray-600 text-sm mt-1">
          Profile photo and password. Company info is under the Company tab.
        </p>
      </div>

      <form onSubmit={handleSaveAccount} className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Profile photo</h2>
        <div className="flex items-center gap-4">
          {profileImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profileImageUrl} alt="Profile" className="w-20 h-20 rounded-full object-cover" />
          ) : (
            <div className="w-20 h-20 rounded-full bg-slate-200 flex items-center justify-center">
              <User className="w-10 h-10 text-slate-500" />
            </div>
          )}
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Image URL</label>
            <input
              type="url"
              value={profileImageUrl}
              onChange={(e) => setProfileImageUrl(e.target.value)}
              placeholder="https://…"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="mt-4 rounded-lg bg-amber-500 text-white font-semibold px-4 py-2 hover:bg-amber-600 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </form>

      <form onSubmit={handleChangePassword} className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Lock className="w-5 h-5" />
          Change password
        </h2>
        {pwMessage && (
          <div
            className={`mb-4 rounded-lg px-3 py-2 text-sm ${
              pwMessage.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-700'
            }`}
          >
            {pwMessage.text}
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Current password</label>
            <input
              type="password"
              value={pwCurrent}
              onChange={(e) => setPwCurrent(e.target.value)}
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">New password</label>
            <input
              type="password"
              value={pwNew}
              onChange={(e) => setPwNew(e.target.value)}
              required
              minLength={8}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm new password</label>
            <input
              type="password"
              value={pwConfirm}
              onChange={(e) => setPwConfirm(e.target.value)}
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={pwSaving}
          className="mt-4 rounded-lg bg-amber-500 text-white font-semibold px-4 py-2 hover:bg-amber-600 disabled:opacity-50"
        >
          {pwSaving ? 'Updating…' : 'Update password'}
        </button>
      </form>
    </div>
  )
}
