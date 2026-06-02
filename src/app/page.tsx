'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'

export default function SplashPage() {
  const router = useRouter()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.replace('/dashboard')
      } else {
        setChecking(false)
      }
    })
  }, [router])

  if (checking) {
    return (
      <div style={{ background: '#111111' }} className="flex h-screen items-center justify-center">
        <div className="h-10 w-10 rounded-full border-4 animate-spin"
          style={{ borderColor: '#CC1111', borderTopColor: 'transparent' }} />
      </div>
    )
  }

  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden" style={{ background: '#111111' }}>

      {/* Logo de fondo grande con blur */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
        <div style={{ opacity: 0.08, filter: 'blur(3px)', transform: 'scale(1.5)' }}>
          <Image src="/logo.png" alt="" width={560} height={560} priority style={{ objectFit: 'contain' }} />
        </div>
      </div>

      {/* Gradiente inferior */}
      <div
        className="absolute bottom-0 left-0 right-0 h-2/3 pointer-events-none"
        style={{ background: 'linear-gradient(to top, #111111 60%, transparent)' }}
      />

      {/* Contenido */}
      <div className="relative z-10 flex flex-col flex-1 items-center justify-between px-8 py-16">

        {/* Logo + nombre */}
        <div className="flex-1 flex flex-col items-center justify-center gap-6 fade-in">
          <div
            className="rounded-3xl overflow-hidden"
            style={{
              outline: '3px solid rgba(204,17,17,0.5)',
              outlineOffset: '5px',
              boxShadow: '0 0 70px rgba(204,17,17,0.4)',
            }}
          >
            <Image
              src="/logo.png"
              alt="B&M Repuestos y Accesorios"
              width={160}
              height={160}
              priority
              style={{ objectFit: 'cover', display: 'block' }}
            />
          </div>

          <div className="text-center">
            <h1 className="text-3xl font-black tracking-tight mb-1" style={{ color: '#F5F5F5' }}>
              B&M Repuestos
            </h1>
            <p className="text-base font-semibold" style={{ color: '#E53535' }}>y Accesorios</p>
          </div>
        </div>

        {/* Frase + botón */}
        <div className="w-full max-w-sm fade-in flex flex-col gap-5">
          <div className="text-center">
            <p className="text-xl font-bold leading-snug mb-2" style={{ color: '#F5F5F5' }}>
              Tu inventario,<br />siempre bajo control.
            </p>
            <p className="text-sm" style={{ color: '#888888' }}>
              Gestiona repuestos, ventas y stock en tiempo real desde cualquier dispositivo.
            </p>
          </div>

          <button
            onClick={() => router.push('/login')}
            className="w-full py-4 rounded-2xl font-bold text-base text-white transition-all active:scale-95 hover:opacity-90"
            style={{
              background: 'linear-gradient(135deg, #8B0000 0%, #CC1111 100%)',
              boxShadow: '0 8px 30px rgba(204,17,17,0.45)',
            }}
          >
            Comenzar →
          </button>

          <p className="text-center text-xs" style={{ color: '#555555' }}>
            © 2025 B&M Repuestos y Accesorios
          </p>
        </div>
      </div>
    </div>
  )
}
