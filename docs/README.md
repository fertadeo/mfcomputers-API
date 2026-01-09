# Norte ERP API

API backend para el sistema ERP de Norte Abanicos desarrollado con Node.js y TypeScript.

## Características

- **Framework**: Express.js con TypeScript
- **Base de datos**: MySQL con conexión por pool
- **Puerto**: 8083
- **Autenticación**: JWT
- **Validación**: Joi + Express Validator
- **Seguridad**: Helmet + CORS

## Módulos del ERP

- 📊 **Dashboard** - Estadísticas y resumen general
- 📦 **Stock** - Gestión de inventario y productos
- 👥 **Clientes** - Administración de clientes
- 💰 **Caja** - Control de caja y finanzas
- 🏭 **Producción** - Órdenes de producción
- 👨‍💼 **Personal** - Gestión de empleados
- 🛒 **Compras** - Gestión de compras y proveedores
- 📋 **Pedidos** - Administración de pedidos
- 💼 **Presupuestos** - Creación y gestión de presupuestos
- 🏪 **Tienda** - Gestión de tienda
- 🧾 **Facturación** - Sistema de facturación

## Instalación

1. Instalar dependencias:
```bash
npm install
```

2. Configurar variables de entorno:
```bash
cp .env.example .env
# Editar .env con tus configuraciones
```

3. Configurar base de datos MySQL:
```bash
# Ejecutar el script SQL en src/database/schema.sql
mysql -u root -p < src/database/schema.sql
```

4. Compilar TypeScript:
```bash
npm run build
```

5. Iniciar servidor:
```bash
# Desarrollo
npm run dev

# Producción
npm start
```

## Endpoints

- `GET /health` - Health check del servidor
- `GET /api` - Información de la API
- `GET /api/dashboard/stats` - Estadísticas del dashboard
- `GET /api/dashboard/activities` - Actividades recientes

## Estructura del proyecto

```
src/
├── config/          # Configuraciones (database, etc.)
├── controllers/     # Controladores de rutas
├── middleware/      # Middleware personalizado
├── routes/          # Definición de rutas
├── types/          # Tipos TypeScript
├── database/       # Scripts SQL
└── index.ts        # Punto de entrada
```

## Variables de entorno

```env
# Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=norte_erp_db

# Server
PORT=8083
NODE_ENV=development

# JWT
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=24h

# CORS
CORS_ORIGIN=http://localhost:3000
```