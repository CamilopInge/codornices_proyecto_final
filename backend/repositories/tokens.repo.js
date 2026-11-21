/**
 * Tokens de restablecimiento de contrasena y sesiones emitidas.
 *
 * Nunca se guarda el token en claro: solo su hash SHA-256. El enlace que recibe
 * la persona es la unica copia del valor original.
 */

import crypto from 'node:crypto';
import { db } from '../db/index.js';

export const hashToken = (token) => crypto.createHash('sha256').update(String(token)).digest('hex');

// --- Restablecimiento de contrasena -----------------------------------------

/** Invalida los tokens vigentes del usuario y emite uno nuevo. */
export function crearTokenReset({ usuarioId, minutosVigencia, ip = null, userAgent = null }) {
  const token = crypto.randomBytes(32).toString('base64url');

  db().transaccion(() => {
    db().run(
      `UPDATE password_resets
       SET invalidado_en = datetime('now')
       WHERE usuario_id = ? AND usado_en IS NULL AND invalidado_en IS NULL`,
      usuarioId
    );
    db().run(
      `INSERT INTO password_resets (usuario_id, token_hash, expira_en, ip_solicitud, user_agent)
       VALUES (?, ?, datetime('now', ?), ?, ?)`,
      usuarioId,
      hashToken(token),
      `+${minutosVigencia} minutes`,
      ip,
      userAgent
    );
  })();

  return token;
}

/** Busca un token vigente (no usado, no invalidado, no vencido). */
export function buscarTokenVigente(token) {
  return db().get(
    `SELECT r.id, r.usuario_id, r.expira_en, u.email, u.nombre, u.activo
     FROM password_resets r
     JOIN usuarios u ON u.id = r.usuario_id
     WHERE r.token_hash = ?
       AND r.usado_en IS NULL
       AND r.invalidado_en IS NULL
       AND datetime(r.expira_en) > datetime('now')`,
    hashToken(token)
  );
}

export function marcarTokenUsado(id) {
  db().run("UPDATE password_resets SET usado_en = datetime('now') WHERE id = ?", id);
}

export function invalidarTokensDe(usuarioId) {
  db().run(
    `UPDATE password_resets SET invalidado_en = datetime('now')
     WHERE usuario_id = ? AND usado_en IS NULL AND invalidado_en IS NULL`,
    usuarioId
  );
}

/** Cuenta solicitudes recientes para frenar el abuso del formulario de recuperacion. */
export function contarSolicitudesRecientes(usuarioId, minutos) {
  const fila = db().get(
    `SELECT COUNT(*) AS total FROM password_resets
     WHERE usuario_id = ? AND datetime(created_at) > datetime('now', ?)`,
    usuarioId,
    `-${minutos} minutes`
  );
  return fila?.total ?? 0;
}

export function purgarTokensVencidos() {
  const resultado = db().run(
    "DELETE FROM password_resets WHERE datetime(expira_en) < datetime('now', '-7 days')"
  );
  return resultado.changes ?? 0;
}

// --- Sesiones ----------------------------------------------------------------

export function registrarSesion({ usuarioId, jti, expiraEn, ip = null, userAgent = null }) {
  db().run(
    'INSERT INTO sesiones (usuario_id, jti, expira_en, ip, user_agent) VALUES (?, ?, ?, ?, ?)',
    usuarioId,
    jti,
    expiraEn,
    ip,
    userAgent
  );
}

export function sesionVigente(jti) {
  return db().get(
    `SELECT id, usuario_id FROM sesiones
     WHERE jti = ? AND revocada_en IS NULL AND datetime(expira_en) > datetime('now')`,
    jti
  );
}

export function revocarSesion(jti) {
  db().run("UPDATE sesiones SET revocada_en = datetime('now') WHERE jti = ? AND revocada_en IS NULL", jti);
}

export function revocarSesionesDe(usuarioId) {
  db().run(
    "UPDATE sesiones SET revocada_en = datetime('now') WHERE usuario_id = ? AND revocada_en IS NULL",
    usuarioId
  );
}

export function purgarSesionesVencidas() {
  const resultado = db().run("DELETE FROM sesiones WHERE datetime(expira_en) < datetime('now', '-30 days')");
  return resultado.changes ?? 0;
}
