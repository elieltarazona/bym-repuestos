'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'
import type { ClienteFiado, Fiado } from '@/lib/types'
import { X, Search, Plus, Pencil, Trash2, Check, ChevronDown, ChevronUp, CreditCard } from 'lucide-react'
import toast from 'react-hot-toast'

interface PanelFiadosProps {
  onClose: () => void
}

interface ClienteConFiados extends ClienteFiado {
  fiados: Fiado[]
  totalSaldo: number
}

export default function PanelFiados({ onClose }: PanelFiadosProps) {
  const [clientes, setClientes] = useState<ClienteConFiados[]>([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [expandido, setExpandido] = useState<string | null>(null)
  const [guardando, setGuardando] = useState<string | null>(null)
  const [showNuevo, setShowNuevo] = useState(false)
  const [editando, setEditando] = useState<string | null>(null)
  const [abonoId, setAbonoId] = useState<string | null>(null)
  const [nombreForm, setNombreForm] = useState('')
  const [telefonoForm, setTelefonoForm] = useState('')
  const [montoAbono, setMontoAbono] = useState('')

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const [fiadosRes, clientesRes] = await Promise.all([
      supabase.from('fiados').select('*').eq('estado', 'pendiente').order('created_at', { ascending: false }),
      supabase.from('clientes_fiado').select('*').order('nombre'),
    ])

    const clienteMap: Record<string, ClienteConFiados> = {}
    ;(clientesRes.data || []).forEach(c => {
      clienteMap[c.id] = { ...c, fiados: [], totalSaldo: 0 }
    })
    ;(fiadosRes.data || []).forEach((f: Fiado) => {
      if (clienteMap[f.cliente_id]) {
        clienteMap[f.cliente_id].fiados.push(f)
        clienteMap[f.cliente_id].totalSaldo += f.saldo
      }
    })

    setClientes(
      Object.values(clienteMap)
        .filter(c => c.totalSaldo > 0)
        .sort((a, b) => b.totalSaldo - a.totalSaldo)
    )
    setLoading(false)
  }

  const filtrados = busqueda
    ? clientes.filter(c =>
        c.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        (c.telefono || '').includes(busqueda)
      )
    : clientes

  async function crearCliente() {
    if (!nombreForm.trim()) { toast.error('Escribe el nombre'); return }
    setGuardando('nuevo')
    const { error } = await supabase.from('clientes_fiado').insert({
      nombre: nombreForm.trim(),
      telefono: telefonoForm.trim() || null,
    })
    if (error) { toast.error('Error al guardar'); } else {
      toast.success('Cliente registrado')
      setShowNuevo(false)
      setNombreForm(''); setTelefonoForm('')
      loadData()
    }
    setGuardando(null)
  }

  async function editarCliente(id: string) {
    if (!nombreForm.trim()) { toast.error('Escribe el nombre'); return }
    setGuardando('edit-' + id)
    const { error } = await supabase.from('clientes_fiado').update({
      nombre: nombreForm.trim(),
      telefono: telefonoForm.trim() || null,
    }).eq('id', id)
    if (error) { toast.error('Error al actualizar'); } else {
      toast.success('Cliente actualizado')
      setEditando(null)
      loadData()
    }
    setGuardando(null)
  }

  async function eliminarCliente(c: ClienteConFiados) {
    if (!confirm(`¿Eliminar a "${c.nombre}" y cancelar toda su deuda?`)) return
    setGuardando('del-' + c.id)
    await supabase.from('fiados').update({ estado: 'cancelado' }).eq('cliente_id', c.id).eq('estado', 'pendiente')
    toast.success('Cliente eliminado')
    loadData()
    setGuardando(null)
  }

  async function registrarAbono(c: ClienteConFiados) {
    const monto = parseFloat(montoAbono)
    if (!monto || monto <= 0) { toast.error('Ingresa un monto válido'); return }
    if (monto > c.totalSaldo) { toast.error(`Monto mayor a la deuda (${formatCurrency(c.totalSaldo)})`); return }

    setGuardando('abono-' + c.id)
    const { data: { user } } = await supabase.auth.getUser()

    let remaining = monto
    const ordenados = [...c.fiados].sort((a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )

    for (const fiado of ordenados) {
      if (remaining <= 0) break
      const pago = Math.min(remaining, fiado.saldo)
      const nuevoSaldo = Math.round((fiado.saldo - pago) * 100) / 100

      await supabase.from('abonos_fiado').insert({ fiado_id: fiado.id, monto: pago, usuario_id: user?.id })
      await supabase.from('fiados').update({
        saldo: nuevoSaldo,
        estado: nuevoSaldo === 0 ? 'pagado' : 'pendiente',
        updated_at: new Date().toISOString(),
      }).eq('id', fiado.id)

      remaining -= pago
    }

    toast.success(`Abono de ${formatCurrency(monto)} registrado`)
    setAbonoId(null)
    setMontoAbono('')
    loadData()
    setGuardando(null)
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end" style={{ background: 'rgba(0,0,0,0.6)' }}>
      <div className="w-full max-w-lg h-full flex flex-col fade-in overflow-hidden"
        style={{ background: 'var(--bg-surface)', borderLeft: '1px solid var(--bg-surface2)' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--bg-surface2)' }}>
          <div>
            <h2 className="font-bold text-base flex items-center gap-2" style={{ color: 'var(--text)' }}>
              <CreditCard size={18} color="#F59E0B" />
              Fiados
            </h2>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {clientes.length} cliente{clientes.length !== 1 ? 's' : ''} con deuda pendiente
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setShowNuevo(true); setEditando(null); setAbonoId(null); setNombreForm(''); setTelefonoForm('') }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold"
              style={{ background: 'rgba(245,158,11,0.15)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.3)' }}>
              <Plus size={14} />
              Nuevo cliente
            </button>
            <button onClick={onClose} style={{ color: 'var(--text-muted)' }}><X size={22} /></button>
          </div>
        </div>

        {/* Form nuevo cliente */}
        {showNuevo && (
          <div className="px-4 py-3 flex-shrink-0 flex flex-col gap-2"
            style={{ borderBottom: '1px solid var(--bg-surface2)', background: 'rgba(245,158,11,0.05)' }}>
            <p className="text-xs font-semibold" style={{ color: '#F59E0B' }}>➕ Nuevo cliente fiado</p>
            <div className="flex gap-2">
              <input type="text" placeholder="Nombre completo *" value={nombreForm}
                onChange={e => setNombreForm(e.target.value)}
                style={{ flex: 1, fontSize: '0.85rem' }} />
              <input type="tel" placeholder="Teléfono" value={telefonoForm}
                onChange={e => setTelefonoForm(e.target.value)}
                style={{ width: '130px', fontSize: '0.85rem' }} />
            </div>
            <div className="flex gap-2">
              <button onClick={crearCliente} disabled={guardando === 'nuevo'}
                className="flex-1 py-2 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1"
                style={{ background: '#F59E0B' }}>
                <Check size={13} />
                {guardando === 'nuevo' ? 'Guardando...' : 'Guardar cliente'}
              </button>
              <button onClick={() => setShowNuevo(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold"
                style={{ background: 'var(--bg-surface2)', color: 'var(--text-muted)' }}>
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Buscador */}
        <div className="px-4 py-3 flex-shrink-0" style={{ borderBottom: '1px solid var(--bg-surface2)' }}>
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: 'var(--bg-surface2)' }}>
            <Search size={15} style={{ color: 'var(--text-muted)' }} />
            <input type="text" placeholder="Buscar cliente..." value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              style={{ border: 'none !important', background: 'transparent !important', padding: '0', fontSize: '0.85rem', flex: 1 }} />
          </div>
        </div>

        {/* Lista de clientes */}
        <div className="flex-1 overflow-y-auto px-3 py-2">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="h-7 w-7 rounded-full border-4 animate-spin"
                style={{ borderColor: 'var(--primary-light)', borderTopColor: 'transparent' }} />
            </div>
          ) : filtrados.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <CreditCard size={40} style={{ color: 'var(--bg-surface3)' }} />
              <p className="text-sm text-center" style={{ color: 'var(--text-muted)' }}>
                {busqueda ? 'Sin resultados' : 'Sin fiados pendientes'}
              </p>
            </div>
          ) : (
            filtrados.map(c => {
              const isEditando = editando === c.id
              const isAbonando = abonoId === c.id
              const isExpanded = expandido === c.id

              return (
                <div key={c.id} className="mb-2 rounded-2xl overflow-hidden"
                  style={{ background: 'var(--bg-surface2)', border: '1px solid var(--bg-surface3)' }}>

                  {/* Fila principal */}
                  <div className="flex items-center gap-3 px-4 py-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-base font-black"
                      style={{ background: 'rgba(245,158,11,0.15)', color: '#F59E0B' }}>
                      {c.nombre.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>{c.nombre}</p>
                      {c.telefono && (
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>📞 {c.telefono}</p>
                      )}
                      <p className="text-sm font-black" style={{ color: '#EF4444' }}>
                        Debe: {formatCurrency(c.totalSaldo)}
                      </p>
                    </div>
                    {/* 3 botones de acción */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => { setAbonoId(isAbonando ? null : c.id); setMontoAbono(''); setEditando(null); setExpandido(null) }}
                        className="p-2 rounded-xl transition-all flex items-center gap-1 text-xs font-semibold"
                        style={{ background: isAbonando ? 'rgba(16,185,129,0.2)' : 'rgba(16,185,129,0.1)', color: '#10B981' }}
                        title="Pagar o abonar">
                        <CreditCard size={15} />
                        {isAbonando ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      </button>
                      <button
                        onClick={() => { setEditando(isEditando ? null : c.id); setNombreForm(c.nombre); setTelefonoForm(c.telefono || ''); setAbonoId(null); setExpandido(null) }}
                        className="p-2 rounded-xl transition-all"
                        style={{ background: isEditando ? 'rgba(37,99,235,0.2)' : 'rgba(37,99,235,0.1)', color: 'var(--primary-light)' }}
                        title="Editar cliente">
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => eliminarCliente(c)}
                        disabled={guardando === 'del-' + c.id}
                        className="p-2 rounded-xl transition-all"
                        style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444' }}
                        title="Eliminar cliente">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  {/* Panel: Abonar/Pagar */}
                  {isAbonando && (
                    <div className="px-4 pb-3 pt-2 flex flex-col gap-2"
                      style={{ borderTop: '1px solid var(--bg-surface3)' }}>
                      <p className="text-xs font-semibold" style={{ color: '#10B981' }}>
                        Pagar / Abonar — Total pendiente: {formatCurrency(c.totalSaldo)}
                      </p>
                      <div className="flex gap-2 items-center">
                        <input type="number" min={1} placeholder="Monto a abonar" value={montoAbono}
                          onChange={e => setMontoAbono(e.target.value)}
                          style={{ flex: 1, fontSize: '0.85rem' }} />
                        <button onClick={() => setMontoAbono(String(c.totalSaldo))}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap"
                          style={{ background: 'rgba(16,185,129,0.15)', color: '#10B981' }}>
                          Pagar todo
                        </button>
                      </div>
                      <button onClick={() => registrarAbono(c)} disabled={guardando === 'abono-' + c.id}
                        className="w-full py-2 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1"
                        style={{ background: '#10B981' }}>
                        <Check size={13} />
                        {guardando === 'abono-' + c.id ? 'Registrando...' : 'Confirmar pago'}
                      </button>
                    </div>
                  )}

                  {/* Panel: Editar cliente */}
                  {isEditando && (
                    <div className="px-4 pb-3 pt-2 flex flex-col gap-2"
                      style={{ borderTop: '1px solid var(--bg-surface3)' }}>
                      <p className="text-xs font-semibold" style={{ color: 'var(--primary-light)' }}>Editar cliente</p>
                      <input type="text" placeholder="Nombre *" value={nombreForm}
                        onChange={e => setNombreForm(e.target.value)} style={{ fontSize: '0.85rem' }} />
                      <input type="tel" placeholder="Teléfono (opcional)" value={telefonoForm}
                        onChange={e => setTelefonoForm(e.target.value)} style={{ fontSize: '0.85rem' }} />
                      <div className="flex gap-2">
                        <button onClick={() => editarCliente(c.id)} disabled={guardando === 'edit-' + c.id}
                          className="flex-1 py-2 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1"
                          style={{ background: 'var(--primary-light)' }}>
                          <Check size={13} />
                          {guardando === 'edit-' + c.id ? 'Guardando...' : 'Guardar cambios'}
                        </button>
                        <button onClick={() => setEditando(null)}
                          className="px-3 py-2 rounded-xl text-xs font-semibold"
                          style={{ background: 'var(--bg-surface3)', color: 'var(--text-muted)' }}>
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Ver detalle fiados */}
                  {!isAbonando && !isEditando && (
                    <button onClick={() => setExpandido(isExpanded ? null : c.id)}
                      className="w-full px-4 py-2 flex items-center justify-between text-xs transition-all"
                      style={{ borderTop: '1px solid var(--bg-surface3)', color: 'var(--text-muted)' }}>
                      <span>{c.fiados.length} fiado{c.fiados.length !== 1 ? 's' : ''} pendiente{c.fiados.length !== 1 ? 's' : ''}</span>
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                  )}

                  {isExpanded && !isAbonando && !isEditando && (
                    <div className="px-4 pb-3 flex flex-col gap-1"
                      style={{ borderTop: '1px solid var(--bg-surface3)' }}>
                      {c.fiados.map(f => (
                        <div key={f.id} className="flex items-start justify-between py-2"
                          style={{ borderBottom: '1px solid var(--bg-surface3)' }}>
                          <div>
                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                              {new Date(f.created_at).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </p>
                            {(f.items as { nombre: string; cantidad: number }[]).map((item, i) => (
                              <p key={i} className="text-xs font-medium" style={{ color: 'var(--text)' }}>
                                {item.cantidad}× {item.nombre}
                              </p>
                            ))}
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-black" style={{ color: '#EF4444' }}>
                              {formatCurrency(f.saldo)}
                            </p>
                            {f.total !== f.saldo && (
                              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>de {formatCurrency(f.total)}</p>
                            )}
                          </div>
                        </div>
                      ))}
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
