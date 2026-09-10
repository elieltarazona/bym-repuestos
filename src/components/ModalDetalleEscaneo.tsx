'use client'

import { useRouter } from 'next/navigation'
import { formatCurrency } from '@/lib/utils'
import type { Producto } from '@/lib/types'
import { X, CheckCircle2, AlertTriangle, Plus, ShoppingCart, PackagePlus, Tag, Truck, Barcode, ArrowRight } from 'lucide-react'
import { useProfile } from '@/lib/profile-context'

interface ModalDetalleEscaneoProps {
  codigoEscaneado: string
  producto: Producto | null
  loading: boolean
  onClose: () => void
  onAbrirVenta?: (producto: Producto) => void
  onAbrirGestion?: (producto: Producto) => void
}

export default function ModalDetalleEscaneo({
  codigoEscaneado,
  producto,
  loading,
  onClose,
  onAbrirVenta,
  onAbrirGestion,
}: ModalDetalleEscaneoProps) {
  const router = useRouter()
  const { esDueno } = useProfile()

  const catNombre = (producto?.categoria as { nombre?: string })?.nombre || 'Sin categoría'
  const provNombre = (producto?.proveedor as { nombre?: string })?.nombre || 'Sin proveedor'

  function handleCrearNuevo() {
    onClose()
    router.push(`/productos/nuevo?codigo_barras=${encodeURIComponent(codigoEscaneado)}`)
  }

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
                ¿Deseas agregar un nuevo producto utilizando este código de barras/QR?
              </p>

              <div className="flex gap-3 mt-1">
                <button
                  onClick={onClose}
                  className="flex-1 py-3 rounded-xl text-xs font-semibold"
                  style={{ background: 'var(--bg-surface2)', color: 'var(--text-muted)' }}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCrearNuevo}
                  className="flex-1 py-3 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1.5"
                  style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)' }}
                >
                  <Plus size={16} />
                  Crear Producto
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
