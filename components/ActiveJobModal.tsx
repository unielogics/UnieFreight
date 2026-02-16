'use client'

import { useState, useEffect, useCallback } from 'react'
import { Package, Truck, Loader2, X, Mail, Send, FileDown } from 'lucide-react'
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

export const CARRIER_STATUS_OPTIONS = [
  { value: '', label: '—' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'dispatched', label: 'Dispatched' },
  { value: 'in_transit', label: 'In transit' },
  { value: 'delivered', label: 'Delivered' },
] as const

function buildProposedPickupTimeOptions(): string[] {
  const options: string[] = []
  const hours = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
  const minutes = ['00', '15', '30', '45']
  for (const period of ['AM', 'PM'] as const) {
    for (const h of hours) {
      const hourStr = h === 12 ? '12' : String(h).padStart(2, '0')
      for (const m of minutes) {
        options.push(`${hourStr}:${m} ${period}`)
      }
    }
  }
  return options
}
const PROPOSED_PICKUP_TIME_OPTIONS = buildProposedPickupTimeOptions()

function normalizeProposedPickupTime(value: string | undefined): string {
  if (!value || !value.trim()) return ''
  const v = value.trim()
  if (PROPOSED_PICKUP_TIME_OPTIONS.includes(v)) return v
  const match = v.match(/^(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)?$/i)
  if (match) {
    const hour = parseInt(match[1], 10)
    const min = match[2]
    const period = (match[3] || '').toUpperCase() || (hour < 12 ? 'AM' : 'PM')
    const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
    const hourStr = h12 === 12 ? '12' : String(h12).padStart(2, '0')
    const key = `${hourStr}:${min} ${period === 'AM' ? 'AM' : 'PM'}`
    if (PROPOSED_PICKUP_TIME_OPTIONS.includes(key)) return key
  }
  const asDate = new Date(`1970-01-01T${v}`)
  if (!Number.isNaN(asDate.getTime())) {
    const h = asDate.getHours()
    const m = asDate.getMinutes()
    const period = h < 12 ? 'AM' : 'PM'
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h
    const hourStr = h12 === 12 ? '12' : String(h12).padStart(2, '0')
    const minStr = String(m).padStart(2, '0')
    const key = `${hourStr}:${minStr} ${period}`
    if (PROPOSED_PICKUP_TIME_OPTIONS.includes(key)) return key
    const closest = PROPOSED_PICKUP_TIME_OPTIONS.find((t) => t.startsWith(`${hourStr}:`))
    if (closest) return closest
  }
  return ''
}

function formatAddress(addr: Record<string, any> | undefined) {
  if (!addr) return '—'
  const parts = [
    addr.street,
    [addr.city, addr.state, addr.zipCode].filter(Boolean).join(', '),
    addr.country,
  ].filter(Boolean)
  return parts.join(' · ') || '—'
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
  truckTypeOptions,
  onSave,
  onCancel,
  saving,
}: {
  job: any
  truckTypeOptions: string[]
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
  const [carrierProposedPickupTime, setCarrierProposedPickupTime] = useState(() =>
    normalizeProposedPickupTime(job.carrierProposedPickupTime ?? '')
  )
  const truckTypeSelectOptions = [...truckTypeOptions]
  if (truckType && !truckTypeOptions.includes(truckType)) truckTypeSelectOptions.push(truckType)
  truckTypeSelectOptions.sort()

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
          <select
            value={truckType}
            onChange={(e) => setTruckType(e.target.value)}
            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
          >
            <option value="">— Select vehicle —</option>
            {truckTypeSelectOptions.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
          {truckTypeOptions.length === 0 && (
            <p className="text-xs text-amber-600 mt-0.5">Add vehicles in Settings → Company (Fleet) to select here.</p>
          )}
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
          <label className="block text-xs font-medium text-gray-600 mb-0.5">Proposed pickup time</label>
          <select
            value={carrierProposedPickupTime}
            onChange={(e) => setCarrierProposedPickupTime(e.target.value)}
            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
          >
            <option value="">— Select time —</option>
            {PROPOSED_PICKUP_TIME_OPTIONS.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-0.5">Format: XX:XX AM/PM (e.g. 09:00 AM, 02:30 PM)</p>
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

export type ActiveJobModalForm = {
  truckDescription: string
  truckType: string
  licensePlate: string
  driverName: string
  carrierJobStatus: string
  carrierProposedPickupDate: string
  carrierProposedPickupTime: string
}

export function ActiveJobModal({
  row,
  truckTypeOptions,
  onSave,
  onClose,
  saving,
}: {
  row: any
  truckTypeOptions: string[]
  onSave: (form: ActiveJobModalForm) => void
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
          <div className="flex items-center gap-2">
            {(job._id || job.id) && job.warehouseCode && (
              <button
                type="button"
                onClick={async () => {
                  const id = String(job._id || job.id)
                  const wh = String(job.warehouseCode)
                  try {
                    const blob = await api.getFreightJobBOL(id, wh)
                    const url = URL.createObjectURL(blob)
                    window.open(url, '_blank', 'noopener,noreferrer')
                    setTimeout(() => URL.revokeObjectURL(url), 60000)
                  } catch (e: any) {
                    alert(e?.message || 'Failed to download BOL')
                  }
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <FileDown className="h-4 w-4" />
                Download BOL
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
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

            <div className="rounded border border-gray-200 bg-gray-50 px-4 py-3">
              <h3 className="text-xs font-semibold uppercase text-gray-500 mb-2">Load summary</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                <div>
                  <span className="text-gray-500 font-medium">Pallets</span>
                  <div className="font-medium text-gray-900">{spec.palletCount != null ? spec.palletCount : (job.type === 'LTL' ? 1 : '—')}</div>
                </div>
                <div>
                  <span className="text-gray-500 font-medium">Clients</span>
                  <div className="font-medium text-gray-900">{spec.clientCount != null ? spec.clientCount : '—'}</div>
                </div>
                <div>
                  <span className="text-gray-500 font-medium">SKUs</span>
                  <div className="font-medium text-gray-900">{spec.skuCount != null ? spec.skuCount : '—'}</div>
                </div>
                <div>
                  <span className="text-gray-500 font-medium">Boxes</span>
                  <div className="font-medium text-gray-900">{spec.totalBoxes != null ? spec.totalBoxes : (spec.boxesInPallet != null ? spec.boxesInPallet : '—')}</div>
                </div>
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
            truckTypeOptions={truckTypeOptions}
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
