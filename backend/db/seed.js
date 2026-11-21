/**
 * Siembra del administrador inicial.
 *
 * Es idempotente: si la cuenta ya existe no la toca. La contrasena sale de
 * SEED_ADMIN_PASSWORD; si no esta definida se genera una temporal que se
 * muestra una sola vez por consola.
 */

import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import config from '../config/env.js';
import { db } from './index.js';
import * as usuarios from '../repositories/usuarios.repo.js';
import * as auditoria from '../repositories/auditoria.repo.js';

/**
 * @returns {Promise<{creado: boolean, usuario: object, claveGenerada?: string}>}
 */
export async function sembrarAdministrador({ forzar = false } = {}) {
  const { nombre, usuario: username, correo, clave } = config.semilla;

  const existente = usuarios.buscarPorCorreo(correo);
  if (existente && !forzar) {
    return { creado: false, usuario: existente };
  }

  const claveGenerada = clave ? null : crypto.randomBytes(18).toString('base64url');
  const passwordHash = await bcrypt.hash(clave || claveGenerada, config.seguridad.rondasBcrypt);

  if (existente && forzar) {
    const actualizado = usuarios.actualizar(existente.id, {
      nombre,
      username,
      rol: 'admin',
      activo: true,
      debeCambiarPassword: false,
      passwordHash
    });
    auditoria.registrar({
      accion: 'sembrar', entidad: 'usuario', entidadId: actualizado.id,
      detalle: { motivo: 'administrador inicial reestablecido' }
    });
    return { creado: false, actualizado: true, usuario: actualizado, ...(claveGenerada ? { claveGenerada } : {}) };
  }

  const creado = db().transaccion(() =>
    usuarios.crear({
      nombre,
      username,
      email: correo,
      passwordHash,
      rol: 'admin',
      debeCambiarPassword: false
    })
  )();

  auditoria.registrar({
    accion: 'sembrar', entidad: 'usuario', entidadId: creado.id,
    datosDespues: { email: creado.email, username: creado.username, rol: 'admin' },
    detalle: { origen: 'seed', claveDesdeEntorno: Boolean(clave) }
  });

  return { creado: true, usuario: creado, ...(claveGenerada ? { claveGenerada } : {}) };
}

export default sembrarAdministrador;
