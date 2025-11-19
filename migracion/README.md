# 🚀 Configuración de Base de Datos - GreenFit

## ⚡ Configuración Rápida (Recomendada)

### Para Windows:
```bash
# 1. Ejecutar script automático
setup_simple.bat

# 2. Cuando se abra psql, pegar estos comandos uno por uno:
CREATE USER greenfit_user WITH PASSWORD 'greenfit_password';
CREATE DATABASE greenfit_db OWNER greenfit_user;
GRANT ALL PRIVILEGES ON DATABASE greenfit_db TO greenfit_user;
\c greenfit_db;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
\q

# 3. El script continuará automáticamente
```

### Para macOS/Linux:
```bash
# 1. Configurar PostgreSQL manualmente
psql -U postgres -f setup_postgresql.sql

# 2. Configurar backend
cd backend
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

## 🗄️ ¿Cómo funciona?

1. **PostgreSQL** - Base de datos principal
2. **Prisma** - ORM que maneja tablas automáticamente
3. **Migraciones** - Crea todas las tablas desde `schema.prisma`
4. **Seed** - Inserta datos de prueba (usuarios, ingredientes, platillos)

## 👥 Usuarios incluidos después del seed:

| Email | Password | Rol |
|-------|----------|-----|
| `test@greenfit.mx` | `test123` | Customer |
| `admin@greenfit.mx` | `admin123` | Admin |
| `chef@greenfit.mx` | `chef123` | Employee |
| `kitchen1@greenfit.mx` | `kitchen123` | Employee |

## 🎯 Comandos útiles:

```bash
cd backend

# Ver datos en interfaz gráfica
npx prisma studio

# Reiniciar base de datos completa
npm run db:reset

# Solo insertar datos nuevos
npm run db:seed
```

## ✅ Verificación:

### Opción 1: Verificación automática
```bash
node migracion/verify_postgres_setup.js
```

### Opción 2: Verificación manual
- Backend: `http://localhost:3002/health`
- Prisma Studio: `npx prisma studio`
- Login admin funcional
- Catálogo con 22 ingredientes y 8 platillos

---

**¡Listo para desarrollar! 🎉**