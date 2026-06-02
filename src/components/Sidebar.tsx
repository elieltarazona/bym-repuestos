'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, Package, ArrowLeftRight, BarChart3, LogOut, Settings, Menu, X, ShoppingCart } from 'lucide-react'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { useProfile } from '@/lib/profile-context'

const navItemsBase = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', solodueno: false },
  { href: '/inventario', icon: Package, label: 'Inventario', solodueno: false },
  { href: '/ventas', icon: ShoppingCart, label: 'Ventas', solodueno: false },
  { href: '/movimientos', icon: ArrowLeftRight, label: 'Movimientos', solodueno: false },
  { href: '/reportes', icon: BarChart3, label: 'Reportes', solodueno: true },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const { profile, esDueno } = useProfile()

  const navItems = navItemsBase.filter(item => !item.solodueno || esDueno)

  async function handleLogout() {
    await supabase.auth.signOut()
    toast.success('Sesión cerrada')
    router.replace('/login')
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo cuadrado redondeado */}
      <div className="px-4 py-5 flex items-center justify-center" style={{ borderBottom: '1px solid var(--bg-surface2)' }}>
        <div className="relative w-16 h-16 overflow-hidden" style={{
          borderRadius: '16px',
          outline: '2px solid rgba(204,17,17,0.5)',
          outlineOffset: '3px',
          boxShadow: '0 0 20px rgba(204,17,17,0.35)',
        }}>
          <Image src="/logo.png" alt="B&M" fill style={{ objectFit: 'cover' }} priority />
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
        {navItems.map(item => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150"
              style={{
                background: active ? 'rgba(204, 17, 17, 0.15)' : 'transparent',
                color: active ? 'var(--primary-light)' : 'var(--text-muted)',
                borderLeft: active ? '3px solid var(--primary-light)' : '3px solid transparent',
              }}
            >
              <item.icon size={18} />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 pb-4 flex flex-col gap-1" style={{ borderTop: '1px solid var(--bg-surface2)', paddingTop: '0.75rem' }}>

        {/* Usuario actual */}
        {profile && (
          <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl mb-1"
            style={{ background: 'var(--bg-surface2)' }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black flex-shrink-0"
              style={{
                background: profile.rol === 'dueño' ? 'rgba(245,158,11,0.2)' : 'rgba(37,99,235,0.2)',
                color: profile.rol === 'dueño' ? '#F59E0B' : '#3B82F6',
              }}>
              {profile.nombre?.charAt(0).toUpperCase() || '?'}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold truncate" style={{ color: 'var(--text)' }}>
                {profile.nombre?.split(' ')[0] || 'Usuario'}
              </p>
              <p className="text-xs" style={{ color: profile.rol === 'dueño' ? '#F59E0B' : '#3B82F6' }}>
                {profile.rol === 'dueño' ? '👑 Dueño' : '👤 Empleado'}
              </p>
            </div>
          </div>
        )}

        {esDueno && (
          <Link
            href="/configuracion"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium"
            style={{ color: 'var(--text-muted)' }}
            onClick={() => setOpen(false)}
          >
            <Settings size={18} />
            Configuración
          </Link>
        )}
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-left w-full"
          style={{ color: 'var(--danger)' }}
        >
          <LogOut size={18} />
          Cerrar sesión
        </button>
      </div>
    </div>
  )

  return (
    <>
      <aside className="hidden md:flex flex-col w-56 flex-shrink-0 sticky top-0 h-screen p-3"
        style={{ background: 'transparent' }}>
        <div className="flex flex-col h-full rounded-2xl overflow-hidden"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-surface2)', boxShadow: '0 4px 24px rgba(0,0,0,0.18)' }}>
          <SidebarContent />
        </div>
      </aside>

      <button onClick={() => setOpen(true)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 rounded-lg"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-surface2)' }}>
        <Menu size={20} style={{ color: 'var(--text)' }} />
      </button>

      {open && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <aside className="relative w-56 h-full flex flex-col" style={{ background: 'var(--bg-surface)' }}>
            <button onClick={() => setOpen(false)} className="absolute top-4 right-4" style={{ color: 'var(--text-muted)' }}>
              <X size={20} />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}
    </>
  )
}
