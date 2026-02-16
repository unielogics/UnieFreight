'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Loader2, Package, Truck, ExternalLink, Lock, TrendingUp, AlertCircle, DollarSign } from 'lucide-react'
import { api } from '@/lib/api/client'
import { getUser } from '@/lib/api/auth'
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subWeeks, subMonths } from 'date-fns'

const PAYMENT_STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'paid', label: 'Paid' },
  { value: 'unpaid', label: 'Unpaid' },
  { value: 'disputed', label: 'Disputed' },
] as const

type PeriodKey = 'this_week' | 'this_month' | 'last_4_weeks' | 'last_3_months'

function aggregateByWeek(offers: any[], refDate: Date): { period: string; revenue: number; count: number }[] {
  const rows: { start: Date; end: Date; revenue: number; count: number }[] = []
  for (let i = 0; i < 4; i++) {
    const end = i === 0 ? refDate : subWeeks(refDate, i)
    const start = startOfWeek(end, { weekStartsOn: 0 })
    const endD = endOfWeek(end, { weekStartsOn: 0 })
    rows.push({ start, end: endD, revenue: 0, count: 0 })
  }
  rows.reverse()
  for (const o of offers) {
    const d = o.updatedAt ? new Date(o.updatedAt) : o.createdAt ? new Date(o.createdAt) : null
    if (!d) continue
    const t = d.getTime()
    for (const r of rows) {
      if (t >= r.start.getTime() && t <= r.end.getTime()) {
        r.revenue += Number(o.amount || 0)
        r.count += 1
        break
      }
    }
  }
  return rows.map((r) => ({
    period: `${format(r.start, 'MMM d')} – ${format(r.end, 'MMM d, yyyy')}`,
    revenue: r.revenue,
    count: r.count,
  }))
}

function aggregateByMonth(offers: any[], refDate: Date): { period: string; revenue: number; count: number }[] {
  const rows: { start: Date; end: Date; revenue: number; count: number }[] = []
  for (let i = 0; i < 3; i++) {
    const d = subMonths(refDate, i)
    const start = startOfMonth(d)
    const end = endOfMonth(d)
    rows.push({ start, end, revenue: 0, count: 0 })
  }
  rows.reverse()
  for (const o of offers) {
    const d = o.updatedAt ? new Date(o.updatedAt) : o.createdAt ? new Date(o.createdAt) : null
    if (!d) continue
    const t = d.getTime()
    for (const r of rows) {
      if (t >= r.start.getTime() && t <= r.end.getTime()) {
        r.revenue += Number(o.amount || 0)
        r.count += 1
        break
      }
    }
  }
  return rows.map((r) => ({
    period: format(r.start, 'MMMM yyyy'),
    revenue: r.revenue,
    count: r.count,
  }))
}

