/**
 * Siembra o reestablece el administrador inicial.
 *
 *   npm run seed              crea la cuenta si no existe
 *   npm run seed -- --forzar  reestablece nombre, rol, estado y contrasena
 *
 * La contrasena sale de SEED_ADMIN_PASSWORD en .env.
 */

import config, { validarConfiguracion } from '../backend/config/env.js';
import { inicializarBaseDatos, cerrarBaseDatos } from '../backend/db/index.js';
import { sembrarAdministrador } from '../backend/db/seed.js';

const forzar = process.argv.includes('--forzar');

validarConfiguracion({ silencioso: true });
inicializarBaseDatos({ silencioso: true });

const resultado = await sembrarAdministrador({ forzar });

console.log('');
if (resultado.creado) {
  console.log('Administrador creado:');
} else if (resultado.actualizado) {
  console.log('Administrador reestablecido:');
} else {
  console.log('El administrador ya existia (use --forzar para reestablecerlo):');
}

console.log(`  Nombre   ${resultado.usuario.nombre}`);
console.log(`  Usuario  ${resultado.usuario.username}`);
console.log(`  Correo   ${resultado.usuario.email}`);
console.log(`  Rol      ${resultado.usuario.rol}`);

if (resultado.claveGenerada) {
  console.log('');
  console.warn(`  Clave temporal generada: ${resultado.claveGenerada}`);
  console.warn('  No se volvera a mostrar. Definala en SEED_ADMIN_PASSWORD para fijarla.');
} else if (resultado.creado || resultado.actualizado) {
  console.log('');
  console.log('  Contrasena: la definida en SEED_ADMIN_PASSWORD.');
}

console.log(`\n  Entre en ${config.servidor.urlPublica}\n`);

cerrarBaseDatos();
