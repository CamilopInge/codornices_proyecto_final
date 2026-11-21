/**
 * Aplica las migraciones pendientes sin arrancar el servidor.
 *
 *   npm run migrar
 *   npm run migrar -- --estado    solo informa, no aplica nada
 */

import config, { validarConfiguracion } from '../backend/config/env.js';
import { inicializarBaseDatos, db, migrar, tablasDeDatos, cerrarBaseDatos } from '../backend/db/index.js';

const soloEstado = process.argv.includes('--estado');

validarConfiguracion({ silencioso: true });

if (soloEstado) {
  inicializarBaseDatos({ silencioso: true });
  const aplicadas = db().all('SELECT nombre, aplicada_en FROM migraciones ORDER BY id');

  console.log(`\nBase de datos: ${config.rutas.baseDatos}\n`);
  console.log('Migraciones aplicadas:');
  if (!aplicadas.length) console.log('  (ninguna)');
  for (const fila of aplicadas) console.log(`  ${fila.nombre.padEnd(34)} ${fila.aplicada_en}`);

  const tablas = tablasDeDatos();
  console.log(`\nTablas de datos (${tablas.length}):`);
  for (const tabla of tablas) {
    const total = db().get(`SELECT COUNT(*) AS total FROM "${tabla}"`)?.total ?? 0;
    console.log(`  ${tabla.padEnd(26)} ${String(total).padStart(6)} fila(s)`);
  }
  console.log('');
  cerrarBaseDatos();
} else {
  // inicializarBaseDatos ya aplica lo pendiente; aqui solo se informa el resultado.
  const antes = new Set();
  try {
    inicializarBaseDatos({ silencioso: true });
    db().all('SELECT nombre FROM migraciones').forEach((fila) => antes.add(fila.nombre));
  } catch {
    // Primera ejecucion: aun no existe la tabla de control.
  }

  const resultado = migrar();
  const recienAplicadas = [...antes].length === 0 ? resultado.omitidas : resultado.aplicadas;

  if (!recienAplicadas.length) console.log('\nLa base ya estaba al dia; no habia migraciones pendientes.\n');
  else console.log(`\n${recienAplicadas.length} migracion(es) aplicada(s): ${recienAplicadas.join(', ')}\n`);

  cerrarBaseDatos();
}
