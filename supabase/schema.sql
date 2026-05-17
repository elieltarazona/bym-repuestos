-- =============================================
-- B&M Repuestos y Accesorios — Schema Supabase
-- Ejecutar en el SQL Editor de Supabase
-- =============================================

-- Perfiles de usuario (extiende auth.users)
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  nombre text not null,
  rol text check (rol in ('dueño', 'empleado')) default 'empleado',
  created_at timestamptz default now()
);

-- Trigger: crear profile automáticamente al registrarse
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, email, nombre, rol)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'nombre', new.email), 'empleado');
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- Categorías de productos
create table if not exists categorias (
  id uuid default gen_random_uuid() primary key,
  nombre text not null unique,
  created_at timestamptz default now()
);

-- Proveedores
create table if not exists proveedores (
  id uuid default gen_random_uuid() primary key,
  nombre text not null,
  contacto text,
  telefono text,
  created_at timestamptz default now()
);

-- Productos
create table if not exists productos (
  id uuid default gen_random_uuid() primary key,
  nombre text not null,
  descripcion text,
  codigo text unique not null,
  codigo_barras text,
  precio_costo decimal(10,2) default 0,
  precio_venta decimal(10,2) default 0,
  stock int default 0,
  stock_minimo int default 5,
  categoria_id uuid references categorias(id),
  proveedor_id uuid references proveedores(id),
  foto_url text,
  activo boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Movimientos de inventario
create table if not exists movimientos (
  id uuid default gen_random_uuid() primary key,
  producto_id uuid references productos(id) on delete cascade,
  tipo text check (tipo in ('entrada', 'salida')) not null,
  cantidad int not null check (cantidad > 0),
  motivo text,
  usuario_id uuid references profiles(id),
  created_at timestamptz default now()
);

-- Trigger: actualizar stock automáticamente en movimientos
create or replace function actualizar_stock()
returns trigger as $$
begin
  if new.tipo = 'entrada' then
    update productos set stock = stock + new.cantidad, updated_at = now()
    where id = new.producto_id;
  elsif new.tipo = 'salida' then
    update productos set stock = stock - new.cantidad, updated_at = now()
    where id = new.producto_id;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists on_movimiento_created on movimientos;
create trigger on_movimiento_created
  after insert on movimientos
  for each row execute procedure actualizar_stock();

-- RLS (Row Level Security)
alter table profiles enable row level security;
alter table categorias enable row level security;
alter table proveedores enable row level security;
alter table productos enable row level security;
alter table movimientos enable row level security;

-- Políticas: usuarios autenticados leen todo
create policy "auth users read profiles" on profiles for select using (auth.role() = 'authenticated');
create policy "auth users update own profile" on profiles for update using (auth.uid() = id);

create policy "auth users read categorias" on categorias for all using (auth.role() = 'authenticated');
create policy "auth users read proveedores" on proveedores for all using (auth.role() = 'authenticated');
create policy "auth users read productos" on productos for all using (auth.role() = 'authenticated');
create policy "auth users read movimientos" on movimientos for all using (auth.role() = 'authenticated');

-- Datos iniciales: categorías
insert into categorias (nombre) values
  ('Motor'),
  ('Frenos'),
  ('Suspensión'),
  ('Eléctrico'),
  ('Filtros'),
  ('Llantas'),
  ('Carrocería'),
  ('Aceites y Lubricantes'),
  ('Accesorios'),
  ('Transmisión')
on conflict (nombre) do nothing;
