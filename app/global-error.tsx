'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', background: '#f9fafb', color: '#111', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', padding: 24, maxWidth: 400 }}>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: 8 }}>Something went wrong</h1>
          <p style={{ color: '#4b5563', fontSize: 14, marginBottom: 24 }}>
            The app encountered an error. Try refreshing the page.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            style={{ padding: '8px 16px', borderRadius: 8, background: '#f59e0b', color: '#fff', fontWeight: 500, border: 'none', cursor: 'pointer' }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  )
}
