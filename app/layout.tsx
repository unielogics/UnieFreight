import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'UnieFreight – Freight carrier dashboard',
  description: 'Find jobs and manage your freight quotes',
  icons: { icon: '/favicon.svg' },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <noscript>
          <div style={{ padding: 24, textAlign: 'center', fontFamily: 'system-ui, sans-serif' }}>
            UnieFreight needs JavaScript to run. Please enable it and refresh.
          </div>
        </noscript>
        {children}
      </body>
    </html>
  )
}
