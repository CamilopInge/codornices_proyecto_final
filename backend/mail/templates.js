/**
 * Plantillas de correo.
 * HTML con estilos en linea, que es lo unico que respetan los clientes de correo.
 */

import config from '../config/env.js';

const escapar = (texto) =>
  String(texto ?? '').replace(/[&<>"']/g, (caracter) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[caracter]
  );

function envoltura({ titulo, cuerpo, pie }) {
  return `<!doctype html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:24px;background:#F3F5F1;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1C2921;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#FFFFFF;border:1px solid #D6DDD3;border-radius:8px;">
    <tr>
      <td style="padding:20px 28px;background:#2C4A3B;border-radius:8px 8px 0 0;">
        <span style="color:#FFFFFF;font-size:18px;font-weight:700;letter-spacing:-0.01em;">EvalCodorniz</span>
        <span style="color:#A8C7B6;font-size:13px;display:block;margin-top:2px;">Bienestar animal ICA</span>
      </td>
    </tr>
    <tr>
      <td style="padding:28px;">
        <h1 style="margin:0 0 16px;font-size:20px;line-height:1.3;color:#1C2921;">${escapar(titulo)}</h1>
        ${cuerpo}
      </td>
    </tr>
    <tr>
      <td style="padding:16px 28px 24px;border-top:1px solid #D6DDD3;color:#5B685F;font-size:12px;line-height:1.5;">
        ${pie}
      </td>
    </tr>
  </table>
</body>
</html>`;
}

const boton = (url, texto) =>
  `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:22px 0;">
     <tr><td style="background:#2C4A3B;border-radius:6px;">
       <a href="${url}" style="display:inline-block;padding:12px 24px;color:#FFFFFF;text-decoration:none;font-weight:600;font-size:15px;">${escapar(texto)}</a>
     </td></tr>
   </table>`;

const parrafo = (texto) =>
  `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#1C2921;">${texto}</p>`;

const PIE_ESTANDAR = `Este mensaje fue enviado automaticamente por el sistema EvalCodorniz desde
  <strong>${escapar(config.correo.remitente)}</strong>. No responda a este correo.`;

/** Correo de restablecimiento de contrasena. */
export function plantillaRestablecer({ nombre, enlace, minutosVigencia }) {
  const url = escapar(enlace);
  const titulo = 'Restablecer su contrasena';

  const cuerpo = [
    parrafo(`Hola <strong>${escapar(nombre)}</strong>,`),
    parrafo('Recibimos una solicitud para restablecer la contrasena de su cuenta en EvalCodorniz.'),
    boton(url, 'Crear una contrasena nueva'),
    parrafo(`El enlace vence en <strong>${minutosVigencia} minutos</strong> y solo puede usarse una vez.`),
    parrafo('Si el boton no funciona, copie y pegue esta direccion en su navegador:'),
    `<p style="margin:0 0 14px;font-size:13px;word-break:break-all;background:#E9EDE6;padding:10px 12px;border-radius:6px;color:#2C4A3B;">${url}</p>`,
    parrafo('Si usted no solicito este cambio, ignore el mensaje: su contrasena actual sigue vigente.')
  ].join('\n');

  const texto = [
    `Hola ${nombre},`,
    '',
    'Recibimos una solicitud para restablecer la contrasena de su cuenta en EvalCodorniz.',
    '',
    `Abra este enlace para crear una contrasena nueva (vence en ${minutosVigencia} minutos):`,
    enlace,
    '',
    'Si usted no solicito este cambio, ignore el mensaje.',
    '',
    `-- Enviado por ${config.correo.remitente}`
  ].join('\n');

  return { asunto: 'EvalCodorniz: restablecer su contrasena', html: envoltura({ titulo, cuerpo, pie: PIE_ESTANDAR }), texto };
}

/** Correo de bienvenida con enlace para definir la contrasena inicial. */
export function plantillaBienvenida({ nombre, usuario, rol, enlace, minutosVigencia }) {
  const url = escapar(enlace);
  const titulo = 'Su cuenta de EvalCodorniz esta lista';

  const cuerpo = [
    parrafo(`Hola <strong>${escapar(nombre)}</strong>,`),
    parrafo('Se creo una cuenta para usted en el sistema de evaluacion de bienestar animal ICA para codornices.'),
    `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 18px;font-size:14px;">
       <tr><td style="padding:4px 16px 4px 0;color:#5B685F;">Usuario</td><td style="padding:4px 0;font-weight:600;">${escapar(usuario)}</td></tr>
       <tr><td style="padding:4px 16px 4px 0;color:#5B685F;">Rol</td><td style="padding:4px 0;font-weight:600;">${escapar(rol)}</td></tr>
     </table>`,
    parrafo('Para entrar por primera vez debe definir su propia contrasena:'),
    boton(url, 'Definir mi contrasena'),
    parrafo(`El enlace vence en <strong>${minutosVigencia} minutos</strong>. Si expira, use la opcion "Olvide mi contrasena" en la pantalla de acceso.`),
    parrafo('Si el boton no funciona, copie y pegue esta direccion en su navegador:'),
    `<p style="margin:0 0 14px;font-size:13px;word-break:break-all;background:#E9EDE6;padding:10px 12px;border-radius:6px;color:#2C4A3B;">${url}</p>`
  ].join('\n');

  const texto = [
    `Hola ${nombre},`,
    '',
    'Se creo una cuenta para usted en EvalCodorniz.',
    `Usuario: ${usuario}`,
    `Rol: ${rol}`,
    '',
    `Defina su contrasena con este enlace (vence en ${minutosVigencia} minutos):`,
    enlace,
    '',
    `-- Enviado por ${config.correo.remitente}`
  ].join('\n');

  return { asunto: 'EvalCodorniz: active su cuenta', html: envoltura({ titulo, cuerpo, pie: PIE_ESTANDAR }), texto };
}

/** Aviso de que la contrasena cambio, como control de seguridad. */
export function plantillaPasswordCambiada({ nombre, cuando }) {
  const titulo = 'Su contrasena fue modificada';

  const cuerpo = [
    parrafo(`Hola <strong>${escapar(nombre)}</strong>,`),
    parrafo(`La contrasena de su cuenta en EvalCodorniz se cambio el <strong>${escapar(cuando)}</strong>.`),
    parrafo('Todas las sesiones abiertas se cerraron. Si usted hizo el cambio, no necesita hacer nada mas.'),
    `<p style="margin:0;padding:12px 14px;background:#F7EBD3;border-radius:6px;font-size:14px;line-height:1.5;color:#7A4F0E;">
       Si <strong>no</strong> reconoce este cambio, avise de inmediato al administrador del sistema en
       ${escapar(config.correo.remitente)}.
     </p>`
  ].join('\n');

  const texto = [
    `Hola ${nombre},`,
    '',
    `La contrasena de su cuenta en EvalCodorniz se cambio el ${cuando}.`,
    'Todas las sesiones abiertas se cerraron.',
    '',
    `Si no reconoce este cambio, avise al administrador en ${config.correo.remitente}.`
  ].join('\n');

  return { asunto: 'EvalCodorniz: su contrasena fue modificada', html: envoltura({ titulo, cuerpo, pie: PIE_ESTANDAR }), texto };
}
