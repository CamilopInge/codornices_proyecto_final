/**
 * Ejecutor de migraciones.
 *
 * Aplica en orden los archivos .sql de esta carpeta y registra cuales ya
 * corrieron, de modo que arrancar el servidor varias veces es idempotente.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { db } from '../connection.js';

const CARPETA = path.dirname(fileURLToPath(import.meta.url));

function asegurarTablaControl(conexion) {
  conexion.exec(`
    CREATE TABLE IF NOT EXISTS migraciones (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre      TEXT NOT NULL UNIQUE,
      checksum    TEXT NOT NULL,
      aplicada_en TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

function archivosDisponibles() {
  return fs
    .readdirSync(CARPETA)
    .filter((archivo) => archivo.endsWith('.sql'))
    .sort((a, b) => a.localeCompare(b, 'en'));
}

/**
 * Aplica las migraciones pendientes.
 * @returns {{aplicadas: string[], omitidas: string[]}}
 */
export function migrar({ silencioso = false } = {}) {
  const conexion = db();
  asegurarTablaControl(conexion);

  const yaAplicadas = new Map(
    conexion.all('SELECT nombre, checksum FROM migraciones').map((fila) => [fila.nombre, fila.checksum])
  );

  const aplicadas = [];
  const omitidas = [];

  for (const archivo of archivosDisponibles()) {
    const sql = fs.readFileSync(path.join(CARPETA, archivo), 'utf8');
    const checksum = crypto.createHash('sha256').update(sql).digest('hex');
    const registrada = yaAplicadas.get(archivo);

    if (registrada) {
      if (registrada !== checksum && !silencioso) {
        console.warn(
          `[migracion] ${archivo} cambio despues de aplicarse. Cree una migracion nueva en vez de editar una ya aplicada.`
        );
      }
      omitidas.push(archivo);
      continue;
    }

    // Cada migracion corre completa o no corre: nunca a medias.
    conexion.transaccion(() => {
      conexion.exec(sql);
      conexion.run('INSERT INTO migraciones (nombre, checksum) VALUES (?, ?)', archivo, checksum);
    })();

    aplicadas.push(archivo);
    if (!silencioso) console.log(`[migracion] aplicada: ${archivo}`);
  }

  return { aplicadas, omitidas };
}

/** Nombres de las tablas de datos, excluyendo las internas de SQLite y el control. */
export function tablasDeDatos() {
  return db()
    .all(
      `SELECT name FROM sqlite_master
       WHERE type = 'table'
         AND name NOT LIKE 'sqlite_%'
         AND name <> 'migraciones'
       ORDER BY name`
    )
    .map((fila) => fila.name);
}
