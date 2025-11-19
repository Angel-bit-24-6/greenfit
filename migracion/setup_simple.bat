@echo off
echo ================================================
echo    CONFIGURACION MANUAL POSTGRESQL - GREENFIT
echo ================================================
echo.
echo Este script te guiara paso a paso.
echo Necesitaras ingresar las credenciales manualmente.
echo.
pause

echo [1/5] Verificando PostgreSQL...
psql --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ ERROR: PostgreSQL no encontrado
    echo.
    echo 📥 Descarga e instala PostgreSQL desde:
    echo    https://www.postgresql.org/download/windows/
    echo.
    echo ⚠️  Durante la instalacion, RECUERDA la contraseña del usuario 'postgres'
    pause
    exit /b 1
)
echo ✅ PostgreSQL encontrado

echo.
echo [2/5] IMPORTANTE: Ahora necesitas configurar la base de datos manualmente
echo.
echo 📝 Copia y pega estos comandos en psql:
echo.
echo     CREATE USER greenfit_user WITH PASSWORD 'greenfit_password';
echo     CREATE DATABASE greenfit_db OWNER greenfit_user;
echo     GRANT ALL PRIVILEGES ON DATABASE greenfit_db TO greenfit_user;
echo     \c greenfit_db;
echo     CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
echo     CREATE EXTENSION IF NOT EXISTS "pg_trgm";
echo     \q
echo.
echo 🚀 Presiona Enter para abrir psql (necesitaras la contraseña de postgres):
pause
psql -U postgres

echo.
echo [3/5] Configurando backend...
cd backend
if %errorlevel% neq 0 (
    echo ❌ ERROR: No se encontro la carpeta backend
    pause
    exit /b 1
)

echo Instalando dependencias de PostgreSQL...
call npm install pg @types/pg

echo Generando cliente Prisma...
call npm run db:generate
if %errorlevel% neq 0 (
    echo ❌ ERROR: Fallo la generacion del cliente
    pause
    exit /b 1
)

echo.
echo [4/5] Ejecutando migracion...
call npx prisma migrate dev --name init
if %errorlevel% neq 0 (
    echo ❌ ERROR: Fallo la migracion
    echo 💡 Verifica que la base de datos este configurada correctamente
    pause
    exit /b 1
)

echo.
echo [5/5] Cargando datos iniciales...
call npm run db:seed
if %errorlevel% neq 0 (
    echo ❌ ERROR: Fallo el seed
    pause
    exit /b 1
)

echo.
echo ================================================
echo     🎉 MIGRACION COMPLETADA EXITOSAMENTE!
echo ================================================
echo.
echo 🚀 Para iniciar el servidor:
echo    npm run dev
echo.
echo 🔗 URL de conexion configurada:
echo    postgresql://greenfit_user:greenfit_password@localhost:5432/greenfit_db
echo.
pause