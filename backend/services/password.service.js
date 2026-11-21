/**
 * Restablecimiento de contrasena.
 *
 * Flujo:
 *   1. La persona pide el restablecimiento desde la pantalla de acceso.
 *   2. Se emite un token de un solo uso; en la base queda solo su hash.
 *   3. Se envia el enlace por correo desde administrador@evalcodorniz.edu.co.
 *   4. Al definir la contrasena nueva el token se marca usado y se cierran
 *      todas las sesiones abiertas de esa cuenta.
 *
 * La respuesta de "solicitar" es siempre la misma exista o no la cuenta, para
 * que el formulario no sirva de directorio de correos registrados.
 */

import config from '../config/env.js';
import { ErrorValidacion, ErrorLimiteExcedido } from '../errors.js';
import * as usuarios from '../repositories/usuarios.repo.js';
import * as tokens from '../repositories/tokens.repo.js';
import * as auditoria from '../repositories/auditoria.repo.js';
import { enviarCorreo } from '../mail/transport.js';
import { plantillaRestablecer, plantillaBienvenida, plantillaPasswordCambiada } from '../mail/templates.js';
import { hashearPassword } from './auth.service.js';
import { ROL_NOMBRE } from '../../shared/ica/roles.js';

const MAX_SOLICITUDES_POR_HORA = 5;

const construirEnlace = (token) =>
  `${config.servidor.urlPublica}/#/restablecer?token=${encodeURIComponent(token)}`;

/**
 * Solicita el restablecimiento. Responde igual exista o no la cuenta.
 * @returns {{mensaje: string, enlaceDesarrollo?: string}}
 */
export async function solicitarRestablecimiento({ correo, ip = null, userAgent = null }) {
  const email = String(correo || '').trim().toLowerCase();
  const respuestaNeutra = {
    mensaje: 'Si el correo corresponde a una cuenta registrada, enviamos un enlace para restablecer la contrasena.'
  };

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new ErrorValidacion('Indique un correo electronico valido.');
  }

  const usuario = usuarios.buscarPorCorreo(email);

  if (!usuario || !usuario.activo) {
    auditoria.registrar({
      accion: 'solicitar_reset', entidad: 'usuario', resultado: 'fallo',
      detalle: { correo: email, motivo: usuario ? 'cuenta inactiva' : 'correo no registrado' },
      ip, userAgent
    });
    return respuestaNeutra;
  }

  if (tokens.contarSolicitudesRecientes(usuario.id, 60) >= MAX_SOLICITUDES_POR_HORA) {
    auditoria.registrar({
      usuario: { id: usuario.id, nombre: usuario.nombre, rol: usuario.rol },
      accion: 'solicitar_reset', entidad: 'usuario', entidadId: usuario.id, resultado: 'fallo',
      detalle: { motivo: 'limite de solicitudes por hora' }, ip, userAgent
    });
    throw new ErrorLimiteExcedido('Ya se enviaron varios enlaces a este correo. Espere una hora antes de volver a solicitarlo.');
  }

  const minutos = config.seguridad.vigenciaResetMinutos;
  const token = tokens.crearTokenReset({ usuarioId: usuario.id, minutosVigencia: minutos, ip, userAgent });
  const enlace = construirEnlace(token);

  const plantilla = plantillaRestablecer({ nombre: usuario.nombre, enlace, minutosVigencia: minutos });
  const envio = await enviarCorreo({ para: usuario.email, ...plantilla, plantilla: 'restablecer-password' });

  auditoria.registrar({
    usuario: { id: usuario.id, nombre: usuario.nombre, rol: usuario.rol },
    accion: 'solicitar_reset', entidad: 'usuario', entidadId: usuario.id,
    detalle: { correoEnviado: envio.enviado, registradoEnDisco: Boolean(envio.registrado) },
    ip, userAgent
  });

  // Sin SMTP el enlace se devuelve para no bloquear las pruebas locales.
  // En produccion nunca se expone: ahi el correo si sale.
  if (!envio.enviado && !config.esProduccion) {
    return { ...respuestaNeutra, enlaceDesarrollo: enlace };
  }
  return respuestaNeutra;
}

