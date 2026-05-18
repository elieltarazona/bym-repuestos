'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { formatCurrency, formatDate } from '@/lib/utils'
import { DollarSign, CreditCard, Banknote, TrendingUp } from 'lucide-react'

interface Venta {
  id: string
  items: { nombre: string; cantidad: number; precio_venta: number }[]
  subtotal: number
  descuento: number
  total: number
  medio_pago: string
  referencia_pago?: string
  usuario_id: string
  created_at: string
}

interface AbonoHistorial {
  id: string
  fiado_id: string
  monto: number
  medio_pago: string
  usuario_id: string
  created_at: string
  fiado?: {
    items: { nombre: string; cantidad: number }[]
    total: number
    cliente?: { nombre: string }
  }
}

const MEDIO_INFO: Record<string, { label: string; emoji: string; color: string }> = {
  efectivo:       { label: 'Efectivo',    emoji: '💵', color: '#10B981' },
  nequi:          { label: 'Nequi',       emoji: '🟣', color: '#8B5CF6' },
  bancolombia:    { label: 'Bancolombia', emoji: '🟡', color: '#F59E0B' },
  daviplata:      { label: 'Daviplata',   emoji: '🔴', color: '#EF4444' },
  tarjeta_debito: { label: 'T. Débito',   emoji: '💳', color: '#2563EB' },
  tarjeta_credito:{ label: 'T. Crédito',  emoji: '💳', color: '#6366F1' },
}

