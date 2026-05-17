'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

const inputBase: React.CSSProperties = {
  background: 'rgba(19,32,64,0.7)',
  border: '1.5px solid rgba(59,130,246,0.2)',
  borderRadius: '12px',
  padding: '0.65rem 0.9rem',
  color: '#F0F6FF',
  width: '100%',
  fontSize: '0.9rem',
  outline: 'none',
  transition: 'border-color 0.25s, box-shadow 0.25s, background 0.25s',
}

const inputFocus: React.CSSProperties = {
  ...inputBase,
  borderColor: '#3B82F6',
  background: 'rgba(27,45,85,0.9)',
  boxShadow: '0 0 0 3px rgba(59,130,246,0.2), 0 0 20px rgba(59,130,246,0.15)',
}

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [nombre, setNombre] = useState('')
  const [focused, setFocused] = useState<string | null>(null)
  const [btnHover, setBtnHover] = useState(false)
  const [cardHover, setCardHover] = useState(false)
  const [cardClick, setCardClick] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        router.replace('/dashboard')
      } else {
        const { error } = await supabase.auth.signUp({
          email, password, options: { data: { nombre } },
        })
        if (error) throw error
        toast.success('Cuenta creada. Revisa tu email para confirmar.')
        setMode('login')
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  const iStyle = (field: string) => focused === field ? inputFocus : inputBase

  return (
    <div
      className="relative min-h-screen flex items-center justify-center px-4 overflow-hidden"
      style={{ background: '#0D1B35' }}
    >
      {/* Logo de fondo — más visible */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
        <div style={{ opacity: 0.18, filter: 'blur(1px)', transform: 'scale(1.5)' }}>
          <Image src="/logo.png" alt="" width={560} height={560} priority style={{ objectFit: 'contain' }} />
        </div>
      </div>
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at center, transparent 15%, #0D1B35 70%)' }}
      />

      <div className="relative z-10 w-full max-w-sm fade-in">

        {/* Logo visible */}
        <div className="text-center mb-7">
          <div className="flex justify-center mb-4">
            <div
              style={{
                borderRadius: '20px',
                overflow: 'hidden',
                outline: '2px solid rgba(59,130,246,0.5)',
                outlineOffset: '5px',
                boxShadow: '0 0 50px rgba(37,99,235,0.45), 0 0 100px rgba(37,99,235,0.15)',
                animation: 'logoPulse 3s ease-in-out infinite',
              }}
            >
              <Image
                src="/logo.png"
                alt="B&M"
                width={110}
                height={110}
                priority
                style={{ objectFit: 'cover', display: 'block' }}
              />
            </div>
          </div>
          <h1 className="text-2xl font-black" style={{ color: '#F0F6FF', letterSpacing: '-0.5px' }}>B&M Repuestos</h1>
          <p className="text-sm font-medium mt-0.5" style={{ color: '#3B82F6' }}>Sistema de Inventario</p>
        </div>

        {/* Card con glassmorphism */}
        <div
          className="rounded-3xl p-7"
          onMouseEnter={() => setCardHover(true)}
          onMouseLeave={() => { setCardHover(false); setCardClick(false) }}
          onMouseDown={() => setCardClick(true)}
          onMouseUp={() => setCardClick(false)}
          style={{
            background: 'rgba(19,32,64,0.75)',
            border: `1px solid ${cardHover ? 'rgba(59,130,246,0.45)' : 'rgba(59,130,246,0.2)'}`,
            backdropFilter: 'blur(20px)',
            boxShadow: cardClick
              ? '0 8px 20px rgba(0,0,0,0.6), 0 0 40px rgba(37,99,235,0.4), inset 0 1px 0 rgba(255,255,255,0.06)'
              : cardHover
              ? '0 30px 80px rgba(0,0,0,0.6), 0 0 60px rgba(37,99,235,0.35), 0 0 120px rgba(59,130,246,0.15), inset 0 1px 0 rgba(255,255,255,0.08)'
              : '0 20px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)',
            transform: cardClick
              ? 'scale(0.985)'
              : cardHover
              ? 'scale(1.025)'
              : 'scale(1)',
            transition: 'transform 0.25s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.25s ease, border-color 0.25s ease',
          }}
        >
          <h2 className="text-lg font-bold mb-5" style={{ color: '#F0F6FF' }}>
            {mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
          </h2>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: '#7FA4D0' }}>Nombre completo</label>
                <input
                  type="text"
                  placeholder="Tu nombre"
                  value={nombre}
                  onChange={e => setNombre(e.target.value)}
                  onFocus={() => setFocused('nombre')}
                  onBlur={() => setFocused(null)}
                  style={iStyle('nombre')}
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: '#7FA4D0' }}>Correo electrónico</label>
              <input
                type="email"
                placeholder="correo@ejemplo.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onFocus={() => setFocused('email')}
                onBlur={() => setFocused(null)}
                style={iStyle('email')}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: '#7FA4D0' }}>Contraseña</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onFocus={() => setFocused('password')}
                onBlur={() => setFocused(null)}
                style={iStyle('password')}
                required
                minLength={6}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              onMouseEnter={() => setBtnHover(true)}
              onMouseLeave={() => setBtnHover(false)}
              className="mt-1 py-3.5 rounded-2xl font-bold text-white transition-all duration-200 disabled:opacity-50"
              style={{
                background: loading
                  ? 'rgba(37,99,235,0.4)'
                  : btnHover
                  ? 'linear-gradient(135deg, #2563EB 0%, #60A5FA 100%)'
                  : 'linear-gradient(135deg, #1E3A8A 0%, #3B82F6 100%)',
                boxShadow: btnHover && !loading
                  ? '0 8px 30px rgba(59,130,246,0.5), 0 0 0 1px rgba(59,130,246,0.3)'
                  : '0 4px 15px rgba(37,99,235,0.3)',
                transform: btnHover && !loading ? 'translateY(-1px)' : 'translateY(0)',
              }}
            >
              {loading ? 'Cargando...' : mode === 'login' ? 'Entrar al sistema' : 'Crear cuenta'}
            </button>
          </form>

          <div className="mt-5 text-center">
            <button
              onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
              className="text-sm transition-colors hover:opacity-80"
              style={{ color: '#F59E0B' }}
            >
              {mode === 'login' ? '¿No tienes cuenta? Crear una' : '¿Ya tienes cuenta? Iniciar sesión'}
            </button>
          </div>
        </div>

        <p className="text-center text-xs mt-5" style={{ color: '#3D5478' }}>
          © 2025 B&M Repuestos y Accesorios
        </p>
      </div>

      <style jsx global>{`
        @keyframes logoPulse {
          0%, 100% { box-shadow: 0 0 50px rgba(37,99,235,0.45), 0 0 100px rgba(37,99,235,0.15); }
          50% { box-shadow: 0 0 70px rgba(59,130,246,0.7), 0 0 140px rgba(59,130,246,0.25); }
        }
      `}</style>
    </div>
  )
}
