'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'
import type { Producto } from '@/lib/types'
import { X, CheckCircle2, AlertTriangle, Plus, ShoppingCart, PackagePlus, Tag, Truck, Barcode, ArrowRight, Link2, Search, Check, Loader2 } from 'lucide-react'
import { useProfile } from '@/lib/profile-context'
import toast from 'react-hot-toast'

interface ModalDetalleEscaneoProps {
  codigoEscaneado: string
  producto: Producto | null
  loading: boolean
  onClose: () => void
  onAbrirVenta?: (producto: Producto) => void
  onAbrirGestion?: (producto: Producto) => void
  onActualizado?: () => void
}

export default function ModalDetalleEscaneo({
  codigoEscaneado,
  producto,
  loading,
  onClose,
  onAbrirVenta,
  onAbrirGestion,
  onActualizado,
}: ModalDetalleEscaneoProps) {
  const router = useRouter()
  const { esDueno } = useProfile()

  const [modoVincular, setModoVincular] = useState(false)
  const [productosDisponibles, setProductosDisponibles] = useState<Producto[]>([])
  const [loadingProds, setLoadingProds] = useState(false)
  const [busquedaProd, setBusquedaProd] = useState('')
  const [productoSeleccionado, setProductoSeleccionado] = useState<Producto | null>(null)
  const [vinculando, setVinculando] = useState(false)

  useEffect(() => {
    if (modoVincular && productosDisponibles.length === 0) {
      cargarProductos()
    }
  }, [modoVincular])

  async function cargarProductos() {
    setLoadingProds(true)
    const { data, error } = await supabase
      .from('productos')
      .select('*, categoria:categorias(nombre)')
      .eq('activo', true)
      .order('nombre')
    
    if (error) {
      toast.error('Error cargando lista de productos')
    } else {
      setProductosDisponibles((data || []) as Producto[])
    }
    setLoadingProds(false)
  }

  async function handleVincularCodigo() {
    if (!productoSeleccionado) return
    setVinculando(true)

    const { error } = await supabase
      .from('productos')
      .update({
        codigo_barras: codigoEscaneado,
        updated_at: new Date().toISOString(),
      })
      .eq('id', productoSeleccionado.id)

    setVinculando(false)

    if (error) {
      toast.error(`Error vinculando código: ${error.message}`)
    } else {
      toast.success(`✅ Código ${codigoEscaneado} vinculado a ${productoSeleccionado.nombre}`)
      onActualizado?.()
      onClose()
    }
  }

  const catNombre = (producto?.categoria as { nombre?: string })?.nombre || 'Sin categoría'
  const provNombre = (producto?.proveedor as { nombre?: string })?.nombre || 'Sin proveedor'

  function handleCrearNuevo() {
    onClose()
    router.push(`/productos/nuevo?codigo_barras=${encodeURIComponent(codigoEscaneado)}`)
  }

  const productosFiltrados = busquedaProd.trim()
    ? productosDisponibles.filter(p =>
        p.nombre.toLowerCase().includes(busquedaProd.toLowerCase()) ||
        p.codigo.toLowerCase().includes(busquedaProd.toLowerCase()) ||
        (p.categoria as { nombre?: string })?.nombre?.toLowerCase().includes(busquedaProd.toLowerCase())
      )
    : productosDisponibles

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)' }}
    >
      <div
        className="w-full max-w-md rounded-2xl overflow-hidden shadow-2xl fade-in"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-surface2)' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid var(--bg-surface2)' }}
        >
          <div className="flex items-center gap-2">
            <Barcode size={20} style={{ color: 'var(--primary-light)' }} />
            <span className="font-bold text-sm" style={{ color: 'var(--text)' }}>
              Resultado del Escaneo
            </span>
          </div>
          <button onClick={onClose} style={{ color: 'var(--text-muted)' }} className="p-1 rounded-lg hover:bg-white/10">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <div className="w-8 h-8 rounded-full border-3 animate-spin"
                style={{ borderColor: 'var(--primary-light)', borderTopColor: 'transparent' }} />
              <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                Buscando producto en el sistema...
              </p>
            </div>
          ) : producto ? (
            /* PRODUCTO ENCONTRADO */
            <div className="flex flex-col gap-4">
              {/* Badge de éxito */}
              <div
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold"
                style={{ background: 'rgba(16,185,129,0.12)', color: '#10B981', border: '1px solid rgba(16,185,129,0.25)' }}
              >
                <CheckCircle2 size={16} />
                <span>Producto Encontrado</span>
              </div>

              {/* Card principal del producto */}
              <div
                className="flex items-start gap-4 p-4 rounded-xl"
                style={{ background: 'var(--bg-surface2)', border: '1px solid var(--bg-surface3)' }}
              >
                {producto.foto_url ? (
                  <img
                    src={producto.foto_url}
                    alt={producto.nombre}
                    className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
                  />
                ) : (
                  <div
                    className="w-16 h-16 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 font-bold"
                    style={{ background: 'var(--bg-surface3)', color: 'var(--text-muted)' }}
                  >
                    📦
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-base leading-tight mb-1" style={{ color: 'var(--text)' }}>
                    {producto.nombre}
                  </h3>
                  <div className="flex items-center gap-2 flex-wrap text-xs">
                    <span className="font-mono font-semibold" style={{ color: 'var(--accent)' }}>
                      Código: {producto.codigo}
                    </span>
                    {producto.codigo_barras && (
                      <span className="font-mono text-muted" style={{ color: 'var(--text-muted)' }}>
                        | Barcode: {producto.codigo_barras}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Información detallada: Dónde se guarda (Categoría, Proveedor, Precios) */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                {/* Categoría */}
                <div
                  className="p-3 rounded-xl flex flex-col gap-1"
                  style={{ background: 'var(--bg-surface2)', border: '1px solid var(--bg-surface3)' }}
                >
                  <div className="flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                    <Tag size={14} />
                    <span className="font-medium">Categoría</span>
                  </div>
                  <span className="font-semibold text-sm truncate" style={{ color: 'var(--text)' }}>
                    {catNombre}
                  </span>
                </div>

                {/* Proveedor / Ubicación */}
                <div
                  className="p-3 rounded-xl flex flex-col gap-1"
                  style={{ background: 'var(--bg-surface2)', border: '1px solid var(--bg-surface3)' }}
                >
                  <div className="flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                    <Truck size={14} />
                    <span className="font-medium">Proveedor</span>
                  </div>
                  <span className="font-semibold text-sm truncate" style={{ color: 'var(--text)' }}>
                    {provNombre}
                  </span>
                </div>

                {/* Stock Actual */}
                <div
                  className="p-3 rounded-xl flex flex-col gap-1"
                  style={{ background: 'var(--bg-surface2)', border: '1px solid var(--bg-surface3)' }}
                >
                  <span className="font-medium" style={{ color: 'var(--text-muted)' }}>Stock Actual</span>
                  <span
                    className="font-bold text-sm"
                    style={{
                      color: producto.stock === 0 ? '#EF4444' : producto.stock <= producto.stock_minimo ? '#F59E0B' : '#10B981',
                    }}
                  >
                    {producto.stock} unidades
                    {producto.stock <= producto.stock_minimo && (
                      <span className="text-[10px] block font-normal text-amber-500">
                        {producto.stock === 0 ? '(Agotado)' : '(Bajo mínimo)'}
                      </span>
                    )}
                  </span>
                </div>

                {/* Precios */}
                <div
                  className="p-3 rounded-xl flex flex-col gap-1"
                  style={{ background: 'var(--bg-surface2)', border: '1px solid var(--bg-surface3)' }}
                >
                  <span className="font-medium" style={{ color: 'var(--text-muted)' }}>Precio Venta</span>
                  <span className="font-bold text-sm" style={{ color: 'var(--primary-light)' }}>
                    {formatCurrency(producto.precio_venta)}
                  </span>
                  {esDueno && (
                    <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                      Costo: {formatCurrency(producto.precio_costo)}
                    </span>
                  )}
                </div>
              </div>

              {/* Botones de acción rápida */}
              <div className="flex flex-col gap-2 mt-2">
                {onAbrirVenta && (
                  <button
                    onClick={() => {
                      onClose()
                      onAbrirVenta(producto)
                    }}
                    disabled={producto.stock === 0}
                    className="w-full py-3 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)' }}
                  >
                    <ShoppingCart size={17} />
                    Vender producto
                  </button>
                )}

                {onAbrirGestion && (
                  <button
                    onClick={() => {
                      onClose()
                      onAbrirGestion(producto)
                    }}
                    className="w-full py-2.5 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 transition-all"
                    style={{ background: 'rgba(37,99,235,0.15)', color: 'var(--primary-light)', border: '1px solid rgba(37,99,235,0.3)' }}
                  >
                    <PackagePlus size={16} />
                    Agregar stock / Editar producto
                  </button>
                )}
              </div>
            </div>
          ) : modoVincular ? (
            /* VISTA DE VINCULACIÓN A PRODUCTO EXISTENTE */
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Link2 size={18} style={{ color: 'var(--primary-light)' }} />
                  <span className="font-bold text-sm" style={{ color: 'var(--text)' }}>
                    Vincular Código a Producto
                  </span>
                </div>
                <button
                  onClick={() => setModoVincular(false)}
                  className="text-xs font-semibold text-muted hover:underline"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Volver
                </button>
              </div>

              <div
                className="py-2 px-3 rounded-xl font-mono text-xs font-bold text-center"
                style={{ background: 'var(--bg-surface2)', color: 'var(--primary-light)', border: '1px dashed var(--bg-surface3)' }}
              >
                Código escaneado: {codigoEscaneado}
              </div>

              {/* Buscador de producto a vincular */}
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="Buscar producto existente por nombre o código..."
                  value={busquedaProd}
                  onChange={e => setBusquedaProd(e.target.value)}
                  style={{ paddingLeft: '2.2rem', fontSize: '0.85rem' }}
                />
              </div>

              {/* Lista de productos para seleccionar */}
              <div
                className="max-h-52 overflow-y-auto rounded-xl flex flex-col gap-1.5 p-1"
                style={{ background: 'var(--bg-surface2)', border: '1px solid var(--bg-surface3)' }}
              >
                {loadingProds ? (
                  <div className="flex items-center justify-center py-8 gap-2">
                    <Loader2 size={18} className="animate-spin" style={{ color: 'var(--primary-light)' }} />
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Cargando productos...</span>
                  </div>
                ) : productosFiltrados.length === 0 ? (
                  <div className="text-center py-6 text-xs" style={{ color: 'var(--text-muted)' }}>
                    No se encontraron productos coincidentes
                  </div>
                ) : (
                  productosFiltrados.map(p => {
                    const seleccionado = productoSeleccionado?.id === p.id
                    return (
                      <button
                        key={p.id}
                        onClick={() => setProductoSeleccionado(p)}
                        className="flex items-center justify-between p-2.5 rounded-lg text-left transition-all"
                        style={{
                          background: seleccionado ? 'rgba(37,99,235,0.2)' : 'transparent',
                          border: seleccionado ? '1px solid var(--primary-light)' : '1px solid transparent',
                        }}
                      >
                        <div className="min-w-0 flex-1 pr-2">
                          <p className="text-xs font-bold truncate" style={{ color: 'var(--text)' }}>
                            {p.nombre}
                          </p>
                          <p className="text-[11px] font-mono" style={{ color: 'var(--accent)' }}>
                            {p.codigo} {p.codigo_barras ? `· Actual: ${p.codigo_barras}` : '· (Sin barcode)'}
                          </p>
                        </div>
                        {seleccionado && <Check size={16} style={{ color: 'var(--primary-light)' }} />}
                      </button>
                    )
                  })
                )}
              </div>

              {/* Botón Vincular */}
              <div className="flex gap-2 mt-1">
                <button
                  onClick={() => setModoVincular(false)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-semibold"
                  style={{ background: 'var(--bg-surface2)', color: 'var(--text-muted)' }}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleVincularCodigo}
                  disabled={!productoSeleccionado || vinculando}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1.5 disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)' }}
                >
                  {vinculando ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <>
                      <Link2 size={15} />
                      Vincular Código
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            /* PRODUCTO NO ENCONTRADO */
            <div className="flex flex-col gap-4 text-center py-2">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto"
                style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)', color: '#F59E0B' }}
              >
                <AlertTriangle size={28} />
              </div>

              <div>
                <h3 className="font-bold text-base" style={{ color: 'var(--text)' }}>
                  Producto no encontrado
                </h3>
                <p className="text-xs mt-1 px-4" style={{ color: 'var(--text-muted)' }}>
                  No existe ningún producto registrado con el siguiente código:
                </p>
              </div>

              <div
                className="py-3 px-4 rounded-xl font-mono text-sm font-bold tracking-wide"
                style={{ background: 'var(--bg-surface2)', color: 'var(--primary-light)', border: '1px dashed var(--bg-surface3)' }}
              >
                {codigoEscaneado}
              </div>

              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                ¿Qué deseas hacer con este código escaneado?
              </p>

              <div className="flex flex-col gap-2.5 mt-1">
                {/* Botón Vincular a producto existente */}
                <button
                  onClick={() => setModoVincular(true)}
                  className="w-full py-3 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-2 transition-all shadow-sm"
                  style={{ background: 'linear-gradient(135deg, #059669 0%, #10B981 100%)' }}
                >
                  <Link2 size={16} />
                  Vincular a producto ya existente
                </button>

                {/* Botón Crear nuevo producto */}
                <button
                  onClick={handleCrearNuevo}
                  className="w-full py-3 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-2 transition-all"
                  style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)' }}
                >
                  <Plus size={16} />
                  Crear como nuevo producto
                  <ArrowRight size={14} />
                </button>

                <button
                  onClick={onClose}
                  className="w-full py-2.5 rounded-xl text-xs font-semibold"
                  style={{ background: 'var(--bg-surface2)', color: 'var(--text-muted)' }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

