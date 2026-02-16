'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('UnieFreight app error', error)
  }, [error])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gray-50 text-gray-900">
      <div className="max-w-md w-full text-center">
        <h1 className="text-xl font-semibold text-gray-900 mb-2">Something went wrong</h1>
        <p className="text-gray-600 text-sm mb-6">
          The app encountered an error. Try refreshing the page.
        </p>
        <button
          type="button"
          onClick={() => reset()}
          className="px-4 py-2 rounded-lg bg-amber-500 text-white font-medium hover:bg-amber-600"
        >
          Try again
        </button>
      </div>
    </div>
  )
}
