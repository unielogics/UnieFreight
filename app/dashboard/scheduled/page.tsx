'use client'

import { useState, useEffect, useCallback } from 'react'
import { Package, Truck, Loader2, Calendar, Search } from 'lucide-react'
import { api } from '@/lib/api/client'
import { format } from 'date-fns'
import { ActiveJobModal } from '@/components/ActiveJobModal'

/** Parse carrier proposed pickup date + time into a Date for sorting. Returns null if no date. */
function getPickupDateTime(job: any): Date | null {
  const dateStr = job?.carrierProposedPickupDate
  const timeStr = job?.carrierProposedPickupTime
  if (dateStr == null || dateStr === '') return null
  const s = String(dateStr).trim()
  if (!s) return null
  const date = /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(s + 'T00:00:00') : new Date(s)
  if (Number.isNaN(date.getTime())) return null
  if (timeStr) {
    const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)/i)
    if (match) {
      let h = parseInt(match[1], 10)
      const m = parseInt(match[2], 10)
      const period = (match[3] || '').toUpperCase()
      if (period === 'PM' && h !== 12) h += 12
      if (period === 'AM' && h === 12) h = 0
      date.setHours(h, m, 0, 0)
    }
  }
  return date
}

/** Pickup city and state from job origin address. */
function getPickupCityState(job: any): string {
  const addr = job?.spec?.originAddress
  if (!addr) return '—'
  const city = (addr.city || '').trim()
  const state = (addr.state || '').trim()
  if (city && state) return `${city}, ${state}`
  if (city) return city
  if (state) return state
  return '—'
}

/** Get yyyy-MM-dd for a given date. */
function toDateKey(d: Date): string {
  return format(d, 'yyyy-MM-dd')
}

/** Format pickup date for display; returns '—' if invalid. */
function formatPickupDateDisplay(value: unknown): string {
  if (value == null || value === '') return '—'
  const str = String(value).trim()
  if (!str) return '—'
  let date: Date
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    date = new Date(str + 'T00:00:00')
  } else {
    date = new Date(str)
  }
  if (Number.isNaN(date.getTime())) return '—'
  try {
    return format(date, 'MMM d, yyyy')
  } catch {
    return '—'
  }
}

/** End of current week (Saturday 23:59). Week = Sun–Sat. */
function getEndOfWeek(from: Date): Date {
  const d = new Date(from)
  const day = d.getDay()
  const daysToSaturday = day === 6 ? 0 : (6 - day + 7) % 7
  d.setDate(d.getDate() + daysToSaturday)
  d.setHours(23, 59, 59, 999)
  return d
}

/** Collect unique truck types from profile fleet. */
function getFleetTruckTypes(profile: Record<string, any> | null): string[] {
  const fleet = profile?.fleetPerState
  if (!Array.isArray(fleet)) return []
  const set = new Set<string>()
  for (const entry of fleet) {
    const trucks = entry?.trucks
    if (trucks && typeof trucks === 'object') {
      for (const key of Object.keys(trucks)) {
        if (key && typeof key === 'string') set.add(key)
      }
    }
  }
  return Array.from(set).sort()
}

const STATUS_LABEL: Record<string, string> = {
  assigned: 'Assigned',
  dispatched: 'Dispatched',
  in_transit: 'In transit',
  delivered: 'Delivered',
}

/** Build a single searchable string from all important job/row fields. */
function buildSearchText(row: any): string {
  const job = row?.job || {}
  const spec = job?.spec || {}
  const origin = spec?.originAddress || {}
  const dest = spec?.destinationAddress || {}
  const parts: string[] = [
    job._id,
    job.id,
    job.reference,
    job.displayId,
    job.title,
    job.type,
    job.destinationWarehouseCode,
    job.destinationState,
    job.destinationCity,
    job.warehouseCode,
    job.clientName,
    job.carrierJobStatus,
    STATUS_LABEL[job.carrierJobStatus],
    origin.name,
    origin.city,
    origin.state,
    origin.street,
    origin.zipCode,
    origin.country,
    dest.name,
    dest.city,
    dest.state,
    dest.street,
    dest.zipCode,
    dest.country,
    spec.clientName,
    job.carrierTruckType,
    job.carrierDriverName,
    job.carrierLicensePlate,
    row?.amount != null ? String(row.amount) : '',
    row?._id,
  ]
  return parts
    .filter((v) => v != null && v !== '')
    .map((v) => String(v).toLowerCase())
    .join(' ')
}

