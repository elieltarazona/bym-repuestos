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
    const [prodsRes, movsRes] = await Promise.all([
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
    ])

    setProductos((prodsRes.data || []) as Producto[])
    setMovimientos((movsRes.data || []) as Movimiento[])
    setLoading(false)
  }

  async function exportarExcel() {
    try {
      const { utils, writeFile } = await import('xlsx')

      // Hoja 1: Inventario
      const inventarioData = productos.map((p) => ({
        Código: p.codigo,
        Nombre: p.nombre,
        Categoría: (p.categoria as { nombre: string })?.nombre ?? '',
        'Precio Costo': p.precio_costo,
        'Precio Venta': p.precio_venta,
        Stock: p.stock,
        'Stock Mínimo': p.stock_minimo,
        'Valor Total': p.precio_venta * p.stock,
      }))

      // Hoja 2: Movimientos
      const movsData = movimientos.map((m) => ({
        Fecha: formatDateShort(m.created_at),
        Producto: (m.producto as { nombre: string })?.nombre ?? '',
        Código: (m.producto as { codigo: string })?.codigo ?? '',
        Tipo: m.tipo,
        Cantidad: m.cantidad,
        Motivo: m.motivo || '',
      }))

      const wb = utils.book_new()
      utils.book_append_sheet(wb, utils.json_to_sheet(inventarioData), 'Inventario')
      utils.book_append_sheet(wb, utils.json_to_sheet(movsData), 'Movimientos')

      writeFile(wb, `BYM_Reporte_${fechaDesde}_${fechaHasta}.xlsx`)
      toast.success('Excel exportado')
    } catch {
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
                </tr>
              </thead>
              <tbody>
                {movimientos.slice(0, 30).map((m) => (
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
