'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { Producto } from '@/lib/types'
import { Package, DollarSign, AlertTriangle, ArrowUpCircle, ArrowDownCircle, TrendingUp, Bell } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import type { Profile } from '@/lib/types'
import { useProfile } from '@/lib/profile-context'

interface TopProducto { nombre: string; total: number }

function getSaludo() {
  const h = new Date().getHours()
  if (h < 12) return 'Buenos días'
  if (h < 18) return 'Buenas tardes'
  return 'Buenas noches'
}

export default function DashboardPage() {
  const [stats, setStats] = useState({ total_productos: 0, valor_inventario: 0, stock_bajo: 0, ventas_hoy: 0, entradas_hoy: 0, salidas_hoy: 0 })
  const [alertas, setAlertas] = useState<Producto[]>([])
  const [topVendidos, setTopVendidos] = useState<TopProducto[]>([])
  const [menosVendidos, setMenosVendidos] = useState<TopProducto[]>([])
  const [recientes, setRecientes] = useState<{ id: string; tipo: string; cantidad: number; created_at: string; producto: { nombre: string } }[]>([])
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<Profile | null>(null)
  const { esDueno } = useProfile()

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0)

    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (prof) setProfile(prof as Profile)
    }

    const [prodsRes, movHoyRes, ventasHoyRes, recientesRes, ventasRes] = await Promise.all([
      supabase.from('productos').select('*').eq('activo', true),
      supabase.from('movimientos').select('tipo').gte('created_at', hoy.toISOString()),
      supabase.from('ventas').select('total').gte('created_at', hoy.toISOString()),
      supabase.from('movimientos').select('*, producto:productos(nombre)').order('created_at', { ascending: false }).limit(6),
      supabase.from('ventas').select('items'),
    ])

    const productos = prodsRes.data || []
    const movHoy = movHoyRes.data || []
    const ventasHoy = ventasHoyRes.data || []
    const todasVentas = ventasRes.data || []

    // Calcular top vendidos desde items de ventas
    const conteo: Record<string, number> = {}
    todasVentas.forEach(v => {
      if (Array.isArray(v.items)) {
        v.items.forEach((item: { nombre: string; cantidad: number }) => {
          conteo[item.nombre] = (conteo[item.nombre] || 0) + item.cantidad
        })
      }
    })
    const ranking = Object.entries(conteo).map(([nombre, total]) => ({ nombre, total })).sort((a, b) => b.total - a.total)

    setTopVendidos(ranking.slice(0, 8))
    setMenosVendidos(ranking.slice(-5).reverse())
    setAlertas(productos.filter(p => p.stock <= p.stock_minimo).slice(0, 6) as Producto[])
    setRecientes(recientesRes.data as typeof recientes || [])
    setStats({
      total_productos: productos.length,
      valor_inventario: productos.reduce((a, p) => a + p.precio_venta * p.stock, 0),
      stock_bajo: productos.filter(p => p.stock <= p.stock_minimo).length,
      ventas_hoy: ventasHoy.reduce((a, v) => a + v.total, 0),
      entradas_hoy: movHoy.filter(m => m.tipo === 'entrada').length,
      salidas_hoy: movHoy.filter(m => m.tipo === 'salida').length,
    })
    setLoading(false)
  }

  if (loading) return (
    <div className="flex h-64 items-center justify-center">
      <div className="h-8 w-8 rounded-full border-4 animate-spin" style={{ borderColor: 'var(--primary-light)', borderTopColor: 'transparent' }} />
    </div>
  )

  const statCards = [
    { label: 'Ventas hoy', value: formatCurrency(stats.ventas_hoy), icon: DollarSign, color: '#10B981', bg: 'rgba(16,185,129,0.12)', solodueno: false },
    { label: 'Valor inventario', value: formatCurrency(stats.valor_inventario), icon: TrendingUp, color: '#2563EB', bg: 'rgba(37,99,235,0.12)', solodueno: true },
    { label: 'Total productos', value: stats.total_productos.toString(), icon: Package, color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)', solodueno: false },
    { label: 'Alertas de stock', value: stats.stock_bajo.toString(), icon: AlertTriangle, color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', solodueno: false },
    { label: 'Entradas hoy', value: stats.entradas_hoy.toString(), icon: ArrowUpCircle, color: '#10B981', bg: 'rgba(16,185,129,0.12)', solodueno: false },
    { label: 'Salidas hoy', value: stats.salidas_hoy.toString(), icon: ArrowDownCircle, color: '#EF4444', bg: 'rgba(239,68,68,0.12)', solodueno: false },
  ].filter(c => !c.solodueno || esDueno)

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: { value: number; payload: TopProducto }[] }) => {
    if (active && payload?.length) {
      return (
        <div className="px-3 py-2 rounded-xl text-sm" style={{ background: 'var(--bg-surface2)', color: 'var(--text)' }}>
          <p className="font-semibold">{payload[0].payload.nombre}</p>
          <p style={{ color: 'var(--accent)' }}>{payload[0].value} unidades vendidas</p>
        </div>
      )
    }
    return null
  }

  const nombreMostrar = profile?.nombre?.split(' ')[0] || 'Usuario'

  return (
    <div className="fade-in">
      {/* Bienvenida */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text-page)' }}>
              {getSaludo()}, {nombreMostrar} 👋
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="text-xs font-bold px-2.5 py-1 rounded-full"
              style={{
                background: esDueno ? 'rgba(245,158,11,0.15)' : 'rgba(37,99,235,0.15)',
                color: esDueno ? '#F59E0B' : '#3B82F6',
                border: `1px solid ${esDueno ? 'rgba(245,158,11,0.3)' : 'rgba(37,99,235,0.3)'}`,
              }}
            >
              {esDueno ? '👑 Dueño' : '👤 Empleado'}
            </span>
            <p className="text-sm" style={{ color: 'var(--text-page-muted)' }}>B&M Repuestos y Accesorios</p>
          </div>
        </div>
        <p className="text-xs px-3 py-1.5 rounded-xl" style={{ background: 'var(--bg-surface)', color: 'var(--text-muted)', border: '1px solid var(--bg-surface2)' }}>
          {new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        {statCards.map(card => (
          <div key={card.label} className="rounded-2xl p-5 transition-all hover:translate-y-[-2px]"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-surface2)', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>{card.label}</p>
                <p className="text-xl font-bold" style={{ color: 'var(--text)' }}>{card.value}</p>
              </div>
              <div className="p-2.5 rounded-xl" style={{ background: card.bg }}>
                <card.icon size={20} style={{ color: card.color }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Alertas de stock bajo */}
      {alertas.length > 0 && (
        <div className="rounded-2xl p-5 mb-6" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)' }}>
          <div className="flex items-center gap-2 mb-3">
            <Bell size={16} color="#F59E0B" />
            <span className="font-semibold text-sm" style={{ color: '#F59E0B' }}>
              {alertas.length} producto{alertas.length > 1 ? 's' : ''} con stock bajo — reponer pronto
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {alertas.map(p => (
              <span key={p.id} className="text-xs px-3 py-1.5 rounded-full font-medium"
                style={{ background: p.stock === 0 ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)', color: p.stock === 0 ? '#EF4444' : '#F59E0B' }}>
                {p.nombre} — {p.stock === 0 ? 'SIN STOCK' : `${p.stock} uds`}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Gráfica top vendidos */}
      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <div className="rounded-2xl p-5" style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-surface2)' }}>
          <h2 className="font-semibold text-sm mb-4 flex items-center gap-2" style={{ color: 'var(--text)' }}>
            <TrendingUp size={16} style={{ color: 'var(--accent)' }} />
            Más vendidos (histórico)
          </h2>
          {topVendidos.length === 0 ? (
            <p className="text-sm text-center py-8" style={{ color: 'var(--text-muted)' }}>Sin ventas aún</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={topVendidos} layout="vertical" margin={{ left: 0, right: 10 }}>
                <XAxis type="number" tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="nombre" tick={{ fill: '#9CA3AF', fontSize: 10 }} width={100} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                <Bar dataKey="total" radius={[0, 6, 6, 0]}>
                  {topVendidos.map((_, i) => (
                    <Cell key={i} fill={i === 0 ? '#F59E0B' : i === 1 ? '#2563EB' : '#374151'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Movimientos recientes */}
        <div className="rounded-2xl p-5" style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-surface2)' }}>
          <h2 className="font-semibold text-sm mb-4" style={{ color: 'var(--text)' }}>Movimientos recientes</h2>
          {recientes.length === 0 ? (
            <p className="text-sm text-center py-8" style={{ color: 'var(--text-muted)' }}>Sin movimientos</p>
          ) : (
            <div className="flex flex-col gap-2">
              {recientes.map(mov => (
                <div key={mov.id} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: mov.tipo === 'entrada' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)' }}>
                      {mov.tipo === 'entrada' ? <ArrowUpCircle size={14} color="#10B981" /> : <ArrowDownCircle size={14} color="#EF4444" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium leading-tight" style={{ color: 'var(--text)' }}>{mov.producto?.nombre ?? '—'}</p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{formatDate(mov.created_at)}</p>
                    </div>
                  </div>
                  <span className="text-sm font-bold" style={{ color: mov.tipo === 'entrada' ? '#10B981' : '#EF4444' }}>
                    {mov.tipo === 'entrada' ? '+' : '-'}{mov.cantidad}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
