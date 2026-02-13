import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'UnieFreight – Freight carrier dashboard',
  description: 'Find opportunities and manage your freight quotes',
  icons: { icon: '/favicon.svg' },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
