'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Package, Truck, Loader2, ExternalLink, Settings2, X, Mail, Send } from 'lucide-react'
import { api } from '@/lib/api/client'
import { fetchMailbox, sendMailboxEmail } from '@/lib/api/mailbox'
import { format } from 'date-fns'
import {
  hasAnyCapability,
  formatLoadingEquipment,
  formatRequiredTruckEquipment,
  formatLoadingDockStyles,
  formatCallAheadHours,
} from '@/lib/freight-capabilities-labels'

const CARRIER_STATUS_OPTIONS = [
  { value: '', label: '—' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'dispatched', label: 'Dispatched' },
  { value: 'in_transit', label: 'In transit' },
  { value: 'delivered', label: 'Delivered' },
] as const

function formatAddress(addr: Record<string, any> | undefined) {
  if (!addr) return '—'
  const parts = [
    addr.street,
    [addr.city, addr.state, addr.zipCode].filter(Boolean).join(', '),
    addr.country,
  ].filter(Boolean)
  return parts.join(' · ') || '—'
}

function formatPickupBy(job: any): string {
  const spec = job?.spec || {}
  const pickupDate = spec.pickupDate
  const deliverBy = spec.deliverBy
  if (pickupDate) return format(new Date(pickupDate), 'MMM d, yyyy')
  if (deliverBy) return format(new Date(deliverBy), 'MMM d, yyyy')
  return '—'
}

export default function ActiveJobsPage() {
  const [offers, setOffers] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('approved')
  const [modalRow, setModalRow] = useState<any | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)

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
          onSave={(form) => handleSaveTruckDetails(modalRow, form)}
          onClose={() => setModalRow(null)}
          saving={savingId === `${modalRow.job?.warehouseCode}-${modalRow.job?._id || modalRow.job?.id}`}
        />
      )}
    </div>
  )
}

