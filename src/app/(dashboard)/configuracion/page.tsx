'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useProfile } from '@/lib/profile-context'
import { Building2, Tag, Truck, Plus, Pencil, Trash2, Check, X, Save } from 'lucide-react'
import toast from 'react-hot-toast'

interface Categoria { id: string; nombre: string }
interface Proveedor { id: string; nombre: string; telefono?: string; email?: string }

const NEGOCIO_KEY = 'bym_negocio_config'

export default function ConfiguracionPage() {
  const router = useRouter()
  const { esDueno, loading: loadingProfile } = useProfile()
  const [tab, setTab] = useState<'negocio' | 'categorias' | 'proveedores'>('negocio')

  useEffect(() => {
    if (!loadingProfile && !esDueno) router.replace('/dashboard')
  }, [esDueno, loadingProfile, router])

  // Negocio
  const [negocio, setNegocio] = useState({ nombre: 'B&M Repuestos y Accesorios', nit: '', telefono: '', direccion: '', ciudad: '' })
  const [guardandoNegocio, setGuardandoNegocio] = useState(false)

  // Categorías
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [nuevaCat, setNuevaCat] = useState('')
  const [editandoCat, setEditandoCat] = useState<string | null>(null)
  const [editValCat, setEditValCat] = useState('')
  const [loadingCat, setLoadingCat] = useState(true)

  // Proveedores
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [nuevoProv, setNuevoProv] = useState({ nombre: '', telefono: '', email: '' })
  const [editandoProv, setEditandoProv] = useState<string | null>(null)
  const [editValProv, setEditValProv] = useState({ nombre: '', telefono: '', email: '' })
  const [loadingProv, setLoadingProv] = useState(true)
  const [showFormProv, setShowFormProv] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem(NEGOCIO_KEY)
    if (saved) setNegocio(JSON.parse(saved))
    loadCategorias()
    loadProveedores()
  }, [])

  async function loadCategorias() {
    const { data } = await supabase.from('categorias').select('*').order('nombre')
    setCategorias(data || [])
    setLoadingCat(false)
  }

  async function loadProveedores() {
    const { data } = await supabase.from('proveedores').select('*').order('nombre')
    setProveedores(data || [])
    setLoadingProv(false)
  }

  function guardarNegocio() {
    setGuardandoNegocio(true)
    localStorage.setItem(NEGOCIO_KEY, JSON.stringify(negocio))
    setTimeout(() => {
      setGuardandoNegocio(false)
      toast.success('Datos del negocio guardados')
    }, 400)
  }

  async function agregarCategoria() {
    if (!nuevaCat.trim()) return
    const { error } = await supabase.from('categorias').insert({ nombre: nuevaCat.trim() })
    if (error) { toast.error('Error agregando categoría'); return }
    toast.success('Categoría agregada')
    setNuevaCat('')
    loadCategorias()
  }

  async function guardarEditCat(id: string) {
    if (!editValCat.trim()) return
    const { error } = await supabase.from('categorias').update({ nombre: editValCat.trim() }).eq('id', id)
    if (error) { toast.error('Error'); return }
    toast.success('Categoría actualizada')
    setEditandoCat(null)
    loadCategorias()
  }

  async function eliminarCategoria(id: string) {
    if (!confirm('¿Eliminar esta categoría?')) return
    const { error } = await supabase.from('categorias').delete().eq('id', id)
    if (error) { toast.error('Error eliminando'); return }
    toast.success('Categoría eliminada')
    loadCategorias()
  }

  async function agregarProveedor() {
    if (!nuevoProv.nombre.trim()) return
    const { error } = await supabase.from('proveedores').insert({
      nombre: nuevoProv.nombre.trim(),
      telefono: nuevoProv.telefono || null,
      email: nuevoProv.email || null,
    })
    if (error) { toast.error('Error agregando proveedor'); return }
    toast.success('Proveedor agregado')
    setNuevoProv({ nombre: '', telefono: '', email: '' })
    setShowFormProv(false)
    loadProveedores()
  }

  async function guardarEditProv(id: string) {
    if (!editValProv.nombre.trim()) return
    const { error } = await supabase.from('proveedores').update({
      nombre: editValProv.nombre.trim(),
      telefono: editValProv.telefono || null,
      email: editValProv.email || null,
    }).eq('id', id)
    if (error) { toast.error('Error'); return }
    toast.success('Proveedor actualizado')
    setEditandoProv(null)
    loadProveedores()
  }

  async function eliminarProveedor(id: string) {
    if (!confirm('¿Eliminar este proveedor?')) return
    const { error } = await supabase.from('proveedores').delete().eq('id', id)
    if (error) { toast.error('Error eliminando'); return }
    toast.success('Proveedor eliminado')
    loadProveedores()
  }

  const tabs = [
    { id: 'negocio', label: 'Negocio', icon: Building2 },
    { id: 'categorias', label: 'Categorías', icon: Tag },
    { id: 'proveedores', label: 'Proveedores', icon: Truck },
  ] as const

  return (
    <div className="fade-in max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-page)' }}>Configuración</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-page-muted)' }}>Gestiona tu negocio, categorías y proveedores</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {tabs.map(t => {
          const active = tab === t.id
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={{
                background: active ? 'var(--primary-light)' : 'var(--bg-surface)',
                color: active ? 'white' : 'var(--text-muted)',
                border: active ? '1px solid var(--primary-light)' : '1px solid var(--bg-surface2)',
              }}>
              <t.icon size={15} />
              {t.label}
            </button>
          )
        })}
      </div>

      {/* ── TAB NEGOCIO ── */}
      {tab === 'negocio' && (
        <div className="rounded-2xl p-6" style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-surface2)' }}>
          <h2 className="text-sm font-bold mb-5" style={{ color: 'var(--text)' }}>Datos del negocio</h2>
          <div className="flex flex-col gap-4">
            {[
              { label: 'Nombre del negocio', key: 'nombre', placeholder: 'B&M Repuestos y Accesorios' },
              { label: 'NIT / RUT', key: 'nit', placeholder: '900.123.456-7' },
              { label: 'Teléfono', key: 'telefono', placeholder: '300 123 4567' },
              { label: 'Dirección', key: 'direccion', placeholder: 'Calle 10 #5-20' },
              { label: 'Ciudad', key: 'ciudad', placeholder: 'Bogotá' },
            ].map(({ label, key, placeholder }) => (
              <div key={key}>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>{label}</label>
                <input
                  type="text"
                  placeholder={placeholder}
                  value={negocio[key as keyof typeof negocio]}
                  onChange={e => setNegocio(prev => ({ ...prev, [key]: e.target.value }))}
                />
              </div>
            ))}
            <button
              onClick={guardarNegocio}
              disabled={guardandoNegocio}
              className="mt-2 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #3B82F6 100%)' }}>
              <Save size={15} />
              {guardandoNegocio ? 'Guardando...' : 'Guardar datos'}
            </button>
          </div>
        </div>
      )}

      {/* ── TAB CATEGORÍAS ── */}
      {tab === 'categorias' && (
        <div className="rounded-2xl p-6" style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-surface2)' }}>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-bold" style={{ color: 'var(--text)' }}>Categorías de productos</h2>
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--bg-surface2)', color: 'var(--text-muted)' }}>
              {categorias.length} categorías
            </span>
          </div>

          {/* Agregar nueva */}
          <div className="flex gap-2 mb-5">
            <input
              type="text"
              placeholder="Nueva categoría..."
              value={nuevaCat}
              onChange={e => setNuevaCat(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && agregarCategoria()}
              style={{ flex: 1 }}
            />
            <button onClick={agregarCategoria}
              className="px-4 py-2 rounded-xl text-sm font-bold text-white flex items-center gap-1.5"
              style={{ background: 'var(--primary-light)', whiteSpace: 'nowrap' }}>
              <Plus size={15} /> Agregar
            </button>
          </div>

          {/* Lista */}
          {loadingCat ? (
            <div className="flex justify-center py-8">
              <div className="h-6 w-6 rounded-full border-4 animate-spin" style={{ borderColor: 'var(--primary-light)', borderTopColor: 'transparent' }} />
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {categorias.map(cat => (
                <div key={cat.id} className="flex items-center gap-3 px-4 py-3 rounded-xl"
                  style={{ background: 'var(--bg-surface2)', border: '1px solid var(--bg-surface3)' }}>
                  {editandoCat === cat.id ? (
                    <>
                      <input value={editValCat} onChange={e => setEditValCat(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && guardarEditCat(cat.id)}
                        style={{ flex: 1, padding: '0.25rem 0.5rem', fontSize: '0.875rem' }} autoFocus />
                      <button onClick={() => guardarEditCat(cat.id)} style={{ color: '#10B981' }}><Check size={16} /></button>
                      <button onClick={() => setEditandoCat(null)} style={{ color: 'var(--text-muted)' }}><X size={16} /></button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 text-sm" style={{ color: 'var(--text)' }}>{cat.nombre}</span>
                      <button onClick={() => { setEditandoCat(cat.id); setEditValCat(cat.nombre) }}
                        style={{ color: 'var(--text-muted)' }}><Pencil size={15} /></button>
                      <button onClick={() => eliminarCategoria(cat.id)} style={{ color: '#EF4444' }}><Trash2 size={15} /></button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB PROVEEDORES ── */}
      {tab === 'proveedores' && (
        <div className="rounded-2xl p-6" style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-surface2)' }}>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-bold" style={{ color: 'var(--text)' }}>Proveedores</h2>
            <button onClick={() => setShowFormProv(!showFormProv)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold text-white"
              style={{ background: 'var(--primary-light)' }}>
              <Plus size={14} /> Nuevo
            </button>
          </div>

          {/* Formulario nuevo proveedor */}
          {showFormProv && (
            <div className="mb-5 p-4 rounded-xl flex flex-col gap-3"
              style={{ background: 'var(--bg-surface2)', border: '1px solid var(--bg-surface3)' }}>
              <input type="text" placeholder="Nombre del proveedor *"
                value={nuevoProv.nombre} onChange={e => setNuevoProv(p => ({ ...p, nombre: e.target.value }))} />
              <div className="grid grid-cols-2 gap-3">
                <input type="text" placeholder="Teléfono"
                  value={nuevoProv.telefono} onChange={e => setNuevoProv(p => ({ ...p, telefono: e.target.value }))} />
                <input type="email" placeholder="Email"
                  value={nuevoProv.email} onChange={e => setNuevoProv(p => ({ ...p, email: e.target.value }))} />
              </div>
              <div className="flex gap-2">
                <button onClick={agregarProveedor}
                  className="flex-1 py-2 rounded-xl text-sm font-bold text-white"
                  style={{ background: '#10B981' }}>Guardar</button>
                <button onClick={() => setShowFormProv(false)}
                  className="flex-1 py-2 rounded-xl text-sm font-semibold"
                  style={{ background: 'var(--bg-surface3)', color: 'var(--text-muted)' }}>Cancelar</button>
              </div>
            </div>
          )}

          {/* Lista proveedores */}
          {loadingProv ? (
            <div className="flex justify-center py-8">
              <div className="h-6 w-6 rounded-full border-4 animate-spin" style={{ borderColor: 'var(--primary-light)', borderTopColor: 'transparent' }} />
            </div>
          ) : proveedores.length === 0 ? (
            <p className="text-center text-sm py-8" style={{ color: 'var(--text-muted)' }}>Sin proveedores registrados</p>
          ) : (
            <div className="flex flex-col gap-2">
              {proveedores.map(prov => (
                <div key={prov.id} className="rounded-xl overflow-hidden"
                  style={{ background: 'var(--bg-surface2)', border: '1px solid var(--bg-surface3)' }}>
                  {editandoProv === prov.id ? (
                    <div className="p-3 flex flex-col gap-2">
                      <input value={editValProv.nombre} onChange={e => setEditValProv(p => ({ ...p, nombre: e.target.value }))}
                        placeholder="Nombre *" style={{ fontSize: '0.875rem' }} autoFocus />
                      <div className="grid grid-cols-2 gap-2">
                        <input value={editValProv.telefono} onChange={e => setEditValProv(p => ({ ...p, telefono: e.target.value }))}
                          placeholder="Teléfono" style={{ fontSize: '0.875rem' }} />
                        <input value={editValProv.email} onChange={e => setEditValProv(p => ({ ...p, email: e.target.value }))}
                          placeholder="Email" style={{ fontSize: '0.875rem' }} />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => guardarEditProv(prov.id)}
                          className="flex-1 py-1.5 rounded-lg text-xs font-bold text-white" style={{ background: '#10B981' }}>Guardar</button>
                        <button onClick={() => setEditandoProv(null)}
                          className="flex-1 py-1.5 rounded-lg text-xs font-semibold"
                          style={{ background: 'var(--bg-surface3)', color: 'var(--text-muted)' }}>Cancelar</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 px-4 py-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{prov.nombre}</p>
                        {(prov.telefono || prov.email) && (
                          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                            {prov.telefono}{prov.telefono && prov.email ? ' · ' : ''}{prov.email}
                          </p>
                        )}
                      </div>
                      <button onClick={() => { setEditandoProv(prov.id); setEditValProv({ nombre: prov.nombre, telefono: prov.telefono || '', email: prov.email || '' }) }}
                        style={{ color: 'var(--text-muted)' }}><Pencil size={15} /></button>
                      <button onClick={() => eliminarProveedor(prov.id)} style={{ color: '#EF4444' }}><Trash2 size={15} /></button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
