# B&M Repuestos y Accesorios — Guía de Instalación

## 1. Crear proyecto en Supabase

1. Ve a https://supabase.com y crea una cuenta
2. Crea un nuevo proyecto (anota la contraseña)
3. Espera que el proyecto termine de iniciar (~2 min)

## 2. Ejecutar el schema de base de datos

1. En tu proyecto Supabase, ve a **SQL Editor**
2. Copia y pega el contenido de `supabase/schema.sql`
3. Haz clic en **Run**

## 3. Crear bucket de imágenes

1. Ve a **Storage** en Supabase
2. Crea un bucket llamado `productos`
3. Marca como **Public bucket**

## 4. Configurar variables de entorno

1. Copia el archivo de ejemplo:
```
copy .env.local.example .env.local
```

2. Abre `.env.local` y llena con tus datos de Supabase:
- `NEXT_PUBLIC_SUPABASE_URL` → Settings > API > Project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` → Settings > API > anon public key

## 5. Correr el proyecto localmente

```bash
npm install
npm run dev
```

Abre http://localhost:3000

## 6. Crear el usuario dueño

1. Ve al sistema → crea una cuenta con tu email
2. En Supabase **Table Editor** → tabla `profiles`
3. Encuentra tu usuario y cambia `rol` de `empleado` a `dueño`

## 7. Deploy en Vercel (opcional)

```bash
npx vercel
```

Agrega las variables de entorno en el dashboard de Vercel.

---

## Módulos del sistema

| Módulo | Ruta | Descripción |
|--------|------|-------------|
| Dashboard | `/dashboard` | Métricas, alertas de stock, movimientos recientes |
| Inventario | `/inventario` | Lista completa de productos con filtros |
| Nuevo producto | `/productos/nuevo` | Agregar producto con foto, código, precios |
| Movimientos | `/movimientos` | Escanear QR/barras, registrar entradas/salidas |
| Reportes | `/reportes` | Exportar PDF y Excel por período |

## Escaneo de productos

En **Movimientos** puedes:
- Escribir el código numérico y presionar Enter
- Hacer clic en el ícono QR para abrir la cámara del celular
- Escanea QR o código de barras automáticamente
