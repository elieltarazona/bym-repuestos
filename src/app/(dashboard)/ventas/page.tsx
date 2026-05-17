'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { formatCurrency, formatDate } from '@/lib/utils'
import { DollarSign, Smartphone, CreditCard, Banknote, TrendingUp } from 'lucide-react'

interface Venta {
  id: string
  items: { nombre: string; cantidad: number; precio_venta: number }[]
  subtotal: number
  descuento: number
  total: number
  medio_pago: string
  referencia_pago?: string
  created_at: string
}

const MEDIO_ICONS: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  efectivo: { label: 'Efectivo', icon: <Banknote size={14} />, color: '#10B981' },
  nequi: { label: 'Nequi', icon: <Smartphone size={14} />, color: '#8B5CF6' },
  bancolombia: { label: 'Bancolombia', icon: <Smartphone size={14} />, color: '#F59E0B' },
  daviplata: { label: 'Daviplata', icon: <Smartphone size={14} />, color: '#EF4444' },
  tarjeta_debito: { label: 'T. Débito', icon: <CreditCard size={14} />, color: '#2563EB' },
  tarjeta_credito: { label: 'T. Crédito', icon: <CreditCard size={14} />, color: '#6366F1' },
}

export default function VentasPage() {
  const [ventas, setVentas] = useState<Venta[]>([])
  const [loading, setLoading] = useState(true)
  const [fechaDesde, setFechaDesde] = useState(() => new Date().toISOString().split('T')[0])
  const [fechaHasta, setFechaHasta] = useState(() => new Date().toISOString().split('T')[0])

  useEffect(() => { loadVentas() }, [])

  async function loadVentas() {
    const { data } = await supabase
      .from('ventas')
      .select('*')
      .gte('created_at', `${fechaDesde}T00:00:00`)
      .lte('created_at', `${fechaHasta}T23:59:59`)
      .order('created_at', { ascending: false })

    setVentas((data || []) as Venta[])
    setLoading(false)
  }

  const totalDia = ventas.reduce((a, v) => a + v.total, 0)
  const porMedio = MEDIO_ICONS && Object.keys(MEDIO_ICONS).map(medio => ({
    medio,
    total: ventas.filter(v => v.medio_pago === medio).reduce((a, v) => a + v.total, 0),
    count: ventas.filter(v => v.medio_pago === medio).length,
  })).filter(m => m.count > 0)

  return (
    <div className="fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-page)' }}>Registro de Ventas</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>{ventas.length} ventas · {formatCurrency(totalDia)} total</p>
      </div>

      {/* Filtro fechas */}
      <div className="flex flex-wrap items-center gap-3 p-4 rounded-2xl mb-6" style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-surface2)' }}>
        <input type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} style={{ width: 'auto' }} />
        <span style={{ color: 'var(--text-muted)' }}>→</span>
        <input type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} style={{ width: 'auto' }} />
        <button onClick={loadVentas} className="px-4 py-2 rounded-xl text-sm font-semibold text-white" style={{ background: 'var(--primary)' }}>
          Aplicar
        </button>
      </div>

      {/* Resumen por medio de pago */}
      {porMedio.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
          <div className="rounded-2xl p-4 col-span-2 sm:col-span-1" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)' }}>
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp size={16} color="#F59E0B" />
              <span className="text-xs font-semibold" style={{ color: '#F59E0B' }}>Total del período</span>
            </div>
            <p className="text-2xl font-black" style={{ color: '#F59E0B' }}>{formatCurrency(totalDia)}</p>
          </div>
          {porMedio.map(m => {
            const info = MEDIO_ICONS[m.medio]
            return (
              <div key={m.medio} className="rounded-2xl p-4" style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-surface2)' }}>
                <div className="flex items-center gap-2 mb-1" style={{ color: info?.color }}>
                  {info?.icon}
                  <span className="text-xs font-semibold">{info?.label}</span>
                </div>
                <p className="text-lg font-bold" style={{ color: 'var(--text)' }}>{formatCurrency(m.total)}</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{m.count} venta{m.count !== 1 ? 's' : ''}</p>
              </div>
            )
          })}
        </div>
      )}

      {/* Lista de ventas */}
      <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-surface2)' }}>
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="h-6 w-6 rounded-full border-4 animate-spin" style={{ borderColor: 'var(--primary-light)', borderTopColor: 'transparent' }} />
          </div>
        ) : ventas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <DollarSign size={40} style={{ color: 'var(--bg-surface3)' }} />
            <p style={{ color: 'var(--text-muted)' }}>Sin ventas en este período</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Producto(s)</th>
                  <th>Medio</th>
                  <th>Descuento</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {ventas.map(v => {
                  const info = MEDIO_ICONS[v.medio_pago]
                  return (
                    <tr key={v.id}>
                      <td style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap', fontSize: '0.8rem' }}>
                        {formatDate(v.created_at)}
                      </td>
                      <td>
                        {v.items.map((item, i) => (
                          <div key={i}>
                            <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>{item.nombre}</span>
                            <span className="text-xs ml-2" style={{ color: 'var(--text-muted)' }}>x{item.cantidad}</span>
                          </div>
                        ))}
                      </td>
                      <td>
                        <span
                          className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full"
                          style={{ background: `${info?.color}20`, color: info?.color }}
                        >
                          {info?.icon} {info?.label}
                        </span>
                        {v.referencia_pago && (
                          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{v.referencia_pago}</p>
                        )}
                      </td>
                      <td style={{ color: 'var(--danger)' }}>
                        {v.descuento > 0 ? `-${formatCurrency(v.descuento)}` : '—'}
                      </td>
                      <td className="font-bold" style={{ color: '#10B981' }}>{formatCurrency(v.total)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
