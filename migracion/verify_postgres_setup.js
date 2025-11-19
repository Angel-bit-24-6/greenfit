// Script para verificar que PostgreSQL esté configurado correctamente
const { Client } = require('pg');

async function verifyPostgreSQLSetup() {
  console.log('🔍 Verificando configuración de PostgreSQL...\n');
  
  const client = new Client({
    user: 'greenfit_user',
    host: 'localhost',
    database: 'greenfit_db',
    password: 'greenfit_password',
    port: 5432,
  });

  try {
    // Test de conexión
    console.log('[1/4] Probando conexión...');
    await client.connect();
    console.log('✅ Conexión exitosa');

    // Test de base de datos
    console.log('\n[2/4] Verificando base de datos...');
    const dbResult = await client.query('SELECT current_database()');
    console.log(`✅ Base de datos: ${dbResult.rows[0].current_database}`);

    // Test de usuario
    console.log('\n[3/4] Verificando usuario...');
    const userResult = await client.query('SELECT current_user');
    console.log(`✅ Usuario: ${userResult.rows[0].current_user}`);

    // Test de extensiones
    console.log('\n[4/4] Verificando extensiones...');
    const extResult = await client.query(`
      SELECT extname FROM pg_extension 
      WHERE extname IN ('uuid-ossp', 'pg_trgm')
    `);
    
    if (extResult.rows.length >= 2) {
      console.log('✅ Extensiones instaladas:', extResult.rows.map(r => r.extname).join(', '));
    } else {
      console.log('⚠️  Algunas extensiones pueden estar faltando');
    }

    console.log('\n🎉 ¡PostgreSQL está configurado correctamente!');
    console.log('\n📝 Siguiente paso: Ejecutar migración con:');
    console.log('   cd backend');
    console.log('   npm install');
    console.log('   npx prisma migrate dev --name init');
    console.log('   npm run db:seed');

  } catch (error) {
    console.error('\n❌ Error de configuración:');
    console.error('   ', error.message);
    console.log('\n🔧 Pasos de solución:');
    console.log('   1. Verifica que PostgreSQL esté ejecutándose');
    console.log('   2. Ejecuta: psql -U postgres -f setup_postgresql.sql');
    console.log('   3. Reinicia PostgreSQL si es necesario');
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 PostgreSQL no está ejecutándose. Inicia el servicio:');
      console.log('   Windows: net start postgresql-x64-13');
      console.log('   macOS: brew services start postgresql');
      console.log('   Linux: sudo systemctl start postgresql');
    }
  } finally {
    await client.end();
  }
}

// Verificar si pg está disponible
try {
  require('pg');
  verifyPostgreSQLSetup();
} catch (error) {
  console.log('📦 Instalando dependencia de PostgreSQL...');
  console.log('Ejecuta: npm install pg @types/pg');
  console.log('Luego ejecuta este script nuevamente.');
}