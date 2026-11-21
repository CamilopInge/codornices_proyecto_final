/**
 * Verificacion de la configuracion de correo saliente.
 *
 *   npm run probar-correo                    solo comprueba la conexion
 *   npm run probar-correo -- destino@ejemplo.com   ademas envia un mensaje real
 *
 * Diagnostica los fallos habituales (credenciales, puerto, remitente reescrito)
 * con una explicacion de que hacer en cada caso, en vez de un volcado de error.
 */

import config, { validarConfiguracion } from '../backend/config/env.js';

const destino = process.argv.slice(2).find((arg) => arg.includes('@'));

const linea = (etiqueta, valor) => console.log(`  ${etiqueta.padEnd(16)} ${valor}`);
const ok = (texto) => console.log(`  ✓ ${texto}`);
const fallo = (texto) => console.log(`  ✗ ${texto}`);
const aviso = (texto) => console.log(`  ! ${texto}`);

validarConfiguracion({ silencioso: true });

console.log('\nConfiguracion de correo\n');
linea('Remitente', `${config.correo.nombreRemitente} <${config.correo.remitente}>`);
linea('Host', config.correo.host || '(sin configurar)');
linea('Puerto', config.correo.puerto);
linea('Seguro (TLS)', config.correo.seguro ? 'si (implicito)' : 'no (STARTTLS)');
linea('Usuario', config.correo.usuario || '(sin configurar)');
linea('Contrasena', config.correo.clave ? `${'*'.repeat(8)} (${config.correo.clave.length} caracteres)` : '(sin configurar)');

if (config.correo.incompleto) {
  console.log('\nConfiguracion incompleta\n');
  if (!config.correo.usuario) fallo('Falta SMTP_USER.');
  if (!config.correo.clave) fallo('Falta SMTP_PASSWORD.');
  console.log('\n  Mientras falten, los correos se escriben en data/correos-salientes/');
  console.log('  y el enlace de restablecimiento aparece en pantalla: el sistema');
  console.log('  funciona, pero nadie recibe correo de verdad.\n');

  if (/gmail|googlemail/i.test(config.correo.host)) {
    console.log('  Para Gmail:');
    console.log('   1. Active la verificacion en dos pasos en la cuenta de Google.');
    console.log('   2. Cree una contrasena de aplicacion en');
    console.log('      https://myaccount.google.com/apppasswords');
    console.log('   3. En .env, ponga la cuenta en SMTP_USER y los 16 caracteres');
    console.log('      (sin espacios) en SMTP_PASSWORD.');
    console.log('   4. Vuelva a ejecutar: npm run probar-correo\n');
  } else {
    console.log('  Complete SMTP_USER y SMTP_PASSWORD en .env. Vea docs/OPERACION.md.\n');
  }
  process.exit(1);
}

if (!config.correo.habilitado) {
  console.log('\nSMTP no esta configurado.\n');
  console.log('  Los correos se escriben en data/correos-salientes/ y el enlace de');
  console.log('  restablecimiento aparece en pantalla. El sistema funciona, pero');
  console.log('  nadie recibe correo de verdad.\n');
  console.log('  Para habilitarlo, complete SMTP_HOST, SMTP_USER y SMTP_PASSWORD en .env.');
  console.log('  Vea docs/OPERACION.md para el procedimiento con Gmail.\n');
  process.exit(0);
}

console.log('\nRevision previa\n');

const esGmail = /gmail|googlemail/i.test(config.correo.host);
let hayAdvertencias = false;

// Gmail exige contrasena de aplicacion de 16 caracteres, no la del usuario.
if (esGmail) {
  const clave = config.correo.clave.replace(/\s/g, '');
  if (clave.length !== 16) {
    fallo(`Gmail espera una contrasena de aplicacion de 16 caracteres; la actual tiene ${clave.length}.`);
    console.log('    Genere una en https://myaccount.google.com/apppasswords');
    console.log('    (requiere verificacion en dos pasos activada).');
    hayAdvertencias = true;
  } else {
    ok('La contrasena tiene el formato de una contrasena de aplicacion de Gmail.');
  }

  if (config.correo.clave.includes(' ')) {
    aviso('La contrasena contiene espacios. Google la muestra en bloques de 4, pero debe pegarse sin espacios.');
    hayAdvertencias = true;
  }

  // Gmail reescribe el From si no es la cuenta autenticada ni un alias verificado.
  if (config.correo.remitente.toLowerCase() !== config.correo.usuario.toLowerCase()) {
    aviso(`MAIL_FROM (${config.correo.remitente}) no coincide con SMTP_USER (${config.correo.usuario}).`);
    console.log('    Gmail reescribira el remitente a la cuenta autenticada, salvo que esa');
    console.log('    direccion este dada de alta como alias verificado en Gmail:');
    console.log('    Configuracion > Cuentas e importacion > Enviar como.');
    hayAdvertencias = true;
  } else {
    ok('El remitente coincide con la cuenta autenticada.');
  }
}

if (config.correo.puerto === 465 && !config.correo.seguro) {
  aviso('El puerto 465 normalmente requiere SMTP_SECURE=true.');
  hayAdvertencias = true;
}
if (config.correo.puerto === 587 && config.correo.seguro) {
  aviso('El puerto 587 normalmente requiere SMTP_SECURE=false (usa STARTTLS).');
  hayAdvertencias = true;
}

