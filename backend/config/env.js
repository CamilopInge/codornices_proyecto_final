/**
 * Carga y validacion de la configuracion.
 *
 * Un unico lugar lee process.env. El resto del backend importa `config`, de modo
 * que ninguna capa depende directamente del entorno y las pruebas pueden sustituirlo.
 */

import 'dotenv/config';
import crypto from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = path.dirname(fileURLToPath(import.meta.url));
export const RAIZ_PROYECTO = path.resolve(aqui, '..', '..');

const entero = (valor, porDefecto) => {
  const numero = Number(valor);
  return Number.isFinite(numero) && numero > 0 ? Math.trunc(numero) : porDefecto;
};

const booleano = (valor, porDefecto = false) => {
  if (valor == null || valor === '') return porDefecto;
  return ['1', 'true', 'si', 'yes', 'on'].includes(String(valor).toLowerCase());
};

const entorno = process.env.NODE_ENV || 'development';
const esProduccion = entorno === 'production';

/** Proveedores publicos que siempre exigen usuario y contrasena. */
const PROVEEDORES_CON_AUTH = /gmail|googlemail|office365|outlook|hotmail|yahoo|zoho|sendgrid|brevo|sendinblue|mailgun|resend|postmark|amazonaws/i;

/**
 * Configuracion de correo.
 *
 * `habilitado` exige que las credenciales esten completas, no solo el host: con
 * un host sin usuario ni contrasena, Gmail acepta la conexion pero rechaza el
 * envio, de modo que el sistema parecia configurado y no enviaba nada.
 */
function correoConfig() {
  const host = process.env.SMTP_HOST || '';
  const usuario = process.env.SMTP_USER || '';
  const clave = process.env.SMTP_PASSWORD || '';

  const exigeAuth = PROVEEDORES_CON_AUTH.test(host);
  // Un relay interno puede no pedir autenticacion, pero indicar solo uno de los
  // dos datos siempre es un error de configuracion.
  const credencialesCompletas = exigeAuth
    ? Boolean(usuario && clave)
    : Boolean(usuario) === Boolean(clave);

  return {
    remitente: process.env.MAIL_FROM || 'administrador@evalcodorniz.edu.co',
    nombreRemitente: process.env.MAIL_FROM_NAME || 'EvalCodorniz ICA',
    host,
    puerto: entero(process.env.SMTP_PORT, 587),
    seguro: booleano(process.env.SMTP_SECURE, false),
    usuario,
    clave,
    exigeAuth,
    // Sin esto el correo se escribe en data/correos-salientes en vez de enviarse.
    habilitado: Boolean(host) && credencialesCompletas,
    // Host puesto pero credenciales a medias: hay que avisarlo, no ignorarlo.
    incompleto: Boolean(host) && !credencialesCompletas
  };
}

const directorioDatos = path.resolve(process.env.DATA_DIR || path.join(RAIZ_PROYECTO, 'data'));

export const config = {
  entorno,
  esProduccion,
  esPrueba: entorno === 'test',

  servidor: {
    puerto: entero(process.env.API_PORT || process.env.PORT, 3000),
    host: process.env.API_HOST || '0.0.0.0',
    urlPublica: (process.env.APP_URL || `http://localhost:${entero(process.env.API_PORT || process.env.PORT, 3000)}`).replace(/\/+$/, ''),
    origenesPermitidos: (process.env.FRONTEND_ORIGIN || '')
      .split(',')
      .map((origen) => origen.trim())
      .filter(Boolean)
  },

  rutas: {
    raiz: RAIZ_PROYECTO,
    datos: directorioDatos,
    evidencias: path.join(directorioDatos, 'evidencias'),
    baseDatos: path.join(directorioDatos, 'bienestar-ica.sqlite'),
    respaldos: path.resolve(process.env.BACKUP_DIR || path.join(os.homedir(), 'bienestarica-backups')),
    frontend: path.join(RAIZ_PROYECTO, 'frontend'),
    compartido: path.join(RAIZ_PROYECTO, 'shared')
  },

  seguridad: {
    secretoJwt: process.env.JWT_SECRET || '',
    vigenciaToken: process.env.JWT_TTL || '8h',
    rondasBcrypt: entero(process.env.BCRYPT_ROUNDS, 12),
    longitudMinimaPassword: entero(process.env.MIN_PASSWORD_LENGTH, 12),
    intentosMaximosLogin: entero(process.env.MAX_LOGIN_ATTEMPTS, 8),
    ventanaBloqueoMinutos: entero(process.env.LOGIN_WINDOW_MINUTES, 15),
    vigenciaResetMinutos: entero(process.env.RESET_TOKEN_TTL_MINUTES, 60)
  },

  archivos: {
    tamanoMaximoBytes: entero(process.env.MAX_FILE_BYTES, 5 * 1024 * 1024),
    tiposPermitidos: {
      '.pdf': 'application/pdf',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png'
    }
  },

  correo: correoConfig(),

  semilla: {
    nombre: process.env.SEED_ADMIN_NOMBRE || 'Administrador',
    usuario: (process.env.SEED_ADMIN_USERNAME || 'administrador').trim().toLowerCase(),
    correo: (process.env.SEED_ADMIN_EMAIL || 'administrador@evalcodorniz.edu.co').trim().toLowerCase(),
    clave: process.env.SEED_ADMIN_PASSWORD || ''
  },

  ia: {
    clave: process.env.OPENAI_API_KEY || '',
    baseUrl: process.env.OPENAI_API_BASE || '',
    modelo: process.env.AI_MODEL || 'gpt-4.1-mini',
    habilitada: Boolean(process.env.OPENAI_API_KEY)
  },

  /**
   * Asistente conversacional sobre los datos del sistema.
   * Sin GEMINI_API_KEY el asistente queda deshabilitado y la interfaz lo
   * indica en vez de fallar.
   */
  asistente: {
    clave: process.env.GEMINI_API_KEY || '',
    // Alias en vez de una version fija: Google retira modelos con cierta
    // frecuencia y un nombre concreto deja de existir sin aviso.
    modelo: process.env.GEMINI_MODEL || 'gemini-flash-latest',
    baseUrl: (process.env.GEMINI_API_BASE || 'https://generativelanguage.googleapis.com/v1beta').replace(/\/+$/, ''),
    temperatura: Number(process.env.GEMINI_TEMPERATURE ?? 0.2),
    maximoTokens: entero(process.env.GEMINI_MAX_TOKENS, 1024),
    // Cuantas preguntas puede hacer una persona por hora.
    limitePorHora: entero(process.env.ASISTENTE_LIMITE_HORA, 60),
    // Cuantos turnos previos se reenvian como contexto de la conversacion.
    turnosHistorial: entero(process.env.ASISTENTE_TURNOS_HISTORIAL, 6),
    habilitado: Boolean(process.env.GEMINI_API_KEY)
  }
};

