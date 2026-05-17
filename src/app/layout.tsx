import type { Metadata, Viewport } from 'next'
import { Toaster } from 'react-hot-toast'
import './globals.css'

export const metadata: Metadata = {
  title: 'B&M Repuestos y Accesorios',
  description: 'Sistema de inventario para taller mecánico B&M',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'B&M' },
  icons: { icon: '/logo.png', apple: '/logo.png' },
}

export const viewport: Viewport = {
  themeColor: '#1E3A8A',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="h-full">
      <body className="h-full antialiased">
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            style: { background: '#1F2937', color: '#F9FAFB', border: '1px solid #374151', borderRadius: '10px' },
            success: { iconTheme: { primary: '#10B981', secondary: '#F9FAFB' } },
            error: { iconTheme: { primary: '#EF4444', secondary: '#F9FAFB' } },
          }}
        />
      </body>
    </html>
  )
}
