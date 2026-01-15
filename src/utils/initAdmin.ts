import { executeQuery } from '../config/database';
import bcrypt from 'bcryptjs';

// Credenciales por defecto del usuario admin
const DEFAULT_ADMIN = {
  username: 'admin',
  email: 'admin@mfcomputers.com',
  password: 'admin123', // ⚠️ IMPORTANTE: Cambiar esta contraseña después del primer login
  firstName: 'Administrador',
  lastName: 'Sistema',
  role: 'admin' as const
};

/**
 * Inicializa un usuario admin por defecto si no existe ninguno
 * Esta función es idempotente: solo crea el admin si no existe
 */
export async function initializeAdminUser(): Promise<void> {
  try {
    // Verificar si ya existe un usuario admin activo
    const sql = `SELECT id, username FROM users WHERE role = ? AND is_active = 1 LIMIT 1`;
    const existingAdmins = await executeQuery(sql, ['admin']) as Array<{ id: number; username: string }>;

    if (existingAdmins.length > 0) {
      console.log(`✅ Usuario admin ya existe: ${existingAdmins[0].username} (ID: ${existingAdmins[0].id})`);
      return;
    }

    console.log('⚠️  No se encontró ningún usuario admin activo.');
    console.log('🔨 Creando usuario admin por defecto...');

    // Hashear la contraseña
    const passwordHash = await bcrypt.hash(DEFAULT_ADMIN.password, 10);

    // Insertar el usuario admin
    const insertSql = `INSERT INTO users (username, email, password_hash, first_name, last_name, role, is_active) 
                       VALUES (?, ?, ?, ?, ?, ?, ?)`;
    await executeQuery(insertSql, [
      DEFAULT_ADMIN.username,
      DEFAULT_ADMIN.email,
      passwordHash,
      DEFAULT_ADMIN.firstName,
      DEFAULT_ADMIN.lastName,
      DEFAULT_ADMIN.role,
      true
    ]);

    console.log('✅ Usuario admin creado exitosamente!');
    console.log(`📋 Credenciales: Username: ${DEFAULT_ADMIN.username}, Password: ${DEFAULT_ADMIN.password}`);
    console.log('⚠️  IMPORTANTE: Cambia la contraseña después del primer login por seguridad.');

  } catch (error: any) {
    // Si el usuario ya existe (duplicate entry), no es un error crítico
    if (error.code === 'ER_DUP_ENTRY' || error.message?.includes('Duplicate entry')) {
      console.log('✅ Usuario admin ya existe en la base de datos.');
    } else {
      console.error('❌ Error inicializando usuario admin:', error.message);
      // No lanzar el error para que el servidor pueda iniciar incluso si falla la inicialización
    }
  }
}
