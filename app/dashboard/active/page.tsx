'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Package, Truck, Loader2, ExternalLink, Settings2 } from 'lucide-react'
import { api } from '@/lib/api/client'
import { format } from 'date-fns'
import { ActiveJobModal } from '@/components/ActiveJobModal'

function formatPickupBy(job: any): string {
  const spec = job?.spec || {}
  const pickupDate = spec.pickupDate
  const deliverBy = spec.deliverBy
  if (pickupDate) return format(new Date(pickupDate), 'MMM d, yyyy')
  if (deliverBy) return format(new Date(deliverBy), 'MMM d, yyyy')
  return '—'
}

/** Collect unique truck types from profile fleet (Company settings). */
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

export default function ActiveJobsPage() {
  const [offers, setOffers] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<Record<string, any> | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('approved')
  const [modalRow, setModalRow] = useState<any | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)

  useEffect(() => {
    api.getProfile().then(setProfile).catch(() => setProfile(null))
  }, [])

  const loadOffers = useCallback(() => {
    setLoading(true)
    api
      .listMyOffers({ status: statusFilter || undefined })
      .then((res) => {
        setOffers(res.data || [])
        setTotal(res.total ?? 0)
      })
      .catch(() => setOffers([]))
      .finally(() => setLoading(false))
  }, [statusFilter])

  useEffect(() => {
    loadOffers()
  }, [loadOffers])

  const handleSaveTruckDetails = async (row: any, form: {
    truckDescription: string
    truckType: string
    licensePlate: string
    driverName: string
    carrierJobStatus: string
    carrierProposedPickupDate: string
    carrierProposedPickupTime: string
  }) => {
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
      loadOffers()
    } catch (e: any) {
      alert(e?.message || 'Failed to save')
    } finally {
      setSavingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Active jobs</h1>
        <p className="text-gray-600 text-sm mt-1">
          Approved quotes appear here. Add the truck that will service the job and update status (dispatched, in transit, delivered).
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm">
            <span className="text-gray-600">Status</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded border border-gray-300 px-2 py-1.5 text-sm"
            >
              <option value="">All</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved (active)</option>
              <option value="rejected">Rejected</option>
            </select>
          </label>
          <span className="text-sm text-gray-500">{total} offer{total !== 1 ? 's' : ''}</span>
        </div>
        {(() => {
          const approvedTotal = offers.filter((o: any) => o.status === 'approved').reduce((sum: number, o: any) => sum + Number(o.amount || 0), 0)
          if (approvedTotal > 0) {
            return (
              <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-2">
                <span className="text-sm text-emerald-700 font-medium">Revenue (approved):</span>
                <span className="ml-2 text-sm font-semibold text-emerald-800">${approvedTotal.toFixed(2)} USD</span>
              </div>
            )
          }
          return null
        })()}
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-12 text-gray-500">
          <Loader2 className="w-6 h-6 animate-spin" />
          Loading…
        </div>
      ) : (
        <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs font-semibold text-gray-600 uppercase">
              <tr>
                <th className="px-4 py-3">Job</th>
                <th className="px-4 py-3">Pallets</th>
                <th className="px-4 py-3">Clients</th>
                <th className="px-4 py-3">SKUs</th>
                <th className="px-4 py-3">Boxes</th>
                <th className="px-4 py-3">Your offer</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Carrier status</th>
                <th className="px-4 py-3">Pickup by</th>
                <th className="px-4 py-3">Submitted</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {offers.map((row) => {
                const offer = row
                const job = row.job || {}
                const jobId = job._id || job.id || offer.freightJobId
                const warehouseCode = job.warehouseCode
                const rowId = warehouseCode && jobId ? `${warehouseCode}-${jobId}` : offer._id
                const isApproved = offer.status === 'approved'
                return (
                  <tr key={offer._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 rounded bg-gray-100 px-2 py-0.5 font-medium text-gray-800">
                        {job.type === 'FTL' ? <Truck className="w-3.5 h-3.5" /> : <Package className="w-3.5 h-3.5" />}
                        {job.type}
                      </span>
                      <div className="font-medium text-gray-900 mt-0.5">{job.title || job.reference || jobId || '—'}</div>
                      <div className="text-xs text-gray-500">{job.destinationWarehouseCode} {job.destinationState && `(${job.destinationState})`}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-700 tabular-nums">
                      {job.spec?.palletCount != null ? job.spec.palletCount : (job.type === 'LTL' ? 1 : '—')}
                    </td>
                    <td className="px-4 py-3 text-gray-700 tabular-nums">
                      {job.spec?.clientCount != null ? job.spec.clientCount : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-700 tabular-nums">
                      {job.spec?.skuCount != null ? job.spec.skuCount : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-700 tabular-nums">
                      {job.spec?.totalBoxes != null ? job.spec.totalBoxes : (job.spec?.boxesInPallet != null ? job.spec.boxesInPallet : '—')}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      ${Number(offer.amount).toFixed(2)} {offer.currency || 'USD'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          offer.status === 'approved'
                            ? 'rounded bg-green-100 px-2 py-0.5 text-green-800'
                            : offer.status === 'rejected'
                              ? 'rounded bg-red-100 px-2 py-0.5 text-red-800'
                              : 'rounded bg-amber-100 px-2 py-0.5 text-amber-800'
                        }
                      >
                        {offer.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {isApproved && job.carrierJobStatus && (
                        <span className="rounded bg-slate-100 px-2 py-0.5 text-slate-700 capitalize">
                          {String(job.carrierJobStatus).replace('_', ' ')}
                        </span>
                      )}
                      {isApproved && !job.carrierJobStatus && <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {formatPickupBy(job)}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {offer.createdAt ? format(new Date(offer.createdAt), 'MMM d, yyyy') : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {isApproved && warehouseCode && jobId && (
                          <button
                            type="button"
                            onClick={() => setModalRow(row)}
                            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                          >
                            <Settings2 className="w-3.5 h-3.5" />
                            Truck & status
                          </button>
                        )}
                        {(row.snapshotId || jobId) && (
                          <Link
                            href={`/dashboard/opportunities/${row.snapshotId || jobId}`}
                            className="inline-flex items-center gap-1 text-amber-600 hover:text-amber-700 font-medium text-sm"
                          >
                            View job <ExternalLink className="w-3.5 h-3.5" />
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {offers.length === 0 && (
            <div className="px-4 py-12 text-center text-gray-500">
              {statusFilter === 'approved'
                ? 'No approved jobs yet. When a warehouse approves your quote, it will appear here so you can add truck details and update status.'
                : 'No offers yet. Go to Find opportunities to submit quotes.'}
            </div>
          )}
        </div>
      )}

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
