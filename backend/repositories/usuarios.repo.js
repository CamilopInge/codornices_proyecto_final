/**
 * Acceso a datos de usuarios.
 * Solo SQL y mapeo de filas; las reglas de negocio viven en los servicios.
 */

import { db, aBool, deBool } from '../db/index.js';

/** Columnas seguras: nunca exponen password_hash fuera del repositorio. */
const CAMPOS_PUBLICOS = `
  id, nombre, username, email, rol, activo, debe_cambiar_password,
  ultimo_acceso, created_at, updated_at
`;

function mapear(fila) {
  if (!fila) return null;
  return {
    id: fila.id,
    nombre: fila.nombre,
    username: fila.username,
    email: fila.email,
    rol: fila.rol,
    activo: aBool(fila.activo),
    debeCambiarPassword: aBool(fila.debe_cambiar_password),
    ultimoAcceso: fila.ultimo_acceso,
    creadoEn: fila.created_at,
    actualizadoEn: fila.updated_at
  };
}

export function listar({ incluirInactivos = true } = {}) {
  const filtro = incluirInactivos ? '' : 'WHERE activo = 1';
  return db()
    .all(`SELECT ${CAMPOS_PUBLICOS} FROM usuarios ${filtro} ORDER BY nombre COLLATE NOCASE`)
    .map(mapear);
}

export function buscarPorId(id) {
  return mapear(db().get(`SELECT ${CAMPOS_PUBLICOS} FROM usuarios WHERE id = ?`, id));
}

/** Incluye el hash: uso exclusivo del servicio de autenticacion. */
export function buscarCredenciales(identificador) {
  const valor = String(identificador || '').trim().toLowerCase();
  return db().get(
    `SELECT id, nombre, username, email, password_hash, rol, activo,
            debe_cambiar_password, intentos_fallidos, bloqueado_hasta
     FROM usuarios
     WHERE lower(email) = ? OR lower(username) = ?`,
    valor,
    valor
  );
}

/** Incluye el hash, buscando por id. Uso exclusivo de los servicios de seguridad. */
export function buscarCredencialesPorId(id) {
  return db().get(
    `SELECT id, nombre, username, email, password_hash, rol, activo, debe_cambiar_password
     FROM usuarios WHERE id = ?`,
    id
  );
}

export function buscarPorCorreo(email) {
  return mapear(db().get(`SELECT ${CAMPOS_PUBLICOS} FROM usuarios WHERE lower(email) = ?`, String(email || '').trim().toLowerCase()));
}

export function existeCorreoOUsuario(email, username, excluirId = null) {
  const fila = db().get(
    `SELECT id FROM usuarios
     WHERE (lower(email) = ? OR lower(username) = ?)
       AND (? IS NULL OR id <> ?)`,
    String(email || '').toLowerCase(),
    String(username || '').toLowerCase(),
    excluirId,
    excluirId
  );
  return Boolean(fila);
}

export function crear({ nombre, username, email, passwordHash, rol, debeCambiarPassword = false, creadoPor = null }) {
  const resultado = db().run(
    `INSERT INTO usuarios (nombre, username, email, password_hash, rol, debe_cambiar_password, creado_por)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    nombre,
    String(username).toLowerCase(),
    String(email).toLowerCase(),
    passwordHash,
    rol,
    deBool(debeCambiarPassword),
    creadoPor
  );
  return buscarPorId(Number(resultado.lastInsertRowid));
}

export function actualizar(id, cambios) {
  const asignaciones = [];
  const valores = [];

  const mapa = {
    nombre: 'nombre',
    username: 'username',
    email: 'email',
    rol: 'rol',
    activo: 'activo',
    debeCambiarPassword: 'debe_cambiar_password',
    passwordHash: 'password_hash'
  };

  for (const [clave, columna] of Object.entries(mapa)) {
    if (cambios[clave] === undefined) continue;
    let valor = cambios[clave];
    if (clave === 'activo' || clave === 'debeCambiarPassword') valor = deBool(valor);
    if (clave === 'username' || clave === 'email') valor = String(valor).toLowerCase();
    asignaciones.push(`${columna} = ?`);
    valores.push(valor);
  }

  if (!asignaciones.length) return buscarPorId(id);

  asignaciones.push("updated_at = datetime('now')");
  db().run(`UPDATE usuarios SET ${asignaciones.join(', ')} WHERE id = ?`, ...valores, id);
  return buscarPorId(id);
}

export function registrarAcceso(id) {
  db().run(
    "UPDATE usuarios SET ultimo_acceso = datetime('now'), intentos_fallidos = 0, bloqueado_hasta = NULL WHERE id = ?",
    id
  );
}

/** Suma un intento fallido y bloquea la cuenta al alcanzar el maximo. */
export function registrarIntentoFallido(id, { maximo, minutosBloqueo }) {
  const fila = db().get('SELECT intentos_fallidos FROM usuarios WHERE id = ?', id);
  const intentos = (fila?.intentos_fallidos ?? 0) + 1;
  const bloquear = intentos >= maximo;

  db().run(
    `UPDATE usuarios
     SET intentos_fallidos = ?,
         bloqueado_hasta = CASE WHEN ? = 1 THEN datetime('now', ?) ELSE bloqueado_hasta END
     WHERE id = ?`,
    intentos,
    bloquear ? 1 : 0,
    `+${minutosBloqueo} minutes`,
    id
  );

  return { intentos, bloqueada: bloquear };
}

export function contarAdministradoresActivos(excluirId = null) {
  const fila = db().get(
    `SELECT COUNT(*) AS total FROM usuarios
     WHERE rol = 'admin' AND activo = 1 AND (? IS NULL OR id <> ?)`,
    excluirId,
    excluirId
  );
  return fila?.total ?? 0;
}

export { mapear as mapearUsuario };