/**
 * Valida la configuracion critica.
 * En produccion los fallos son fatales; en desarrollo se avisa y se continua
 * con valores efimeros para no bloquear el trabajo local.
 */
export function validarConfiguracion({ silencioso = false } = {}) {
  const errores = [];
  const avisos = [];

  const secreto = config.seguridad.secretoJwt;
  if (secreto && (secreto.length < 32 || /^(replace|cambiar|changeme)/i.test(secreto))) {
    errores.push('JWT_SECRET debe tener al menos 32 caracteres aleatorios y no puede ser el valor de ejemplo.');
  }
  if (!secreto) {
    if (config.esProduccion) errores.push('En produccion JWT_SECRET es obligatorio.');
    else {
      config.seguridad.secretoJwt = crypto.randomBytes(48).toString('hex');
      avisos.push('JWT_SECRET no configurado: se genero uno efimero. Las sesiones se invalidan al reiniciar.');
    }
  }

  const clave = config.semilla.clave;
  if (clave && clave.length < config.seguridad.longitudMinimaPassword) {
    errores.push(`SEED_ADMIN_PASSWORD debe tener al menos ${config.seguridad.longitudMinimaPassword} caracteres.`);
  }
  if (!clave && config.esProduccion) {
    errores.push('En produccion SEED_ADMIN_PASSWORD es obligatorio.');
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(config.semilla.correo)) {
    errores.push('SEED_ADMIN_EMAIL debe ser un correo valido.');
  }

  if (config.correo.incompleto) {
    avisos.push(
      `SMTP_HOST esta configurado (${config.correo.host}) pero faltan SMTP_USER o SMTP_PASSWORD. ` +
      'Los correos se registraran en disco en vez de enviarse. Verifique con: npm run probar-correo'
    );
  } else if (config.esProduccion && !config.correo.habilitado) {
    avisos.push('SMTP no configurado: los correos de restablecimiento se registraran en disco en vez de enviarse.');
  }

  if (config.correo.habilitado) {
    const esGmail = /gmail|googlemail/i.test(config.correo.host);
    const claveSinEspacios = config.correo.clave.replace(/\s/g, '');

    if (esGmail && claveSinEspacios.length !== 16) {
      avisos.push(
        `Gmail espera una contrasena de aplicacion de 16 caracteres y la configurada tiene ${claveSinEspacios.length}. ` +
        'Genere una en https://myaccount.google.com/apppasswords y verifique con: npm run probar-correo'
      );
    }

    // Gmail reescribe el remitente si no es la cuenta autenticada ni un alias verificado,
    // asi que el correo no saldria de la direccion institucional configurada.
    if (esGmail && config.correo.usuario &&
        config.correo.remitente.toLowerCase() !== config.correo.usuario.toLowerCase()) {
      avisos.push(
        `MAIL_FROM (${config.correo.remitente}) no coincide con SMTP_USER (${config.correo.usuario}). ` +
        'Gmail reescribira el remitente salvo que esa direccion sea un alias verificado en la cuenta.'
      );
    }

    if (config.correo.puerto === 465 && !config.correo.seguro) {
      avisos.push('El puerto 465 requiere SMTP_SECURE=true.');
    }
    if (config.correo.puerto === 587 && config.correo.seguro) {
      avisos.push('El puerto 587 usa STARTTLS, de modo que SMTP_SECURE debe ser false.');
    }
  }

  if (errores.length) {
    const detalle = errores.map((mensaje) => `  - ${mensaje}`).join('\n');
    throw new Error(`Configuracion invalida:\n${detalle}`);
  }

  if (!silencioso) avisos.forEach((aviso) => console.warn(`[config] ${aviso}`));
  return { avisos };
}

export default config;
