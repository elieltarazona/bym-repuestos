export type UserRole = 'dueño' | 'empleado'

export interface Profile {
  id: string
  email: string
  nombre: string
  rol: UserRole
  created_at: string
}

export interface Categoria {
  id: string
  nombre: string
  codigo?: number
  created_at: string
}

export interface Proveedor {
  id: string
  nombre: string
  contacto?: string
  telefono?: string
  created_at: string
}

export interface Producto {
  id: string
  nombre: string
  descripcion?: string
  codigo: string
  codigo_barras?: string
  precio_costo: number
  precio_venta: number
  stock: number
  stock_minimo: number
  categoria_id?: string
  proveedor_id?: string
  foto_url?: string
  activo: boolean
  created_at: string
  updated_at: string
  categoria?: Categoria
  proveedor?: Proveedor
}

export type TipoMovimiento = 'entrada' | 'salida'

export interface Movimiento {
  id: string
  producto_id: string
  tipo: TipoMovimiento
  cantidad: number
  motivo?: string
  usuario_id: string
  created_at: string
  producto?: Producto
  usuario?: Profile
}

export interface ClienteFiado {
  id: string
  nombre: string
  telefono?: string
  created_at: string
}

export interface Fiado {
  id: string
  cliente_id: string
  items: { producto_id: string; nombre: string; cantidad: number; precio_venta: number }[]
  total: number
  saldo: number
  estado: 'pendiente' | 'pagado' | 'cancelado'
  usuario_id: string
  created_at: string
  updated_at: string
  cliente?: ClienteFiado
}

export interface AbonoFiado {
  id: string
  fiado_id: string
  monto: number
  medio_pago: string
  usuario_id: string
  created_at: string
}

export interface DashboardStats {
  total_productos: number
  total_stock: number
  valor_inventario: number
  stock_bajo: number
  movimientos_hoy: number
}