function ActiveJobModal({
  row,
  onSave,
  onClose,
  saving,
}: {
  row: any
  onSave: (form: { truckDescription: string; truckType: string; licensePlate: string; driverName: string; carrierJobStatus: string; carrierProposedPickupDate: string; carrierProposedPickupTime: string }) => void
  onClose: () => void
  saving: boolean
}) {
  const job = row.job || {}
  const offer = row
  const spec = job.spec || {}
  const originAddr = spec.originAddress
  const destAddr = spec.destinationAddress
  const deliverBy = spec.deliverBy ? format(new Date(spec.deliverBy), 'PPp') : null
  const pickupDate = spec.pickupDate ? format(new Date(spec.pickupDate), 'PPp') : null

  return (
    <div className="fixed inset-0 top-14 z-50 flex flex-col bg-white shadow-xl">
      <div className="flex-1 min-h-0 flex flex-col">
        <div className="shrink-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            {job.type} – {job.title || job.reference || 'Job details'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-1 min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span className="inline-flex items-center gap-1 rounded bg-gray-100 px-2 py-0.5 font-medium text-gray-800">
                {job.type === 'FTL' ? <Truck className="w-3.5 h-3.5" /> : <Package className="w-3.5 h-3.5" />}
                {job.type}
              </span>
              <span>Destination: {job.destinationWarehouseCode || '—'} {job.destinationState && `(${job.destinationState})`}</span>
              <span>Your offer: ${Number(offer.amount).toFixed(2)}</span>
            </div>

            <div className="space-y-4">
              <div className="rounded border border-gray-200 bg-gray-50 px-4 py-3">
                <h3 className="text-xs font-semibold uppercase text-gray-500 mb-1">Shipping from (pickup)</h3>
                <p className="text-gray-900 text-sm">{originAddr?.name && `${originAddr.name} — `}{formatAddress(originAddr)}</p>
              </div>
              <div className="rounded border border-gray-200 bg-gray-50 px-4 py-3">
                <h3 className="text-xs font-semibold uppercase text-gray-500 mb-1">Shipping to</h3>
                <p className="text-gray-900 text-sm">{destAddr?.name && `${destAddr.name} — `}{formatAddress(destAddr)}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              {pickupDate && (
                <div className="rounded border border-gray-100 bg-gray-50 px-3 py-2">
                  <span className="text-gray-500 font-medium">Pickup by</span>
                  <div className="font-medium text-gray-900">{pickupDate}</div>
                </div>
              )}
              {deliverBy && (
                <div className="rounded border border-gray-100 bg-gray-50 px-3 py-2">
                  <span className="text-gray-500 font-medium">Deliver by</span>
                  <div className="font-medium text-gray-900">{deliverBy}</div>
                </div>
              )}
              {spec.palletCubicFeet != null && (
                <div className="rounded border border-gray-100 bg-gray-50 px-3 py-2">
                  <span className="text-gray-500 font-medium">Pallet ft³</span>
                  <div className="font-medium text-gray-900">{spec.palletCubicFeet}</div>
                </div>
              )}
              {spec.palletWeightLbs != null && (
                <div className="rounded border border-gray-100 bg-gray-50 px-3 py-2">
                  <span className="text-gray-500 font-medium">Weight</span>
                  <div className="font-medium text-gray-900">{spec.palletWeightLbs} lbs</div>
                </div>
              )}
            </div>

            {hasAnyCapability(spec.originCapabilities) && (
            <div className="rounded border border-amber-100 bg-amber-50/50 px-4 py-3">
              <h3 className="text-xs font-semibold uppercase text-amber-800 mb-2">Pickup requirements</h3>
              <ul className="text-sm text-gray-800 space-y-1">
                {spec.originCapabilities.canReceiveTruckTrailers !== undefined && (
                  <li>Can receive truck trailers: {spec.originCapabilities.canReceiveTruckTrailers ? 'Yes' : 'No'}</li>
                )}
                {formatLoadingEquipment(spec.originCapabilities.loadingEquipment) && (
                  <li>Loading equipment: {formatLoadingEquipment(spec.originCapabilities.loadingEquipment)}</li>
                )}
                {formatCallAheadHours(spec.originCapabilities.callAheadHours) && (
                  <li>Call-ahead: {formatCallAheadHours(spec.originCapabilities.callAheadHours)}</li>
                )}
                {formatRequiredTruckEquipment(spec.originCapabilities.requiredEquipmentInTruck) && (
                  <li>Required in truck: {formatRequiredTruckEquipment(spec.originCapabilities.requiredEquipmentInTruck)}</li>
                )}
                {(formatLoadingDockStyles(spec.originCapabilities.loadingDockStyles) || formatLoadingDockStyles(spec.originCapabilities.loadingDockStyle)) && (
                  <li>Dock style: {formatLoadingDockStyles(spec.originCapabilities.loadingDockStyles) || formatLoadingDockStyles(spec.originCapabilities.loadingDockStyle)}</li>
                )}
              </ul>
            </div>
          )}

          <TruckDetailsForm
            job={job}
            row={row}
            onSave={onSave}
            onCancel={onClose}
            saving={saving}
          />
          </div>

          {row.threadId ? (
            <div className="w-96 shrink-0 border-l border-gray-200 flex flex-col bg-gray-50">
              <ThreadChat
                threadId={row.threadId}
                subject={`${job.displayId || job.type} – ${job.title || job.reference || 'Job'}`}
                warehouseCode={job.warehouseCode}
                jobId={String(job._id || job.id)}
              />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function ThreadChat({
  threadId,
  subject,
  warehouseCode,
  jobId,
}: {
  threadId: string
  subject: string
  warehouseCode: string
  jobId: string
}) {
  const [messages, setMessages] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [replyBody, setReplyBody] = useState('')
  const [sending, setSending] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    fetchMailbox({ threadId, limit: 50 })
      .then((r: any) => setMessages(r.messages || []))
      .catch(() => setMessages([]))
      .finally(() => setLoading(false))
  }, [threadId])

  useEffect(() => {
    load()
  }, [load])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!replyBody.trim()) return
    setSending(true)
    try {
      await sendMailboxEmail({
        subject: `Re: ${subject}`,
        body: replyBody.trim(),
        threadId,
        warehouseId: warehouseCode,
        freightJobId: jobId,
      })
      setReplyBody('')
      load()
    } catch (err: any) {
      alert(err?.message || 'Failed to send')
    } finally {
      setSending(false)
    }
  }

  const sorted = [...messages].sort(
    (a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
  )

  return (
    <div className="flex flex-col h-full p-4">
      <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2 shrink-0">
        <Mail className="w-4 h-4" />
        Chat with warehouse
      </h4>
      <div className="flex-1 min-h-0 overflow-y-auto rounded-lg border border-gray-200 p-2 space-y-2 bg-white">
        {loading ? (
          <div className="flex items-center justify-center py-6 text-gray-500 text-sm">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        ) : sorted.length === 0 ? (
          <div className="text-sm text-gray-500 py-4 text-center">No messages yet. Send a message to coordinate pickup.</div>
        ) : (
          sorted.map((m: any) => (
            <div
              key={m._id}
              className={`rounded px-3 py-2 text-sm ${
                m.direction === 'outbound' ? 'bg-amber-100 ml-4' : 'bg-white border border-gray-200 mr-4'
              }`}
            >
              <div className="text-xs text-gray-500 mb-0.5">
                {m.direction === 'outbound' ? 'You' : (m.fromEmail || 'Warehouse')} · {m.createdAt && format(new Date(m.createdAt), 'MMM d, HH:mm')}
              </div>
              <div className="text-gray-900 whitespace-pre-wrap">{m.body}</div>
            </div>
          ))
        )}
      </div>
      <form onSubmit={handleSend} className="mt-3 flex flex-col gap-2 shrink-0">
        <textarea
          value={replyBody}
          onChange={(e) => setReplyBody(e.target.value)}
          placeholder="Type a message…"
          rows={3}
          className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm resize-none"
          disabled={sending}
        />
        <button
          type="submit"
          disabled={sending || !replyBody.trim()}
          className="rounded-lg bg-amber-600 px-3 py-2 text-white hover:bg-amber-700 disabled:opacity-50 flex items-center justify-center gap-1"
        >
          <Send className="w-4 h-4" />
          Send
        </button>
      </form>
    </div>
  )
}

function TruckDetailsForm({
  job,
  row,
  onSave,
  onCancel,
  saving,
}: {
  job: any
  row?: any
  onSave: (form: { truckDescription: string; truckType: string; licensePlate: string; driverName: string; carrierJobStatus: string; carrierProposedPickupDate: string; carrierProposedPickupTime: string }) => void
  onCancel: () => void
  saving: boolean
}) {
  const [truckDescription, setTruckDescription] = useState(job.carrierTruckDescription ?? '')
  const [truckType, setTruckType] = useState(job.carrierTruckType ?? '')
  const [licensePlate, setLicensePlate] = useState(job.carrierLicensePlate ?? '')
  const [driverName, setDriverName] = useState(job.carrierDriverName ?? '')
  const [carrierJobStatus, setCarrierJobStatus] = useState(job.carrierJobStatus ?? '')
  const [carrierProposedPickupDate, setCarrierProposedPickupDate] = useState(
    job.carrierProposedPickupDate ? format(new Date(job.carrierProposedPickupDate), 'yyyy-MM-dd') : ''
  )
  const [carrierProposedPickupTime, setCarrierProposedPickupTime] = useState(job.carrierProposedPickupTime ?? '')

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <h4 className="text-sm font-semibold text-gray-900 mb-3">Truck & status for this job</h4>
      <p className="text-xs text-gray-500 mb-4">
        Add the truck that will go to the warehouse. The warehouse will see this information in the freight job details.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-0.5">Truck description</label>
          <input
            type="text"
            value={truckDescription}
            onChange={(e) => setTruckDescription(e.target.value)}
            placeholder="e.g. 53ft dry van"
            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-0.5">Truck type</label>
          <input
            type="text"
            value={truckType}
            onChange={(e) => setTruckType(e.target.value)}
            placeholder="e.g. Dry van, Flatbed"
            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-0.5">License plate</label>
          <input
            type="text"
            value={licensePlate}
            onChange={(e) => setLicensePlate(e.target.value)}
            placeholder="License plate"
            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-0.5">Driver name</label>
          <input
            type="text"
            value={driverName}
            onChange={(e) => setDriverName(e.target.value)}
            placeholder="Driver name"
            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-gray-600 mb-0.5">Carrier status</label>
          <select
            value={carrierJobStatus}
            onChange={(e) => setCarrierJobStatus(e.target.value)}
            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
          >
            {CARRIER_STATUS_OPTIONS.map((o) => (
              <option key={o.value || 'blank'} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-0.5">Propose pickup date</label>
          <input
            type="date"
            value={carrierProposedPickupDate}
            onChange={(e) => setCarrierProposedPickupDate(e.target.value)}
            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-0.5">Propose pickup time</label>
          <input
            type="text"
            value={carrierProposedPickupTime}
            onChange={(e) => setCarrierProposedPickupTime(e.target.value)}
            placeholder="e.g. 9:00 AM, 14:00"
            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
          />
        </div>
      </div>
      <div className="flex gap-2 mt-4">
        <button
          type="button"
          onClick={() => onSave({ truckDescription, truckType, licensePlate, driverName, carrierJobStatus, carrierProposedPickupDate, carrierProposedPickupTime })}
          disabled={saving}
          className="rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
