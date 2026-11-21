/**
 * Arranque del servidor.
 *
 * Orden: validar configuracion, abrir e inicializar la base, sembrar el
 * administrador si hace falta y recien entonces escuchar en el puerto.
 */

import config, { validarConfiguracion } from '../backend/config/env.js';
import { inicializarBaseDatos, cerrarBaseDatos } from '../backend/db/index.js';
import { sembrarAdministrador } from '../backend/db/seed.js';
import { purgarTokensVencidos, purgarSesionesVencidas } from '../backend/repositories/tokens.repo.js';
import { crearApp } from './app.js';

function imprimirBanner() {
  const lineas = [
    '',
    '  EvalCodorniz · Bienestar animal ICA',
    `  Entorno      ${config.entorno}`,
    `  Interfaz     ${config.servidor.urlPublica}`,
    `  API          ${config.servidor.urlPublica}/api`,
    `  Base         ${config.rutas.baseDatos}`,
    `  Evidencias   ${config.rutas.evidencias}`,
    `  Correo       ${config.correo.habilitado ? `SMTP ${config.correo.host}` : 'sin SMTP (se registra en disco)'}`,
    `  Remitente    ${config.correo.remitente}`,
    `  IA           ${config.ia.habilitada ? config.ia.modelo : 'no configurada'}`,
    ''
  ];
  console.log(lineas.join('\n'));
}

export async function iniciar() {
  validarConfiguracion();
  inicializarBaseDatos();

  const semilla = await sembrarAdministrador();
  if (semilla.creado) {
    console.log(`[semilla] administrador inicial creado: ${semilla.usuario.email}`);
    if (semilla.claveGenerada) {
      console.warn(
        `[semilla] SEED_ADMIN_PASSWORD no estaba configurada. Clave temporal: ${semilla.claveGenerada}\n` +
        '          Guardela ahora: no se vuelve a mostrar. Mejor aun, definala en .env y recree la cuenta.'
      );
    }
  }

  // Higiene de tablas de seguridad en cada arranque.
  purgarTokensVencidos();
  purgarSesionesVencidas();

  const app = crearApp();

  return new Promise((resolver) => {
    const servidor = app.listen(config.servidor.puerto, config.servidor.host, () => {
      imprimirBanner();
      resolver(servidor);
    });

    const apagar = (senal) => {
      console.log(`\n[servidor] ${senal} recibido; cerrando...`);
      servidor.close(() => {
        cerrarBaseDatos();
        process.exit(0);
      });
      // Si alguna conexion queda colgada, no se espera indefinidamente.
      setTimeout(() => process.exit(1), 10_000).unref();
    };

    process.on('SIGINT', () => apagar('SIGINT'));
    process.on('SIGTERM', () => apagar('SIGTERM'));
  });
}

// Solo arranca si se ejecuta directamente, no al importarse desde una prueba.
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('server.js')) {
  iniciar().catch((error) => {
    console.error('\n[servidor] no se pudo iniciar:\n', error.message, '\n');
    process.exit(1);
  });
}

export default iniciar;
