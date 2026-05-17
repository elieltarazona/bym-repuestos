'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { formatDate } from '@/lib/utils'
import type { Movimiento, Producto, TipoMovimiento } from '@/lib/types'
import Scanner from '@/components/Scanner'
import { QrCode, ArrowUpCircle, ArrowDownCircle, Search, Package, ChevronDown } from 'lucide-react'
import toast from 'react-hot-toast'

export default function MovimientosPage() {
  const [movimientos, setMovimientos] = useState<Movimiento[]>([])
  const [productos, setProductos] = useState<Producto[]>([])
  const [loading, setLoading] = useState(true)
  const [showScanner, setShowScanner] = useState(false)

  // Formulario
  const [tipo, setTipo] = useState<TipoMovimiento>('entrada')
  const [cantidad, setCantidad] = useState(1)
  const [motivo, setMotivo] = useState('')
  const [guardando, setGuardando] = useState(false)

  // Selección de producto
  const [busqueda, setBusqueda] = useState('')
  const [productoSeleccionado, setProductoSeleccionado] = useState<Producto | null>(null)
  const [showDropdown, setShowDropdown] = useState(false)

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    const [prodsRes, movsRes] = await Promise.all([
      supabase.from('productos').select('*').eq('activo', true).order('nombre'),
      supabase.from('movimientos')
        .select('*, producto:productos(nombre, codigo)')
        .order('created_at', { ascending: false })
        .limit(50),
    ])
    setProductos((prodsRes.data || []) as Producto[])
    setMovimientos((movsRes.data || []) as Movimiento[])
    setLoading(false)
  }

  const productosFiltrados = busqueda.length > 0
    ? productos.filter(p =>
        p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        p.codigo.toLowerCase().includes(busqueda.toLowerCase())
      )
    : productos

  function seleccionarProducto(p: Producto) {
    setProductoSeleccionado(p)
    setBusqueda(p.nombre)
    setShowDropdown(false)
  }

  const buscarPorCodigo = useCallback((codigo: string) => {
    const encontrado = productos.find(
      p => p.codigo === codigo || p.codigo_barras === codigo
    )
    if (encontrado) {
      seleccionarProducto(encontrado)
      toast.success(`Producto: ${encontrado.nombre}`)
    } else {
      toast.error('Producto no encontrado — revisa el código')
    }
  }, [productos])

  function handleScan(code: string) {
    setShowScanner(false)
    buscarPorCodigo(code.trim())
  }

  async function registrarMovimiento() {
    if (!productoSeleccionado) {
      toast.error('Selecciona un producto primero')
      return
    }
    if (tipo === 'salida' && cantidad > productoSeleccionado.stock) {
      toast.error(`Stock insuficiente. Disponible: ${productoSeleccionado.stock} uds`)
      return
    }

    setGuardando(true)
    const { data: { user } } = await supabase.auth.getUser()

    const { error } = await supabase.from('movimientos').insert({
      producto_id: productoSeleccionado.id,
      tipo,
      cantidad,
      motivo: motivo.trim() || null,
      usuario_id: user?.id,
    })

    if (error) {
      toast.error(`Error: ${error.message}`)
    } else {
      toast.success(`${tipo === 'entrada' ? '✅ Entrada' : '📤 Salida'} registrada — ${cantidad} uds de ${productoSeleccionado.nombre}`)
      setProductoSeleccionado(null)
      setBusqueda('')
      setCantidad(1)
      setMotivo('')
      loadAll()
    }
    setGuardando(false)
  }

  return (
    <div className="fade-in">
      {showScanner && <Scanner onScan={handleScan} onClose={() => setShowScanner(false)} />}

      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-page)' }}>Movimientos</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
          Registra entradas y salidas del inventario
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {/* Panel de registro */}
        <div className="rounded-2xl p-6"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-surface2)' }}>
          <h2 className="font-semibold text-sm mb-5" style={{ color: 'var(--text)' }}>
            Registrar movimiento
          </h2>

          {/* Tipo */}
          <div className="flex gap-2 mb-5">
            {(['entrada', 'salida'] as TipoMovimiento[]).map(t => (
              <button key={t} onClick={() => setTipo(t)}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all"
                style={{
                  background: tipo === t
                    ? t === 'entrada' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'
                    : 'var(--bg-surface2)',
                  color: tipo === t
                    ? t === 'entrada' ? '#10B981' : '#EF4444'
                    : 'var(--text-muted)',
                  border: tipo === t
                    ? `1.5px solid ${t === 'entrada' ? '#10B981' : '#EF4444'}`
                    : '1.5px solid transparent',
                }}>
                {t === 'entrada'
                  ? <ArrowUpCircle size={16} />
                  : <ArrowDownCircle size={16} />}
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          {/* Buscar producto — por nombre o código */}
          <div className="mb-4">
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>
              Buscar producto (nombre o código)
            </label>
            <div className="relative">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2"
                    style={{ color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    placeholder="Escribe nombre o código..."
                    value={busqueda}
                    onChange={e => {
                      setBusqueda(e.target.value)
                      setShowDropdown(true)
                      if (!e.target.value) setProductoSeleccionado(null)
                    }}
                    onFocus={() => setShowDropdown(true)}
                    onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
                    style={{ paddingLeft: '2rem' }}
                  />
                </div>
                <button onClick={() => setShowScanner(true)}
                  className="px-3 rounded-xl"
                  style={{ background: 'rgba(37,99,235,0.15)', color: 'var(--primary-light)' }}
                  title="Escanear QR / código de barras">
                  <QrCode size={17} />
                </button>
              </div>

              {/* Dropdown resultados */}
              {showDropdown && productosFiltrados.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 rounded-xl overflow-hidden z-20 max-h-52 overflow-y-auto"
                  style={{ background: 'var(--bg-surface2)', border: '1px solid var(--bg-surface3)', boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
                  {productosFiltrados.slice(0, 8).map(p => (
                    <button key={p.id} onMouseDown={() => seleccionarProducto(p)}
                      className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-opacity-80 transition-colors"
                      style={{ borderBottom: '1px solid var(--bg-surface3)' }}>
                      <div>
                        <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>{p.nombre}</p>
                        <p className="text-xs font-mono" style={{ color: 'var(--accent)' }}>{p.codigo}</p>
                      </div>
                      <span className="text-xs font-bold ml-3 px-2 py-0.5 rounded-full flex-shrink-0"
                        style={{
                          background: p.stock === 0 ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)',
                          color: p.stock === 0 ? '#EF4444' : '#10B981',
                        }}>
                        {p.stock} uds
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Producto seleccionado */}
          {productoSeleccionado && (
            <div className="flex items-center justify-between p-3 rounded-xl mb-4"
              style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)' }}>
              <div className="flex items-center gap-2">
                <Package size={16} color="#10B981" />
                <div>
                  <p className="text-sm font-semibold" style={{ color: '#10B981' }}>
                    {productoSeleccionado.nombre}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    Stock actual: <strong>{productoSeleccionado.stock}</strong> uds · {productoSeleccionado.codigo}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Cantidad */}
          <div className="mb-4">
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>
              Cantidad
            </label>
            <div className="flex items-center gap-3">
              <button onClick={() => setCantidad(c => Math.max(1, c - 1))}
                className="w-10 h-10 rounded-xl font-bold text-lg flex items-center justify-center"
                style={{ background: 'var(--bg-surface2)', color: 'var(--text)' }}>−</button>
              <input type="number" min={1} value={cantidad}
                onChange={e => setCantidad(Math.max(1, parseInt(e.target.value) || 1))}
                style={{ width: '80px', textAlign: 'center', fontWeight: 700, fontSize: '1.1rem' }} />
              <button onClick={() => setCantidad(c => c + 1)}
                className="w-10 h-10 rounded-xl font-bold text-lg flex items-center justify-center"
                style={{ background: 'rgba(37,99,235,0.15)', color: 'var(--primary-light)' }}>+</button>
            </div>
          </div>

          {/* Motivo */}
          <div className="mb-5">
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>
              Motivo (opcional)
            </label>
            <input type="text"
              placeholder="Ej: Compra proveedor, devolución, daño..."
              value={motivo}
              onChange={e => setMotivo(e.target.value)} />
          </div>

          {/* Botón registrar */}
          <button onClick={registrarMovimiento}
            disabled={!productoSeleccionado || guardando}
            className="w-full py-3.5 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all disabled:opacity-40"
            style={{
              background: tipo === 'entrada'
                ? 'linear-gradient(135deg, #065F46 0%, #10B981 100%)'
                : 'linear-gradient(135deg, #7F1D1D 0%, #EF4444 100%)',
            }}>
            {tipo === 'entrada' ? <ArrowUpCircle size={18} /> : <ArrowDownCircle size={18} />}
            {guardando ? 'Registrando...' : `Registrar ${tipo}`}
          </button>
        </div>

        {/* Historial */}
        <div className="rounded-2xl p-6"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-surface2)' }}>
          <h2 className="font-semibold text-sm mb-5" style={{ color: 'var(--text)' }}>
            Historial reciente
          </h2>

          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="h-6 w-6 rounded-full border-4 animate-spin"
                style={{ borderColor: 'var(--primary-light)', borderTopColor: 'transparent' }} />
            </div>
          ) : movimientos.length === 0 ? (
            <p className="text-center text-sm py-12" style={{ color: 'var(--text-muted)' }}>
              Sin movimientos registrados
            </p>
          ) : (
            <div className="flex flex-col gap-2 overflow-y-auto max-h-[420px]">
              {movimientos.map(mov => (
                <div key={mov.id} className="flex items-center justify-between py-2.5 px-3 rounded-xl"
                  style={{ background: 'var(--bg-surface2)' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{
                        background: mov.tipo === 'entrada'
                          ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                      }}>
                      {mov.tipo === 'entrada'
                        ? <ArrowUpCircle size={14} color="#10B981" />
                        : <ArrowDownCircle size={14} color="#EF4444" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium leading-tight" style={{ color: 'var(--text)' }}>
                        {(mov.producto as { nombre: string })?.nombre ?? '—'}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {formatDate(mov.created_at)}
                        {mov.motivo ? ` · ${mov.motivo}` : ''}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-bold flex-shrink-0"
                    style={{ color: mov.tipo === 'entrada' ? '#10B981' : '#EF4444' }}>
                    {mov.tipo === 'entrada' ? '+' : '-'}{mov.cantidad}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
