-- Script para configurar PostgreSQL localmente para GreenFit
-- Ejecutar como administrador de PostgreSQL

-- 1. Crear usuario y base de datos
CREATE USER greenfit_user WITH PASSWORD 'greenfit_password';
CREATE DATABASE greenfit_db OWNER greenfit_user;

-- 2. Conceder permisos
GRANT ALL PRIVILEGES ON DATABASE greenfit_db TO greenfit_user;

-- 3. Conectar a la base de datos y configurar extensiones
\c greenfit_db;

-- 4. Configurar esquema por defecto
ALTER DEFAULT PRIVILEGES FOR USER greenfit_user IN SCHEMA public GRANT ALL ON TABLES TO greenfit_user;
ALTER DEFAULT PRIVILEGES FOR USER greenfit_user IN SCHEMA public GRANT ALL ON SEQUENCES TO greenfit_user;

-- 5. Crear extensiones útiles
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- Para búsquedas de texto mejoradas

-- Mensaje de confirmación
SELECT 'PostgreSQL configurado exitosamente para GreenFit!' as status;