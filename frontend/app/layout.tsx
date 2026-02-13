import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Ploton - Local Motion Graphics Renderer',
  description: 'Paste TSX code, render MP4 locally',
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
