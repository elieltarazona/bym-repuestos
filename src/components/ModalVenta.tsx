'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'
import type { Producto } from '@/lib/types'
import { X, Minus, Plus, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'

interface ModalVentaProps {
  producto: Producto
  onClose: () => void
  onVendido: () => void
}

const MEDIOS_PAGO = [
  { id: 'efectivo', label: 'Efectivo', emoji: '💵' },
  { id: 'nequi', label: 'Nequi', emoji: '🟣' },
  { id: 'bancolombia', label: 'Bancolombia', emoji: '🟡' },
  { id: 'daviplata', label: 'Daviplata', emoji: '🔴' },
  { id: 'tarjeta_debito', label: 'T. Débito', emoji: '💳' },
  { id: 'tarjeta_credito', label: 'T. Crédito', emoji: '💳' },
]

export default function ModalVenta({ producto, onClose, onVendido }: ModalVentaProps) {
  const [cantidad, setCantidad] = useState(1)
  const [descuento, setDescuento] = useState(0)
  const [medioPago, setMedioPago] = useState('')
  const [referencia, setReferencia] = useState('')
  const [vendiendo, setVendiendo] = useState(false)

  const subtotal = producto.precio_venta * cantidad
  const totalFinal = Math.max(0, subtotal - descuento)
  const esDigital = medioPago !== 'efectivo' && medioPago !== ''

  async function handleVender() {
    if (!medioPago) { toast.error('Selecciona el medio de pago'); return }
    if (cantidad > producto.stock) { toast.error(`Stock insuficiente. Disponible: ${producto.stock}`); return }

    setVendiendo(true)
    const { data: { user } } = await supabase.auth.getUser()

    const { error: ventaError } = await supabase.from('ventas').insert({
      items: [{ producto_id: producto.id, nombre: producto.nombre, cantidad, precio_venta: producto.precio_venta }],
      subtotal,
      descuento,
      total: totalFinal,
      medio_pago: medioPago,
      referencia_pago: referencia || null,
      usuario_id: user?.id,
    })

    if (ventaError) { toast.error('Error registrando venta'); setVendiendo(false); return }

    const { error: movError } = await supabase.from('movimientos').insert({
      producto_id: producto.id,
      tipo: 'salida',
      cantidad,
      motivo: `Venta — ${MEDIOS_PAGO.find(m => m.id === medioPago)?.label}`,
      usuario_id: user?.id,
    })

    if (movError) { toast.error('Error actualizando stock'); setVendiendo(false); return }

    toast.success(`Venta registrada — ${formatCurrency(totalFinal)}`)
    onVendido()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)' }}>
      <div
        className="w-full max-w-sm rounded-2xl overflow-hidden fade-in"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-surface2)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--bg-surface2)' }}>
          <div className="flex items-center gap-3">
            {producto.foto_url && (
              <img src={producto.foto_url} alt={producto.nombre} className="w-10 h-10 rounded-xl object-cover" />
            )}
            <div>
              <p className="font-bold text-sm" style={{ color: 'var(--text)' }}>{producto.nombre}</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Stock: {producto.stock} · {formatCurrency(producto.precio_venta)}
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ color: 'var(--text-muted)' }}><X size={20} /></button>
        </div>

        <div className="px-5 py-4 flex flex-col gap-4">
          {/* Cantidad */}
          <div>
            <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>Cantidad</p>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setCantidad(c => Math.max(1, c - 1))}
                className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-lg transition-colors"
                style={{ background: 'var(--bg-surface2)', color: 'var(--text)' }}
              >
                <Minus size={16} />
              </button>
              <span className="text-2xl font-bold w-8 text-center" style={{ color: 'var(--text)' }}>{cantidad}</span>
              <button
                onClick={() => setCantidad(c => Math.min(producto.stock, c + 1))}
                className="w-9 h-9 rounded-xl flex items-center justify-center font-bold transition-colors"
                style={{ background: 'rgba(37,99,235,0.15)', color: 'var(--primary-light)' }}
              >
                <Plus size={16} />
              </button>
              <div className="flex-1 text-right">
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Subtotal</p>
                <p className="text-lg font-bold" style={{ color: 'var(--accent)' }}>{formatCurrency(subtotal)}</p>
              </div>
            </div>
          </div>

          {/* Descuento */}
          <div>
            <p className="text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>Descuento (opcional)</p>
            <input
              type="number"
              min={0}
              max={subtotal}
              value={descuento || ''}
              onChange={e => setDescuento(parseFloat(e.target.value) || 0)}
              placeholder="$ 0"
            />
          </div>

          {/* Total */}
          <div
            className="flex items-center justify-between px-4 py-3 rounded-xl"
            style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)' }}
          >
            <span className="font-semibold text-sm" style={{ color: 'var(--accent)' }}>TOTAL</span>
            <span className="text-xl font-black" style={{ color: 'var(--accent)' }}>{formatCurrency(totalFinal)}</span>
          </div>

          {/* Medio de pago */}
          <div>
            <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>Medio de pago</p>
            <div className="grid grid-cols-3 gap-2">
              {MEDIOS_PAGO.map(mp => (
                <button
                  key={mp.id}
                  onClick={() => setMedioPago(mp.id)}
                  className="flex flex-col items-center gap-1 py-2.5 rounded-xl text-xs font-semibold transition-all"
                  style={{
                    background: medioPago === mp.id ? 'rgba(37,99,235,0.2)' : 'var(--bg-surface2)',
                    color: medioPago === mp.id ? 'var(--primary-light)' : 'var(--text-muted)',
                    border: medioPago === mp.id ? '1px solid var(--primary-light)' : '1px solid transparent',
                  }}
                >
                  <span className="text-lg">{mp.emoji}</span>
                  {mp.label}
                </button>
              ))}
            </div>
          </div>

          {/* Referencia pago digital */}
          {esDigital && (
            <div>
              <p className="text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>
                Referencia / Nro. transacción (opcional)
              </p>
              <input
                type="text"
                placeholder="Ej: #123456789"
                value={referencia}
                onChange={e => setReferencia(e.target.value)}
              />
            </div>
          )}

          {/* Botón vender */}
          <button
            onClick={handleVender}
            disabled={vendiendo || !medioPago}
            className="w-full py-3.5 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #065F46 0%, #10B981 100%)' }}
          >
            <CheckCircle size={18} />
            {vendiendo ? 'Registrando...' : 'Vender'}
          </button>
        </div>
      </div>
    </div>
  )
}
