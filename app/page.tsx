'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getToken } from '@/lib/api/auth'

export default function HomePage() {
  const router = useRouter()
  useEffect(() => {
    const token = getToken()
    if (token) router.replace('/dashboard')
    else router.replace('/login')
  }, [router])
  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500">Redirecting…</p>
    </div>
  )
}
