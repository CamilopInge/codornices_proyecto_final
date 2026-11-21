/**
 * Envio de correo.
 *
 * Con SMTP configurado usa nodemailer. Sin SMTP (el caso habitual en desarrollo)
 * no falla: escribe el mensaje en data/correos-salientes y muestra el enlace en
 * consola, de modo que el flujo de restablecimiento se puede probar completo
 * sin montar un servidor de correo.
 *
 * El remitente siempre es config.correo.remitente (administrador@evalcodorniz.edu.co
 * por defecto), tanto para el restablecimiento como para el alta de usuarios.
 */

import fs from 'node:fs';
import path from 'node:path';
import config from '../config/env.js';
import { registrarCorreo } from '../repositories/configuracion.repo.js';

let transporteCache;

async function obtenerTransporte() {
  if (transporteCache !== undefined) return transporteCache;

  if (!config.correo.habilitado) {
    transporteCache = null;
    return null;
  }

  try {
    const { default: nodemailer } = await import('nodemailer');
    transporteCache = nodemailer.createTransport({
      host: config.correo.host,
      port: config.correo.puerto,
      secure: config.correo.seguro,
      // Google muestra la contrasena de aplicacion en bloques de 4; los espacios
      // son solo de presentacion y el servidor los rechaza.
      auth: config.correo.usuario
        ? { user: config.correo.usuario, pass: config.correo.clave.replace(/\s/g, '') }
        : undefined
    });
    return transporteCache;
  } catch (error) {
    console.warn(`[correo] nodemailer no disponible (${error.message}); se usara el registro en disco.`);
    transporteCache = null;
    return null;
  }
}

function carpetaSalida() {
  const carpeta = path.join(config.rutas.datos, 'correos-salientes');
  fs.mkdirSync(carpeta, { recursive: true });
  return carpeta;
}

/** Deja el correo en disco cuando no hay SMTP, para poder inspeccionarlo. */
function registrarEnDisco({ para, asunto, html, texto, plantilla }) {
  const marca = new Date().toISOString().replace(/[:.]/g, '-');
  const seguro = String(para).replace(/[^a-z0-9@._-]/gi, '_');
  const archivo = path.join(carpetaSalida(), `${marca}__${plantilla}__${seguro}.html`);

  const contenido = `<!doctype html>
<meta charset="utf-8">
<!--
  De:      ${config.correo.nombreRemitente} <${config.correo.remitente}>
  Para:    ${para}
  Asunto:  ${asunto}
  Fecha:   ${new Date().toISOString()}
  SMTP no configurado: este mensaje no se envio, solo se registro.
-->
${html}
<hr>
<pre>${texto}</pre>`;

  fs.writeFileSync(archivo, contenido, 'utf8');
  return archivo;
}

/**
 * Envia un correo. Devuelve siempre un resultado; no lanza por fallos de SMTP,
 * para que un problema de correo no impida completar la operacion de negocio.
 */
export async function enviarCorreo({ para, asunto, html, texto, plantilla = 'generico' }) {
  const remitente = `"${config.correo.nombreRemitente}" <${config.correo.remitente}>`;
  const transporte = await obtenerTransporte();

  if (!transporte) {
    const archivo = registrarEnDisco({ para, asunto, html, texto, plantilla });
    registrarCorreo({ destinatario: para, remitente: config.correo.remitente, asunto, plantilla, estado: 'registrado' });
    console.log(`[correo] SMTP no configurado. Mensaje "${asunto}" para ${para} registrado en: ${archivo}`);
    return { enviado: false, registrado: true, archivo };
  }

  try {
    await transporte.sendMail({ from: remitente, to: para, subject: asunto, html, text: texto });
    registrarCorreo({ destinatario: para, remitente: config.correo.remitente, asunto, plantilla, estado: 'enviado' });
    return { enviado: true, registrado: false };
  } catch (error) {
    registrarCorreo({
      destinatario: para,
      remitente: config.correo.remitente,
      asunto,
      plantilla,
      estado: 'fallido',
      error: error.message
    });
    const archivo = registrarEnDisco({ para, asunto, html, texto, plantilla });
    console.error(`[correo] fallo el envio a ${para}: ${error.message}. Copia en ${archivo}`);
    return { enviado: false, registrado: true, archivo, error: error.message };
  }
}

export function reiniciarTransporte() {
  transporteCache = undefined;
}