export default function VentasPage() {
  const [tab, setTab] = useState<'ventas' | 'fiados'>('ventas')
  const [ventas, setVentas] = useState<Venta[]>([])
  const [abonos, setAbonos] = useState<AbonoHistorial[]>([])
  const [profileMap, setProfileMap] = useState<Record<string, { nombre: string; rol: string }>>({})
  const [loading, setLoading] = useState(true)
  const [fechaDesde, setFechaDesde] = useState(() => new Date().toISOString().split('T')[0])
  const [fechaHasta, setFechaHasta] = useState(() => new Date().toISOString().split('T')[0])

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    const [ventasRes, abonosRes, profilesRes] = await Promise.all([
      supabase.from('ventas')
        .select('*')
        .gte('created_at', `${fechaDesde}T00:00:00`)
        .lte('created_at', `${fechaHasta}T23:59:59`)
        .order('created_at', { ascending: false }),
      supabase.from('abonos_fiado')
        .select('*, fiado:fiados(items, total, cliente:clientes_fiado(nombre))')
        .gte('created_at', `${fechaDesde}T00:00:00`)
        .lte('created_at', `${fechaHasta}T23:59:59`)
        .order('created_at', { ascending: false }),
      supabase.from('profiles').select('id, nombre'),
    ])

    setVentas((ventasRes.data || []) as Venta[])
    setAbonos((abonosRes.data || []) as AbonoHistorial[])
    const map: Record<string, { nombre: string; rol: string }> = {}
    ;(profilesRes.data || []).forEach((p: { id: string; nombre: string; rol: string }) => { map[p.id] = { nombre: p.nombre, rol: p.rol } })
    setProfileMap(map)
    setLoading(false)
  }

  const totalVentas = ventas.reduce((a, v) => a + v.total, 0)
  const totalAbonos = abonos.reduce((a, ab) => a + ab.monto, 0)

  const porMedio = Object.keys(MEDIO_INFO).map(medio => ({
    medio,
    total: ventas.filter(v => v.medio_pago === medio).reduce((a, v) => a + v.total, 0),
    count: ventas.filter(v => v.medio_pago === medio).length,
  })).filter(m => m.count > 0)

  function MedioBadge({ medio }: { medio: string }) {
    const info = MEDIO_INFO[medio]
    if (!info) return <span style={{ color: 'var(--text-muted)' }}>—</span>
    return (
      <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full"
        style={{ background: `${info.color}20`, color: info.color }}>
        {info.emoji} {info.label}
      </span>
    )
  }

  function UserBadge({ userId }: { userId: string }) {
    const p = profileMap[userId]
    const nombre = p?.nombre?.split(' ')[0] || 'Usuario'
    const isDueno = p?.rol === 'dueño'
    return (
      <div className="flex flex-col gap-0.5">
        <p className="text-xs font-semibold" style={{ color: 'var(--text)' }}>{nombre}</p>
        <span className="text-xs font-bold px-1.5 py-0.5 rounded-full w-fit"
          style={{
            background: isDueno ? 'rgba(245,158,11,0.15)' : 'rgba(37,99,235,0.15)',
            color: isDueno ? '#F59E0B' : '#3B82F6',
          }}>
          {isDueno ? '👑 Dueño' : '👤 Empleado'}
        </span>
      </div>
    )
  }

  return (
    <div className="fade-in">
      {/* Header */}
      <div className="mb-5">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-page)' }}>Historial</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
          Registro de ventas y pagos de fiados
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-5">
        <button onClick={() => setTab('ventas')}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all"
          style={{
            background: tab === 'ventas' ? 'rgba(16,185,129,0.15)' : 'var(--bg-surface)',
            color: tab === 'ventas' ? '#10B981' : 'var(--text-muted)',
            border: tab === 'ventas' ? '1px solid rgba(16,185,129,0.4)' : '1px solid var(--bg-surface2)',
          }}>
          💵 Ventas
          {ventas.length > 0 && (
            <span className="text-xs px-1.5 py-0.5 rounded-full"
              style={{ background: 'rgba(16,185,129,0.2)', color: '#10B981' }}>
              {ventas.length}
            </span>
          )}
        </button>
        <button onClick={() => setTab('fiados')}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all"
          style={{
            background: tab === 'fiados' ? 'rgba(245,158,11,0.15)' : 'var(--bg-surface)',
            color: tab === 'fiados' ? '#F59E0B' : 'var(--text-muted)',
            border: tab === 'fiados' ? '1px solid rgba(245,158,11,0.4)' : '1px solid var(--bg-surface2)',
          }}>
          💳 Pagos fiados
          {abonos.length > 0 && (
            <span className="text-xs px-1.5 py-0.5 rounded-full"
              style={{ background: 'rgba(245,158,11,0.2)', color: '#F59E0B' }}>
              {abonos.length}
            </span>
          )}
        </button>
      </div>

      {/* Filtro fechas */}
      <div className="flex flex-wrap items-center gap-3 p-4 rounded-2xl mb-5"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-surface2)' }}>
        <input type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} style={{ width: 'auto' }} />
        <span style={{ color: 'var(--text-muted)' }}>→</span>
        <input type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} style={{ width: 'auto' }} />
        <button onClick={loadAll} className="px-4 py-2 rounded-xl text-sm font-semibold text-white" style={{ background: 'var(--primary)' }}>
          Aplicar
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="h-6 w-6 rounded-full border-4 animate-spin"
            style={{ borderColor: 'var(--primary-light)', borderTopColor: 'transparent' }} />
        </div>
      ) : (
        <>
          {/* ===== TAB VENTAS ===== */}
          {tab === 'ventas' && (
            <>
              {/* Resumen */}
              {ventas.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
                  <div className="rounded-2xl p-4 col-span-2 sm:col-span-1"
                    style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)' }}>
                    <div className="flex items-center gap-2 mb-1">
                      <TrendingUp size={16} color="#10B981" />
                      <span className="text-xs font-semibold" style={{ color: '#10B981' }}>Total período</span>
                    </div>
                    <p className="text-2xl font-black" style={{ color: '#10B981' }}>{formatCurrency(totalVentas)}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{ventas.length} venta{ventas.length !== 1 ? 's' : ''}</p>
                  </div>
                  {porMedio.map(m => {
                    const info = MEDIO_INFO[m.medio]
                    return (
                      <div key={m.medio} className="rounded-2xl p-4"
                        style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-surface2)' }}>
                        <p className="text-xs font-semibold mb-1" style={{ color: info?.color }}>
                          {info?.emoji} {info?.label}
                        </p>
                        <p className="text-lg font-bold" style={{ color: 'var(--text)' }}>{formatCurrency(m.total)}</p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{m.count} venta{m.count !== 1 ? 's' : ''}</p>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Tabla ventas */}
              <div className="rounded-2xl overflow-hidden"
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-surface2)' }}>
                {ventas.length === 0 ? (
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
                          <th>Desc.</th>
                          <th>Total</th>
                          <th>Vendido por</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ventas.map(v => (
                          <tr key={v.id}>
                            <td style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap', fontSize: '0.8rem' }}>
                              {formatDate(v.created_at)}
                            </td>
                            <td>
                              {v.items.map((item, i) => (
                                <div key={i}>
                                  <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>{item.nombre}</span>
                                  <span className="text-xs ml-1.5" style={{ color: 'var(--text-muted)' }}>×{item.cantidad}</span>
                                </div>
                              ))}
                            </td>
                            <td>
                              <MedioBadge medio={v.medio_pago} />
                              {v.referencia_pago && (
                                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{v.referencia_pago}</p>
                              )}
                            </td>
                            <td style={{ color: 'var(--danger)' }}>
                              {v.descuento > 0 ? `-${formatCurrency(v.descuento)}` : '—'}
                            </td>
                            <td className="font-bold" style={{ color: '#10B981' }}>{formatCurrency(v.total)}</td>
                            <td><UserBadge userId={v.usuario_id} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}

          {/* ===== TAB FIADOS ===== */}
          {tab === 'fiados' && (
            <>
              {abonos.length > 0 && (
                <div className="rounded-2xl p-4 mb-5"
                  style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)' }}>
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp size={16} color="#F59E0B" />
                    <span className="text-xs font-semibold" style={{ color: '#F59E0B' }}>Total cobrado en período</span>
                  </div>
                  <p className="text-2xl font-black" style={{ color: '#F59E0B' }}>{formatCurrency(totalAbonos)}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{abonos.length} pago{abonos.length !== 1 ? 's' : ''} registrado{abonos.length !== 1 ? 's' : ''}</p>
                </div>
              )}

              <div className="rounded-2xl overflow-hidden"
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-surface2)' }}>
                {abonos.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-2">
                    <CreditCard size={40} style={{ color: 'var(--bg-surface3)' }} />
                    <p style={{ color: 'var(--text-muted)' }}>Sin pagos de fiados en este período</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table>
                      <thead>
                        <tr>
                          <th>Fecha</th>
                          <th>Cliente</th>
                          <th>Producto(s)</th>
                          <th>Medio</th>
                          <th>Monto</th>
                          <th>Registrado por</th>
                        </tr>
                      </thead>
                      <tbody>
                        {abonos.map(ab => {
                          const items = (ab.fiado?.items || []) as { nombre: string; cantidad: number }[]
                          return (
                            <tr key={ab.id}>
                              <td style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap', fontSize: '0.8rem' }}>
                                {formatDate(ab.created_at)}
                              </td>
                              <td>
                                <p className="text-sm font-semibold" style={{ color: '#F59E0B' }}>
                                  {(ab.fiado?.cliente as { nombre: string })?.nombre || '—'}
                                </p>
                              </td>
                              <td>
                                {items.map((item, i) => (
                                  <div key={i}>
                                    <span className="text-xs font-medium" style={{ color: 'var(--text)' }}>{item.nombre}</span>
                                    <span className="text-xs ml-1" style={{ color: 'var(--text-muted)' }}>×{item.cantidad}</span>
                                  </div>
                                ))}
                              </td>
                              <td>
                                <MedioBadge medio={ab.medio_pago} />
                              </td>
                              <td className="font-bold" style={{ color: '#10B981' }}>{formatCurrency(ab.monto)}</td>
                              <td><UserBadge userId={ab.usuario_id} /></td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
