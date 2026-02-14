'use client'

import { useState, useEffect } from 'react'
import { Loader2, Users, Plus, Mail, Lock, AlertCircle } from 'lucide-react'
import { api } from '@/lib/api/client'
import { getUser } from '@/lib/api/auth'

export default function SubUsersPage() {
  const user = getUser()
  const isSubUser = !!user?.isSubUser
  const [list, setList] = useState<{ email: string; createdAt?: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  useEffect(() => {
    if (isSubUser) return
    api
      .listSubUsers()
      .then((res) => setList(res.data || []))
      .catch(() => setList([]))
      .finally(() => setLoading(false))
  }, [isSubUser])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    const trimmed = email.trim().toLowerCase()
    if (!trimmed) {
      setError('Email is required')
      return
    }
    if (!password || password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    setSaving(true)
    try {
      await api.createSubUser({ email: trimmed, password })
      setSuccess(`Sub user ${trimmed} added. They can log in with this email and password; they will not see billing or financial data.`)
      setEmail('')
      setPassword('')
      const res = await api.listSubUsers()
      setList(res.data || [])
    } catch (err: any) {
      setError(err?.message || 'Failed to add sub user')
    } finally {
      setSaving(false)
    }
  }

  if (isSubUser) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-amber-800">
        <p className="font-medium">Sub accounts cannot manage team members. Only the primary account can add or view sub users.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
          <Users className="w-6 h-6" />
          Sub users
        </h1>
        <p className="text-gray-600 text-sm mt-1">
          Sub users can use the dashboard for opportunities, active jobs, and messages, but cannot access billing or financial data.
        </p>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Add sub user</h2>
        <form onSubmit={handleAdd} className="space-y-3 max-w-md">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                placeholder="subuser@example.com"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password (min 8 characters)</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                placeholder="••••••••"
                minLength={8}
              />
            </div>
          </div>
          {error && (
            <div className="flex items-center gap-2 text-red-600 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}
          {success && (
            <div className="text-emerald-700 text-sm bg-emerald-50 border border-emerald-200 rounded-lg p-3">
              {success}
            </div>
          )}
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Add sub user
          </button>
        </form>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
        <h2 className="text-lg font-semibold text-gray-900 px-4 py-3 border-b border-gray-200">Current sub users</h2>
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-8 text-gray-500">
            <Loader2 className="w-5 h-5 animate-spin" />
            Loading…
          </div>
        ) : list.length === 0 ? (
          <div className="px-4 py-8 text-center text-gray-500">
            No sub users yet. Add one above to give team members access without billing permissions.
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {list.map((item) => (
              <li key={item.email} className="px-4 py-3 flex items-center justify-between">
                <span className="font-medium text-gray-900">{item.email}</span>
                {item.createdAt && (
                  <span className="text-xs text-gray-500">
                    Added {new Date(item.createdAt).toLocaleDateString()}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
