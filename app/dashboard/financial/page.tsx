'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Loader2, Package, Truck, ExternalLink } from 'lucide-react'
import { api } from '@/lib/api/client'
import { format } from 'date-fns'

export default function FinancialReportPage() {
  const [offers, setOffers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    api.listMyOffers({ status: 'approved' })
      .then((res) => { if (!cancelled) setOffers(res.data || []) })
      .catch(() => { if (!cancelled) setOffers([]) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const totalRevenue = offers.reduce((sum: number, o: any) => sum + Number(o.amount || 0), 0)

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
          Revenue from approved quotes and completed jobs.
        </p>
      </div>

      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-6">
        <h2 className="text-lg font-semibold text-emerald-900 mb-2">Total revenue (approved)</h2>
        <p className="text-2xl font-bold text-emerald-800">${totalRevenue.toFixed(2)} USD</p>
        <p className="text-sm text-emerald-700 mt-1">{offers.length} approved offer{offers.length !== 1 ? 's' : ''}</p>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
        <h2 className="text-lg font-semibold text-gray-900 px-4 py-3 border-b border-gray-200">Approved jobs</h2>
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs font-semibold text-gray-600 uppercase">
            <tr>
              <th className="px-4 py-3">Job</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Approved</th>
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {offers.map((row) => {
              const job = row.job || {}
              const jobId = job._id || job.id || row.freightJobId
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
                  <td className="px-4 py-3 text-gray-600">
                    {row.updatedAt ? format(new Date(row.updatedAt), 'MMM d, yyyy') : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {jobId && (
                      <Link href={`/dashboard/opportunities/${jobId}`} className="inline-flex items-center gap-1 text-amber-600 hover:text-amber-700 font-medium text-sm">
                        View job <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {offers.length === 0 && (
          <div className="px-4 py-12 text-center text-gray-500">
            No approved offers yet. Approved quotes will appear here and count toward revenue.
          </div>
        )}
      </div>
    </div>
  )
}
