/**
 * Autenticacion: inicio de sesion, verificacion de token y cierre de sesion.
 *
 * Mejoras frente a la version anterior:
 *  - Bloqueo por cuenta ademas del limite por IP, para frenar el ataque dirigido
 *    a un usuario concreto desde muchas direcciones.
 *  - Cada token lleva un identificador (jti) registrado en la tabla sesiones,
 *    de modo que se puede revocar antes de su vencimiento.
 *  - El hash siempre se compara, exista o no el usuario, para no filtrar por
 *    diferencia de tiempo que correos estan registrados.
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import config from '../config/env.js';
import { ErrorAutenticacion, ErrorValidacion } from '../errors.js';
import * as usuarios from '../repositories/usuarios.repo.js';
import * as tokens from '../repositories/tokens.repo.js';
import * as auditoria from '../repositories/auditoria.repo.js';
import { enviarCorreo } from '../mail/transport.js';
import { plantillaPasswordCambiada } from '../mail/templates.js';

/** Hash de descarte: mantiene constante el costo del login con correo inexistente. */
const HASH_SENUELO = bcrypt.hashSync(crypto.randomBytes(24).toString('hex'), 10);

export const hashearPassword = (clave) => bcrypt.hash(clave, config.seguridad.rondasBcrypt);

/** Convierte "8h", "45m" o "3600" en segundos. */
function vigenciaEnSegundos(vigencia) {
  const texto = String(vigencia).trim();
  const coincide = texto.match(/^(\d+)([smhd])?$/);
  if (!coincide) return 8 * 3600;
  const cantidad = Number(coincide[1]);
  const factor = { s: 1, m: 60, h: 3600, d: 86400 }[coincide[2] ?? 's'] ?? 1;
  return cantidad * factor;
}

function datosPublicos(usuario) {
  return {
    id: usuario.id,
    nombre: usuario.nombre,
    username: usuario.username,
    email: usuario.email,
    rol: usuario.rol,
    debeCambiarPassword: Boolean(usuario.debe_cambiar_password ?? usuario.debeCambiarPassword)
  };
}

/**
 * Valida credenciales y emite un token.
 * @param {{identificador: string, password: string, ip?: string, userAgent?: string}} datos
 */
export async function iniciarSesion({ identificador, password, ip = null, userAgent = null }) {
  if (!identificador || !password) {
    throw new ErrorValidacion('Indique su usuario o correo y su contrasena.');
  }

  const fila = usuarios.buscarCredenciales(identificador);

  // Se compara siempre, incluso sin usuario, para que el tiempo de respuesta no delate nada.
  const coincide = await bcrypt.compare(String(password), fila?.password_hash ?? HASH_SENUELO);

  if (!fila) {
    auditoria.registrar({
      accion: 'login', entidad: 'usuario', resultado: 'fallo',
      detalle: { identificador, motivo: 'usuario inexistente' }, ip, userAgent
    });
    throw new ErrorAutenticacion('Usuario o contrasena incorrectos.');
  }

  if (!fila.activo) {
    auditoria.registrar({
      usuario: { id: fila.id, nombre: fila.nombre, rol: fila.rol },
      accion: 'login', entidad: 'usuario', entidadId: fila.id, resultado: 'fallo',
      detalle: { motivo: 'cuenta inactiva' }, ip, userAgent
    });
    throw new ErrorAutenticacion('La cuenta esta inactiva. Contacte al administrador.');
  }

  if (fila.bloqueado_hasta && new Date(`${fila.bloqueado_hasta}Z`) > new Date()) {
    auditoria.registrar({
      usuario: { id: fila.id, nombre: fila.nombre, rol: fila.rol },
      accion: 'login', entidad: 'usuario', entidadId: fila.id, resultado: 'fallo',
      detalle: { motivo: 'cuenta bloqueada' }, ip, userAgent
    });
    throw new ErrorAutenticacion('La cuenta esta bloqueada temporalmente por intentos fallidos. Intente mas tarde o restablezca su contrasena.');
  }

  if (!coincide) {
    const estado = usuarios.registrarIntentoFallido(fila.id, {
      maximo: config.seguridad.intentosMaximosLogin,
      minutosBloqueo: config.seguridad.ventanaBloqueoMinutos
    });
    auditoria.registrar({
      usuario: { id: fila.id, nombre: fila.nombre, rol: fila.rol },
      accion: 'login', entidad: 'usuario', entidadId: fila.id, resultado: 'fallo',
      detalle: { motivo: 'contrasena incorrecta', intentos: estado.intentos, bloqueada: estado.bloqueada },
      ip, userAgent
    });
    throw new ErrorAutenticacion(
      estado.bloqueada
        ? `Cuenta bloqueada por ${config.seguridad.ventanaBloqueoMinutos} minutos tras ${estado.intentos} intentos fallidos.`
        : 'Usuario o contrasena incorrectos.'
    );
  }

  const jti = crypto.randomUUID();
  const segundos = vigenciaEnSegundos(config.seguridad.vigenciaToken);
  const expiraEn = new Date(Date.now() + segundos * 1000).toISOString();

  const token = jwt.sign({ sub: fila.id, rol: fila.rol, jti }, config.seguridad.secretoJwt, { expiresIn: segundos });

  tokens.registrarSesion({ usuarioId: fila.id, jti, expiraEn, ip, userAgent });
  usuarios.registrarAcceso(fila.id);

  auditoria.registrar({
    usuario: { id: fila.id, nombre: fila.nombre, rol: fila.rol },
    accion: 'login', entidad: 'usuario', entidadId: fila.id, ip, userAgent
  });

  return { token, expiraEn, vigenciaSegundos: segundos, usuario: datosPublicos(fila) };
}

