'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { generateCodigo } from '@/lib/utils'
import type { Categoria, Proveedor } from '@/lib/types'
import { ArrowLeft, RefreshCw, Upload, ChevronDown } from 'lucide-react'
import { useProfile } from '@/lib/profile-context'
import Link from 'next/link'
import toast from 'react-hot-toast'

// Lista completa de productos de moto usados en Colombia
const SUGERENCIAS_PRODUCTOS = [
  // ── ACEITES ──
  'Aceite Motor 4T 10W-40', 'Aceite Motor 4T 20W-50', 'Aceite Motor 4T 15W-50',
  'Aceite Motor 2T', 'Aceite Motor Sintético 10W-40', 'Aceite Motor Semi-sintético 10W-40',
  'Aceite de Caja', 'Aceite de Horquilla SAE 10', 'Aceite de Horquilla SAE 15',
  'Aceite de Horquilla SAE 20', 'Aceite Transmisión 80W-90',

  // ── FILTROS ──
  'Filtro de Aceite', 'Filtro de Aire', 'Filtro de Gasolina', 'Filtro de Combustible',
  'Filtro de Aire Espuma', 'Filtro de Aire Papel', 'Filtro de Aire Doble Efecto',
  'Filtro de Paso de Gasolina',

  // ── FRENOS ──
  'Pastillas de Freno Delanteras', 'Pastillas de Freno Traseras',
  'Disco de Freno Delantero', 'Disco de Freno Trasero',
  'Zapatas de Freno Delanteras', 'Zapatas de Freno Traseras',
  'Líquido de Frenos DOT3', 'Líquido de Frenos DOT4', 'Líquido de Frenos DOT5',
  'Cable de Freno Delantero', 'Cable de Freno Trasero',
  'Palanca de Freno Delantera', 'Palanca de Freno Trasera',
  'Bomba de Freno Delantera', 'Bomba de Freno Trasera',
  'Manguera de Freno', 'Perno de Rueda Delantera', 'Perno de Rueda Trasera',
  'Mordaza de Freno Delantera', 'Mordaza de Freno Trasera',
  'Sello de Bomba de Freno', 'Kit de Reparación Mordaza',

  // ── TRANSMISIÓN / ARRASTRE ──
  'Kit de Arrastre (Cadena + Piñón + Corona)', 'Cadena 420', 'Cadena 428', 'Cadena 520', 'Cadena 530',
  'Piñón Delantero Z13', 'Piñón Delantero Z14', 'Piñón Delantero Z15', 'Piñón Delantero Z16',
  'Corona / Piñón Trasero Z36', 'Corona / Piñón Trasero Z37', 'Corona / Piñón Trasero Z38',
  'Corona / Piñón Trasero Z40', 'Corona / Piñón Trasero Z41', 'Corona / Piñón Trasero Z42',
  'Guaya de Acelerador', 'Guaya de Embrague', 'Guaya de Velocímetro', 'Guaya de Freno',
  'Plato de Embrague', 'Disco de Embrague', 'Resorte de Embrague',
  'Kit de Embrague Completo', 'Muñeca de Embrague', 'Caja de Embrague',

  // ── LLANTAS ──
  'Llanta Delantera 80/100-18', 'Llanta Delantera 90/80-17', 'Llanta Delantera 70/90-17',
  'Llanta Delantera 60/100-17', 'Llanta Delantera 100/80-17',
  'Llanta Trasera 110/90-17', 'Llanta Trasera 120/80-17', 'Llanta Trasera 130/70-17',
  'Llanta Trasera 140/70-17', 'Llanta Trasera 100/90-18',
  'Rin Delantero', 'Rin Trasero', 'Rayos de Rueda', 'Buje Delantero', 'Buje Trasero',
  'Cámara Delantera', 'Cámara Trasera', 'Válvula de Cámara',

  // ── ELÉCTRICO / ILUMINACIÓN ──
  'Batería 12V 5Ah', 'Batería 12V 7Ah', 'Batería 12V 9Ah', 'Batería 12V 12Ah',
  'Bujía', 'Bujía Iridium', 'Bujía Platino', 'Bujía NGK CR7HSA', 'Bujía NGK CPR8EA-9',
  'Farola Delantera Completa', 'Faro Delantero LED', 'Faro Delantero Halógeno',
  'Faro Trasero / Stop', 'Stop Trasero LED', 'Stop Trasero Completo',
  'Direccional Delantera Izquierda', 'Direccional Delantera Derecha',
  'Direccional Trasera Izquierda', 'Direccional Trasera Derecha',
  'Bombillo H4 35/35W', 'Bombillo H4 60/55W', 'Bombillo T10 Posición',
  'Bombillo BA9S', 'Bombillo BA15S 21W', 'Bombillo BA15S 10W',
  'Bombillo Stop 1157', 'Foco LED H4', 'Kit LED H4',
  'Relay de Arranque', 'Relay de Luces', 'Relay de Direccionales',
  'Fusible 5A', 'Fusible 7.5A', 'Fusible 10A', 'Fusible 15A', 'Fusible 20A', 'Fusible 25A', 'Fusible 30A',
  'Porta Fusible', 'Caja de Fusibles',
  'Bobina de Encendido', 'Regulador Rectificador', 'CDI Analógico', 'CDI Digital',
  'Estator / Generador', 'Rotor', 'Pick Up / Captador',
  'Interruptor de Luces', 'Interruptor de Arranque', 'Interruptor de Freno',
  'Claxon / Pito', 'Velocímetro', 'Tacómetro', 'Tablero de Instrumentos',
  'Arnés / Mazo de Cables', 'Conector Eléctrico', 'Terminal Eléctrico',
  'Sensor de Temperatura', 'Sensor de Oxígeno', 'Sensor TPS', 'Sensor MAP',
  'Motor de Arranque', 'Bendix de Arranque', 'Solenoide de Arranque',

  // ── SUSPENSIÓN ──
  'Amortiguador Trasero', 'Amortiguador Trasero Par',
  'Amortiguador Delantero Izquierdo', 'Amortiguador Delantero Derecho',
  'Horquilla Delantera Completa', 'Tubo de Horquilla',
  'Retén de Horquilla', 'Sello de Horquilla',
  'Resorte de Amortiguador', 'Rótula de Dirección',
  'Rodamiento de Dirección', 'Cono de Dirección', 'Kit de Dirección',
  'Guardapolvo de Horquilla', 'Buje de Amortiguador',

  // ── CARBURACIÓN / INYECCIÓN ──
  'Carburador Completo', 'Kit de Reparación Carburador',
  'Aguja de Carburador', 'Flotador de Carburador',
  'Surtidor / Jet Principal', 'Surtidor Lento / Piloto',
  'Diafragma de Carburador', 'Tapa de Carburador',
  'Filtro de Paso', 'Llave de Paso de Gasolina',
  'Inyector de Combustible', 'Bomba de Gasolina', 'Regulador de Presión',
  'Cuerpo de Aceleración', 'Mariposa de Aceleración',

  // ── MOTOR INTERNO ──
  'Cilindro Completo', 'Culata Completa', 'Tapa de Culata',
  'Kit de Pistón', 'Pistón STD', 'Pistón 0.25mm', 'Pistón 0.50mm', 'Pistón 0.75mm',
  'Aro de Pistón STD', 'Aro de Pistón 0.25mm', 'Aro de Pistón 0.50mm',
  'Perno de Pistón', 'Seguro de Perno de Pistón',
  'Biela Completa', 'Cojinete de Biela', 'Pie de Biela',
  'Cigüeñal', 'Cojinete Principal', 'Sello de Cigüeñal',
  'Árbol de Levas', 'Cadena de Distribución', 'Banda de Tiempo',
  'Tensor de Cadena', 'Guía de Cadena', 'Piñón de Distribución',
  'Válvula de Admisión', 'Válvula de Escape',
  'Resorte de Válvula', 'Reten de Válvula', 'Guía de Válvula',
  'Taquete / Empujador', 'Balancín', 'Eje de Balancín',
  'Empaque de Culata', 'Empaque de Motor Completo',
  'Empaque de Tapa Válvulas', 'Empaque de Escape', 'Empaque de Admisión',
  'Tapa de Motor', 'Tapa de Encendido', 'Tapa de Embrague',
  'Bomba de Aceite', 'Colador de Aceite', 'Tapón de Aceite',
  'Termostato', 'Bomba de Agua', 'Radiador', 'Manguera de Radiador',
  'Ventilador de Radiador',

  // ── ESCAPE ──
  'Exosto Completo', 'Silenciador', 'Tubo de Escape', 'Colector de Escape',
  'Abrazadera de Escape', 'Empaque Colector de Escape',

  // ── CARROCERÍA EXTERNA ──
  'Guardabarro Delantero', 'Guardabarro Trasero',
  'Farola Delantera', 'Careta Delantera', 'Máscara Delantera',
  'Faro Trasero Completo', 'Cubierta Trasera',
  'Tanque de Gasolina', 'Tapón de Tanque', 'Llave de Tanque',
  'Sillín / Asiento', 'Base de Sillín',
  'Espejo Retrovisor Izquierdo', 'Espejo Retrovisor Derecho', 'Espejos Par',
  'Direccional Completa Delantera Izquierda', 'Direccional Completa Delantera Derecha',
  'Direccional Completa Trasera Izquierda', 'Direccional Completa Trasera Derecha',
  'Cubre Motor', 'Protector de Motor', 'Barras de Protección',
  'Tapa Lateral Izquierda', 'Tapa Lateral Derecha',
  'Carenado Completo', 'Pechera', 'Cubierta Superior',
  'Manubrio Completo', 'Semibarra Izquierda', 'Semibarra Derecha',
  'Puño Izquierdo', 'Puño Derecho', 'Puños Par',
  'Palanca de Freno Delantera', 'Palanca de Embrague',
  'Reposa Pie Delantero Izquierdo', 'Reposa Pie Delantero Derecho',
  'Reposa Pie Trasero Izquierdo', 'Reposa Pie Trasero Derecho',
  'Porta Equipaje', 'Parrilla Trasera', 'Baúl / Maleta',
  'Caballete Central', 'Caballete Lateral', 'Resorte de Caballete',
  'Placa Porta Documentos', 'Marco de Placa',

  // ── REFRIGERANTE Y FLUIDOS ──
  'Refrigerante / Anticongelante', 'Líquido Refrigerante Rojo', 'Líquido Refrigerante Verde',

  // ── ADITIVOS Y MANTENIMIENTO ──
  'Aditivo para Combustible', 'Aditivo para Aceite', 'Limpiador de Inyectores',
  'Limpiador de Carburador', 'Limpiador de Cadena', 'Lubricante de Cadena',
  'Grasa Multiusos', 'Grasa de Litio', 'Grasa de Molibdeno',
  'Limpiador Multiusos', 'Cera para Moto', 'Silicona Líquida',
  'Desengrasante', 'Limpiador de Frenos', 'Aceite en Spray WD-40',
  'Loctite Azul', 'Loctite Rojo', 'Silicona RTV',

  // ── TORNILLOS PARA MOTO ──
  'Tornillo Allen M5x10mm', 'Tornillo Allen M5x12mm', 'Tornillo Allen M5x16mm', 'Tornillo Allen M5x20mm',
  'Tornillo Allen M6x10mm', 'Tornillo Allen M6x12mm', 'Tornillo Allen M6x16mm', 'Tornillo Allen M6x20mm', 'Tornillo Allen M6x25mm',
  'Tornillo Allen M8x16mm', 'Tornillo Allen M8x20mm', 'Tornillo Allen M8x25mm', 'Tornillo Allen M8x30mm',
  'Tornillo Allen M10x20mm', 'Tornillo Allen M10x25mm', 'Tornillo Allen M10x30mm',
  'Tornillo Allen M12x25mm', 'Tornillo Allen M12x30mm', 'Tornillo Allen M12x40mm',
  'Tornillo Hexagonal M6x20mm', 'Tornillo Hexagonal M6x25mm', 'Tornillo Hexagonal M6x30mm',
  'Tornillo Hexagonal M8x20mm', 'Tornillo Hexagonal M8x25mm', 'Tornillo Hexagonal M8x30mm', 'Tornillo Hexagonal M8x35mm',
  'Tornillo Hexagonal M10x25mm', 'Tornillo Hexagonal M10x30mm', 'Tornillo Hexagonal M10x40mm',
  'Tornillo Hexagonal M12x30mm', 'Tornillo Hexagonal M12x40mm', 'Tornillo Hexagonal M12x50mm',
  'Tornillo Hexagonal M14x40mm', 'Tornillo Hexagonal M14x50mm',
  'Tornillo de Culata M6', 'Tornillo de Culata M8', 'Tornillo de Culata M10',
  'Espárrago de Culata M6', 'Espárrago de Culata M8',
  'Tornillo de Tapa Válvulas', 'Tornillo de Tapa de Motor',
  'Tornillo de Escape M8', 'Tornillo de Escape M10',
  'Tornillo de Carburador M5', 'Tornillo de Carburador M6',
  'Tornillo de Freno M6', 'Tornillo de Freno M8',
  'Tornillo de Disco de Freno M8', 'Tornillo de Mordaza M8',
  'Perno de Rueda Delantera M12', 'Perno de Rueda Trasera M14',
  'Perno de Rueda Delantera M10', 'Perno de Amortiguador M10', 'Perno de Amortiguador M12',
  'Tuerca M5', 'Tuerca M6', 'Tuerca M8', 'Tuerca M10', 'Tuerca M12', 'Tuerca M14',
  'Tuerca Autoblocante M6', 'Tuerca Autoblocante M8', 'Tuerca Autoblocante M10',
  'Tuerca Autoblocante M12', 'Tuerca Corona M10', 'Tuerca Corona M12',

  // ── ARANDELAS PARA MOTO ──
  'Arandela Plana M5', 'Arandela Plana M6', 'Arandela Plana M8',
  'Arandela Plana M10', 'Arandela Plana M12', 'Arandela Plana M14',
  'Arandela de Presión M5', 'Arandela de Presión M6', 'Arandela de Presión M8',
  'Arandela de Presión M10', 'Arandela de Presión M12',
  'Arandela Cobre Tapón Aceite', 'Arandela Aluminio Tapón Aceite',
  'Arandela de Sellado M10', 'Arandela de Sellado M12',
  'Arandela Dentada M6', 'Arandela Dentada M8', 'Arandela Dentada M10',
  'Arandela Gruesa M8', 'Arandela Gruesa M10', 'Arandela Gruesa M12',

  // ── RODAMIENTOS / RETENES ──
  'Rodamiento 6200', 'Rodamiento 6201', 'Rodamiento 6202', 'Rodamiento 6203',
  'Rodamiento 6204', 'Rodamiento 6205', 'Rodamiento 6206', 'Rodamiento 6301',
  'Rodamiento 6302', 'Rodamiento 6303', 'Rodamiento 6304',
  'Rodamiento de Rueda Delantera', 'Rodamiento de Rueda Trasera',
  'Reten de Aceite Motor', 'Retén de Cigüeñal Delantero', 'Retén de Cigüeñal Trasero',
  'Retén de Horquilla 33mm', 'Retén de Horquilla 35mm', 'Retén de Horquilla 38mm',
  'Retén de Rueda Delantera', 'Retén de Rueda Trasera',

  // ── ACCESORIOS ──
  'Casco Integral', 'Casco Abierto', 'Casco Modular', 'Casco Cross / Enduro',
  'Guantes de Moto', 'Chaqueta de Moto', 'Rodilleras', 'Coderas',
  'Candado de Disco', 'Candado de Manubrio', 'Alarma para Moto',
  'Cargador USB Moto', 'Soporte Celular Moto', 'Maleta Lateral', 'Maletero Trasero',
  'Correa de Amarre', 'Cubierta para Moto', 'Funda para Moto',

  // ── MARCAS COMUNES COLOMBIA ──
  'Mobil Super 1000 10W-40', 'Mobil Super 3000 10W-40', 'Mobil Super 2000 20W-50',
  'Castrol 4T 20W-50', 'Castrol GTX 10W-40', 'Shell Advance 4T 20W-50',
  'Repsol Moto 4T 20W-50', 'Motul 7100 4T 10W-40', 'Valvoline 4T 20W-50',
  'NGK Bujía CR7HSA', 'NGK Bujía CPR8EA-9', 'Denso Bujía',
]

