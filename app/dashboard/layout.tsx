'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Truck, Briefcase, ListTodo, User, LogOut, BarChart3, Mail, Bell, ChevronDown, Building2, Users, Calendar } from 'lucide-react'
import { getToken, getUser, logout } from '@/lib/api/auth'
import { api } from '@/lib/api/client'

function gradeColor(grade: number | undefined, gradeStatus?: string) {
  if (grade == null) return { bg: 'bg-slate-500', text: 'text-slate-200', stroke: '#94a3b8' }
  if (gradeStatus === 'suspended') return { bg: 'bg-red-600', text: 'text-red-100', stroke: '#ef4444' }
  if (gradeStatus === 'under_review' || grade < 82) return { bg: 'bg-amber-600', text: 'text-amber-100', stroke: '#f59e0b' }
  if (grade < 90) return { bg: 'bg-emerald-600', text: 'text-emerald-100', stroke: '#10b981' }
  return { bg: 'bg-green-600', text: 'text-green-100', stroke: '#22c55e' }
}

function GradeWidget({ grade, gradeStatus, active }: { grade?: number; gradeStatus?: string; active?: boolean }) {
  const g = Math.max(0, Math.min(100, grade ?? 0))
  const colors = gradeColor(grade, gradeStatus)
  const radius = 18
  const circumference = 2 * Math.PI * radius
  const filled = (g / 100) * circumference
  const gap = circumference - filled
  return (
    <Link
      href="/dashboard/feedback"
      className={`relative flex items-center justify-center w-11 h-11 rounded-full transition-colors ${active ? 'bg-slate-700' : 'hover:bg-slate-700'}`}
      title="Grade: click to view feedback and ratings"
    >
      <svg width="44" height="44" className="absolute inset-0 w-11 h-11 rotate-[-90deg]" viewBox="0 0 44 44">
        <circle
          cx="22"
          cy="22"
          r={radius}
          fill="none"
          stroke="#475569"
          strokeWidth="3"
        />
        <circle
          cx="22"
          cy="22"
          r={radius}
          fill="none"
          stroke={colors.stroke}
          strokeWidth="3"
          strokeDasharray={`${filled} ${gap}`}
          strokeLinecap="round"
        />
      </svg>
      <span className={`relative z-10 text-xs font-bold tabular-nums ${colors.text}`}>{g}</span>
    </Link>
  )
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const user = getUser()
  const [mounted, setMounted] = useState(false)
  const [notifUnread, setNotifUnread] = useState(0)
  useEffect(() => setMounted(true), [])
  const refreshNotifUnread = () => {
    if (!getToken()) return
    api.getNotifications({ limit: 1 }).then((r) => setNotifUnread(r.unreadCount ?? 0)).catch(() => {})
  }
  useEffect(() => {
    refreshNotifUnread()
  }, [pathname])
  useEffect(() => {
    const onUpdated = (e: Event) => setNotifUnread((e as CustomEvent).detail?.unreadCount ?? 0)
    window.addEventListener('notifications-updated', onUpdated)
    return () => window.removeEventListener('notifications-updated', onUpdated)
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!getToken()) {
      router.replace('/login')
      return
    }
    if (user?.gradeStatus === 'under_review' || user?.gradeStatus === 'suspended') {
      // Still show layout; some features may be restricted by API
    }
  }, [router, user])

  const handleLogout = () => {
    logout()
    router.replace('/login')
  }

  const isSubUser = !!user?.isSubUser
  const nav = [
    { href: '/dashboard/opportunities', label: 'Find opportunities', icon: Briefcase },
    { href: '/dashboard/scheduled', label: 'Scheduled jobs', icon: Calendar },
    { href: '/dashboard/active', label: 'Active jobs', icon: ListTodo },
  ]
  const [settingsOpen, setSettingsOpen] = useState(false)

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-slate-800 text-white shadow">
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-between h-14">
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
            <Truck className="w-6 h-6 text-amber-400" />
            UnieFreight
          </Link>
          <nav className="flex items-center gap-1">
            {nav.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${
                  pathname === href || pathname.startsWith(href + '/')
                    ? 'bg-slate-700 text-white'
                    : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            {mounted && user && (
              <GradeWidget
                grade={user.grade}
                gradeStatus={user.gradeStatus}
                active={pathname === '/dashboard/feedback'}
              />
            )}
            <Link
              href="/dashboard/inbox"
              className="flex items-center justify-center w-9 h-9 rounded-lg text-slate-300 hover:bg-slate-700 hover:text-white"
              title="Inbox"
            >
              <Mail className="w-5 h-5" />
            </Link>
            <Link
              href="/dashboard/notifications"
              className="relative flex items-center justify-center w-9 h-9 rounded-lg text-slate-300 hover:bg-slate-700 hover:text-white"
              title="Notifications"
            >
              <Bell className="w-5 h-5" />
              {notifUnread > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white">
                  {notifUnread > 99 ? '99+' : notifUnread}
                </span>
              )}
            </Link>
            <div className="relative">
              <button
                type="button"
                onClick={() => setSettingsOpen((o) => !o)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${
                  pathname === '/dashboard/profile' || pathname === '/dashboard/company' || pathname === '/dashboard/sub-users' || pathname === '/dashboard/scheduled' || pathname === '/dashboard/financial' || pathname.startsWith('/dashboard/profile/') || pathname.startsWith('/dashboard/company/')
                    ? 'bg-slate-700 text-white'
                    : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
                title="Settings"
              >
                {user?.profileImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.profileImageUrl}
                    alt="Settings"
                    className="w-6 h-6 rounded-full object-cover"
                  />
                ) : (
                  <User className="w-5 h-5" />
                )}
                Settings
                <ChevronDown className={`w-4 h-4 transition-transform ${settingsOpen ? 'rotate-180' : ''}`} />
              </button>
              {settingsOpen && (
                <>
                  <div className="fixed inset-0 z-10" aria-hidden onClick={() => setSettingsOpen(false)} />
                  <div className="absolute right-0 top-full mt-1 z-20 min-w-[140px] rounded-lg border border-slate-600 bg-slate-800 py-1 shadow-lg">
                    <Link
                      href="/dashboard/profile"
                      className="flex items-center gap-2 px-3 py-2 text-sm text-slate-200 hover:bg-slate-700"
                      onClick={() => setSettingsOpen(false)}
                    >
                      <User className="w-4 h-4" />
                      Profile
                    </Link>
                    <Link
                      href="/dashboard/company"
                      className="flex items-center gap-2 px-3 py-2 text-sm text-slate-200 hover:bg-slate-700"
                      onClick={() => setSettingsOpen(false)}
                    >
                      <Building2 className="w-4 h-4" />
                      Company
                    </Link>
                    {!isSubUser && (
                      <Link
                        href="/dashboard/financial"
                        className="flex items-center gap-2 px-3 py-2 text-sm text-slate-200 hover:bg-slate-700"
                        onClick={() => setSettingsOpen(false)}
                      >
                        <BarChart3 className="w-4 h-4" />
                        Financial Report
                      </Link>
                    )}
                    {!isSubUser && (
                      <Link
                        href="/dashboard/sub-users"
                        className="flex items-center gap-2 px-3 py-2 text-sm text-slate-200 hover:bg-slate-700"
                        onClick={() => setSettingsOpen(false)}
                      >
                        <Users className="w-4 h-4" />
                        Sub users
                      </Link>
                    )}
                  </div>
                </>
              )}
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-slate-300 hover:bg-slate-700 hover:text-white text-sm"
            >
              <LogOut className="w-4 h-4" />
              Log out
            </button>
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6">{children}</main>
    </div>
  )
}
