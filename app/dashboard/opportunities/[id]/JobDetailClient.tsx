'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Package, Truck, Loader2, ArrowLeft, DollarSign, Pencil, XCircle, ThumbsDown } from 'lucide-react'
import { api } from '@/lib/api/client'
import { format } from 'date-fns'
import {
  hasAnyCapability,
  formatLoadingEquipment,
  formatRequiredTruckEquipment,
  formatLoadingDockStyles,
  formatCallAheadHours,
} from '@/lib/freight-capabilities-labels'

export default function JobDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const [job, setJob] = useState<Record<string, any> | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [amount, setAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [editing, setEditing] = useState(false)
  const [editAmount, setEditAmount] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    api
      .getJob(id)
      .then((data) => {
        if (!cancelled) setJob(data)
      })
      .catch(() => {
        if (!cancelled) setJob(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [id])

  useEffect(() => {
    if (!id || !job) return
    api.markJobViewed(id).catch(() => {})
  }, [id, job])

  const myOffer = job?.myOffer
  const hasOffer = !!myOffer
  const isPending = myOffer?.status === 'pending'

  const handleUpdateOffer = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    const num = parseFloat(editAmount)
    if (Number.isNaN(num) || num < 0) {
      setError('Enter a valid amount.')
      return
    }
    setActionLoading('update')
    try {
      await api.updateOffer(id, { amount: num, notes: editNotes.trim() || undefined })
      setSuccess('Offer updated.')
      setEditing(false)
      setEditAmount('')
      setEditNotes('')
      const updated = await api.getJob(id)
      setJob(updated)
    } catch (err: any) {
      setError(err.message || 'Failed to update offer')
    } finally {
      setActionLoading(null)
    }
  }

  const handleCancelOffer = async () => {
    if (!confirm('Withdraw your offer? You can submit a new quote later if the job is still open.')) return
    setError('')
    setSuccess('')
    setActionLoading('cancel')
    try {
      await api.cancelOffer(id)
      setSuccess('Offer withdrawn.')
      const updated = await api.getJob(id)
      setJob(updated)
    } catch (err: any) {
      setError(err.message || 'Failed to cancel offer')
    } finally {
      setActionLoading(null)
    }
  }

  const handleNotInterested = async () => {
    if (!confirm('Mark this job as Not Interested? It will be moved to your Not interested list.')) return
    setActionLoading('not-interested')
    try {
      await api.markNotInterested(id)
      router.push('/dashboard/opportunities')
    } catch (err: any) {
      setError(err?.message || 'Failed to update')
      setActionLoading(null)
    }
  }

  const handleSubmitOffer = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    const num = parseFloat(amount)
    if (Number.isNaN(num) || num < 0) {
      setError('Enter a valid amount.')
      return
    }
    setSubmitting(true)
    try {
      await api.submitOffer(id, { amount: num, currency: 'USD', notes: notes.trim() || undefined })
      setSuccess('Offer submitted. The warehouse will review and may approve your quote.')
      setAmount('')
      setNotes('')
      const updated = await api.getJob(id)
      setJob(updated)
    } catch (err: any) {
      setError(err.message || 'Failed to submit offer')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-12 text-gray-500">
        <Loader2 className="w-6 h-6 animate-spin" />
        Loading job…
      </div>
    )
  }
  if (!job) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800">
        Job not found or no longer open.
        <Link href="/dashboard/opportunities" className="ml-2 underline">Back to opportunities</Link>
      </div>
    )
  }

  const spec = job.spec || {}
  const loc = spec.locationAttributes || {}

  const formatAddress = (addr: Record<string, any> | undefined) => {
    if (!addr) return '—'
    const parts = [addr.street, [addr.city, addr.state, addr.zipCode].filter(Boolean).join(', '), addr.country].filter(Boolean)
    return parts.join(' · ') || '—'
  }

  const originAddr = spec.originAddress
  const destAddr = spec.destinationAddress
  const palletSnap = spec.palletTemplateSnapshot
  const deliverBy = spec.deliverBy ? format(new Date(spec.deliverBy), 'PPp') : null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <Link
          href="/dashboard/opportunities"
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to opportunities
        </Link>
        <button
          type="button"
          onClick={handleNotInterested}
          disabled={!!actionLoading}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
        >
          {actionLoading === 'not-interested' ? <Loader2 className="w-4 h-4 animate-spin" /> : <ThumbsDown className="w-4 h-4" />}
          Not interested
        </button>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="flex items-center gap-2 text-gray-500 text-sm mb-4">
          <span className="inline-flex items-center gap-1 rounded bg-gray-100 px-2 py-0.5 font-medium text-gray-800">
            {job.type === 'FTL' ? <Truck className="w-3.5 h-3.5" /> : <Package className="w-3.5 h-3.5" />}
            {job.type}
          </span>
          <span>Destination: {job.destinationWarehouseCode || '—'} {job.destinationState && `(${job.destinationState})`}</span>
        </div>
        <h1 className="text-xl font-semibold text-gray-900">{job.title || job.reference || 'Freight job'}</h1>

        <div className="mt-6 space-y-4">
          <div className="rounded border border-gray-200 bg-gray-50 px-4 py-3">
            <h3 className="text-xs font-semibold uppercase text-gray-500 mb-1">Shipping from</h3>
            <p className="text-gray-900 text-sm">{originAddr?.name && `${originAddr.name} — `}{formatAddress(originAddr)}</p>
          </div>
          <div className="rounded border border-gray-200 bg-gray-50 px-4 py-3">
            <h3 className="text-xs font-semibold uppercase text-gray-500 mb-1">Shipping to</h3>
            <p className="text-gray-900 text-sm">{destAddr?.name && `${destAddr.name} — `}{formatAddress(destAddr)}</p>
          </div>
        </div>

        <div className="mt-6 rounded border border-gray-200 bg-gray-50 px-4 py-3">
          <h3 className="text-xs font-semibold uppercase text-gray-500 mb-2">Load summary</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div className="rounded border border-gray-100 bg-white px-3 py-2">
              <span className="text-gray-500 font-medium">Pallets</span>
              <div className="font-medium text-gray-900">{spec.palletCount != null ? spec.palletCount : (job.type === 'LTL' ? 1 : '—')}</div>
            </div>
            <div className="rounded border border-gray-100 bg-white px-3 py-2">
              <span className="text-gray-500 font-medium">Clients</span>
              <div className="font-medium text-gray-900">{spec.clientCount != null ? spec.clientCount : '—'}</div>
            </div>
            <div className="rounded border border-gray-100 bg-white px-3 py-2">
              <span className="text-gray-500 font-medium">SKUs</span>
              <div className="font-medium text-gray-900">{spec.skuCount != null ? spec.skuCount : '—'}</div>
            </div>
            <div className="rounded border border-gray-100 bg-white px-3 py-2">
              <span className="text-gray-500 font-medium">Boxes</span>
              <div className="font-medium text-gray-900">{spec.totalBoxes != null ? spec.totalBoxes : (spec.boxesInPallet != null ? spec.boxesInPallet : '—')}</div>
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
          {spec.boxesInPallet != null && (
            <div className="rounded border border-gray-100 bg-gray-50 px-3 py-2">
              <span className="text-gray-500 font-medium">Boxes in pallet</span>
              <div className="font-medium text-gray-900">{spec.boxesInPallet}</div>
            </div>
          )}
          {spec.palletWeightLbs != null && (
            <div className="rounded border border-gray-100 bg-gray-50 px-3 py-2">
              <span className="text-gray-500 font-medium">Weight</span>
              <div className="font-medium text-gray-900">{spec.palletWeightLbs} lbs</div>
            </div>
          )}
          {(spec.palletCubicFeet != null || palletSnap) && (
            <div className="rounded border border-gray-100 bg-gray-50 px-3 py-2">
              <span className="text-gray-500 font-medium">Pallet size</span>
              <div className="font-medium text-gray-900">
                {palletSnap
                  ? `${palletSnap.lengthIn ?? '—'}″ × ${palletSnap.widthIn ?? '—'}″ × ${palletSnap.heightIn ?? '—'}″`
                  : null}
                {spec.palletCubicFeet != null && (
                  <span>{palletSnap ? ` (${spec.palletCubicFeet} ft³)` : `${spec.palletCubicFeet} ft³`}</span>
                )}
              </div>
            </div>
          )}
          {deliverBy && (
            <div className="rounded border border-gray-100 bg-gray-50 px-3 py-2">
              <span className="text-gray-500 font-medium">Deliver by</span>
              <div className="font-medium text-gray-900">{deliverBy}</div>
            </div>
          )}
        </div>

        {loc.pickup && (loc.pickup.liftGate || loc.pickup.dock || loc.pickup.notes) && (
          <div className="mt-4 rounded border border-gray-100 bg-gray-50 px-3 py-2">
            <span className="text-gray-500 font-medium">Pickup</span>
            <div className="text-gray-900 text-sm mt-1">
              {loc.pickup.liftGate && 'Lift gate · '}
              {loc.pickup.dock && 'Dock · '}
              {loc.pickup.notes}
            </div>
          </div>
        )}
        {loc.destination && (loc.destination.liftGate || loc.destination.dock || loc.destination.notes) && (
          <div className="mt-4 rounded border border-gray-100 bg-gray-50 px-3 py-2">
            <span className="text-gray-500 font-medium">Destination access</span>
            <div className="text-gray-900 text-sm mt-1">
              {loc.destination.liftGate && 'Lift gate · '}
              {loc.destination.dock && 'Dock · '}
              {loc.destination.notes}
            </div>
          </div>
        )}

        {hasAnyCapability(spec.originCapabilities) && (
          <div className="mt-4 rounded border border-amber-100 bg-amber-50/50 px-4 py-3">
            <h3 className="text-xs font-semibold uppercase text-amber-800 mb-2">Pickup requirements</h3>
            <ul className="text-sm text-gray-800 space-y-1">
              {spec.originCapabilities.canReceiveTruckTrailers !== undefined && (
                <li>
                  Can receive truck trailers: {spec.originCapabilities.canReceiveTruckTrailers ? 'Yes' : 'No'}
                  {spec.originCapabilities.canReceiveTruckTrailers && spec.originCapabilities.maxTrailerLengthFt && (
                    <span> (up to {spec.originCapabilities.maxTrailerLengthFt} ft)</span>
                  )}
                </li>
              )}
              {formatLoadingEquipment(spec.originCapabilities.loadingEquipment) && (
                <li>Loading equipment: {formatLoadingEquipment(spec.originCapabilities.loadingEquipment)}</li>
              )}
              {formatLoadingEquipment(spec.originCapabilities.unloadingEquipment) && (
                <li>Unloading equipment: {formatLoadingEquipment(spec.originCapabilities.unloadingEquipment)}</li>
              )}
              {((spec.originCapabilities.callAheadHours != null && spec.originCapabilities.callAheadHours >= 0)
                ? formatCallAheadHours(spec.originCapabilities.callAheadHours)
                : (spec.originCapabilities as any).callAheadTimeWindow) && (
                <li>Call-ahead: {(spec.originCapabilities.callAheadHours != null && spec.originCapabilities.callAheadHours >= 0)
                  ? formatCallAheadHours(spec.originCapabilities.callAheadHours)
                  : (spec.originCapabilities as any).callAheadTimeWindow}</li>
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
        {hasAnyCapability(spec.destinationCapabilities) && (
          <div className="mt-4 rounded border border-amber-100 bg-amber-50/50 px-4 py-3">
            <h3 className="text-xs font-semibold uppercase text-amber-800 mb-2">Dropoff requirements (ship-to)</h3>
            <ul className="text-sm text-gray-800 space-y-1">
              {spec.destinationCapabilities.canReceiveTruckTrailers !== undefined && (
                <li>
                  Can receive truck trailers: {spec.destinationCapabilities.canReceiveTruckTrailers ? 'Yes' : 'No'}
                  {spec.destinationCapabilities.canReceiveTruckTrailers && spec.destinationCapabilities.maxTrailerLengthFt && (
                    <span> (up to {spec.destinationCapabilities.maxTrailerLengthFt} ft)</span>
                  )}
                </li>
              )}
              {formatLoadingEquipment(spec.destinationCapabilities.loadingEquipment) && (
                <li>Loading equipment: {formatLoadingEquipment(spec.destinationCapabilities.loadingEquipment)}</li>
              )}
              {formatLoadingEquipment(spec.destinationCapabilities.unloadingEquipment) && (
                <li>Unloading equipment: {formatLoadingEquipment(spec.destinationCapabilities.unloadingEquipment)}</li>
              )}
              {((spec.destinationCapabilities.callAheadHours != null && spec.destinationCapabilities.callAheadHours >= 0)
                ? formatCallAheadHours(spec.destinationCapabilities.callAheadHours)
                : (spec.destinationCapabilities as any).callAheadTimeWindow) && (
                <li>Call-ahead: {(spec.destinationCapabilities.callAheadHours != null && spec.destinationCapabilities.callAheadHours >= 0)
                  ? formatCallAheadHours(spec.destinationCapabilities.callAheadHours)
                  : (spec.destinationCapabilities as any).callAheadTimeWindow}</li>
              )}
              {formatRequiredTruckEquipment(spec.destinationCapabilities.requiredEquipmentInTruck) && (
                <li>Required in truck: {formatRequiredTruckEquipment(spec.destinationCapabilities.requiredEquipmentInTruck)}</li>
              )}
              {(formatLoadingDockStyles(spec.destinationCapabilities.loadingDockStyles) || formatLoadingDockStyles(spec.destinationCapabilities.loadingDockStyle)) && (
                <li>Dock style: {formatLoadingDockStyles(spec.destinationCapabilities.loadingDockStyles) || formatLoadingDockStyles(spec.destinationCapabilities.loadingDockStyle)}</li>
              )}
            </ul>
          </div>
        )}

        <div className="mt-6 pt-6 border-t border-gray-200">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Submit your quote</h2>
          {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
          {success && <p className="text-sm text-green-700 mb-2">{success}</p>}
          {hasOffer ? (
            <div className="rounded-lg border border-gray-200 bg-amber-50/50 p-4">
              {!editing ? (
                <>
                  <p className="text-sm font-medium text-gray-700">
                    Your offer: ${Number(myOffer.amount).toFixed(2)} {myOffer.currency || 'USD'}
                    {myOffer.notes && ` · ${myOffer.notes}`}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Status: {myOffer.status}</p>
                  {isPending && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditing(true)
                          setEditAmount(String(myOffer.amount))
                          setEditNotes(myOffer.notes || '')
                          setError('')
                          setSuccess('')
                        }}
                        className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        Edit price
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelOffer}
                        disabled={!!actionLoading}
                        className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                      >
                        {actionLoading === 'cancel' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                        Withdraw offer
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <form onSubmit={handleUpdateOffer} className="space-y-3 max-w-sm">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Amount (USD)</label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={editAmount}
                        onChange={(e) => setEditAmount(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-amber-500"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
                    <textarea
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      rows={2}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500"
                      placeholder="Transit time, conditions, etc."
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={actionLoading === 'update'}
                      className="rounded-lg bg-amber-500 text-white font-semibold px-4 py-2 hover:bg-amber-600 disabled:opacity-50"
                    >
                      {actionLoading === 'update' ? 'Saving…' : 'Save'}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setEditing(false); setError(''); setSuccess('') }}
                      className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmitOffer} className="space-y-3 max-w-sm">
              {error && <p className="text-sm text-red-600">{error}</p>}
              {success && <p className="text-sm text-green-700">{success}</p>}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (USD)</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  placeholder="Transit time, conditions, etc."
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-amber-500 text-white font-semibold px-4 py-2 hover:bg-amber-600 disabled:opacity-50"
              >
                {submitting ? 'Submitting…' : 'Submit quote'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