export default function NuevoProductoPage() {
  const router = useRouter()
  const { esDueno } = useProfile()
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [sugerencias, setSugerencias] = useState<string[]>([])
  const [showSugerencias, setShowSugerencias] = useState(false)
  const nombreRef = useRef<HTMLDivElement>(null)

  const [form, setForm] = useState({
    nombre: '', descripcion: '', codigo: generateCodigo(), codigo_barras: '',
    precio_costo: '', precio_venta: '', stock: '', stock_minimo: '5',
    categoria_id: '', proveedor_id: '', foto_url: '',
  })

  useEffect(() => {
    Promise.all([
      supabase.from('categorias').select('*').order('nombre'),
      supabase.from('proveedores').select('*').order('nombre'),
    ]).then(([cats, provs]) => {
      setCategorias(cats.data || [])
      setProveedores(provs.data || [])
    })

    // Cerrar sugerencias al hacer clic fuera
    function handleClick(e: MouseEvent) {
      if (nombreRef.current && !nombreRef.current.contains(e.target as Node)) {
        setShowSugerencias(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  function handleNombreChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setForm(prev => ({ ...prev, nombre: val }))
    if (val.length >= 2) {
      const q = val.toLowerCase()
      const matches = SUGERENCIAS_PRODUCTOS.filter(s => s.toLowerCase().includes(q)).slice(0, 8)
      setSugerencias(matches)
      setShowSugerencias(matches.length > 0)
    } else {
      setShowSugerencias(false)
    }
  }

  function seleccionarSugerencia(s: string) {
    setForm(prev => ({ ...prev, nombre: s }))
    setShowSugerencias(false)
  }

  async function handleFotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const ext = file.name.split('.').pop()
    const filename = `${Date.now()}.${ext}`
    const { error, data } = await supabase.storage.from('productos').upload(filename, file, { upsert: true })
    if (error) {
      toast.error(`Error: ${error.message}`)
    } else {
      const { data: urlData } = supabase.storage.from('productos').getPublicUrl(data.path)
      setForm(prev => ({ ...prev, foto_url: urlData.publicUrl }))
      toast.success('Imagen subida')
    }
    setUploading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.from('productos').insert({
      nombre: form.nombre,
      descripcion: form.descripcion || null,
      codigo: form.codigo,
      codigo_barras: form.codigo_barras || null,
      precio_costo: parseFloat(form.precio_costo) || 0,
      precio_venta: parseFloat(form.precio_venta) || 0,
      stock: parseInt(form.stock) || 0,
      stock_minimo: parseInt(form.stock_minimo) || 5,
      categoria_id: form.categoria_id || null,
      proveedor_id: form.proveedor_id || null,
      foto_url: form.foto_url || null,
    })
    if (error) {
      toast.error(error.message || 'Error guardando producto')
    } else {
      toast.success('Producto creado')
      router.push('/inventario')
    }
    setLoading(false)
  }

  const fieldClass = 'flex flex-col gap-1.5'
  const labelClass = 'text-xs font-medium'

  return (
    <div className="fade-in max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/inventario" className="p-2 rounded-xl" style={{ color: 'var(--text-muted)', background: 'var(--bg-surface)' }}>
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>Nuevo producto</h1>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Completa los datos del producto</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Información básica */}
        <div className="rounded-2xl p-6 mb-4" style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-surface2)' }}>
          <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--text)' }}>Información básica</h2>
          <div className="grid grid-cols-1 gap-4">

            {/* Nombre con autocompletado */}
            <div className={fieldClass} ref={nombreRef}>
              <label className={labelClass} style={{ color: 'var(--text-muted)' }}>
                Nombre del producto *
              </label>
              <div className="relative">
                <input
                  name="nombre"
                  value={form.nombre}
                  onChange={handleNombreChange}
                  onFocus={() => form.nombre.length >= 2 && setShowSugerencias(sugerencias.length > 0)}
                  placeholder="Escribe o elige un producto..."
                  required
                  autoComplete="off"
                />
                {/* Botón ver todas */}
                <button
                  type="button"
                  onClick={() => {
                    setSugerencias(SUGERENCIAS_PRODUCTOS.slice(0, 10))
                    setShowSugerencias(true)
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded"
                  style={{ color: 'var(--text-muted)' }}
                  title="Ver sugerencias"
                >
                  <ChevronDown size={16} />
                </button>

                {/* Dropdown de sugerencias */}
                {showSugerencias && (
                  <div
                    className="absolute z-50 w-full mt-1 rounded-xl overflow-hidden"
                    style={{ background: 'var(--bg-surface2)', border: '1px solid var(--bg-surface3)', boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}
                  >
                    {sugerencias.map((s, i) => (
                      <button
                        key={i}
                        type="button"
                        onMouseDown={() => seleccionarSugerencia(s)}
                        className="w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-opacity-80"
                        style={{
                          color: 'var(--text)',
                          borderBottom: i < sugerencias.length - 1 ? '1px solid var(--bg-surface3)' : 'none',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-surface3)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        {s}
                      </button>
                    ))}
                    <div className="px-4 py-2 text-xs" style={{ color: 'var(--text-muted)', background: 'var(--bg-surface3)' }}>
                      También puedes escribir un nombre personalizado
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className={fieldClass}>
              <label className={labelClass} style={{ color: 'var(--text-muted)' }}>Descripción</label>
              <textarea name="descripcion" value={form.descripcion} onChange={handleChange}
                placeholder="Descripción opcional del producto" rows={2} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className={fieldClass}>
                <label className={labelClass} style={{ color: 'var(--text-muted)' }}>Código interno *</label>
                <div className="flex gap-2">
                  <input name="codigo" value={form.codigo} onChange={handleChange} required style={{ flex: 1 }} />
                  <button type="button" onClick={() => setForm(p => ({ ...p, codigo: generateCodigo() }))}
                    className="px-2.5 rounded-xl" style={{ background: 'var(--bg-surface2)', color: 'var(--text-muted)' }} title="Generar código">
                    <RefreshCw size={14} />
                  </button>
                </div>
              </div>
              <div className={fieldClass}>
                <label className={labelClass} style={{ color: 'var(--text-muted)' }}>Código de barras / QR</label>
                <input name="codigo_barras" value={form.codigo_barras} onChange={handleChange} placeholder="Opcional" />
              </div>
            </div>
          </div>
        </div>

        {/* Precios y stock */}
        <div className="rounded-2xl p-6 mb-4" style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-surface2)' }}>
          <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--text)' }}>Precios y stock</h2>
          <div className="grid grid-cols-2 gap-4">
            {esDueno && (
              <div className={fieldClass}>
                <label className={labelClass} style={{ color: 'var(--text-muted)' }}>Precio de costo ($)</label>
                <input type="number" name="precio_costo" value={form.precio_costo} onChange={handleChange} placeholder="0" min={0} step="1" />
              </div>
            )}
            <div className={fieldClass}>
              <label className={labelClass} style={{ color: 'var(--text-muted)' }}>Precio de venta ($) *</label>
              <input type="number" name="precio_venta" value={form.precio_venta} onChange={handleChange} placeholder="0" min={0} step="1" required />
            </div>
            <div className={fieldClass}>
              <label className={labelClass} style={{ color: 'var(--text-muted)' }}>Stock inicial</label>
              <input type="number" name="stock" value={form.stock} onChange={handleChange} placeholder="0" min={0} />
            </div>
            <div className={fieldClass}>
              <label className={labelClass} style={{ color: 'var(--text-muted)' }}>Stock mínimo (alerta)</label>
              <input type="number" name="stock_minimo" value={form.stock_minimo} onChange={handleChange} placeholder="5" min={0} />
            </div>
          </div>
        </div>

        {/* Clasificación e imagen */}
        <div className="rounded-2xl p-6 mb-4" style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-surface2)' }}>
          <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--text)' }}>Clasificación e imagen</h2>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className={fieldClass}>
              <label className={labelClass} style={{ color: 'var(--text-muted)' }}>Categoría</label>
              <select name="categoria_id" value={form.categoria_id} onChange={handleChange}>
                <option value="">Sin categoría</option>
                {categorias.map(c => <option key={c.id} value={c.id}>{c.codigo ? `${c.codigo} - ` : ''}{c.nombre}</option>)}
              </select>
            </div>
            <div className={fieldClass}>
              <label className={labelClass} style={{ color: 'var(--text-muted)' }}>Proveedor</label>
              <select name="proveedor_id" value={form.proveedor_id} onChange={handleChange}>
                <option value="">Sin proveedor</option>
                {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            </div>
          </div>

          {/* Foto */}
          <div className={fieldClass}>
            <label className={labelClass} style={{ color: 'var(--text-muted)' }}>Foto del producto</label>
            {/* Preview */}
            {form.foto_url && (
              <div className="flex justify-center mb-3">
                <img src={form.foto_url} alt="preview" className="h-28 object-contain rounded-xl" />
              </div>
            )}
            {/* Botones galería y cámara */}
            <div className="grid grid-cols-2 gap-2">
              <label className="flex flex-col items-center justify-center gap-1.5 py-4 rounded-xl cursor-pointer transition-all"
                style={{ border: '2px dashed var(--bg-surface3)', color: 'var(--text-muted)' }}>
                <Upload size={20} />
                <span className="text-xs font-semibold">{uploading ? 'Subiendo...' : 'Galería'}</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleFotoUpload} />
              </label>
              <label className="flex flex-col items-center justify-center gap-1.5 py-4 rounded-xl cursor-pointer transition-all"
                style={{ border: '2px dashed rgba(37,99,235,0.4)', color: 'var(--primary-light)' }}>
                <span className="text-xl">📷</span>
                <span className="text-xs font-semibold">{uploading ? 'Subiendo...' : 'Tomar foto'}</span>
                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFotoUpload} />
              </label>
            </div>
          </div>
        </div>

        {/* Botones */}
        <div className="flex gap-3">
          <Link href="/inventario" className="flex-1 py-3 rounded-xl text-sm font-semibold text-center"
            style={{ background: 'var(--bg-surface2)', color: 'var(--text-muted)' }}>
            Cancelar
          </Link>
          <button type="submit" disabled={loading}
            className="flex-1 py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)' }}>
            {loading ? 'Guardando...' : 'Guardar producto'}
          </button>
        </div>
      </form>
    </div>
  )
}
