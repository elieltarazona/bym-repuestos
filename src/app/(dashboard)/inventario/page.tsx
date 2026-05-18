'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'
import type { Producto } from '@/lib/types'
import ModalVenta from '@/components/ModalVenta'
import PanelGestion from '@/components/PanelGestion'
import PanelFiados from '@/components/PanelFiados'
import { Search, Package, Plus, Settings2, CreditCard } from 'lucide-react'
import toast from 'react-hot-toast'

const CATEGORIA_EMOJI: Record<string, string> = {
  'Favoritos': '⭐', 'Aceites Motor 4T': '🛢️', 'Aceites Motor 2T': '🛢️',
  'Aceite de Caja': '⚙️', 'Líquido de Frenos': '🔴', 'Refrigerante': '🧊',
  'Aditivos': '🧪', 'Filtro de Aceite': '🔵', 'Filtro de Aire': '💨',
  'Filtro de Gasolina': '⛽', 'Pastillas Delanteras': '🔩', 'Pastillas Traseras': '🔩',
  'Discos de Freno': '💿', 'Cadena': '⛓️', 'Piñón': '⚙️', 'Corona': '👑',
  'Guaya Acelerador': '🔗', 'Guaya de Embrague': '🔗', 'Llanta Delantera': '🛞',
  'Llanta Trasera': '🛞', 'Batería': '🔋', 'Bujías': '⚡', 'Focos y Luces': '💡',
  'Relay y Fusibles': '🔌', 'Amortiguadores': '🔧', 'Espirales': '🌀',
  'Guardabarro': '🏍️', 'Sillines': '🪑', 'Tanque': '⛽', 'Casco': '⛑️',
  'Guantes': '🧤', 'Chaqueta': '🧥', 'Limpiador de Cadena': '🧴',
  'Limpiador Multiusos': '🧹', 'Repuestos Motor': '🔩', 'Carburador': '⚙️',
  'Accesorios': '🔧', 'Lujos': '✨', 'Otros': '📦',
}

