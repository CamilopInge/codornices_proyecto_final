/**
 * Vacia todas las tablas de datos.
 *
 *   npm run truncate               pide confirmacion escrita
 *   npm run truncate -- --si       omite la confirmacion
 *   npm run truncate -- --conservar-usuarios
 *   npm run truncate -- --sin-respaldo
 *
 * Por defecto crea un respaldo antes de borrar y vuelve a sembrar el
 * administrador, para no dejar el sistema sin forma de entrar.
 */

import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import config, { validarConfiguracion } from '../backend/config/env.js';
import { inicializarBaseDatos, db, tablasDeDatos, cerrarBaseDatos } from '../backend/db/index.js';
import { sembrarAdministrador } from '../backend/db/seed.js';
import { crearRespaldo } from './backup.js';

const argumentos = new Set(process.argv.slice(2));
const sinPreguntar = argumentos.has('--si') || argumentos.has('-y');
const conservarUsuarios = argumentos.has('--conservar-usuarios');
const sinRespaldo = argumentos.has('--sin-respaldo');

/** Tablas que nunca se vacian: el control de migraciones describe el esquema. */
const PROTEGIDAS = new Set(['migraciones']);

function conteoPorTabla(tablas) {
  const conexion = db();
  return tablas.map((tabla) => ({
    tabla,
    filas: conexion.get(`SELECT COUNT(*) AS total FROM "${tabla}"`)?.total ?? 0
  }));
}

async function confirmar(resumen) {
  const consola = readline.createInterface({ input: stdin, output: stdout });
  console.log('\nSe vaciaran estas tablas:\n');
  for (const { tabla, filas } of resumen) {
    console.log(`  ${tabla.padEnd(26)} ${String(filas).padStart(6)} fila(s)`);
  }
  console.log(`\nBase de datos: ${config.rutas.baseDatos}`);
  console.log('Esta accion no se puede deshacer.\n');

  const respuesta = await consola.question('Escriba BORRAR para continuar: ');
  consola.close();
  return respuesta.trim() === 'BORRAR';
}

/** Borra los archivos de evidencia del disco, que no viven en la base. */
function vaciarEvidencias() {
  const carpeta = config.rutas.evidencias;
  if (!fs.existsSync(carpeta)) return 0;

  let borrados = 0;
  for (const archivo of fs.readdirSync(carpeta)) {
    const ruta = path.join(carpeta, archivo);
    if (fs.statSync(ruta).isFile()) {
      fs.rmSync(ruta, { force: true });
      borrados += 1;
    }
  }
  return borrados;
}

export async function truncarTodo({ interactivo = true } = {}) {
  validarConfiguracion({ silencioso: true });
  inicializarBaseDatos({ silencioso: true });

  const todas = tablasDeDatos().filter((tabla) => !PROTEGIDAS.has(tabla));
  const objetivo = conservarUsuarios ? todas.filter((tabla) => tabla !== 'usuarios') : todas;

  const resumen = conteoPorTabla(objetivo);
  const totalFilas = resumen.reduce((suma, fila) => suma + fila.filas, 0);

  if (interactivo && !sinPreguntar) {
    if (!(await confirmar(resumen))) {
      console.log('\nOperacion cancelada. No se borro nada.\n');
      return { cancelado: true };
    }
  }

  if (!sinRespaldo && totalFilas > 0) {
    try {
      const respaldo = await crearRespaldo({ etiqueta: 'pre-truncate' });
      console.log(`\n[respaldo] copia previa en: ${respaldo}`);
    } catch (error) {
      console.warn(`[respaldo] no se pudo crear la copia previa: ${error.message}`);
      if (interactivo && !sinPreguntar) {
        console.log('Operacion cancelada por seguridad.');
        return { cancelado: true };
      }
    }
  }

  const conexion = db();

  conexion.transaccion(() => {
    conexion.exec('PRAGMA foreign_keys = OFF');
    for (const tabla of objetivo) conexion.run(`DELETE FROM "${tabla}"`);
    // Reinicia los contadores AUTOINCREMENT para que los ids vuelvan a empezar en 1.
    const tieneSecuencias = conexion.get(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='sqlite_sequence'"
    );
    if (tieneSecuencias) {
      for (const tabla of objetivo) conexion.run('DELETE FROM sqlite_sequence WHERE name = ?', tabla);
    }
    conexion.exec('PRAGMA foreign_keys = ON');
  })();

  const evidenciasBorradas = conservarUsuarios ? 0 : vaciarEvidencias();

  conexion.exec('VACUUM');

  console.log(`\n[truncate] ${objetivo.length} tabla(s) vaciada(s), ${totalFilas} fila(s) eliminada(s).`);
  if (evidenciasBorradas) console.log(`[truncate] ${evidenciasBorradas} archivo(s) de evidencia eliminado(s).`);

  // Sin administrador nadie podria volver a entrar.
  const semilla = await sembrarAdministrador();
  if (semilla.creado) {
    console.log(`[semilla] administrador recreado: ${semilla.usuario.email}`);
    if (semilla.claveGenerada) {
      console.warn(`[semilla] clave temporal (no se vuelve a mostrar): ${semilla.claveGenerada}`);
    }
  } else {
    console.log(`[semilla] administrador conservado: ${semilla.usuario.email}`);
  }

  return { cancelado: false, tablas: objetivo.length, filas: totalFilas };
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('truncate.js')) {
  truncarTodo()
    .then((resultado) => {
      if (!resultado.cancelado) console.log('\nListo.\n');
      cerrarBaseDatos();
    })
    .catch((error) => {
      console.error(`\n[truncate] fallo: ${error.message}\n`);
      cerrarBaseDatos();
      process.exit(1);
    });
}
