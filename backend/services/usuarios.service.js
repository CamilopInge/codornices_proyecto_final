/**
 * Gestion de usuarios.
 *
 * Al crear una cuenta no se fija una contrasena: se envia al correo un enlace
 * para que la persona defina la suya. Asi ninguna clave viaja en claro ni queda
 * anotada por el administrador.
 */

import crypto from 'node:crypto';
import config from '../config/env.js';
import { ErrorValidacion, ErrorConflicto, ErrorNoEncontrado } from '../errors.js';
import * as usuarios from '../repositories/usuarios.repo.js';
import * as tokens from '../repositories/tokens.repo.js';
import * as auditoria from '../repositories/auditoria.repo.js';
import { hashearPassword } from './auth.service.js';
import { enviarInvitacion } from './password.service.js';
import { LISTA_ROLES, esRolValido, ROL_NOMBRE } from '../../shared/ica/roles.js';

const RE_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RE_USUARIO = /^[a-z0-9._-]{3,32}$/;

export function listar() {
  return usuarios.listar();
}

export function obtener(id) {
  const usuario = usuarios.buscarPorId(id);
  if (!usuario) throw new ErrorNoEncontrado('Usuario');
  return usuario;
}

export function rolesDisponibles() {
  return LISTA_ROLES.map((rol) => ({ valor: rol, nombre: ROL_NOMBRE[rol] }));
}

/** Crea la cuenta y envia la invitacion para definir contrasena. */
export async function crear({ nombre, username, email, rol, creadoPor, ip = null, userAgent = null }) {
  const nombreLimpio = String(nombre || '').trim();
  const correoLimpio = String(email || '').trim().toLowerCase();
  const usuarioLimpio = String(username || correoLimpio.split('@')[0] || '').trim().toLowerCase();

  if (nombreLimpio.length < 3) throw new ErrorValidacion('El nombre debe tener al menos 3 caracteres.');
  if (!RE_CORREO.test(correoLimpio)) throw new ErrorValidacion('Indique un correo electronico valido.');
  if (!RE_USUARIO.test(usuarioLimpio)) {
    throw new ErrorValidacion('El usuario debe tener entre 3 y 32 caracteres y solo letras, numeros, punto, guion o guion bajo.');
  }
  if (!esRolValido(rol)) throw new ErrorValidacion(`Rol invalido. Use uno de: ${LISTA_ROLES.join(', ')}.`);

  if (usuarios.existeCorreoOUsuario(correoLimpio, usuarioLimpio)) {
    throw new ErrorConflicto('Ya existe una cuenta con ese correo o nombre de usuario.');
  }

  // Clave aleatoria de relleno: queda inutilizable hasta que la persona use el enlace.
  const hashProvisional = await hashearPassword(crypto.randomBytes(32).toString('base64url'));

  const creado = usuarios.crear({
    nombre: nombreLimpio,
    username: usuarioLimpio,
    email: correoLimpio,
    passwordHash: hashProvisional,
    rol,
    debeCambiarPassword: true,
    creadoPor: creadoPor?.id ?? null
  });

  const invitacion = await enviarInvitacion({ usuario: creado, ip, userAgent });

  auditoria.registrar({
    usuario: creadoPor,
    accion: 'crear', entidad: 'usuario', entidadId: creado.id,
    datosDespues: { nombre: creado.nombre, username: creado.username, email: creado.email, rol: creado.rol },
    detalle: { correoEnviado: invitacion.correoEnviado },
    ip, userAgent
  });

  return { usuario: creado, ...invitacion };
}

/** Actualiza nombre, rol o estado. El correo y el usuario no se cambian aqui. */
export function actualizar(id, cambios, { actor, ip = null, userAgent = null }) {
  const actual = usuarios.buscarPorId(id);
  if (!actual) throw new ErrorNoEncontrado('Usuario');

  const propuesta = {};

  if (cambios.nombre !== undefined) {
    const nombre = String(cambios.nombre).trim();
    if (nombre.length < 3) throw new ErrorValidacion('El nombre debe tener al menos 3 caracteres.');
    propuesta.nombre = nombre;
  }

  if (cambios.rol !== undefined) {
    if (!esRolValido(cambios.rol)) throw new ErrorValidacion(`Rol invalido. Use uno de: ${LISTA_ROLES.join(', ')}.`);
    propuesta.rol = cambios.rol;
  }

  if (cambios.activo !== undefined) {
    if (typeof cambios.activo !== 'boolean') throw new ErrorValidacion('El estado activo debe ser verdadero o falso.');
    propuesta.activo = cambios.activo;
  }

  // Nadie puede dejarse sin acceso ni quitarse el rol de administrador a si mismo.
  if (actor?.id === actual.id) {
    if (propuesta.activo === false) throw new ErrorValidacion('No puede desactivar su propia cuenta.');
    if (propuesta.rol && propuesta.rol !== 'admin') {
      throw new ErrorValidacion('No puede quitarse a si mismo el rol de administrador.');
    }
  }

  // El sistema debe conservar siempre al menos un administrador activo.
  const dejaDeSerAdmin = actual.rol === 'admin' && (propuesta.rol && propuesta.rol !== 'admin' || propuesta.activo === false);
  if (dejaDeSerAdmin && usuarios.contarAdministradoresActivos(actual.id) === 0) {
    throw new ErrorConflicto('Debe existir al menos un administrador activo. Asigne otro antes de cambiar este.');
  }

  const actualizado = usuarios.actualizar(id, propuesta);

  // Desactivar una cuenta corta sus sesiones de inmediato.
  if (propuesta.activo === false) tokens.revocarSesionesDe(id);

  auditoria.registrar({
    usuario: actor,
    accion: 'actualizar', entidad: 'usuario', entidadId: id,
    datosAntes: { nombre: actual.nombre, rol: actual.rol, activo: actual.activo },
    datosDespues: { nombre: actualizado.nombre, rol: actualizado.rol, activo: actualizado.activo },
    ip, userAgent
  });

  return actualizado;
}

/** Reenvia la invitacion a una cuenta que aun no definio contrasena. */
export async function reenviarInvitacion(id, { actor, ip = null, userAgent = null }) {
  const usuario = usuarios.buscarPorId(id);
  if (!usuario) throw new ErrorNoEncontrado('Usuario');
  if (!usuario.activo) throw new ErrorValidacion('La cuenta esta inactiva; activela antes de reenviar la invitacion.');

  const invitacion = await enviarInvitacion({ usuario, ip, userAgent });

  auditoria.registrar({
    usuario: actor,
    accion: 'reenviar_invitacion', entidad: 'usuario', entidadId: id,
    detalle: { destinatario: usuario.email, correoEnviado: invitacion.correoEnviado },
    ip, userAgent
  });

  return {
    mensaje: `Se reenvio la invitacion a ${usuario.email}.`,
    ...invitacion
  };
}

export const minimoPassword = () => config.seguridad.longitudMinimaPassword;