export default function InventarioPage() {
  const [productos, setProductos] = useState<Producto[]>([])
  const [categorias, setCategorias] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoriaActiva, setCategoriaActiva] = useState('Todos')
  const [productoVenta, setProductoVenta] = useState<Producto | null>(null)
  const [panelGestion, setPanelGestion] = useState(false)
  const [panelFiados, setPanelFiados] = useState(false)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const [prodsRes, catsRes] = await Promise.all([
      supabase.from('productos').select('*, categoria:categorias(nombre)').eq('activo', true).order('nombre'),
      supabase.from('categorias').select('nombre').order('nombre'),
    ])
    if (prodsRes.error) toast.error('Error cargando productos')
    setProductos((prodsRes.data || []) as Producto[])
    setCategorias(['Todos', ...(catsRes.data?.map(c => c.nombre) || [])])
    setLoading(false)
  }

  const filtered = useMemo(() => {
    let result = productos
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(p =>
        p.nombre.toLowerCase().includes(q) ||
        p.codigo.toLowerCase().includes(q) ||
        (p.codigo_barras || '').includes(q)
      )
    }
    if (categoriaActiva !== 'Todos') {
      result = result.filter(p => (p.categoria as { nombre: string })?.nombre === categoriaActiva)
    }
    return result
  }, [productos, search, categoriaActiva])

  const catsConProductos = useMemo(() =>
    categorias.filter(c => c === 'Todos' || productos.some(p => (p.categoria as { nombre: string })?.nombre === c))
  , [categorias, productos])

  function stockColor(stock: number, minimo: number) {
    if (stock === 0) return { color: '#EF4444', bg: 'rgba(239,68,68,0.85)' }
    if (stock <= minimo) return { color: '#F59E0B', bg: 'rgba(245,158,11,0.85)' }
    return { color: 'white', bg: 'rgba(16,185,129,0.85)' }
  }

  if (loading) return (
    <div className="flex h-64 items-center justify-center">
      <div className="h-8 w-8 rounded-full border-4 animate-spin"
        style={{ borderColor: 'var(--primary-light)', borderTopColor: 'transparent' }} />
    </div>
  )

  return (
    <div className="fade-in">
      {productoVenta && (
        <ModalVenta producto={productoVenta} onClose={() => setProductoVenta(null)} onVendido={loadData} />
      )}
      {panelGestion && (
        <PanelGestion onClose={() => setPanelGestion(false)} onActualizado={loadData} />
      )}
      {panelFiados && (
        <PanelFiados onClose={() => setPanelFiados(false)} />
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-page)' }}>Inventario</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {filtered.length} productos · Toca para vender
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Botón fiados */}
          <button
            onClick={() => setPanelFiados(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)', color: '#F59E0B' }}
          >
            <CreditCard size={16} />
            Fiados
          </button>
          {/* Botón gestionar */}
          <button
            onClick={() => setPanelGestion(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-surface2)', color: 'var(--text-muted)' }}
          >
            <Settings2 size={16} />
            Gestionar
          </button>
          {/* Botón agregar */}
          <Link
            href="/productos/nuevo"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white"
            style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)' }}
          >
            <Plus size={16} />
            Agregar producto
          </Link>
        </div>
      </div>

      {/* Buscador */}
      <div className="flex items-center gap-3 px-4 py-3 rounded-2xl mb-5"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-surface2)' }}>
        <Search size={18} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
        <input
          type="text"
          placeholder="Busca producto por nombre, fabricante o código..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ border: 'none !important', background: 'transparent !important', padding: '0', fontSize: '0.9rem', flex: 1 }}
        />
      </div>

      {/* Tabs de categorías */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-5" style={{ scrollbarWidth: 'none' }}>
        {catsConProductos.map(cat => {
          const active = categoriaActiva === cat
          const emoji = cat === 'Todos' ? '🏪' : (CATEGORIA_EMOJI[cat] || '📦')
          return (
            <button
              key={cat}
              onClick={() => { setCategoriaActiva(cat); setSearch('') }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all flex-shrink-0"
              style={{
                background: active ? 'var(--primary-light)' : 'var(--bg-surface)',
                color: active ? 'white' : 'var(--text-muted)',
                border: active ? '1px solid var(--primary-light)' : '1px solid var(--bg-surface2)',
              }}
            >
              <span>{emoji}</span>
              {cat}
            </button>
          )
        })}
      </div>


      {/* Grid de productos */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Package size={48} style={{ color: 'var(--bg-surface3)' }} />
          <p style={{ color: 'var(--text-muted)' }}>Sin productos en esta categoría</p>
          <Link href="/productos/nuevo" className="text-sm font-medium" style={{ color: 'var(--primary-light)' }}>
            + Agregar el primero
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {filtered.map(p => {
            const sinStock = p.stock === 0
            const catNombre = (p.categoria as { nombre: string })?.nombre ?? ''
            const sc = stockColor(p.stock, p.stock_minimo)
            return (
              <button
                key={p.id}
                onClick={() => !sinStock && setProductoVenta(p)}
                disabled={sinStock}
                className="rounded-2xl overflow-hidden text-left transition-all duration-150 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--bg-surface2)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                }}
              >
                {/* Imagen con badge numérico */}
                <div className="w-full aspect-square flex items-center justify-center relative overflow-hidden"
                  style={{ background: 'var(--bg-surface2)' }}>
                  {p.foto_url ? (
                    <img src={p.foto_url} alt={p.nombre} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-4xl">{CATEGORIA_EMOJI[catNombre] || '📦'}</span>
                  )}
                  {/* Badge stock — solo número como en la imagen */}
                  <span
                    className="absolute top-2 right-2 min-w-[26px] h-[26px] px-1.5 rounded-full flex items-center justify-center text-xs font-black"
                    style={{ background: sc.bg, color: sinStock ? '#EF4444' : 'white', backdropFilter: 'blur(4px)' }}
                  >
                    {sinStock ? '0' : p.stock}
                  </span>
                </div>

                {/* Info */}
                <div className="p-3">
                  <p className="text-xs font-semibold leading-tight mb-1 line-clamp-2" style={{ color: 'var(--text)' }}>
                    {p.nombre}
                  </p>
                  <p className="text-sm font-bold" style={{ color: 'var(--primary-light)' }}>
                    {formatCurrency(p.precio_venta)}
                  </p>
                  {/* Código visible debajo del precio */}
                  <p className="text-xs font-mono mt-0.5" style={{ color: 'var(--accent)' }}>
                    {p.codigo}
                  </p>
                  <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>
                    {catNombre}
                  </p>
                </div>
              </button>
            )
          })}

          {/* Tarjeta agregar nuevo */}
          <Link
            href="/productos/nuevo"
            className="rounded-2xl flex flex-col items-center justify-center gap-3 py-8 transition-all hover:scale-[1.02]"
            style={{ border: '2px dashed var(--bg-surface3)', minHeight: '180px' }}
          >
            <div className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(37,99,235,0.12)' }}>
              <Plus size={22} style={{ color: 'var(--primary-light)' }} />
            </div>
            <p className="text-xs font-semibold text-center" style={{ color: 'var(--text-muted)' }}>
              Agregar<br />producto
            </p>
          </Link>
        </div>
      )}
    </div>
  )
}