/** Comprueba si un token sigue siendo utilizable, para que la vista decida que mostrar. */
export function validarToken(token) {
  const registro = tokens.buscarTokenVigente(String(token || ''));
  if (!registro || !registro.activo) {
    return { valido: false, mensaje: 'El enlace no es valido, ya se uso o vencio. Solicite uno nuevo.' };
  }
  return { valido: true, nombre: registro.nombre, correo: registro.email, expiraEn: registro.expira_en };
}

/** Define la contrasena nueva usando el token recibido por correo. */
export async function restablecerPassword({ token, passwordNueva, ip = null, userAgent = null }) {
  const minimo = config.seguridad.longitudMinimaPassword;

  if (!token) throw new ErrorValidacion('Falta el token de restablecimiento.');
  if (!passwordNueva || passwordNueva.length < minimo) {
    throw new ErrorValidacion(`La contrasena debe tener al menos ${minimo} caracteres.`);
  }

  const registro = tokens.buscarTokenVigente(String(token));
  if (!registro) {
    auditoria.registrar({
      accion: 'restablecer_password', entidad: 'usuario', resultado: 'fallo',
      detalle: { motivo: 'token invalido o vencido' }, ip, userAgent
    });
    throw new ErrorValidacion('El enlace no es valido, ya se uso o vencio. Solicite uno nuevo.');
  }
  if (!registro.activo) {
    throw new ErrorValidacion('La cuenta esta inactiva. Contacte al administrador.');
  }

  const hash = await hashearPassword(passwordNueva);

  usuarios.actualizar(registro.usuario_id, { passwordHash: hash, debeCambiarPassword: false });
  tokens.marcarTokenUsado(registro.id);
  tokens.invalidarTokensDe(registro.usuario_id);
  tokens.revocarSesionesDe(registro.usuario_id);

  // Un restablecimiento exitoso tambien levanta el bloqueo por intentos fallidos.
  usuarios.registrarAcceso(registro.usuario_id);

  auditoria.registrar({
    usuario: { id: registro.usuario_id, nombre: registro.nombre },
    accion: 'restablecer_password', entidad: 'usuario', entidadId: registro.usuario_id,
    ip, userAgent
  });

  const aviso = plantillaPasswordCambiada({
    nombre: registro.nombre,
    cuando: new Date().toLocaleString('es-CO', { dateStyle: 'long', timeStyle: 'short' })
  });
  enviarCorreo({ para: registro.email, ...aviso, plantilla: 'password-cambiada' }).catch(() => {});

  return { mensaje: 'Contrasena definida. Ya puede iniciar sesion.' };
}

/**
 * Envia a un usuario recien creado el enlace para definir su primera contrasena.
 * Lo usa el servicio de usuarios al dar de alta una cuenta.
 */
export async function enviarInvitacion({ usuario, ip = null, userAgent = null }) {
  const minutos = config.seguridad.vigenciaResetMinutos;
  const token = tokens.crearTokenReset({ usuarioId: usuario.id, minutosVigencia: minutos, ip, userAgent });
  const enlace = construirEnlace(token);

  const plantilla = plantillaBienvenida({
    nombre: usuario.nombre,
    usuario: usuario.username,
    rol: ROL_NOMBRE[usuario.rol] ?? usuario.rol,
    enlace,
    minutosVigencia: minutos
  });

  const envio = await enviarCorreo({ para: usuario.email, ...plantilla, plantilla: 'bienvenida' });

  return {
    correoEnviado: envio.enviado,
    ...(!envio.enviado && !config.esProduccion ? { enlaceDesarrollo: enlace } : {})
  };
}

/** Un administrador fuerza el restablecimiento de otra cuenta. */
export async function restablecerComoAdministrador({ usuarioId, administrador, ip = null, userAgent = null }) {
  const usuario = usuarios.buscarPorId(usuarioId);
  if (!usuario) throw new ErrorValidacion('Usuario no encontrado.');

  usuarios.actualizar(usuario.id, { debeCambiarPassword: true });
  tokens.revocarSesionesDe(usuario.id);

  const resultado = await enviarInvitacion({ usuario, ip, userAgent });

  auditoria.registrar({
    usuario: administrador,
    accion: 'forzar_reset', entidad: 'usuario', entidadId: usuario.id,
    detalle: { destinatario: usuario.email, correoEnviado: resultado.correoEnviado },
    ip, userAgent
  });

  return {
    mensaje: `Se envio a ${usuario.email} un enlace para definir una contrasena nueva. Las sesiones abiertas se cerraron.`,
    ...resultado
  };
}
