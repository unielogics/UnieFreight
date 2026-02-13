'use client'

import { useState, useEffect } from 'react'
import { Loader2, FileText, AlertCircle, Plus, X } from 'lucide-react'
import { api } from '@/lib/api/client'
import { getUser } from '@/lib/api/auth'

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC',
]

const PREDEFINED_TRUCK_TYPES = [
  '53ft Dry Van',
  '26ft Box',
  'Box Truck',
  'Flatbed',
  'Hot Shot',
  'Straight Truck',
  'Step Deck',
  'Lowboy',
] as const
const OTHER_TRUCK_LABEL = 'Other'

const DOCUMENT_TYPES = [
  { type: 'Insurance', label: 'Insurance' },
  { type: 'LLC Good Standing', label: 'LLC good standing' },
] as const

type DeliveryEntry = { state: string; mode: 'statewide' | 'zips'; zips: string[] }

export default function CompanyPage() {
  const [profile, setProfile] = useState<Record<string, any> | null>(null)
  const [files, setFiles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [companyName, setCompanyName] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactName, setContactName] = useState('')
  const [phone, setPhone] = useState('')
  const [statesServed, setStatesServed] = useState<string[]>([])
  const [fleetPerState, setFleetPerState] = useState<{ state: string; trucks: Record<string, number> }[]>([])
  const [deliveryCoverage, setDeliveryCoverage] = useState<DeliveryEntry[]>([])
  const [stateToAdd, setStateToAdd] = useState('')
  const [fleetOtherType, setFleetOtherType] = useState<Record<string, string>>({})
  const [docUrl, setDocUrl] = useState<Record<string, string>>({})
  const [docUploading, setDocUploading] = useState<Record<string, boolean>>({})

  const user = getUser()
  const isRestricted = user?.gradeStatus === 'under_review' || user?.gradeStatus === 'suspended'

  const loadData = () => {
    Promise.all([api.getProfile(), api.listBusinessFiles()])
      .then(([p, f]) => {
        setProfile(p)
        setCompanyName((p as any).companyName || '')
        setContactEmail((p as any).contactEmail || '')
        setContactName((p as any).contactName || '')
        setPhone((p as any).phone || '')
        setStatesServed((p as any).statesServed || [])
        setFleetPerState((p as any).fleetPerState || [])
        const cov = (p as any).deliveryCoverage || []
        setDeliveryCoverage(
          cov.map((e: any) => ({
            state: e.state || '',
            mode: e.mode === 'zips' ? 'zips' : 'statewide',
            zips: Array.isArray(e.zips) ? e.zips : [],
          }))
        )
        setFiles((f as any).data || [])
      })
      .catch(() => setProfile(null))
  }

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([api.getProfile(), api.listBusinessFiles()])
      .then(([p, f]) => {
        if (cancelled) return
        setProfile(p)
        setCompanyName((p as any).companyName || '')
        setContactEmail((p as any).contactEmail || '')
        setContactName((p as any).contactName || '')
        setPhone((p as any).phone || '')
        setStatesServed((p as any).statesServed || [])
        setFleetPerState((p as any).fleetPerState || [])
        const cov = (p as any).deliveryCoverage || []
        setDeliveryCoverage(
          cov.map((e: any) => ({
            state: e.state || '',
            mode: e.mode === 'zips' ? 'zips' : 'statewide',
            zips: Array.isArray(e.zips) ? e.zips : [],
          }))
        )
        setFiles((f as any).data || [])
      })
      .catch(() => { if (!cancelled) setProfile(null) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const coveragePayload = statesServed.map((state) => {
        const existing = deliveryCoverage.find((d) => d.state === state)
        const mode = existing?.mode ?? 'statewide'
        const zips = existing?.zips ?? []
        return { state, mode, zips: mode === 'zips' ? zips : undefined }
      })
      await api.updateProfile({
        companyName,
        contactEmail,
        contactName,
        phone,
        statesServed,
        fleetPerState,
        deliveryCoverage: coveragePayload,
      })
      loadData()
    } finally {
      setSaving(false)
    }
  }

  const addState = () => {
    const s = stateToAdd.trim()
    if (s && !statesServed.includes(s)) {
      setStatesServed((prev) => [...prev, s].sort())
      setStateToAdd('')
      setDeliveryCoverage((prev) => {
        if (prev.some((d) => d.state === s)) return prev
        const entry: DeliveryEntry = { state: s, mode: 'statewide', zips: [] }
        return [...prev, entry].sort((a, b) => a.state.localeCompare(b.state))
      })
    }
  }

  const removeState = (state: string) => {
    setStatesServed((prev) => prev.filter((s) => s !== state))
    setDeliveryCoverage((prev) => prev.filter((d) => d.state !== state))
    setFleetPerState((prev) => prev.filter((e) => e.state !== state))
    setFleetOtherType((prev) => ({ ...prev, [state]: '' }))
  }

  const getFleetEntry = (state: string) => fleetPerState.find((e) => e.state === state) || { state, trucks: {} }
  const setFleetForState = (state: string, trucks: Record<string, number>) => {
    setFleetPerState((prev) => {
      const rest = prev.filter((e) => e.state !== state)
      if (Object.keys(trucks).length === 0) return rest
      return [...rest, { state, trucks }].sort((a, b) => a.state.localeCompare(b.state))
    })
  }

  const addFleetRow = (state: string, truckType: string, count: number) => {
    const typeLabel = truckType === OTHER_TRUCK_LABEL ? (fleetOtherType[state] || '').trim() || undefined : truckType
    if (!typeLabel || count < 1) return
    const entry = getFleetEntry(state)
    const newTrucks = { ...(entry.trucks || {}), [typeLabel]: (entry.trucks?.[typeLabel] || 0) + count }
    setFleetForState(state, newTrucks)
    if (truckType === OTHER_TRUCK_LABEL) setFleetOtherType((prev) => ({ ...prev, [state]: '' }))
  }

  const removeFleetRow = (state: string, typeLabel: string) => {
    const entry = getFleetEntry(state)
    const trucks = { ...(entry.trucks || {}) }
    delete trucks[typeLabel]
    setFleetForState(state, trucks)
  }

  const setDeliveryForState = (state: string, mode: 'statewide' | 'zips', zips?: string[]) => {
    setDeliveryCoverage((prev) => {
      const rest = prev.filter((d) => d.state !== state)
      return [...rest, { state, mode, zips: zips ?? [] }].sort((a, b) => a.state.localeCompare(b.state))
    })
  }

  const setDeliveryZipsForState = (state: string, zipsText: string) => {
    const zips = zipsText
      .split(/[\n,]+/)
      .map((z) => z.trim())
      .filter(Boolean)
    setDeliveryCoverage((prev) => {
      const rest = prev.filter((d) => d.state !== state)
      return [...rest, { state, mode: 'zips' as const, zips }].sort((a, b) => a.state.localeCompare(b.state))
    })
  }

  const getDeliveryForState = (state: string): DeliveryEntry =>
    deliveryCoverage.find((d) => d.state === state) || { state, mode: 'statewide', zips: [] }

  const statesAvailableToAdd = US_STATES.filter((s) => !statesServed.includes(s))

  const handleDocUpload = async (docType: string) => {
    const url = (docUrl[docType] || '').trim()
    if (!url) return
    setDocUploading((prev) => ({ ...prev, [docType]: true }))
    try {
      await api.uploadBusinessFile({ type: docType, url })
      setDocUrl((prev) => ({ ...prev, [docType]: '' }))
      loadData()
    } catch (e: any) {
      alert(e?.message || 'Upload failed')
    } finally {
      setDocUploading((prev) => ({ ...prev, [docType]: false }))
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
        <h1 className="text-2xl font-semibold text-gray-900">Company</h1>
        <p className="text-gray-600 text-sm mt-1">
          Company (LLC) details, states table, and required documents (Insurance, LLC good standing).
        </p>
      </div>

      {isRestricted && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          Your account is under review. You cannot access new job opportunities until your grade is restored.
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        <div className="rounded-lg border border-gray-200 bg-white p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Company (LLC) & contact</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Company name (LLC)</label>
              <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contact name</label>
              <input type="text" value={contactName} onChange={(e) => setContactName(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500" />
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">States served</h2>
          <p className="text-sm text-gray-500 mb-4">Select a state to add a row to the table. Each row has delivery coverage and fleet for that state.</p>
          <div className="flex flex-wrap gap-2 mb-4">
            <select
              value={stateToAdd}
              onChange={(e) => setStateToAdd(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            >
              <option value="">Select state</option>
              {statesAvailableToAdd.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={addState}
              disabled={!stateToAdd}
              className="inline-flex items-center gap-1 rounded-lg bg-amber-500 text-white px-3 py-2 text-sm font-medium hover:bg-amber-600 disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              Add row
            </button>
          </div>

          {statesServed.length > 0 ? (
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left font-semibold text-gray-700 px-3 py-2 w-20">State</th>
                    <th className="text-left font-semibold text-gray-700 px-3 py-2">Delivery (state-wide or zip codes, comma-separated)</th>
                    <th className="text-left font-semibold text-gray-700 px-3 py-2">Fleet (truck types × count)</th>
                    <th className="w-10 px-2 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {statesServed.map((state) => {
                    const del = getDeliveryForState(state)
                    const entry = getFleetEntry(state)
                    const trucks = entry.trucks || {}
                    return (
                      <tr key={state} className="bg-white hover:bg-gray-50/50">
                        <td className="px-3 py-2 font-medium text-gray-900 align-top">{state}</td>
                        <td className="px-3 py-2 align-top">
                          <div className="space-y-1.5">
                            <label className="flex items-center gap-2 text-xs">
                              <input
                                type="radio"
                                name={`delivery-${state}`}
                                checked={del.mode === 'statewide'}
                                onChange={() => setDeliveryForState(state, 'statewide')}
                                className="rounded border-gray-300 text-amber-600"
                              />
                              State-wide
                            </label>
                            <label className="flex items-center gap-2 text-xs">
                              <input
                                type="radio"
                                name={`delivery-${state}`}
                                checked={del.mode === 'zips'}
                                onChange={() => setDeliveryForState(state, 'zips')}
                                className="rounded border-gray-300 text-amber-600"
                              />
                              Zips:
                            </label>
                            {del.mode === 'zips' && (
                              <input
                                type="text"
                                value={(del.zips || []).join(', ')}
                                onChange={(e) => setDeliveryZipsForState(state, e.target.value)}
                                placeholder="90210, 90211, 90212"
                                className="w-full rounded border border-gray-300 px-2 py-1 text-xs"
                              />
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2 align-top">
                          <div className="flex flex-wrap gap-1.5 mb-1.5">
                            {Object.entries(trucks).map(([type, count]) => (
                              <span key={type} className="inline-flex items-center gap-0.5 rounded bg-gray-100 px-2 py-0.5 text-xs">
                                {type}×{count}
                                <button type="button" onClick={() => removeFleetRow(state, type)} className="text-red-500 hover:text-red-700">
                                  <X className="w-3 h-3" />
                                </button>
                              </span>
                            ))}
                          </div>
                          <FleetAddRowInline
                            state={state}
                            otherValue={fleetOtherType[state] || ''}
                            onOtherChange={(v) => setFleetOtherType((prev) => ({ ...prev, [state]: v }))}
                            onAdd={addFleetRow}
                          />
                        </td>
                        <td className="px-2 py-2 align-top">
                          <button type="button" onClick={() => removeState(state)} className="text-gray-400 hover:text-red-600" aria-label={`Remove ${state}`}>
                            <X className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-gray-500 py-4">Add a state above to create the first row.</p>
          )}
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <button type="submit" disabled={saving} className="rounded-lg bg-amber-500 text-white font-semibold px-4 py-2 hover:bg-amber-600 disabled:opacity-50">
            {saving ? 'Saving…' : 'Save company'}
          </button>
        </div>
      </form>

      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Insurance & documents</h2>
        <p className="text-sm text-gray-500 mb-4">We collect Insurance and LLC good standing. Upload a file to your preferred storage (Google Drive, Dropbox, etc.) and paste the link below, or provide a document URL.</p>
        {DOCUMENT_TYPES.map(({ type, label }) => {
          const existing = files.filter((f: any) => (f.type || '').toLowerCase() === type.toLowerCase())
          return (
            <div key={type} className="mb-6 last:mb-0 rounded-lg border border-gray-200 bg-gray-50/50 p-4">
              <h3 className="font-medium text-gray-900 mb-2">{label}</h3>
              {existing.length > 0 && (
                <ul className="mb-3 space-y-1">
                  {existing.map((f: any, i: number) => (
                    <li key={f._id || i} className="flex items-center gap-2 text-sm">
                      <FileText className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-700">{f.type}</span>
                      <span className="text-gray-500">· {f.status}</span>
                      {f.url && (
                        <a href={f.url} target="_blank" rel="noopener noreferrer" className="text-amber-600 hover:underline">
                          View
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex flex-wrap items-end gap-2">
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-xs font-medium text-gray-500 mb-0.5">Document URL</label>
                  <input
                    type="url"
                    value={docUrl[type] || ''}
                    onChange={(e) => setDocUrl((prev) => ({ ...prev, [type]: e.target.value }))}
                    placeholder="https://…"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleDocUpload(type)}
                  disabled={!docUrl[type]?.trim() || docUploading[type]}
                  className="rounded-lg bg-amber-500 text-white px-3 py-2 text-sm font-medium hover:bg-amber-600 disabled:opacity-50"
                >
                  {docUploading[type] ? 'Uploading…' : 'Upload'}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function FleetAddRowInline({
  state,
  otherValue,
  onOtherChange,
  onAdd,
}: {
  state: string
  otherValue: string
  onOtherChange: (v: string) => void
  onAdd: (state: string, truckType: string, count: number) => void
}) {
  const [selectedType, setSelectedType] = useState('')
  const [count, setCount] = useState(1)
  const handleAdd = () => {
    const type = selectedType === OTHER_TRUCK_LABEL ? OTHER_TRUCK_LABEL : selectedType
    if (type) {
      const label = type === OTHER_TRUCK_LABEL ? otherValue.trim() : type
      if (label) {
        onAdd(state, type, count)
        setSelectedType('')
        setCount(1)
      }
    }
  }
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <select
        value={selectedType}
        onChange={(e) => setSelectedType(e.target.value)}
        className="rounded border border-gray-300 px-2 py-1 text-xs focus:ring-1 focus:ring-amber-500 min-w-[100px]"
      >
        <option value="">Type</option>
        {PREDEFINED_TRUCK_TYPES.map((t) => (
          <option key={t} value={t}>{t}</option>
        ))}
        <option value={OTHER_TRUCK_LABEL}>{OTHER_TRUCK_LABEL}</option>
      </select>
      {selectedType === OTHER_TRUCK_LABEL && (
        <input
          type="text"
          value={otherValue}
          onChange={(e) => onOtherChange(e.target.value)}
          placeholder="Custom type"
          className="rounded border border-gray-300 px-2 py-1 text-xs w-24 focus:ring-1 focus:ring-amber-500"
        />
      )}
      <input
        type="number"
        min={1}
        value={count}
        onChange={(e) => setCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
        className="rounded border border-gray-300 px-2 py-1 text-xs w-12 focus:ring-1 focus:ring-amber-500"
      />
      <button
        type="button"
        onClick={handleAdd}
        disabled={!selectedType || (selectedType === OTHER_TRUCK_LABEL && !otherValue.trim())}
        className="rounded bg-amber-500 text-white px-2 py-1 text-xs font-medium hover:bg-amber-600 disabled:opacity-50"
      >
        Add
      </button>
    </div>
  )
}
