'use client'

import { useState, useEffect } from 'react'
import { Loader2, Star } from 'lucide-react'
import { api } from '@/lib/api/client'

export default function FeedbackPage() {
  const [feedback, setFeedback] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    api.getMyFeedback()
      .then((res) => { if (!cancelled) setFeedback((res as any).data || []) })
      .catch(() => { if (!cancelled) setFeedback([]) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

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
        <h1 className="text-2xl font-semibold text-gray-900">Feedback</h1>
        <p className="text-gray-600 text-sm mt-1">
          Ratings and comments from warehouses after completed jobs.
        </p>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6">
        {feedback.length === 0 ? (
          <p className="text-sm text-gray-500">No feedback yet. Complete jobs to receive ratings.</p>
        ) : (
          <ul className="space-y-4">
            {feedback.map((f: any, i: number) => {
              const avg =
                (Number(f.ratingPricing) + Number(f.ratingCommunication) + Number(f.ratingOnTimeDelivery) + Number(f.ratingProfessionalism)) / 4
              return (
                <li key={f._id || i} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-xs text-gray-500">
                      {f.warehouseCode && `${f.warehouseCode} · `}
                      {f.createdAt && new Date(f.createdAt).toLocaleDateString()}
                    </span>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star key={star} className={`w-4 h-4 ${star <= Math.round(avg) ? 'text-amber-500 fill-amber-500' : 'text-gray-300'}`} />
                      ))}
                      <span className="text-sm font-medium text-gray-700 ml-1">{avg.toFixed(1)}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2 text-xs text-gray-600">
                    <span>Pricing: {f.ratingPricing}/5</span>
                    <span>Communication: {f.ratingCommunication}/5</span>
                    <span>On-time: {f.ratingOnTimeDelivery}/5</span>
                    <span>Professionalism: {f.ratingProfessionalism}/5</span>
                  </div>
                  {f.comments && <p className="mt-2 text-sm text-gray-700 border-t border-gray-100 pt-2">{f.comments}</p>}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