/** Verifica un token y devuelve el usuario vigente. Lanza si no es utilizable. */
export function verificarToken(token) {
  let claims;
  try {
    claims = jwt.verify(token, config.seguridad.secretoJwt);
  } catch {
    throw new ErrorAutenticacion('Su sesion vencio o el token no es valido. Inicie sesion de nuevo.');
  }

  if (claims.jti && !tokens.sesionVigente(claims.jti)) {
    throw new ErrorAutenticacion('La sesion fue cerrada. Inicie sesion de nuevo.');
  }

  const usuario = usuarios.buscarPorId(claims.sub);
  if (!usuario || !usuario.activo) {
    throw new ErrorAutenticacion('La cuenta ya no esta activa.');
  }

  return { ...usuario, jti: claims.jti };
}

export function cerrarSesion({ jti, usuario, ip = null, userAgent = null }) {
  if (jti) tokens.revocarSesion(jti);
  auditoria.registrar({
    usuario, accion: 'logout', entidad: 'usuario', entidadId: usuario?.id, ip, userAgent
  });
  return { mensaje: 'Sesion cerrada.' };
}

/**
 * Cambio de contrasena por parte del propio usuario autenticado.
 * Exige la contrasena actual y revoca las demas sesiones.
 */
export async function cambiarPassword({ usuarioId, passwordActual, passwordNueva, ip = null, userAgent = null }) {
  const minimo = config.seguridad.longitudMinimaPassword;
  if (!passwordNueva || passwordNueva.length < minimo) {
    throw new ErrorValidacion(`La contrasena nueva debe tener al menos ${minimo} caracteres.`);
  }
  if (passwordActual === passwordNueva) {
    throw new ErrorValidacion('La contrasena nueva debe ser distinta de la actual.');
  }

  const cuenta = usuarios.buscarCredencialesPorId(usuarioId);
  if (!cuenta) throw new ErrorAutenticacion('Usuario no encontrado.');

  const coincide = await bcrypt.compare(String(passwordActual ?? ''), cuenta.password_hash);
  if (!coincide) {
    auditoria.registrar({
      usuario: { id: cuenta.id, nombre: cuenta.nombre, rol: cuenta.rol },
      accion: 'cambiar_password', entidad: 'usuario', entidadId: cuenta.id, resultado: 'fallo',
      detalle: { motivo: 'contrasena actual incorrecta' }, ip, userAgent
    });
    throw new ErrorAutenticacion('La contrasena actual no es correcta.');
  }

  const hash = await hashearPassword(passwordNueva);
  usuarios.actualizar(cuenta.id, { passwordHash: hash, debeCambiarPassword: false });
  tokens.revocarSesionesDe(cuenta.id);
  tokens.invalidarTokensDe(cuenta.id);

  auditoria.registrar({
    usuario: { id: cuenta.id, nombre: cuenta.nombre, rol: cuenta.rol },
    accion: 'cambiar_password', entidad: 'usuario', entidadId: cuenta.id, ip, userAgent
  });

  const aviso = plantillaPasswordCambiada({
    nombre: cuenta.nombre,
    cuando: new Date().toLocaleString('es-CO', { dateStyle: 'long', timeStyle: 'short' })
  });
  enviarCorreo({ para: cuenta.email, ...aviso, plantilla: 'password-cambiada' }).catch(() => {});

  return { mensaje: 'Contrasena actualizada. Inicie sesion de nuevo.' };
}

export { datosPublicos };
