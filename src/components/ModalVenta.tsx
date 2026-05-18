'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'
import { useProfile } from '@/lib/profile-context'
import type { Producto, ClienteFiado } from '@/lib/types'
import { X, Minus, Plus, CheckCircle, CreditCard, Search, UserPlus } from 'lucide-react'
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
  const { esDueno } = useProfile()
  const [modo, setModo] = useState<'vender' | 'fiar'>('vender')
  const [cantidad, setCantidad] = useState(1)
  const [descuento, setDescuento] = useState(0)
  const [medioPago, setMedioPago] = useState('')
  const [referencia, setReferencia] = useState('')
  const [procesando, setProcesando] = useState(false)

  // Fiado states
  const [clienteBusqueda, setClienteBusqueda] = useState('')
  const [sugeridos, setSugeridos] = useState<ClienteFiado[]>([])
  const [clienteSeleccionado, setClienteSeleccionado] = useState<ClienteFiado | null>(null)
  const [showDropdown, setShowDropdown] = useState(false)
  const [telefonoNuevo, setTelefonoNuevo] = useState('')
  const [deudaExistente, setDeudaExistente] = useState(0)
  const busquedaRef = useRef<HTMLInputElement>(null)

  const subtotal = producto.precio_venta * cantidad
  const totalFinal = Math.max(0, subtotal - descuento)
  const esDigital = medioPago !== 'efectivo' && medioPago !== ''

  useEffect(() => {
    if (clienteSeleccionado) {
      supabase.from('fiados')
        .select('saldo')
        .eq('cliente_id', clienteSeleccionado.id)
        .eq('estado', 'pendiente')
        .then(({ data }) => {
          const total = (data || []).reduce((a, f) => a + f.saldo, 0)
          setDeudaExistente(total)
        })
    } else {
      setDeudaExistente(0)
    }
  }, [clienteSeleccionado])

  async function buscarClientes(query: string) {
    setClienteBusqueda(query)
    setClienteSeleccionado(null)
    setDeudaExistente(0)
    if (!query.trim()) { setSugeridos([]); setShowDropdown(false); return }
    const { data } = await supabase
      .from('clientes_fiado')
      .select('*')
      .ilike('nombre', `%${query}%`)
      .limit(6)
    setSugeridos(data || [])
    setShowDropdown(true)
  }

  function seleccionarCliente(c: ClienteFiado) {
    setClienteSeleccionado(c)
    setClienteBusqueda(c.nombre)
    setShowDropdown(false)
    setSugeridos([])
  }

  async function handleVender() {
    if (!medioPago) { toast.error('Selecciona el medio de pago'); return }
    if (cantidad > producto.stock) { toast.error(`Stock insuficiente. Disponible: ${producto.stock}`); return }

    setProcesando(true)
    const { data: { user } } = await supabase.auth.getUser()

    const { error: ventaError } = await supabase.from('ventas').insert({
      items: [{ producto_id: producto.id, nombre: producto.nombre, cantidad, precio_venta: producto.precio_venta }],
      subtotal, descuento, total: totalFinal,
      medio_pago: medioPago,
      referencia_pago: referencia || null,
      usuario_id: user?.id,
    })
    if (ventaError) { toast.error('Error registrando venta'); setProcesando(false); return }

    await supabase.from('movimientos').insert({
      producto_id: producto.id, tipo: 'salida', cantidad,
      motivo: `Venta — ${MEDIOS_PAGO.find(m => m.id === medioPago)?.label}`,
      usuario_id: user?.id,
    })

    toast.success(`Venta registrada — ${formatCurrency(totalFinal)}`)
    onVendido(); onClose()
  }

  async function handleFiar() {
    const nombreCliente = clienteBusqueda.trim()
    if (!nombreCliente) { toast.error('Escribe o selecciona el cliente'); return }
    if (cantidad > producto.stock) { toast.error(`Stock insuficiente. Disponible: ${producto.stock}`); return }

    setProcesando(true)
    const { data: { user } } = await supabase.auth.getUser()

    let clienteId = clienteSeleccionado?.id

    if (!clienteId) {
      const { data, error } = await supabase.from('clientes_fiado').insert({
        nombre: nombreCliente,
        telefono: telefonoNuevo.trim() || null,
      }).select().single()
      if (error) { toast.error('Error registrando cliente'); setProcesando(false); return }
      clienteId = data.id
    }

    const { error: fiadoError } = await supabase.from('fiados').insert({
      cliente_id: clienteId,
      items: [{ producto_id: producto.id, nombre: producto.nombre, cantidad, precio_venta: producto.precio_venta }],
      total: totalFinal,
      saldo: totalFinal,
      estado: 'pendiente',
      usuario_id: user?.id,
    })
    if (fiadoError) { toast.error('Error registrando fiado'); setProcesando(false); return }

    await supabase.from('movimientos').insert({
      producto_id: producto.id, tipo: 'salida', cantidad,
      motivo: `Fiado — ${nombreCliente}`,
      usuario_id: user?.id,
    })

    toast.success(`Fiado registrado para ${nombreCliente} — ${formatCurrency(totalFinal)}`)
    onVendido(); onClose()
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
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Stock: {producto.stock} · {formatCurrency(producto.precio_venta)}
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ color: 'var(--text-muted)' }}><X size={20} /></button>
        </div>

        {/* Toggle Vender / Fiar — solo dueño puede fiar */}
        <div className="flex px-5 pt-4 gap-2">
          <button onClick={() => setModo('vender')}
            className="flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
            style={{
              background: modo === 'vender' ? 'rgba(16,185,129,0.15)' : 'var(--bg-surface2)',
              color: modo === 'vender' ? '#10B981' : 'var(--text-muted)',
              border: modo === 'vender' ? '1px solid rgba(16,185,129,0.4)' : '1px solid transparent',
            }}>
            <CheckCircle size={14} />
            Vender
          </button>
          {esDueno && (
            <button onClick={() => setModo('fiar')}
              className="flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
              style={{
                background: modo === 'fiar' ? 'rgba(245,158,11,0.15)' : 'var(--bg-surface2)',
                color: modo === 'fiar' ? '#F59E0B' : 'var(--text-muted)',
                border: modo === 'fiar' ? '1px solid rgba(245,158,11,0.4)' : '1px solid transparent',
              }}>
              <CreditCard size={14} />
              Fiar
            </button>
          )}
        </div>

        <div className="px-5 py-4 flex flex-col gap-4">
          {/* Cantidad */}
          <div>
            <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>Cantidad</p>
            <div className="flex items-center gap-4">
              <button onClick={() => setCantidad(c => Math.max(1, c - 1))}
                className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
                style={{ background: 'var(--bg-surface2)', color: 'var(--text)' }}>
                <Minus size={16} />
              </button>
              <span className="text-2xl font-bold w-8 text-center" style={{ color: 'var(--text)' }}>{cantidad}</span>
              <button onClick={() => setCantidad(c => Math.min(producto.stock, c + 1))}
                className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
                style={{ background: 'rgba(37,99,235,0.15)', color: 'var(--primary-light)' }}>
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
            <input type="number" min={0} max={subtotal} value={descuento || ''}
              onChange={e => setDescuento(parseFloat(e.target.value) || 0)} placeholder="$ 0" />
          </div>

          {/* Total */}
          <div className="flex items-center justify-between px-4 py-3 rounded-xl"
            style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)' }}>
            <span className="font-semibold text-sm" style={{ color: 'var(--accent)' }}>TOTAL</span>
            <span className="text-xl font-black" style={{ color: 'var(--accent)' }}>{formatCurrency(totalFinal)}</span>
          </div>

          {/* ---- MODO VENDER ---- */}
          {modo === 'vender' && (
            <>
              <div>
                <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>Medio de pago</p>
                <div className="grid grid-cols-3 gap-2">
                  {MEDIOS_PAGO.map(mp => (
                    <button key={mp.id} onClick={() => setMedioPago(mp.id)}
                      className="flex flex-col items-center gap-1 py-2.5 rounded-xl text-xs font-semibold transition-all"
                      style={{
                        background: medioPago === mp.id ? 'rgba(37,99,235,0.2)' : 'var(--bg-surface2)',
                        color: medioPago === mp.id ? 'var(--primary-light)' : 'var(--text-muted)',
                        border: medioPago === mp.id ? '1px solid var(--primary-light)' : '1px solid transparent',
                      }}>
                      <span className="text-lg">{mp.emoji}</span>
                      {mp.label}
                    </button>
                  ))}
                </div>
              </div>
              {esDigital && (
                <div>
                  <p className="text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>
                    Referencia / Nro. transacción (opcional)
                  </p>
                  <input type="text" placeholder="Ej: #123456789" value={referencia}
                    onChange={e => setReferencia(e.target.value)} />
                </div>
              )}
              <button onClick={handleVender} disabled={procesando || !medioPago}
                className="w-full py-3.5 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #065F46 0%, #10B981 100%)' }}>
                <CheckCircle size={18} />
                {procesando ? 'Registrando...' : 'Vender'}
              </button>
            </>
          )}

          {/* ---- MODO FIAR ---- */}
          {modo === 'fiar' && (
            <>
              <div className="relative">
                <p className="text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>
                  Cliente *
                </p>
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
                  style={{ background: 'var(--bg-surface2)', border: clienteSeleccionado ? '1px solid rgba(245,158,11,0.5)' : '1px solid transparent' }}>
                  <Search size={15} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                  <input
                    ref={busquedaRef}
                    type="text"
                    placeholder="Buscar cliente registrado o escribir nombre nuevo..."
                    value={clienteBusqueda}
                    onChange={e => buscarClientes(e.target.value)}
                    onFocus={() => clienteBusqueda && sugeridos.length > 0 && setShowDropdown(true)}
                    style={{ border: 'none !important', background: 'transparent !important', padding: '0', fontSize: '0.83rem', flex: 1 }}
                  />
                  {clienteSeleccionado && <span className="text-xs" style={{ color: '#F59E0B' }}>✓</span>}
                </div>

                {/* Dropdown sugerencias */}
                {showDropdown && (sugeridos.length > 0 || clienteBusqueda.trim()) && (
                  <div className="absolute left-0 right-0 mt-1 rounded-xl overflow-hidden z-10"
                    style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-surface2)', boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
                    {sugeridos.map(c => (
                      <button key={c.id} onClick={() => seleccionarCliente(c)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-all hover:bg-[var(--bg-surface2)]">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-black"
                          style={{ background: 'rgba(245,158,11,0.15)', color: '#F59E0B' }}>
                          {c.nombre.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{c.nombre}</p>
                          {c.telefono && <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{c.telefono}</p>}
                        </div>
                      </button>
                    ))}
                    {clienteBusqueda.trim() && !sugeridos.some(c => c.nombre.toLowerCase() === clienteBusqueda.toLowerCase()) && (
                      <button onClick={() => { setShowDropdown(false) }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-all hover:bg-[var(--bg-surface2)]"
                        style={{ borderTop: sugeridos.length > 0 ? '1px solid var(--bg-surface2)' : 'none' }}>
                        <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{ background: 'rgba(16,185,129,0.15)' }}>
                          <UserPlus size={13} color="#10B981" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold" style={{ color: '#10B981' }}>
                            Registrar "{clienteBusqueda.trim()}"
                          </p>
                          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Nuevo cliente</p>
                        </div>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Teléfono si es cliente nuevo */}
              {clienteBusqueda.trim() && !clienteSeleccionado && (
                <div>
                  <p className="text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>
                    Teléfono del cliente (opcional)
                  </p>
                  <input type="tel" placeholder="Ej: 3101234567" value={telefonoNuevo}
                    onChange={e => setTelefonoNuevo(e.target.value)} />
                </div>
              )}

              {/* Aviso deuda existente */}
              {deudaExistente > 0 && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
                  style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}>
                  <span className="text-base">⚠️</span>
                  <p className="text-xs" style={{ color: '#EF4444' }}>
                    <strong>{clienteSeleccionado?.nombre}</strong> ya debe {formatCurrency(deudaExistente)}
                  </p>
                </div>
              )}

              <button onClick={handleFiar} disabled={procesando || !clienteBusqueda.trim()}
                className="w-full py-3.5 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #92400E 0%, #F59E0B 100%)' }}>
                <CreditCard size={18} />
                {procesando ? 'Registrando...' : 'Registrar fiado'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
