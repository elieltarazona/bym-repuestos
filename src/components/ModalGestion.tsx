'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'
import type { Producto } from '@/lib/types'
import { X, Plus, Pencil, Trash2, PackagePlus, DollarSign, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'

interface ModalGestionProps {
  producto: Producto
  onClose: () => void
  onActualizado: () => void
}

type Vista = 'menu' | 'stock' | 'precio' | 'eliminar'

export default function ModalGestion({ producto, onClose, onActualizado }: ModalGestionProps) {
  const [vista, setVista] = useState<Vista>('menu')
  const [cantidad, setCantidad] = useState(1)
  const [motivo, setMotivo] = useState('')
  const [precioCosto, setPrecioCosto] = useState(String(producto.precio_costo))
  const [precioVenta, setPrecioVenta] = useState(String(producto.precio_venta))
  const [stockMinimo, setStockMinimo] = useState(String(producto.stock_minimo))
  const [guardando, setGuardando] = useState(false)

  async function agregarStock() {
    if (cantidad < 1) return
    setGuardando(true)
    const { data: { user } } = await supabase.auth.getUser()

    const { error } = await supabase.from('movimientos').insert({
      producto_id: producto.id,
      tipo: 'entrada',
      cantidad,
      motivo: motivo || 'Reposición de stock',
      usuario_id: user?.id,
    })

    if (error) {
      toast.error('Error agregando stock')
    } else {
      toast.success(`+${cantidad} unidades agregadas`)
      onActualizado()
      onClose()
    }
    setGuardando(false)
  }

  async function guardarPrecio() {
    setGuardando(true)
    const { error } = await supabase
      .from('productos')
      .update({
        precio_costo: parseFloat(precioCosto) || 0,
        precio_venta: parseFloat(precioVenta) || 0,
        stock_minimo: parseInt(stockMinimo) || 5,
        updated_at: new Date().toISOString(),
      })
      .eq('id', producto.id)

    if (error) {
      toast.error('Error actualizando precios')
    } else {
      toast.success('Precios actualizados')
      onActualizado()
      onClose()
    }
    setGuardando(false)
  }

  async function eliminarProducto() {
    setGuardando(true)
    const { error } = await supabase
      .from('productos')
      .update({ activo: false })
      .eq('id', producto.id)

    if (error) {
      toast.error('Error eliminando producto')
    } else {
      toast.success('Producto eliminado del inventario')
      onActualizado()
      onClose()
    }
    setGuardando(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)' }}>
      <div className="w-full max-w-sm rounded-2xl overflow-hidden fade-in"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-surface2)' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--bg-surface2)' }}>
          <div className="flex items-center gap-3">
            {producto.foto_url && (
              <img src={producto.foto_url} alt={producto.nombre} className="w-10 h-10 rounded-xl object-cover" />
            )}
            <div>
              <p className="font-bold text-sm" style={{ color: 'var(--text)' }}>{producto.nombre}</p>
              <p className="text-xs font-mono" style={{ color: 'var(--accent)' }}>{producto.codigo}</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Stock actual: <span className="font-semibold" style={{ color: producto.stock === 0 ? '#EF4444' : '#10B981' }}>
                  {producto.stock} uds
                </span>
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ color: 'var(--text-muted)' }}><X size={20} /></button>
        </div>

        {/* VISTA: menú principal */}
        {vista === 'menu' && (
          <div className="p-4 flex flex-col gap-2">
            <button onClick={() => setVista('stock')}
              className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-semibold text-left transition-all"
              style={{ background: 'rgba(16,185,129,0.1)', color: '#10B981', border: '1px solid rgba(16,185,129,0.2)' }}>
              <PackagePlus size={18} />
              Agregar stock / Reabastecer
            </button>
            <button onClick={() => setVista('precio')}
              className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-semibold text-left transition-all"
              style={{ background: 'rgba(37,99,235,0.1)', color: 'var(--primary-light)', border: '1px solid rgba(37,99,235,0.2)' }}>
              <DollarSign size={18} />
              Editar precios y stock mínimo
            </button>
            <button onClick={() => setVista('eliminar')}
              className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-semibold text-left transition-all"
              style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.2)' }}>
              <Trash2 size={18} />
              Eliminar producto
            </button>
          </div>
        )}

        {/* VISTA: agregar stock */}
        {vista === 'stock' && (
          <div className="p-5 flex flex-col gap-4">
            <div className="flex items-center gap-2 mb-1">
              <PackagePlus size={16} color="#10B981" />
              <span className="font-semibold text-sm" style={{ color: 'var(--text)' }}>Agregar stock</span>
            </div>

            <div>
              <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>Cantidad a agregar</p>
              <div className="flex items-center gap-4">
                <button onClick={() => setCantidad(c => Math.max(1, c - 1))}
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold"
                  style={{ background: 'var(--bg-surface2)', color: 'var(--text)' }}>−</button>
                <span className="text-2xl font-black w-10 text-center" style={{ color: 'var(--text)' }}>{cantidad}</span>
                <button onClick={() => setCantidad(c => c + 1)}
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold"
                  style={{ background: 'rgba(16,185,129,0.15)', color: '#10B981' }}>+</button>
                <div className="flex-1 text-right">
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Nuevo stock</p>
                  <p className="text-lg font-bold" style={{ color: '#10B981' }}>{producto.stock + cantidad} uds</p>
                </div>
              </div>
            </div>

            <div>
              <p className="text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>Motivo (opcional)</p>
              <input type="text" placeholder="Ej: Compra a proveedor, devolución..."
                value={motivo} onChange={e => setMotivo(e.target.value)} />
            </div>

            <div className="flex gap-3 mt-1">
              <button onClick={() => setVista('menu')} className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                style={{ background: 'var(--bg-surface2)', color: 'var(--text-muted)' }}>Volver</button>
              <button onClick={agregarStock} disabled={guardando}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #065F46 0%, #10B981 100%)' }}>
                {guardando ? 'Guardando...' : `Agregar +${cantidad}`}
              </button>
            </div>
          </div>
        )}

        {/* VISTA: editar precios */}
        {vista === 'precio' && (
          <div className="p-5 flex flex-col gap-4">
            <div className="flex items-center gap-2 mb-1">
              <Pencil size={16} style={{ color: 'var(--primary-light)' }} />
              <span className="font-semibold text-sm" style={{ color: 'var(--text)' }}>Editar precios</span>
            </div>

            <div>
              <p className="text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>Precio de costo ($)</p>
              <input type="number" min={0} step="1" value={precioCosto} onChange={e => setPrecioCosto(e.target.value)} placeholder="0" />
            </div>
            <div>
              <p className="text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>Precio de venta ($)</p>
              <input type="number" min={0} step="1" value={precioVenta} onChange={e => setPrecioVenta(e.target.value)} placeholder="0" />
              {parseFloat(precioVenta) > 0 && parseFloat(precioCosto) > 0 && (
                <p className="text-xs mt-1" style={{ color: '#10B981' }}>
                  Margen: {formatCurrency(parseFloat(precioVenta) - parseFloat(precioCosto))}
                  {' '}({Math.round(((parseFloat(precioVenta) - parseFloat(precioCosto)) / parseFloat(precioCosto)) * 100)}%)
                </p>
              )}
            </div>
            <div>
              <p className="text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>Stock mínimo (alerta)</p>
              <input type="number" min={0} value={stockMinimo} onChange={e => setStockMinimo(e.target.value)} placeholder="5" />
            </div>

            <div className="flex gap-3 mt-1">
              <button onClick={() => setVista('menu')} className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                style={{ background: 'var(--bg-surface2)', color: 'var(--text-muted)' }}>Volver</button>
              <button onClick={guardarPrecio} disabled={guardando}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)' }}>
                {guardando ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        )}

        {/* VISTA: confirmar eliminar */}
        {vista === 'eliminar' && (
          <div className="p-5 flex flex-col gap-4">
            <div className="flex items-center gap-3 p-4 rounded-xl"
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <AlertTriangle size={20} color="#EF4444" />
              <p className="text-sm font-medium" style={{ color: '#EF4444' }}>
                ¿Eliminar <strong>{producto.nombre}</strong>?
              </p>
            </div>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              El producto se desactivará del inventario. El historial de ventas y movimientos se conserva.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setVista('menu')} className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                style={{ background: 'var(--bg-surface2)', color: 'var(--text-muted)' }}>Cancelar</button>
              <button onClick={eliminarProducto} disabled={guardando}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-60"
                style={{ background: '#EF4444' }}>
                {guardando ? 'Eliminando...' : 'Sí, eliminar'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
