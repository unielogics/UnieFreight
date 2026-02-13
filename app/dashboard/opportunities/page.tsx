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
        limit: 50,
        sort: sort || undefined,
        includeNotInterested: includeNotInterested,
        showOnlyNotInterested: viewStatusFilter === 'not_interested',
      })
      .then((res) => {
        if (!cancelled) {
          setJobs(res.data || [])
          setTotal(res.total ?? 0)
          setRestricted(res.restricted ?? false)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setJobs([])
          setTotal(0)
          setLoadError(err instanceof Error ? err.message : 'Failed to load opportunities')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [typeFilter, stateFilter, sort, viewStatusFilter, includeNotInterested])

  const filteredJobs = useMemo(() => {
    if (viewStatusFilter === 'not_interested') return jobs
    if (viewStatusFilter === 'all') return includeNotInterested ? jobs : jobs.filter((j) => !j.notInterested)
    if (viewStatusFilter === 'unviewed') return jobs.filter((j) => !j.viewed && j.myOfferStatus !== 'rejected' && !j.notInterested)
    if (viewStatusFilter === 'viewed') return jobs.filter((j) => j.viewed && !j.myOfferStatus && !j.notInterested)
    if (viewStatusFilter === 'offered') return jobs.filter((j) => j.myOfferStatus === 'pending')
    if (viewStatusFilter === 'denied') return jobs.filter((j) => j.myOfferStatus === 'rejected')
    return jobs
  }, [jobs, viewStatusFilter, includeNotInterested])

  const user = getUser()
  const statesServed = (user as any)?.statesServed || []

  const rowBg = (job: any) => {
    if (job.notInterested) return 'bg-gray-100 hover:bg-gray-150'
    if (job.myOfferStatus === 'rejected') return 'bg-red-50 hover:bg-red-100'
    if (job.myOfferStatus === 'pending') return 'bg-amber-50 hover:bg-amber-100'
    if (job.viewed) return 'bg-white hover:bg-gray-50'
    return 'bg-green-50 hover:bg-green-100'
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Find opportunities</h1>
        <p className="text-gray-600 text-sm mt-1">
          Open LTL/FTL jobs matching the states you serve. Click a job to view details and submit your quote.
        </p>
      </div>

      {restricted && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          Your account is under review. You cannot view or submit quotes for new jobs until your grade is restored.
        </div>
      )}

      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm">
          <span className="text-gray-600">Type</span>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded border border-gray-300 px-2 py-1.5 text-sm"
          >
            <option value="">All</option>
            <option value="LTL">LTL</option>
            <option value="FTL">FTL</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm">
          <span className="text-gray-600">State</span>
          <select
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value)}
            className="rounded border border-gray-300 px-2 py-1.5 text-sm"
          >
            <option value="">All served</option>
            {statesServed.map((s: string) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm">
          <span className="text-gray-600">Status</span>
          <select
            value={viewStatusFilter}
            onChange={(e) => setViewStatusFilter(e.target.value as ViewStatusFilter)}
            className="rounded border border-gray-300 px-2 py-1.5 text-sm"
          >
            <option value="all">All</option>
            <option value="unviewed">Unviewed (green)</option>
            <option value="viewed">Viewed (white)</option>
            <option value="offered">Offer sent (yellow)</option>
            <option value="denied">Denied (red)</option>
            <option value="not_interested">Not interested</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm">
          <span className="text-gray-600">Sort</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="rounded border border-gray-300 px-2 py-1.5 text-sm"
          >
            <option value="createdAt_desc">Newest first</option>
            <option value="createdAt_asc">Oldest first</option>
          </select>
        </label>
        {viewStatusFilter !== 'not_interested' && (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={includeNotInterested}
              onChange={(e) => setIncludeNotInterested(e.target.checked)}
              className="rounded border-gray-300"
            />
            <span className="text-gray-600">Include not interested</span>
          </label>
        )}
        <span className="text-sm text-gray-500">
          {viewStatusFilter === 'all' ? total : filteredJobs.length} job{(viewStatusFilter === 'all' ? total : filteredJobs.length) !== 1 ? 's' : ''}
        </span>
      </div>

      {loadError && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          {loadError}
        </div>
      )}
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
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Title / Reference</th>
                <th className="px-4 py-3">Destination</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredJobs.map((job) => (
                <tr key={job._id || job.id} className={rowBg(job)}>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 rounded bg-gray-100 px-2 py-0.5 font-medium text-gray-800">
                      {job.type === 'FTL' ? <Truck className="w-3.5 h-3.5" /> : <Package className="w-3.5 h-3.5" />}
                      {job.type}
                    </span>
                    {job.myOfferStatus === 'pending' && (
                      <span className="ml-1 text-xs font-medium text-amber-700">Offer sent</span>
                    )}
                    {job.myOfferStatus === 'rejected' && (
                      <span className="ml-1 text-xs font-medium text-red-600">Denied</span>
                    )}
                    {job.notInterested && (
                      <span className="ml-1 text-xs font-medium text-gray-500">Not interested</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900">{job.title || job.reference || '—'}</td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1 text-gray-700">
                      {job.destinationWarehouseCode || '—'}
                      {job.destinationState && (
                        <span className="text-gray-500">({job.destinationState})</span>
                      )}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {job.createdAt ? format(new Date(job.createdAt), 'MMM d, yyyy') : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/opportunities/${job._id || job.id}`}
                      className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      View & quote
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredJobs.length === 0 && (
            <div className="px-4 py-12 text-center text-gray-500">
              {viewStatusFilter === 'all'
                ? 'No open jobs match your filters. Jobs are listed by destination state; make sure your profile states served are set.'
                : `No ${viewStatusFilter} jobs. Try a different filter.`}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
