'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { Package, Truck, Loader2, AlertCircle } from 'lucide-react'
import { api } from '@/lib/api/client'
import { getUser } from '@/lib/api/auth'
import { format } from 'date-fns'

type ViewStatusFilter = 'all' | 'unviewed' | 'viewed' | 'offered' | 'denied' | 'not_interested'

export default function OpportunitiesPage() {
  const [jobs, setJobs] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [restricted, setRestricted] = useState(false)
  const [typeFilter, setTypeFilter] = useState<string>('')
  const [stateFilter, setStateFilter] = useState<string>('')
  const [viewStatusFilter, setViewStatusFilter] = useState<ViewStatusFilter>('all')
  const [sort, setSort] = useState<string>('createdAt_desc')
  const [includeNotInterested, setIncludeNotInterested] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setLoadError(null)
    api
      .listJobs({
        type: typeFilter || undefined,
        destinationState: stateFilter || undefined,
        limit: 100,
        offset: 0,
        sort,
        includeNotInterested: includeNotInterested || undefined,
        showOnlyNotInterested: viewStatusFilter === 'not_interested' ? true : undefined,
      })
      .then((res) => {
        if (cancelled) return
        setJobs(res.data || [])
        setTotal(res.total ?? 0)
        setRestricted(!!res.restricted)
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : 'Failed to load opportunities')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [typeFilter, stateFilter, viewStatusFilter, sort, includeNotInterested])

  const filtered = useMemo(() => {
    if (viewStatusFilter === 'not_interested') return jobs
    return jobs.filter((job) => {
      if (viewStatusFilter === 'all') return true
      if (viewStatusFilter === 'unviewed') return !job.viewed
      if (viewStatusFilter === 'viewed') return job.viewed && !job.myOfferStatus
      if (viewStatusFilter === 'offered') return job.myOfferStatus === 'pending' || job.myOfferStatus === 'approved'
      if (viewStatusFilter === 'denied') return job.myOfferStatus === 'rejected'
      if (viewStatusFilter === 'not_interested') return job.notInterested
      return true
    })
  }, [jobs, viewStatusFilter])

  const user = getUser()
  const isSubUser = !!user?.isSubUser

  if (isSubUser) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <p className="text-gray-600">Sub users cannot access Find opportunities.</p>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-2xl font-semibold text-gray-900">Find opportunities</h1>
      <p className="text-gray-600 mt-1">Browse open freight jobs and submit quotes.</p>

      {restricted && (
        <div className="mt-4 flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-amber-800">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>Your account is under review. Job listings may be limited.</span>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">All types</option>
          <option value="LTL">LTL</option>
          <option value="FTL">FTL</option>
        </select>
        <select
          value={stateFilter}
          onChange={(e) => setStateFilter(e.target.value)}
          className="rounded border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">All states</option>
          {['CA', 'TX', 'FL', 'NY', 'NJ', 'IL', 'PA', 'OH', 'GA', 'NC', 'MI', 'AZ', 'WA', 'CO', 'NV'].map((st) => (
            <option key={st} value={st}>{st}</option>
          ))}
        </select>
        <select
          value={viewStatusFilter}
          onChange={(e) => setViewStatusFilter(e.target.value as ViewStatusFilter)}
          className="rounded border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="all">All</option>
          <option value="unviewed">Unviewed</option>
          <option value="viewed">Viewed, no offer</option>
          <option value="offered">With offer</option>
          <option value="denied">Rejected</option>
          <option value="not_interested">Not interested</option>
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="rounded border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="createdAt_desc">Newest first</option>
          <option value="createdAt_asc">Oldest first</option>
        </select>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={includeNotInterested}
            onChange={(e) => setIncludeNotInterested(e.target.checked)}
            className="rounded border-gray-300"
          />
          Include not interested
        </label>
      </div>

      {loadError && (
        <p className="mt-4 text-red-600">{loadError}</p>
      )}

      <div className="mt-4 rounded-lg border border-gray-200 bg-white overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-gray-500">
            <Loader2 className="w-6 h-6 animate-spin" />
            Loading…
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-gray-500">No jobs match the filters.</div>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs font-semibold text-gray-600 uppercase">
              <tr>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Destination</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filtered.map((job) => (
                <tr key={job._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 rounded bg-gray-100 px-2 py-0.5 font-medium text-gray-800">
                      {job.type === 'FTL' ? <Truck className="w-3.5 h-3.5" /> : <Package className="w-3.5 h-3.5" />}
                      {job.type || '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {job.destinationWarehouseCode} {job.destinationState && `(${job.destinationState})`}
                  </td>
                  <td className="px-4 py-3">
                    {job.notInterested ? (
                      <span className="text-gray-500">Not interested</span>
                    ) : job.myOfferStatus ? (
                      <span className="capitalize">{job.myOfferStatus}</span>
                    ) : job.viewed ? (
                      <span className="text-gray-500">Viewed</span>
                    ) : (
                      <span className="text-amber-600 font-medium">New</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {job.createdAt ? format(new Date(job.createdAt), 'MMM d, yyyy') : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/opportunities/${job._id || job.id}`}
                      className="inline-flex items-center gap-1 text-amber-600 hover:text-amber-700 font-medium"
                    >
                      View job
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
