'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function DashboardPage() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/dashboard/scheduled')
  }, [router])
  return (
    <div className="flex items-center justify-center py-12">
      <p className="text-gray-500">Redirecting to scheduled jobs…</p>
    </div>
  )
}
