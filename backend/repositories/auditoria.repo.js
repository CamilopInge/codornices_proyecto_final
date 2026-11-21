/**
 * Registro de auditoria.
 *
 * Append-only: no existen funciones de actualizacion ni borrado. Cada entrada
 * guarda quien, que, sobre que, desde donde y, cuando aplica, el antes y el despues.
 */

import { db, aJson, desdeJson } from '../db/index.js';

function mapear(fila) {
  if (!fila) return null;
  return {
    id: fila.id,
    usuarioId: fila.usuario_id,
    usuario: fila.usuario_nombre,
    rol: fila.usuario_rol,
    accion: fila.accion,
    entidad: fila.entidad,
    entidadId: fila.entidad_id,
    resultado: fila.resultado,
    datosAntes: desdeJson(fila.datos_antes, null),
    datosDespues: desdeJson(fila.datos_despues, null),
    detalle: desdeJson(fila.detalle_json, {}),
    ip: fila.ip,
    userAgent: fila.user_agent,
    fecha: fila.created_at
  };
}

/**
 * Escribe una entrada de auditoria.
 * Nunca lanza: un fallo registrando la traza no debe tumbar la operacion de negocio,
 * pero si se reporta por consola para que no pase inadvertido.
 */
export function registrar({
  usuario = null,
  accion,
  entidad,
  entidadId = null,
  resultado = 'exito',
  datosAntes = null,
  datosDespues = null,
  detalle = null,
  ip = null,
  userAgent = null
}) {
  try {
    db().run(
      `INSERT INTO auditoria
         (usuario_id, usuario_nombre, usuario_rol, accion, entidad, entidad_id,
          resultado, datos_antes, datos_despues, detalle_json, ip, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      usuario?.id ?? null,
      usuario?.nombre ?? null,
      usuario?.rol ?? null,
      accion,
      entidad,
      entidadId == null ? null : String(entidadId),
      resultado,
      aJson(datosAntes),
      aJson(datosDespues),
      aJson(detalle),
      ip,
      userAgent
    );
  } catch (error) {
    console.error('[auditoria] no se pudo registrar la entrada:', error.message);
  }
}

export function listar({ limite = 100, desplazamiento = 0, usuarioId = null, entidad = null,
                         accion = null, desde = null, hasta = null } = {}) {
  const condiciones = [];
  const valores = [];

  if (usuarioId) { condiciones.push('usuario_id = ?'); valores.push(usuarioId); }
  if (entidad) { condiciones.push('entidad = ?'); valores.push(entidad); }
  if (accion) { condiciones.push('accion = ?'); valores.push(accion); }
  if (desde) { condiciones.push('date(created_at) >= date(?)'); valores.push(desde); }
  if (hasta) { condiciones.push('date(created_at) <= date(?)'); valores.push(hasta); }

  const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';
  return db()
    .all(`SELECT * FROM auditoria ${where} ORDER BY id DESC LIMIT ? OFFSET ?`, ...valores, limite, desplazamiento)
    .map(mapear);
}

export function contar(filtros = {}) {
  const condiciones = [];
  const valores = [];
  if (filtros.usuarioId) { condiciones.push('usuario_id = ?'); valores.push(filtros.usuarioId); }
  if (filtros.entidad) { condiciones.push('entidad = ?'); valores.push(filtros.entidad); }
  if (filtros.accion) { condiciones.push('accion = ?'); valores.push(filtros.accion); }
  const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';
  const fila = db().get(`SELECT COUNT(*) AS total FROM auditoria ${where}`, ...valores);
  return fila?.total ?? 0;
}

export function historialDe(entidad, entidadId) {
  return db()
    .all('SELECT * FROM auditoria WHERE entidad = ? AND entidad_id = ? ORDER BY id DESC', entidad, String(entidadId))
    .map(mapear);
}

/** Acciones distintas registradas, para alimentar el filtro de la vista. */
export function accionesRegistradas() {
  return db().all('SELECT DISTINCT accion FROM auditoria ORDER BY accion').map((fila) => fila.accion);
}

export { mapear as mapearAuditoria };
