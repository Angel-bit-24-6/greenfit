# 🌱 **GreenFit - Healthy Food Mobile App**

> **Aplicación móvil/web para venta de comida saludable con React Native + Expo**

[![Version](https://img.shields.io/badge/version-1.0.0-green.svg)](package.json)
[![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](package.json)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

---

## 📱 **¿Qué es GreenFit?**

GreenFit es una aplicación móvil multiplataforma que permite a los usuarios:

- 🥗 **Explorar menú** de platillos saludables
- 🛠️ **Personalizar platillos** seleccionando ingredientes
- 🛒 **Gestionar carrito** con validación de inventario
- 💳 **Realizar pagos** integrados con Stripe
- 👨‍🍳 **Panel de empleados** para gestión de órdenes
- 🔧 **Panel de administración** para gestión completa

---

## 🏗️ **Arquitectura del Sistema**

### **Frontend** (React Native + Expo)
```
frontend/
├── components/     # Componentes reutilizables
├── screens/       # Pantallas principales
├── stores/        # Estado global (Zustand)
├── navigation/    # Navegación entre pantallas
├── services/      # Servicios de API
└── config/        # Configuración de red y tema
```

### **Backend** (Node.js + Express + TypeScript)
```
backend/
├── src/
│   ├── controllers/    # Lógica de negocio
│   ├── routes/        # Endpoints de API
│   ├── middleware/    # Autenticación y validación
│   └── services/      # Servicios externos
├── prisma/            # Esquema de base de datos
└── tests/             # Pruebas automatizadas
```

---

## 🛠️ **Stack Tecnológico**

### **Frontend**
| Tecnología | Propósito |
|------------|-----------|
| **React Native + Expo** | Framework móvil multiplataforma |
| **NativeWind** | Estilos Tailwind CSS |
| **Zustand** | Gestión de estado global |
| **React Navigation** | Navegación entre pantallas |
| **AsyncStorage** | Almacenamiento local persistente |
| **TypeScript** | Tipado estático |

### **Backend**
| Tecnología | Propósito |
|------------|-----------|
| **Node.js + Express** | Servidor web y API REST |
| **TypeScript** | Tipado estático |
| **Prisma** | ORM y migraciones de DB |
| **PostgreSQL** | Base de datos principal |
| **JWT** | Autenticación y autorización |
| **bcryptjs** | Hashing de contraseñas |
| **Stripe** | Procesamiento de pagos |

---

## ⚡ **Instalación Rápida**

### **Prerrequisitos**
- Node.js ≥ 18.0.0
- npm ≥ 8.0.0
- PostgreSQL ≥ 12
- Git

### **1. Clonar el repositorio**
```bash
git clone https://github.com/tu-usuario/greenfit.git
cd greenfit
```

### **2. Configurar Base de Datos**
```bash
# Windows
cd migracion
setup_simple.bat

# macOS/Linux
psql -U postgres -f migracion/setup_postgresql.sql
```

### **3. Configurar Backend**
```bash
cd backend
npm install
cp .env.example .env
# Editar .env con tu configuración

# Configurar base de datos
npm run db:generate
npm run db:migrate
npm run db:seed

# Iniciar servidor
npm run dev
```

### **4. Configurar Frontend**
```bash
cd frontend
npm install

# Editar frontend/config/network.json con tu IP
# Cambiar 192.168.100.12 por tu IP local

# Iniciar aplicación
npm start
```

### **5. ✅ Verificar instalación**
- Backend: http://localhost:3002/health
- Frontend: http://localhost:8081
- Base de datos: `npx prisma studio` (desde `/backend`)

---

## 👥 **Usuarios Predefinidos**

Después del seed, tendrás estos usuarios listos para usar:

| Email | Password | Rol | Acceso |
|-------|----------|-----|--------|
| `test@greenfit.mx` | `test123` | **Customer** | App principal |
| `admin@greenfit.mx` | `admin123` | **Admin** | Panel de administración |
| `chef@greenfit.mx` | `chef123` | **Employee** | Panel de empleados |
| `kitchen1@greenfit.mx` | `kitchen123` | **Employee** | Panel de empleados |

---

## 🔐 **Sistema de Autenticación**

### **Multi-entorno implementado:**

**🏠 Customers (JWT + AuthService):**
- Registro dinámico de nuevos usuarios
- Sesión persistente con AsyncStorage
- JWT tokens con Bearer authentication

**👨‍🍳 Employees (bcrypt + EmployeeController):**
- Sistema especializado para empleados
- Acceso a dashboard de órdenes
- Sin interferencia con sistema principal

**🔧 Admin (JWT + AdminStore separado):**
- JWT con verificación de roles
- Sesión persistente independiente
- Endpoints protegidos con requireAdminRole

---

## 🌐 **API Endpoints**

### **Autenticación**
```
POST /api/auth/login      # Login de usuarios
POST /api/auth/register   # Registro de nuevos usuarios
POST /api/auth/logout     # Cerrar sesión
```

### **Catálogo**
```
GET  /api/catalog         # Obtener ingredientes y platillos
GET  /api/catalog/plates  # Solo platillos
GET  /api/catalog/ingredients # Solo ingredientes
```

### **Carrito y Órdenes**
```
POST /api/cart/add        # Agregar al carrito
GET  /api/cart           # Obtener carrito actual
POST /api/orders         # Crear nueva orden
GET  /api/orders         # Historial de órdenes
```

### **Administración**
```
GET  /api/admin/overview  # Dashboard principal
GET  /api/admin/users     # Gestión de usuarios
PUT  /api/admin/inventory # Actualizar inventario
```

---

## 📱 **Funcionalidades Principales**

### **Para Customers:**
✅ Navegación de menú completo  
✅ Constructor de platillos personalizados  
✅ Sistema de carrito con validación de stock  
✅ Checkout integrado con Stripe  
✅ Historial de órdenes  
✅ Autenticación persistente  

### **Para Employees:**
✅ Dashboard de órdenes en tiempo real  
✅ Gestión de estado de órdenes  
✅ Vista de detalles de pedidos  
✅ Sistema de autenticación especializado  

### **Para Administradores:**
✅ Panel de control completo  
✅ Gestión de inventario  
✅ Administración de usuarios  
✅ Analytics y reportes  
✅ Gestión de catálogo  

---

## 🗄️ **Base de Datos**

### **Esquema Principal:**
```sql
users              # Usuarios del sistema
ingredients        # Ingredientes disponibles
plates            # Platillos predefinidos
plate_ingredients # Relación platillos-ingredientes
orders            # Órdenes de clientes
order_items       # Items de cada orden
employees         # Empleados del sistema
```

### **Datos incluidos:**
- **22 ingredientes** con stock y precios
- **8 platillos** predefinidos
- **4 usuarios** de prueba
- **Extensiones PostgreSQL** habilitadas

---

## 🚀 **Comandos de Desarrollo**

### **Backend**
```bash
npm run dev          # Servidor desarrollo
npm run build        # Compilar TypeScript
npm run test         # Ejecutar pruebas
npm run db:reset     # Reiniciar base de datos
npm run db:seed      # Insertar datos de prueba
```

### **Frontend**
```bash
npm start            # Iniciar Expo
npm run android      # Emulador Android
npm run ios          # Emulador iOS
npm run web          # Navegador web
```

---

## 📂 **Configuración de Red**

### **Archivos importantes:**
- `backend/.env` - Variables de entorno del servidor
- `frontend/config/network.json` - URLs de API
- `frontend/config/app.json` - Configuración general

### **Para cambiar IP:**
1. Obtener nueva IP: `ipconfig` (Windows) o `ifconfig` (macOS/Linux)
2. Actualizar en: `frontend/config/network.json`
3. Actualizar en: `backend/.env`
4. Reiniciar ambos servicios

---

## 🔧 **Solución de Problemas**

### **Backend no conecta:**
```bash
# Verificar PostgreSQL
node migracion/verify_postgres_setup.js

# Verificar configuración
cat backend/.env
```

### **Frontend no carga:**
```bash
# Verificar configuración de red
cat frontend/config/network.json

# Limpiar cache
cd frontend && npx expo start -c
```

### **Errores de base de datos:**
```bash
cd backend
npm run db:reset    # ⚠️ Esto borra todos los datos
npm run db:migrate
npm run db:seed
```

---

## 📈 **Estado del Proyecto**

### **✅ Completado:**
- Sistema de autenticación completo
- Base de datos con Prisma
- API REST funcional
- Frontend con navegación
- Integración de pagos
- Paneles de admin y empleados

### **🚧 En Desarrollo:**
- Sistema de notificaciones
- Chat bot para recomendaciones
- Analytics avanzados
- Optimizaciones de performance

---

## 🤝 **Contribuir**

1. Fork el repositorio
2. Crear rama feature: `git checkout -b feature/nueva-funcionalidad`
3. Commit cambios: `git commit -am 'Agregar nueva funcionalidad'`
4. Push a la rama: `git push origin feature/nueva-funcionalidad`
5. Crear Pull Request

---

## 📄 **Licencia**

Este proyecto está bajo la licencia MIT. Ver `LICENSE` para más detalles.

---

## 👨‍💻 **Equipo**

Desarrollado por el equipo GreenFit

---

**🎉 ¡Listo para desarrollar comida saludable! 🌱**