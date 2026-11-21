/**
 * Punto de entrada de la capa de datos.
 * Inicializa la base, aplica migraciones y expone la conexion.
 */

import fs from 'node:fs';
import config from '../config/env.js';
import { abrirBaseDatos, db, cerrarBaseDatos, aJson, desdeJson, aBool, deBool } from './connection.js';
import { migrar, tablasDeDatos } from './migrations/runner.js';

let inicializada = false;

/** Abre la base, crea los directorios de datos y aplica migraciones pendientes. */
export function inicializarBaseDatos({ silencioso = false } = {}) {
  if (inicializada) return db();

  fs.mkdirSync(config.rutas.datos, { recursive: true });
  fs.mkdirSync(config.rutas.evidencias, { recursive: true });

  abrirBaseDatos();
  migrar({ silencioso });
  inicializada = true;

  return db();
}

export function reiniciarEstadoInicializacion() {
  inicializada = false;
}

export { db, cerrarBaseDatos, migrar, tablasDeDatos, aJson, desdeJson, aBool, deBool };
