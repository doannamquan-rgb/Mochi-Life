import type { Metadata, Viewport } from 'next'
import { Nunito } from 'next/font/google'
import './globals.css'
import { Toaster } from 'sonner'

const nunito = Nunito({
  subsets: ['latin', 'vietnamese'],
  variable: '--font-nunito',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'Mochi Life 🐱',
    template: '%s | Mochi Life',
  },
  description: 'Ứng dụng quản lý mục tiêu cá nhân - Giảm cân, Học tiếng Trung & Kiểm soát Chi tiêu',
  manifest: '/manifest.json',
  keywords: ['mục tiêu', 'giảm cân', 'tiếng Trung', 'chi tiêu', 'HSK', 'kawaii'],
  authors: [{ name: 'Mochi Life' }],
  openGraph: {
    title: 'Mochi Life 🐱',
    description: 'Quản lý mục tiêu cá nhân theo phong cách kawaii',
    type: 'website',
    locale: 'vi_VN',
  },
}

export const viewport: Viewport = {
  themeColor: '#FFCA1A',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="vi" className={nunito.variable}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className={nunito.className}>
        {children}
        <Toaster
          position="top-right"
          richColors={false}
          toastOptions={{
            style: {
              fontFamily: 'Nunito, sans-serif',
              fontWeight: 600,
            },
          }}
        />
      </body>
    </html>
  )
}