if (!hayAdvertencias) ok('Sin advertencias de configuracion.');

// --- Conexion ----------------------------------------------------------------

console.log('\nConexion\n');

let nodemailer;
try {
  ({ default: nodemailer } = await import('nodemailer'));
} catch {
  fallo('nodemailer no esta instalado. Ejecute: npm install');
  process.exit(1);
}

const transporte = nodemailer.createTransport({
  host: config.correo.host,
  port: config.correo.puerto,
  secure: config.correo.seguro,
  auth: config.correo.usuario
    ? { user: config.correo.usuario, pass: config.correo.clave.replace(/\s/g, '') }
    : undefined,
  connectionTimeout: 15000,
  greetingTimeout: 10000
});

/** Traduce los errores de SMTP a una instruccion concreta. */
function explicar(error) {
  const codigo = error.code ?? '';
  const mensaje = error.message ?? '';

  if (codigo === 'EAUTH' || /535|534|credentials/i.test(mensaje)) {
    return [
      'Las credenciales fueron rechazadas.',
      esGmail
        ? '  Use una contrasena de aplicacion, no la del correo: https://myaccount.google.com/apppasswords'
        : '  Verifique SMTP_USER y SMTP_PASSWORD.'
    ];
  }
  if (codigo === 'ETIMEDOUT' || codigo === 'ESOCKET' || codigo === 'ECONNECTION') {
    return [
      'No se pudo abrir la conexion con el servidor.',
      `  Verifique que ${config.correo.host}:${config.correo.puerto} sea alcanzable`,
      '  y que el cortafuegos o la red no bloqueen el puerto de salida.'
    ];
  }
  if (codigo === 'EDNS' || /getaddrinfo/i.test(mensaje)) {
    return ['No se pudo resolver el nombre del servidor.', `  Revise que SMTP_HOST (${config.correo.host}) este bien escrito.`];
  }
  if (/self.signed|certificate/i.test(mensaje)) {
    return ['El certificado TLS del servidor no es valido o es autofirmado.', '  Habitual en servidores internos; consulte con el area de sistemas.'];
  }
  return [mensaje];
}

try {
  await transporte.verify();
  ok('El servidor acepto la conexion y las credenciales.');
} catch (error) {
  fallo('No se pudo verificar la conexion.');
  explicar(error).forEach((texto) => console.log(`    ${texto}`));
  console.log('');
  process.exit(1);
}

// --- Envio de prueba ---------------------------------------------------------

if (!destino) {
  console.log('\nTodo correcto. Para enviar un mensaje real de prueba:\n');
  console.log('  npm run probar-correo -- su.correo@ejemplo.com\n');
  process.exit(0);
}

console.log(`\nEnviando mensaje de prueba a ${destino}\n`);

try {
  const info = await transporte.sendMail({
    from: `"${config.correo.nombreRemitente}" <${config.correo.remitente}>`,
    to: destino,
    subject: 'EvalCodorniz: prueba de configuracion de correo',
    text: [
      'Este es un mensaje de prueba del sistema EvalCodorniz.',
      '',
      'Si lo esta leyendo, el envio de correo funciona y los enlaces de',
      'restablecimiento de contrasena llegaran correctamente.',
      '',
      `Remitente configurado: ${config.correo.remitente}`,
      `Servidor: ${config.correo.host}:${config.correo.puerto}`,
      `Enviado: ${new Date().toLocaleString('es-CO')}`
    ].join('\n'),
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#1A2820">
        <h2 style="color:#2C5440;margin:0 0 16px">Prueba de correo correcta</h2>
        <p>Si esta leyendo este mensaje, el envio funciona y los enlaces de
           restablecimiento de contrasena llegaran correctamente.</p>
        <table style="font-size:14px;color:#55645B;margin-top:16px">
          <tr><td style="padding:2px 12px 2px 0">Remitente</td><td>${config.correo.remitente}</td></tr>
          <tr><td style="padding:2px 12px 2px 0">Servidor</td><td>${config.correo.host}:${config.correo.puerto}</td></tr>
          <tr><td style="padding:2px 12px 2px 0">Enviado</td><td>${new Date().toLocaleString('es-CO')}</td></tr>
        </table>
      </div>`
  });

  ok(`Mensaje aceptado por el servidor (id ${info.messageId}).`);

  if (info.accepted?.length) linea('Aceptados', info.accepted.join(', '));
  if (info.rejected?.length) fallo(`Rechazados: ${info.rejected.join(', ')}`);

  console.log('\n  Revise la bandeja de entrada y la carpeta de correo no deseado.');

  if (esGmail && config.correo.remitente.toLowerCase() !== config.correo.usuario.toLowerCase()) {
    console.log(`\n  Compruebe que el mensaje llegue de ${config.correo.remitente}.`);
    console.log(`  Si llega de ${config.correo.usuario}, Gmail reescribio el remitente:`);
    console.log('  de el de alta como alias verificado o use esa misma direccion en MAIL_FROM.');
  }

  console.log('');
} catch (error) {
  fallo('El servidor acepto la conexion pero rechazo el envio.');
  explicar(error).forEach((texto) => console.log(`    ${texto}`));
  console.log('');
  process.exit(1);
}