export default function ScheduledJobsPage() {
  const [offers, setOffers] = useState<any[]>([])
  const [profile, setProfile] = useState<Record<string, any> | null>(null)
  const [loading, setLoading] = useState(true)
  const [modalRow, setModalRow] = useState<any | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const loadData = useCallback(() => {
    setLoading(true)
    Promise.all([api.listMyOffers({ status: 'approved' }), api.getProfile()])
      .then(([res, p]) => {
        setOffers(res.data || [])
        setProfile(p || null)
      })
      .catch(() => setOffers([]))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleSaveTruckDetails = async (
    row: any,
    form: {
      truckDescription: string
      truckType: string
      licensePlate: string
      driverName: string
      carrierJobStatus: string
      carrierProposedPickupDate: string
      carrierProposedPickupTime: string
    }
  ) => {
    const job = row.job || {}
    const jobId = job._id || job.id
    const warehouseCode = job.warehouseCode
    if (!jobId || !warehouseCode) return
    const id = `${warehouseCode}-${jobId}`
    setSavingId(id)
    try {
      await api.updateActiveJobDetails(warehouseCode, String(jobId), {
        truckDescription: form.truckDescription || undefined,
        truckType: form.truckType || undefined,
        licensePlate: form.licensePlate || undefined,
        driverName: form.driverName || undefined,
        carrierJobStatus: form.carrierJobStatus ? (form.carrierJobStatus as 'assigned' | 'dispatched' | 'in_transit' | 'delivered') : undefined,
        carrierProposedPickupDate: form.carrierProposedPickupDate || undefined,
        carrierProposedPickupTime: form.carrierProposedPickupTime || undefined,
      })
      setModalRow(null)
      loadData()
    } catch (e: any) {
      alert(e?.message || 'Failed to save')
    } finally {
      setSavingId(null)
    }
  }

  const now = new Date()
  const todayKey = toDateKey(now)
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowKey = toDateKey(tomorrow)
  const endOfWeek = getEndOfWeek(now)
  const endOfWeekKey = toDateKey(endOfWeek)

  /** Only show jobs that have both pickup date and time set. */
  const withPickup = offers.filter((row) => {
    const j = row.job || {}
    return j.carrierProposedPickupDate && j.carrierProposedPickupTime
  })

  const sorted = [...withPickup].sort((a, b) => {
    const jobA = a.job || {}
    const jobB = b.job || {}
    const dtA = getPickupDateTime(jobA)?.getTime() ?? Number.MAX_SAFE_INTEGER
    const dtB = getPickupDateTime(jobB)?.getTime() ?? Number.MAX_SAFE_INTEGER
    return dtA - dtB
  })

  /** Status for color coding: overdue (red), very close (yellow), on time (green). */
  const CLOSE_THRESHOLD_MS = 2 * 60 * 60 * 1000 // 2 hours
  function getScheduleStatus(job: any): 'overdue' | 'close' | 'ontime' {
    const dt = getPickupDateTime(job)
    if (!dt) return 'ontime'
    const nowMs = now.getTime()
    const pickupMs = dt.getTime()
    if (pickupMs < nowMs) return 'overdue'
    if (pickupMs - nowMs <= CLOSE_THRESHOLD_MS) return 'close'
    return 'ontime'
  }

  const rowBgClass: Record<'overdue' | 'close' | 'ontime', string> = {
    overdue: 'bg-red-50 hover:bg-red-100/80 border-l-4 border-red-500',
    close: 'bg-amber-50 hover:bg-amber-100/80 border-l-4 border-amber-500',
    ontime: 'bg-emerald-50/50 hover:bg-emerald-100/50 border-l-4 border-emerald-500',
  }

  let pickupToday = 0
  let pickupTomorrow = 0
  let pickupRestOfWeek = 0
  for (const row of sorted) {
    const dt = getPickupDateTime(row.job)
    if (!dt) continue
    const dateKey = toDateKey(dt)
    if (dateKey === todayKey) pickupToday++
    else if (dateKey === tomorrowKey) pickupTomorrow++
    else if (dateKey > tomorrowKey && dateKey <= endOfWeekKey) pickupRestOfWeek++
  }

  const query = searchQuery.trim().toLowerCase()
  const filteredSorted = query
    ? sorted.filter((row) => buildSearchText(row).includes(query))
    : sorted

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
          <Calendar className="w-6 h-6" />
          Scheduled jobs
        </h1>
        <p className="text-gray-600 text-sm mt-1">
          Visual guide of what is booked, ordered by soonest pickup. Click a row to open job details.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <div className="text-sm font-medium text-amber-800">Pickup today</div>
          <div className="text-2xl font-bold text-amber-900">{pickupToday}</div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
          <div className="text-sm font-medium text-slate-700">Pickup tomorrow</div>
          <div className="text-2xl font-bold text-slate-900">{pickupTomorrow}</div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
          <div className="text-sm font-medium text-gray-700">Rest of week</div>
          <div className="text-2xl font-bold text-gray-900">{pickupRestOfWeek}</div>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-gray-500">
            <Loader2 className="w-6 h-6 animate-spin" />
            Loading…
          </div>
        ) : sorted.length === 0 ? (
          <div className="px-4 py-12 text-center text-gray-500">
            No scheduled jobs. Set pickup date and time on approved jobs (Active jobs) to see them here.
          </div>
        ) : (
          <>
            <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by job ID, destination, client, pickup city, status, amount…"
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
              </div>
              <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-emerald-500" /> On time</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-amber-500" /> Very close (≤2h)</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-red-500" /> Overdue</span>
              </div>
            </div>
            {filteredSorted.length === 0 ? (
              <div className="px-4 py-12 text-center text-gray-500">
                No jobs match &quot;{searchQuery}&quot;. Try job ID, destination, client name, or pickup city.
              </div>
            ) : (
            <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs font-semibold text-gray-600 uppercase">
              <tr>
                <th className="px-4 py-3">Pickup city and state</th>
                <th className="px-4 py-3">Job</th>
                <th className="px-4 py-3">Pickup date</th>
                <th className="px-4 py-3">Pickup time</th>
                <th className="px-4 py-3">Destination</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredSorted.map((row) => {
                const job = row.job || {}
                const jobId = job._id || job.id
                const scheduleStatus = getScheduleStatus(job)
                const pickupDateStr = formatPickupDateDisplay(job.carrierProposedPickupDate)
                const pickupTimeStr = job.carrierProposedPickupTime || '—'
                return (
                  <tr
                    key={row._id}
                    onClick={() => setModalRow(row)}
                    className={`cursor-pointer ${rowBgClass[scheduleStatus]}`}
                  >
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {getPickupCityState(job)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 rounded bg-gray-100 px-2 py-0.5 font-medium text-gray-800">
                        {job.type === 'FTL' ? <Truck className="w-3.5 h-3.5" /> : <Package className="w-3.5 h-3.5" />}
                        {job.type}
                      </span>
                      <div className="font-medium text-gray-900 mt-0.5">{job.title || job.reference || jobId || '—'}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{pickupDateStr}</td>
                    <td className="px-4 py-3 text-gray-700">{pickupTimeStr}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {job.destinationWarehouseCode || '—'} {job.destinationState && `(${job.destinationState})`}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {job.carrierJobStatus ? STATUS_LABEL[job.carrierJobStatus] || job.carrierJobStatus : '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">
                      ${Number(row.amount).toFixed(2)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
            )}
          </>
        )}
      </div>

      {modalRow && modalRow.status === 'approved' && (
        <ActiveJobModal
          row={modalRow}
          truckTypeOptions={getFleetTruckTypes(profile)}
          onSave={(form) => handleSaveTruckDetails(modalRow, form)}
          onClose={() => setModalRow(null)}
          saving={savingId === `${modalRow.job?.warehouseCode}-${modalRow.job?._id || modalRow.job?.id}`}
        />
      )}
    </div>
  )
}
