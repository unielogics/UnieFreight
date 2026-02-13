'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Loader2, Bell, Check } from 'lucide-react'
import { api } from '@/lib/api/client'
import { format } from 'date-fns'

export default function NotificationsPage() {
  const [list, setList] = useState<any[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const load = () => {
    api.getNotifications({ limit: 50, unreadOnly: true })
      .then((r) => {
        setList(r.data || [])
        setUnreadCount(r.unreadCount ?? 0)
        if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('notifications-updated', { detail: { unreadCount: r.unreadCount ?? 0 } }))
      })
      .catch(() => {
        setList([])
        setUnreadCount(0)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  const markRead = async (id: string) => {
    try {
      await api.markNotificationRead(id)
      await load()
    } catch {}
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
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Notifications</h1>
        <p className="text-gray-600 text-sm mt-1">
          Approved quotes and other activity that needs your attention.
        </p>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white divide-y divide-gray-100">
        {list.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm">No notifications yet.</div>
        ) : (
          list.map((n: any) => (
            <div
              key={n._id}
              className={`flex items-start gap-3 p-4 ${!n.read ? 'bg-amber-50/50' : ''}`}
            >
              <Bell className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900">{n.title}</p>
                <p className="text-sm text-gray-600 mt-0.5">{n.message}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {n.createdAt && format(new Date(n.createdAt), 'MMM d, yyyy HH:mm')}
                </p>
              </div>
              {!n.read && (
                <button
                  type="button"
                  onClick={() => markRead(n._id)}
                  className="shrink-0 rounded px-2 py-1 text-xs font-medium text-amber-700 hover:bg-amber-100 flex items-center gap-1"
                >
                  <Check className="w-3 h-3" />
                  Mark read
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
