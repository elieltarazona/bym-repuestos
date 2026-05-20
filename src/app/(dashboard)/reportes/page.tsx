'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useProfile } from '@/lib/profile-context'
import { formatCurrency, formatDateShort } from '@/lib/utils'
import type { Producto, Movimiento } from '@/lib/types'
import {
  BarChart3,
  Download,
  FileText,
  ArrowUpCircle,
  ArrowDownCircle,
  TrendingUp,
} from 'lucide-react'
import toast from 'react-hot-toast'

export default function ReportesPage() {
  const router = useRouter()
  const { esDueno, loading: loadingProfile } = useProfile()
  const [productos, setProductos] = useState<Producto[]>([])
  const [movimientos, setMovimientos] = useState<Movimiento[]>([])
  const [profileMap, setProfileMap] = useState<Record<string, { nombre: string; rol: string }>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!loadingProfile && !esDueno) router.replace('/dashboard')
  }, [esDueno, loadingProfile, router])
  const [fechaDesde, setFechaDesde] = useState(() => {
    const d = new Date()
    d.setDate(1)
    return d.toISOString().split('T')[0]
  })
  const [fechaHasta, setFechaHasta] = useState(() => new Date().toISOString().split('T')[0])

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const [prodsRes, movsRes, profilesRes] = await Promise.all([
      supabase
        .from('productos')
        .select('*, categoria:categorias(nombre)')
        .eq('activo', true)
        .order('nombre'),
      supabase
        .from('movimientos')
        .select('*, producto:productos(nombre, codigo)')
        .gte('created_at', `${fechaDesde}T00:00:00`)
        .lte('created_at', `${fechaHasta}T23:59:59`)
        .order('created_at', { ascending: false }),
      supabase.from('profiles').select('id, nombre, rol'),
    ])

    setProductos((prodsRes.data || []) as Producto[])
    setMovimientos((movsRes.data || []) as Movimiento[])
    const map: Record<string, { nombre: string; rol: string }> = {}
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(profilesRes.data as any[] || []).forEach(p => { map[p.id] = { nombre: p.nombre, rol: p.rol } })
    setProfileMap(map)
    setLoading(false)
  }

  async function exportarExcel() {
    try {
      const { utils, writeFile } = await import('xlsx')

      // Traer datos adicionales del período
      const [ventasRes, fiadosPeriodoRes, abonosRes, fiadosPendRes] = await Promise.all([
        supabase.from('ventas').select('*').gte('created_at', `${fechaDesde}T00:00:00`).lte('created_at', `${fechaHasta}T23:59:59`).order('created_at', { ascending: false }),
        supabase.from('fiados').select('*, cliente:clientes_fiado(nombre, telefono)').gte('created_at', `${fechaDesde}T00:00:00`).lte('created_at', `${fechaHasta}T23:59:59`),
        supabase.from('abonos_fiado').select('*, fiado:fiados(cliente:clientes_fiado(nombre))').gte('created_at', `${fechaDesde}T00:00:00`).lte('created_at', `${fechaHasta}T23:59:59`).order('created_at', { ascending: false }),
        supabase.from('fiados').select('*, cliente:clientes_fiado(nombre, telefono)').eq('estado', 'pendiente').order('created_at', { ascending: false }),
      ])

      const ventas = (ventasRes.data || []) as { id: string; items: { nombre: string; cantidad: number; precio_venta: number }[]; subtotal: number; descuento: number; total: number; medio_pago: string; usuario_id: string; created_at: string }[]
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fiadosPeriodo = (fiadosPeriodoRes.data || []) as any[]
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const abonos = (abonosRes.data || []) as any[]
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fiadosPend = (fiadosPendRes.data || []) as any[]

      // Calcular totales
      const totalVentas = ventas.reduce((a, v) => a + v.total, 0)
      const ventasEfectivo = ventas.filter(v => v.medio_pago === 'efectivo').reduce((a, v) => a + v.total, 0)
      const ventasDigital = totalVentas - ventasEfectivo
      const fiadosNuevos = fiadosPeriodo.reduce((a: number, f: { total: number }) => a + f.total, 0)
      const cobrosTotal = abonos.reduce((a: number, ab: { monto: number }) => a + ab.monto, 0)
      const totalPendiente = fiadosPend.reduce((a: number, f: { saldo: number }) => a + f.saldo, 0)
      const valorCosto = productos.reduce((a, p) => a + p.precio_costo * p.stock, 0)
      const valorVenta = productos.reduce((a, p) => a + p.precio_venta * p.stock, 0)

      const wb = utils.book_new()
      const fmt = (n: number) => `$${n.toLocaleString('es-CO', { minimumFractionDigits: 0 })}`

      // ══════════════════════════════════════
      // HOJA 1: RESUMEN GENERAL
      // ══════════════════════════════════════
      const resumen = [
        ['B&M REPUESTOS Y ACCESORIOS', '', ''],
        [`Reporte período: ${fechaDesde} al ${fechaHasta}`, '', ''],
        ['', '', ''],
        ['══════════ VENTAS DEL PERÍODO ══════════', '', ''],
        ['Concepto', 'Valor', ''],
        ['Ventas en efectivo', fmt(ventasEfectivo), ''],
        ['Ventas digitales (Nequi, Bancolombia, etc.)', fmt(ventasDigital), ''],
        ['TOTAL VENTAS', fmt(totalVentas), `${ventas.length} transacciones`],
        ['', '', ''],
        ['══════════ FIADOS DEL PERÍODO ══════════', '', ''],
        ['Concepto', 'Valor', ''],
        ['Nuevos fiados registrados', fmt(fiadosNuevos), `${fiadosPeriodo.length} clientes`],
        ['Cobros de fiados en el período', fmt(cobrosTotal), `${abonos.length} pagos`],
        ['TOTAL PENDIENTE POR COBRAR (todos)', fmt(totalPendiente), `${fiadosPend.length} fiados activos`],
        ['', '', ''],
        ['══════════ INVENTARIO ACTUAL ══════════', '', ''],
        ['Concepto', 'Valor', ''],
        ['Total productos activos', productos.length.toString(), ''],
        ['Valor de inversión (costo × stock)', fmt(valorCosto), ''],
        ['Valor de venta (precio venta × stock)', fmt(valorVenta), ''],
        ['Ganancia potencial si vende todo', fmt(valorVenta - valorCosto), ''],
        ['', '', ''],
        ['══════════ NETO DEL NEGOCIO ══════════', '', ''],
        ['Concepto', 'Valor', ''],
        ['Ingresos por ventas', fmt(totalVentas), ''],
        ['Ingresos cobrados de fiados', fmt(cobrosTotal), ''],
        ['TOTAL INGRESOS DEL PERÍODO', fmt(totalVentas + cobrosTotal), ''],
      ]
      const wsResumen = utils.aoa_to_sheet(resumen)
      wsResumen['!cols'] = [{ wch: 45 }, { wch: 20 }, { wch: 22 }]
      utils.book_append_sheet(wb, wsResumen, 'RESUMEN')

      // ══════════════════════════════════════
      // HOJA 2: VENTAS DEL PERÍODO
      // ══════════════════════════════════════
      const ventasData = ventas.map(v => ({
        Fecha: formatDateShort(v.created_at),
        'Producto(s)': v.items.map(i => `${i.nombre} x${i.cantidad}`).join(' | '),
        Subtotal: v.subtotal,
        Descuento: v.descuento,
        Total: v.total,
        'Medio de Pago': v.medio_pago,
        'Vendido por': profileMap[v.usuario_id]?.nombre || '—',
        Rol: profileMap[v.usuario_id]?.rol === 'dueño' ? 'Dueño' : 'Empleado',
      }))
      if (ventasData.length > 0) {
        ventasData.push({ Fecha: '', 'Producto(s)': '▶ TOTAL', Subtotal: ventas.reduce((a, v) => a + v.subtotal, 0), Descuento: ventas.reduce((a, v) => a + v.descuento, 0), Total: totalVentas, 'Medio de Pago': '', 'Vendido por': '', Rol: '' })
      }
      const wsVentas = utils.json_to_sheet(ventasData.length > 0 ? ventasData : [{ Nota: 'Sin ventas en el período' }])
      wsVentas['!cols'] = [{ wch: 12 }, { wch: 45 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 16 }, { wch: 18 }, { wch: 10 }]
      utils.book_append_sheet(wb, wsVentas, 'VENTAS')

      // ══════════════════════════════════════
      // HOJA 3: FIADOS PENDIENTES
      // ══════════════════════════════════════
      const fiadosPendData = fiadosPend.map((f: { cliente: { nombre: string; telefono: string }; items: { nombre: string; cantidad: number }[]; total: number; saldo: number; created_at: string }) => ({
        '⚠ ESTADO': 'PENDIENTE',
        Cliente: f.cliente?.nombre || '—',
        Teléfono: f.cliente?.telefono || '—',
        'Producto(s)': f.items.map((i: { nombre: string; cantidad: number }) => `${i.nombre} x${i.cantidad}`).join(' | '),
        'Total Fiado': f.total,
        'Ya Abonado': f.total - f.saldo,
        'Saldo Pendiente': f.saldo,
        'Fecha Fiado': formatDateShort(f.created_at),
      }))
      if (fiadosPendData.length > 0) {
        fiadosPendData.push({ '⚠ ESTADO': '', Cliente: '▶ TOTAL PENDIENTE', Teléfono: '', 'Producto(s)': '', 'Total Fiado': fiadosPend.reduce((a: number, f: { total: number }) => a + f.total, 0), 'Ya Abonado': fiadosPend.reduce((a: number, f: { total: number; saldo: number }) => a + (f.total - f.saldo), 0), 'Saldo Pendiente': totalPendiente, 'Fecha Fiado': '' })
      }
      const wsFiados = utils.json_to_sheet(fiadosPendData.length > 0 ? fiadosPendData : [{ Nota: 'Sin fiados pendientes' }])
      wsFiados['!cols'] = [{ wch: 12 }, { wch: 22 }, { wch: 14 }, { wch: 40 }, { wch: 14 }, { wch: 13 }, { wch: 16 }, { wch: 14 }]
      utils.book_append_sheet(wb, wsFiados, 'FIADOS PENDIENTES')

      // ══════════════════════════════════════
      // HOJA 4: COBROS DE FIADOS
      // ══════════════════════════════════════
      const cobrosData = abonos.map((ab: { created_at: string; fiado: { cliente: { nombre: string } }; monto: number; medio_pago: string; usuario_id: string }) => ({
        Fecha: formatDateShort(ab.created_at),
        Cliente: ab.fiado?.cliente?.nombre || '—',
        'Monto Cobrado': ab.monto,
        'Medio de Pago': ab.medio_pago || '—',
        'Registrado por': profileMap[ab.usuario_id]?.nombre || '—',
        Rol: profileMap[ab.usuario_id]?.rol === 'dueño' ? 'Dueño' : 'Empleado',
      }))
      if (cobrosData.length > 0) {
        cobrosData.push({ Fecha: '', Cliente: '▶ TOTAL COBRADO', 'Monto Cobrado': cobrosTotal, 'Medio de Pago': '', 'Registrado por': '', Rol: '' })
      }
      const wsCobros = utils.json_to_sheet(cobrosData.length > 0 ? cobrosData : [{ Nota: 'Sin cobros en el período' }])
      wsCobros['!cols'] = [{ wch: 12 }, { wch: 22 }, { wch: 16 }, { wch: 16 }, { wch: 18 }, { wch: 10 }]
      utils.book_append_sheet(wb, wsCobros, 'COBROS FIADOS')

      // ══════════════════════════════════════
      // HOJA 5: INVENTARIO COMPLETO
      // ══════════════════════════════════════
      const inventarioData = productos.map(p => ({
        Código: p.codigo,
        Nombre: p.nombre,
        Categoría: (p.categoria as { nombre: string })?.nombre ?? '',
        'Precio Costo': p.precio_costo,
        'Precio Venta': p.precio_venta,
        'Margen %': p.precio_costo > 0 ? Math.round(((p.precio_venta - p.precio_costo) / p.precio_costo) * 100) : 0,
        Stock: p.stock,
        'Stock Mínimo': p.stock_minimo,
        Estado: p.stock === 0 ? 'SIN STOCK' : p.stock <= p.stock_minimo ? 'STOCK BAJO' : 'OK',
        'Valor en Costo': p.precio_costo * p.stock,
        'Valor en Venta': p.precio_venta * p.stock,
      }))
      inventarioData.push({ Código: '', Nombre: '▶ TOTALES', Categoría: '', 'Precio Costo': 0, 'Precio Venta': 0, 'Margen %': 0, Stock: productos.reduce((a, p) => a + p.stock, 0), 'Stock Mínimo': 0, Estado: '', 'Valor en Costo': valorCosto, 'Valor en Venta': valorVenta })
      const wsInv = utils.json_to_sheet(inventarioData)
      wsInv['!cols'] = [{ wch: 12 }, { wch: 30 }, { wch: 15 }, { wch: 13 }, { wch: 13 }, { wch: 10 }, { wch: 8 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 14 }]
      utils.book_append_sheet(wb, wsInv, 'INVENTARIO')

      // ══════════════════════════════════════
      // HOJA 6: MOVIMIENTOS
      // ══════════════════════════════════════
      const movsData = movimientos.map(m => ({
        Fecha: formatDateShort(m.created_at),
        Producto: (m.producto as { nombre: string })?.nombre ?? '',
        Código: (m.producto as { codigo: string })?.codigo ?? '',
        Tipo: m.tipo.toUpperCase(),
        Cantidad: m.tipo === 'entrada' ? `+${m.cantidad}` : `-${m.cantidad}`,
        Motivo: m.motivo || '',
        'Registrado por': profileMap[m.usuario_id]?.nombre || '—',
        Rol: profileMap[m.usuario_id]?.rol === 'dueño' ? 'Dueño' : 'Empleado',
      }))
      const wsMovs = utils.json_to_sheet(movsData.length > 0 ? movsData : [{ Nota: 'Sin movimientos en el período' }])
      wsMovs['!cols'] = [{ wch: 12 }, { wch: 30 }, { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 28 }, { wch: 18 }, { wch: 10 }]
      utils.book_append_sheet(wb, wsMovs, 'MOVIMIENTOS')

      writeFile(wb, `BYM_Reporte_${fechaDesde}_${fechaHasta}.xlsx`)
      toast.success('Excel exportado correctamente')
    } catch (err) {
      console.error(err)
      toast.error('Error exportando Excel')
    }
  }

  async function exportarPDF() {
    try {
      const { jsPDF } = await import('jspdf')
      const doc = new jsPDF()

      doc.setFontSize(18)
      doc.setTextColor(30, 58, 138)
      doc.text('B&M Repuestos y Accesorios', 20, 20)

      doc.setFontSize(11)
      doc.setTextColor(100, 100, 100)
      doc.text(`Reporte de inventario — ${fechaDesde} al ${fechaHasta}`, 20, 30)

      doc.setFontSize(12)
      doc.setTextColor(0, 0, 0)
      doc.text('Resumen de inventario', 20, 45)

      const headers = ['Código', 'Nombre', 'Stock', 'Venta', 'Valor']
      let y = 55
      const colWidths = [30, 70, 20, 30, 30]
      const startX = 20

      doc.setFontSize(9)
      doc.setFillColor(30, 58, 138)
      doc.setTextColor(255, 255, 255)
      doc.rect(startX, y - 5, 180, 8, 'F')
      headers.forEach((h, i) => {
        doc.text(h, startX + colWidths.slice(0, i).reduce((a, b) => a + b, 0), y)
      })

      doc.setTextColor(0, 0, 0)
      doc.setFontSize(8)
      y += 8

      productos.slice(0, 40).forEach((p) => {
        if (y > 270) {
          doc.addPage()
          y = 20
        }
        const row = [
          p.codigo,
          p.nombre.substring(0, 35),
          p.stock.toString(),
          `S/.${p.precio_venta.toFixed(2)}`,
          `S/.${(p.precio_venta * p.stock).toFixed(2)}`,
        ]
        row.forEach((cell, i) => {
          doc.text(cell, startX + colWidths.slice(0, i).reduce((a, b) => a + b, 0), y)
        })
        y += 7
      })

      const totalValor = productos.reduce((acc, p) => acc + p.precio_venta * p.stock, 0)
      y += 5
      doc.setFontSize(10)
      doc.setFont(undefined as unknown as string, 'bold')
      doc.text(`Valor total inventario: ${formatCurrency(totalValor)}`, 20, y)

      doc.save(`BYM_Inventario_${fechaDesde}.pdf`)
      toast.success('PDF exportado')
    } catch {
      toast.error('Error exportando PDF')
    }
  }

  const totalEntradas = movimientos.filter((m) => m.tipo === 'entrada').reduce((a, m) => a + m.cantidad, 0)
  const totalSalidas = movimientos.filter((m) => m.tipo === 'salida').reduce((a, m) => a + m.cantidad, 0)
  const valorInventario = productos.reduce((a, p) => a + p.precio_venta * p.stock, 0)

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div
          className="h-8 w-8 rounded-full border-4 animate-spin"
          style={{ borderColor: 'var(--primary-light)', borderTopColor: 'transparent' }}
        />
      </div>
    )
  }

  return (
    <div className="fade-in">
      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-page)' }}>Reportes</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
            Exporta y analiza tu inventario
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={exportarExcel}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={{ background: 'rgba(16,185,129,0.15)', color: '#10B981', border: '1px solid rgba(16,185,129,0.3)' }}
          >
            <Download size={15} />
            Excel
          </button>
          <button
            onClick={exportarPDF}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={{ background: 'rgba(239,68,68,0.15)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.3)' }}
          >
            <FileText size={15} />
            PDF
          </button>
        </div>
      </div>

      {/* Filtro de fechas */}
      <div
        className="flex flex-wrap items-center gap-4 p-4 rounded-2xl mb-6"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-surface2)' }}
      >
        <span className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>Período:</span>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={fechaDesde}
            onChange={(e) => setFechaDesde(e.target.value)}
            style={{ width: 'auto' }}
          />
          <span style={{ color: 'var(--text-muted)' }}>→</span>
          <input
            type="date"
            value={fechaHasta}
            onChange={(e) => setFechaHasta(e.target.value)}
            style={{ width: 'auto' }}
          />
        </div>
        <button
          onClick={loadData}
          className="px-4 py-2 rounded-xl text-sm font-semibold"
          style={{ background: 'var(--primary)', color: 'white' }}
        >
          Aplicar
        </button>
      </div>

      {/* Stats del período */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Valor inventario', value: formatCurrency(valorInventario), icon: BarChart3, color: '#2563EB', bg: 'rgba(37,99,235,0.12)' },
          { label: 'Entradas período', value: totalEntradas.toString() + ' uds', icon: ArrowUpCircle, color: '#10B981', bg: 'rgba(16,185,129,0.12)' },
          { label: 'Salidas período', value: totalSalidas.toString() + ' uds', icon: ArrowDownCircle, color: '#EF4444', bg: 'rgba(239,68,68,0.12)' },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-2xl p-5"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-surface2)' }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
                <p className="text-xl font-bold" style={{ color: 'var(--text)' }}>{s.value}</p>
              </div>
              <div className="p-2.5 rounded-xl" style={{ background: s.bg }}>
                <s.icon size={20} style={{ color: s.color }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Top productos más movidos */}
      <div
        className="rounded-2xl p-6 mb-6"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-surface2)' }}
      >
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={16} style={{ color: 'var(--accent)' }} />
          <h2 className="font-semibold text-sm" style={{ color: 'var(--text)' }}>
            Movimientos del período ({movimientos.length} registros)
          </h2>
        </div>

        {movimientos.length === 0 ? (
          <p className="text-sm text-center py-8" style={{ color: 'var(--text-muted)' }}>
            Sin movimientos en el período seleccionado
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Producto</th>
                  <th>Tipo</th>
                  <th>Cantidad</th>
                  <th>Motivo</th>
                  <th>Registrado por</th>
                </tr>
              </thead>
              <tbody>
                {movimientos.slice(0, 30).map((m) => {
                  const prof = profileMap[m.usuario_id]
                  const isDueno = prof?.rol === 'dueño'
                  return (
                  <tr key={m.id}>
                    <td style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {formatDateShort(m.created_at)}
                    </td>
                    <td>
                      <p className="font-medium text-sm" style={{ color: 'var(--text)' }}>
                        {(m.producto as { nombre: string })?.nombre ?? '—'}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {(m.producto as { codigo: string })?.codigo ?? ''}
                      </p>
                    </td>
                    <td>
                      <span
                        className="text-xs font-bold px-2.5 py-1 rounded-full"
                        style={{
                          background: m.tipo === 'entrada' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                          color: m.tipo === 'entrada' ? '#10B981' : '#EF4444',
                        }}
                      >
                        {m.tipo}
                      </span>
                    </td>
                    <td className="font-bold" style={{ color: m.tipo === 'entrada' ? '#10B981' : '#EF4444' }}>
                      {m.tipo === 'entrada' ? '+' : '-'}{m.cantidad}
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>{m.motivo || '—'}</td>
                    <td>
                      {prof ? (
                        <div className="flex flex-col gap-0.5">
                          <p className="text-xs font-semibold" style={{ color: 'var(--text)' }}>
                            {prof.nombre?.split(' ')[0]}
                          </p>
                          <span className="text-xs font-bold px-1.5 py-0.5 rounded-full w-fit"
                            style={{
                              background: isDueno ? 'rgba(245,158,11,0.15)' : 'rgba(37,99,235,0.15)',
                              color: isDueno ? '#F59E0B' : '#3B82F6',
                            }}>
                            {isDueno ? '👑 Dueño' : '👤 Empleado'}
                          </span>
                        </div>
                      ) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                    </td>
                  </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
