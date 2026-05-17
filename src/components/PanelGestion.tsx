'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'
import { useProfile } from '@/lib/profile-context'
import type { Producto } from '@/lib/types'
import { X, Search, PackagePlus, Pencil, Trash2, ChevronDown, ChevronUp, Check } from 'lucide-react'
import toast from 'react-hot-toast'

interface PanelGestionProps {
  onClose: () => void
  onActualizado: () => void
}

type Expandido = { tipo: 'stock' | 'precio' | null }

export default function PanelGestion({ onClose, onActualizado }: PanelGestionProps) {
  const { esDueno } = useProfile()
  const [productos, setProductos] = useState<Producto[]>([])
  const [busqueda, setBusqueda] = useState('')
  const [loading, setLoading] = useState(true)
  const [expandido, setExpandido] = useState<Record<string, Expandido>>({})
  const [stockVals, setStockVals] = useState<Record<string, number>>({})
  const [precioVals, setPrecioVals] = useState<Record<string, { costo: string; venta: string; minimo: string }>>({})
  const [guardando, setGuardando] = useState<string | null>(null)

  useEffect(() => { loadProductos() }, [])

  async function loadProductos() {
    const { data } = await supabase
      .from('productos')
      .select('*, categoria:categorias(nombre)')
      .eq('activo', true)
      .order('nombre')
    setProductos((data || []) as Producto[])
    setLoading(false)
  }

  const filtrados = busqueda
    ? productos.filter(p =>
        p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        p.codigo.toLowerCase().includes(busqueda.toLowerCase())
      )
    : productos

  function toggleExpand(id: string, tipo: 'stock' | 'precio') {
    setExpandido(prev => {
      const current = prev[id]?.tipo
      return { ...prev, [id]: { tipo: current === tipo ? null : tipo } }
    })
    if (tipo === 'precio') {
      const p = productos.find(x => x.id === id)
      if (p) setPrecioVals(prev => ({
        ...prev,
        [id]: { costo: String(p.precio_costo), venta: String(p.precio_venta), minimo: String(p.stock_minimo) }
      }))
    }
    if (tipo === 'stock') setStockVals(prev => ({ ...prev, [id]: 1 }))
  }

  async function guardarStock(p: Producto) {
    const cantidad = stockVals[p.id] || 1
    setGuardando(p.id + '-stock')
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('movimientos').insert({
      producto_id: p.id, tipo: 'entrada', cantidad,
      motivo: 'Reposición de stock', usuario_id: user?.id,
    })
    if (error) { toast.error('Error'); } else {
      toast.success(`+${cantidad} al stock de ${p.nombre}`)
      setExpandido(prev => ({ ...prev, [p.id]: { tipo: null } }))
      loadProductos()
      onActualizado()
    }
    setGuardando(null)
  }

  async function guardarPrecio(p: Producto) {
    const vals = precioVals[p.id]
    if (!vals) return
    setGuardando(p.id + '-precio')
    const { error } = await supabase.from('productos').update({
      precio_costo: parseFloat(vals.costo) || 0,
      precio_venta: parseFloat(vals.venta) || 0,
      stock_minimo: parseInt(vals.minimo) || 5,
      updated_at: new Date().toISOString(),
    }).eq('id', p.id)
    if (error) { toast.error('Error'); } else {
      toast.success('Precios actualizados')
      setExpandido(prev => ({ ...prev, [p.id]: { tipo: null } }))
      loadProductos()
      onActualizado()
    }
    setGuardando(null)
  }

  async function eliminar(p: Producto) {
    if (!confirm(`¿Eliminar "${p.nombre}" del inventario?`)) return
    setGuardando(p.id + '-del')
    const { error } = await supabase.from('productos').update({ activo: false }).eq('id', p.id)
    if (error) { toast.error('Error'); } else {
      toast.success('Producto eliminado')
      loadProductos()
      onActualizado()
    }
    setGuardando(null)
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end" style={{ background: 'rgba(0,0,0,0.6)' }}>
      <div
        className="w-full max-w-lg h-full flex flex-col fade-in overflow-hidden"
        style={{ background: 'var(--bg-surface)', borderLeft: '1px solid var(--bg-surface2)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--bg-surface2)' }}>
          <div>
            <h2 className="font-bold text-base" style={{ color: 'var(--text)' }}>Gestionar productos</h2>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{productos.length} productos en inventario</p>
          </div>
          <button onClick={onClose} style={{ color: 'var(--text-muted)' }}><X size={22} /></button>
        </div>

        {/* Buscador */}
        <div className="px-4 py-3 flex-shrink-0" style={{ borderBottom: '1px solid var(--bg-surface2)' }}>
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
            style={{ background: 'var(--bg-surface2)' }}>
            <Search size={15} style={{ color: 'var(--text-muted)' }} />
            <input type="text" placeholder="Buscar producto..." value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              style={{ border: 'none !important', background: 'transparent !important', padding: '0', fontSize: '0.85rem', flex: 1 }} />
          </div>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto px-3 py-2">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="h-7 w-7 rounded-full border-4 animate-spin"
                style={{ borderColor: 'var(--primary-light)', borderTopColor: 'transparent' }} />
            </div>
          ) : filtrados.length === 0 ? (
            <p className="text-center text-sm py-12" style={{ color: 'var(--text-muted)' }}>Sin productos</p>
          ) : (
            filtrados.map(p => {
              const exp = expandido[p.id]?.tipo
              const sinStock = p.stock === 0
              const stockBajo = p.stock > 0 && p.stock <= p.stock_minimo
              return (
                <div key={p.id} className="mb-2 rounded-2xl overflow-hidden"
                  style={{ background: 'var(--bg-surface2)', border: '1px solid var(--bg-surface3)' }}>

                  {/* Fila principal */}
                  <div className="flex items-center gap-3 px-4 py-3">
                    {p.foto_url ? (
                      <img src={p.foto_url} alt={p.nombre} className="w-10 h-10 rounded-xl object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-xl"
                        style={{ background: 'var(--bg-surface3)' }}>📦</div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>{p.nombre}</p>
                      <p className="text-xs font-mono" style={{ color: 'var(--accent)' }}>{p.codigo}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                          style={{
                            background: sinStock ? 'rgba(239,68,68,0.15)' : stockBajo ? 'rgba(245,158,11,0.15)' : 'rgba(16,185,129,0.15)',
                            color: sinStock ? '#EF4444' : stockBajo ? '#F59E0B' : '#10B981'
                          }}>
                          {sinStock ? 'Sin stock' : `${p.stock} uds`}
                        </span>
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          {formatCurrency(p.precio_venta)}
                        </span>
                      </div>
                    </div>
                    {/* Botones acción */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button onClick={() => toggleExpand(p.id, 'stock')}
                        className="p-2 rounded-xl transition-all flex items-center gap-1 text-xs font-semibold"
                        style={{ background: exp === 'stock' ? 'rgba(16,185,129,0.2)' : 'rgba(16,185,129,0.1)', color: '#10B981' }}>
                        <PackagePlus size={15} />
                        {exp === 'stock' ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      </button>
                      {esDueno && (
                        <button onClick={() => toggleExpand(p.id, 'precio')}
                          className="p-2 rounded-xl transition-all flex items-center gap-1 text-xs font-semibold"
                          style={{ background: exp === 'precio' ? 'rgba(37,99,235,0.2)' : 'rgba(37,99,235,0.1)', color: 'var(--primary-light)' }}>
                          <Pencil size={15} />
                          {exp === 'precio' ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        </button>
                      )}
                      {esDueno && (
                        <button onClick={() => eliminar(p)} disabled={guardando === p.id + '-del'}
                          className="p-2 rounded-xl transition-all"
                          style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444' }}>
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Expandido: agregar stock */}
                  {exp === 'stock' && (
                    <div className="px-4 pb-3 pt-0 flex items-center gap-3"
                      style={{ borderTop: '1px solid var(--bg-surface3)' }}>
                      <div className="flex items-center gap-2 flex-1">
                        <button onClick={() => setStockVals(prev => ({ ...prev, [p.id]: Math.max(1, (prev[p.id] || 1) - 1) }))}
                          className="w-8 h-8 rounded-lg text-lg font-bold flex items-center justify-center"
                          style={{ background: 'var(--bg-surface3)', color: 'var(--text)' }}>−</button>
                        <span className="text-lg font-black w-8 text-center" style={{ color: '#10B981' }}>
                          {stockVals[p.id] || 1}
                        </span>
                        <button onClick={() => setStockVals(prev => ({ ...prev, [p.id]: (prev[p.id] || 1) + 1 }))}
                          className="w-8 h-8 rounded-lg text-lg font-bold flex items-center justify-center"
                          style={{ background: 'rgba(16,185,129,0.2)', color: '#10B981' }}>+</button>
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          → {p.stock + (stockVals[p.id] || 1)} uds
                        </span>
                      </div>
                      <button onClick={() => guardarStock(p)} disabled={guardando === p.id + '-stock'}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold text-white flex items-center gap-1"
                        style={{ background: '#10B981' }}>
                        <Check size={13} />
                        {guardando === p.id + '-stock' ? '...' : 'Guardar'}
                      </button>
                    </div>
                  )}

                  {/* Expandido: editar precios */}
                  {exp === 'precio' && (
                    <div className="px-4 pb-3 pt-2 flex flex-col gap-2"
                      style={{ borderTop: '1px solid var(--bg-surface3)' }}>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { label: 'Costo ($)', key: 'costo' },
                          { label: 'Venta ($)', key: 'venta' },
                          { label: 'Mín. stock', key: 'minimo' },
                        ].map(({ label, key }) => (
                          <div key={key}>
                            <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{label}</p>
                            <input type="number" min={0} placeholder="0"
                              value={precioVals[p.id]?.[key as 'costo' | 'venta' | 'minimo'] ?? ''}
                              onChange={e => setPrecioVals(prev => ({
                                ...prev,
                                [p.id]: { ...prev[p.id], [key]: e.target.value }
                              }))}
                              style={{ fontSize: '0.8rem', padding: '0.3rem 0.5rem' }}
                            />
                          </div>
                        ))}
                      </div>
                      <button onClick={() => guardarPrecio(p)} disabled={guardando === p.id + '-precio'}
                        className="w-full py-1.5 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1"
                        style={{ background: 'var(--primary-light)' }}>
                        <Check size={13} />
                        {guardando === p.id + '-precio' ? 'Guardando...' : 'Guardar cambios'}
                      </button>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