export default function FinancialReportPage() {
  const router = useRouter()
  const user = getUser()
  const isSubUser = !!user?.isSubUser
  const [offers, setOffers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('')
  const [revenuePeriod, setRevenuePeriod] = useState<PeriodKey>('last_4_weeks')
  const [disputeModal, setDisputeModal] = useState<{ row: any; job: any } | null>(null)
  const [disputeReasonCategory, setDisputeReasonCategory] = useState('')
  const [disputeReason, setDisputeReason] = useState('')
  const [disputeSubmitting, setDisputeSubmitting] = useState(false)

  const DISPUTE_REASON_CATEGORIES: { value: string; label: string }[] = [
    { value: 'payment_amount_incorrect', label: 'Payment amount incorrect' },
    { value: 'payment_not_received', label: 'Payment not received' },
    { value: 'service_not_as_agreed', label: 'Service not as agreed' },
    { value: 'damaged_or_late_delivery', label: 'Damaged or late delivery' },
    { value: 'documentation_issue', label: 'Documentation issue' },
    { value: 'other', label: 'Other' },
  ]
  const [feedback, setFeedback] = useState<any[]>([])

  useEffect(() => {
    if (isSubUser) {
      router.replace('/dashboard')
      return
    }
  }, [isSubUser, router])

  useEffect(() => {
    if (isSubUser) return
    let cancelled = false
    setLoading(true)
    api
      .listMyOffers({ status: 'approved', paymentStatus: paymentStatusFilter || undefined })
      .then((res) => { if (!cancelled) setOffers(res.data || []) })
      .catch(() => { if (!cancelled) setOffers([]) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [isSubUser, paymentStatusFilter])

  useEffect(() => {
    if (isSubUser) return
    api.getMyFeedback().then((res) => setFeedback(res.data || [])).catch(() => setFeedback([]))
  }, [isSubUser])

  const totalRevenue = offers.reduce((sum: number, o: any) => sum + Number(o.amount || 0), 0)
  const paidCount = offers.filter((o: any) => (o.paymentStatus || 'pending') === 'paid').length
  const unpaidCount = offers.filter((o: any) => (o.paymentStatus || 'pending') === 'unpaid').length
  const pendingCount = offers.filter((o: any) => (o.paymentStatus || 'pending') === 'pending').length
  const disputedCount = offers.filter((o: any) => (o.paymentStatus || 'pending') === 'disputed').length

  const now = new Date()
  const revenueRows =
    revenuePeriod === 'this_week'
      ? (() => {
          const start = startOfWeek(now, { weekStartsOn: 0 })
          const end = endOfWeek(now, { weekStartsOn: 0 })
          const rev = offers
            .filter((o) => {
              const d = o.updatedAt ? new Date(o.updatedAt) : o.createdAt ? new Date(o.createdAt) : null
              return d && d.getTime() >= start.getTime() && d.getTime() <= end.getTime()
            })
            .reduce((s, o) => s + Number(o.amount || 0), 0)
          return [{ period: `${format(start, 'MMM d')} – ${format(end, 'MMM d, yyyy')}`, revenue: rev, count: offers.filter((o) => {
            const d = o.updatedAt ? new Date(o.updatedAt) : o.createdAt ? new Date(o.createdAt) : null
            return d && d.getTime() >= start.getTime() && d.getTime() <= end.getTime()
          }).length }]
        })()
      : revenuePeriod === 'this_month'
        ? (() => {
            const start = startOfMonth(now)
            const end = endOfMonth(now)
            const rev = offers
              .filter((o) => {
                const d = o.updatedAt ? new Date(o.updatedAt) : o.createdAt ? new Date(o.createdAt) : null
                return d && d.getTime() >= start.getTime() && d.getTime() <= end.getTime()
              })
              .reduce((s, o) => s + Number(o.amount || 0), 0)
            return [{ period: format(now, 'MMMM yyyy'), revenue: rev, count: offers.filter((o) => {
              const d = o.updatedAt ? new Date(o.updatedAt) : o.createdAt ? new Date(o.createdAt) : null
              return d && d.getTime() >= start.getTime() && d.getTime() <= end.getTime()
            }).length }]
          })()
        : revenuePeriod === 'last_4_weeks'
          ? aggregateByWeek(offers, now)
          : aggregateByMonth(offers, now)

  const handleDisputeSubmit = async () => {
    if (!disputeModal || !disputeReasonCategory) return
    const row = disputeModal.row
    const job = row.job || {}
    const warehouseCode = job.warehouseCode
    const freightOfferId = row._id
    if (!warehouseCode || !freightOfferId) {
      alert('Missing job or offer info')
      return
    }
    setDisputeSubmitting(true)
    try {
      await api.createOfferDispute({
        warehouseCode,
        freightOfferId: String(freightOfferId),
        reasonCategory: disputeReasonCategory,
        reason: disputeReason.trim() || undefined,
      })
      setDisputeModal(null)
      setDisputeReasonCategory('')
      setDisputeReason('')
      setOffers((prev) =>
        prev.map((o) => (o._id === row._id ? { ...o, paymentStatus: 'disputed' } : o))
      )
    } catch (e: any) {
      alert(e?.message || 'Failed to submit dispute')
    } finally {
      setDisputeSubmitting(false)
    }
  }

  if (isSubUser) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-12 text-gray-600">
        <Lock className="w-10 h-10 text-amber-500" />
        <p className="font-medium">Billing and financial data are not available for sub accounts.</p>
        <p className="text-sm">Redirecting…</p>
      </div>
    )
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
        <h1 className="text-2xl font-semibold text-gray-900">Financial Report</h1>
        <p className="text-gray-600 text-sm mt-1">
          Revenue from approved quotes and payment status. Track what has been paid and raise disputes if needed.
        </p>
      </div>

      {/* Rating / grade */}
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-800">Your rating</h2>
          <p className="text-2xl font-bold text-slate-900 mt-0.5">
            Grade: {user?.grade ?? '—'} {user?.gradeStatus && user.gradeStatus !== 'ok' && (
              <span className="text-amber-600 text-sm">({user.gradeStatus})</span>
            )}
          </p>
        </div>
        <Link
          href="/dashboard/feedback"
          className="text-amber-600 hover:text-amber-700 font-medium text-sm"
        >
          View feedback & ratings
        </Link>
      </div>
      {feedback.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-gray-900 mb-2">Recent ratings from warehouses</h2>
          <ul className="space-y-1 text-sm text-gray-600">
            {feedback.slice(0, 5).map((f: any) => (
              <li key={f._id}>
                {f.warehouseCode && <span className="font-medium">{f.warehouseCode}</span>}
                {' — '}
                Pricing: {f.ratingPricing}/5, On time: {f.ratingOnTimeDelivery}/5
                {f.comments && ` — ${f.comments}`}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
          <h2 className="text-sm font-semibold text-emerald-800">Total revenue (approved)</h2>
          <p className="text-xl font-bold text-emerald-900 mt-1">${totalRevenue.toFixed(2)} USD</p>
          <p className="text-xs text-emerald-700 mt-0.5">{offers.length} job{offers.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <h2 className="text-sm font-semibold text-gray-700">Pending</h2>
          <p className="text-xl font-bold text-gray-900 mt-1">{pendingCount}</p>
        </div>
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <h2 className="text-sm font-semibold text-green-800">Paid</h2>
          <p className="text-xl font-bold text-green-900 mt-1">{paidCount}</p>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <h2 className="text-sm font-semibold text-red-800">Unpaid / Disputed</h2>
          <p className="text-xl font-bold text-red-900 mt-1">{unpaidCount + disputedCount}</p>
        </div>
      </div>

      {/* Weekly / monthly revenue table */}
      <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
        <h2 className="text-lg font-semibold text-gray-900 px-4 py-3 border-b border-gray-200 flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Revenue by period
        </h2>
        <div className="px-4 py-2 border-b border-gray-100 flex flex-wrap gap-2">
          <select
            value={revenuePeriod}
            onChange={(e) => setRevenuePeriod(e.target.value as PeriodKey)}
            className="rounded border border-gray-300 px-2 py-1.5 text-sm"
          >
            <option value="this_week">This week</option>
            <option value="this_month">This month</option>
            <option value="last_4_weeks">Last 4 weeks</option>
            <option value="last_3_months">Last 3 months</option>
          </select>
        </div>
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs font-semibold text-gray-600 uppercase">
            <tr>
              <th className="px-4 py-3">Period</th>
              <th className="px-4 py-3 text-right">Revenue (USD)</th>
              <th className="px-4 py-3 text-right">Jobs</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {revenueRows.map((r, i) => (
              <tr key={i} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{r.period}</td>
                <td className="px-4 py-3 text-right font-medium">${r.revenue.toFixed(2)}</td>
                <td className="px-4 py-3 text-right text-gray-600">{r.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Approved jobs table with status and dispute */}
      <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-gray-900">Approved jobs</h2>
          <select
            value={paymentStatusFilter}
            onChange={(e) => setPaymentStatusFilter(e.target.value)}
            className="rounded border border-gray-300 px-2 py-1.5 text-sm"
          >
            {PAYMENT_STATUS_OPTIONS.map((opt) => (
              <option key={opt.value || 'all'} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs font-semibold text-gray-600 uppercase">
            <tr>
              <th className="px-4 py-3">Job</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Paid date</th>
              <th className="px-4 py-3">Approved</th>
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {offers.map((row) => {
              const job = row.job || {}
              // Use snapshot id so GET /freight-carrier/jobs/:id resolves (central snapshot); fallback to warehouse job id
              const jobId = row.snapshotId || job._id || job.id || row.freightJobId
              const status = row.paymentStatus || 'pending'
              const statusColor =
                status === 'paid' ? 'text-green-700 bg-green-100' :
                status === 'disputed' ? 'text-red-700 bg-red-100' :
                status === 'unpaid' ? 'text-amber-700 bg-amber-100' : 'text-gray-700 bg-gray-100'
              return (
                <tr key={row._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 rounded bg-gray-100 px-2 py-0.5 font-medium text-gray-800">
                      {job.type === 'FTL' ? <Truck className="w-3.5 h-3.5" /> : <Package className="w-3.5 h-3.5" />}
                      {job.type}
                    </span>
                    <div className="font-medium text-gray-900 mt-0.5">{job.title || job.reference || jobId || '—'}</div>
                    <div className="text-xs text-gray-500">{job.destinationWarehouseCode} {job.destinationState && `(${job.destinationState})`}</div>
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900">
                    ${Number(row.amount).toFixed(2)} {row.currency || 'USD'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded px-2 py-0.5 text-xs font-medium capitalize ${statusColor}`}>
                      {status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {row.paidAt ? format(new Date(row.paidAt), 'MMM d, yyyy') : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {row.updatedAt ? format(new Date(row.updatedAt), 'MMM d, yyyy') : '—'}
                  </td>
                  <td className="px-4 py-3 flex items-center gap-2">
                    {jobId && (
                      <Link href={`/dashboard/opportunities/${jobId}`} className="inline-flex items-center gap-1 text-amber-600 hover:text-amber-700 font-medium text-sm">
                        View job <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    )}
                    {status !== 'disputed' && (
                      <button
                        type="button"
                        onClick={() => setDisputeModal({ row, job })}
                        className="inline-flex items-center gap-1 text-red-600 hover:text-red-700 text-sm font-medium"
                      >
                        <AlertCircle className="w-3.5 h-3.5" />
                        Dispute
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {offers.length === 0 && (
          <div className="px-4 py-12 text-center text-gray-500">
            No approved offers yet. Approved quotes will appear here with payment status.
          </div>
        )}
      </div>

      {/* Dispute modal */}
      {disputeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Raise a dispute</h3>
            <p className="text-sm text-gray-600 mb-4">
              Your dispute will be reviewed by the warehouse and by UnieWMS. Select the main reason and add notes if needed.
            </p>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason (required)</label>
            <select
              value={disputeReasonCategory}
              onChange={(e) => setDisputeReasonCategory(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm mb-3"
            >
              <option value="">Select reason…</option>
              {DISPUTE_REASON_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
            <textarea
              value={disputeReason}
              onChange={(e) => setDisputeReason(e.target.value)}
              placeholder="Add any details…"
              rows={3}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
            />
            <div className="flex gap-2 mt-4">
              <button
                type="button"
                onClick={() => { setDisputeModal(null); setDisputeReasonCategory(''); setDisputeReason('') }}
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDisputeSubmit}
                disabled={disputeSubmitting || !disputeReasonCategory}
                className="flex-1 rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {disputeSubmitting ? 'Submitting…' : 'Submit dispute'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
