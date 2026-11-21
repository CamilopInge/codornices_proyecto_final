/**
 * Conexion a SQLite usando el modulo nativo de Node (node:sqlite, Node 22.14+).
 * No requiere compilacion nativa ni Build Tools de C++.
 */

import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import config from '../config/env.js';

let instancia = null;

/** Envuelve DatabaseSync con transacciones, pragmas y helpers de consulta. */
function envolver(nativa) {
  const envoltura = {
    nativa,

    exec: (sql) => nativa.exec(sql),

    prepare: (sql) => nativa.prepare(sql),

    /** Primera fila o undefined. */
    get(sql, ...parametros) {
      return nativa.prepare(sql).get(...parametros);
    },

    /** Todas las filas. */
    all(sql, ...parametros) {
      return nativa.prepare(sql).all(...parametros);
    },

    /** INSERT/UPDATE/DELETE; devuelve { changes, lastInsertRowid }. */
    run(sql, ...parametros) {
      return nativa.prepare(sql).run(...parametros);
    },

    pragma(sentencia) {
      return nativa.prepare(`PRAGMA ${sentencia}`).all();
    },

    /**
     * Ejecuta una funcion dentro de una transaccion inmediata.
     * Soporta anidamiento mediante savepoints para que un servicio pueda
     * componer operaciones transaccionales sin saber si ya hay una abierta.
     */
    transaccion(funcion) {
      return (...argumentos) => {
        if (envoltura._profundidad > 0) {
          const punto = `sp_${envoltura._profundidad}`;
          nativa.exec(`SAVEPOINT ${punto}`);
          envoltura._profundidad += 1;
          try {
            const resultado = funcion(...argumentos);
            nativa.exec(`RELEASE ${punto}`);
            return resultado;
          } catch (error) {
            nativa.exec(`ROLLBACK TO ${punto}`);
            nativa.exec(`RELEASE ${punto}`);
            throw error;
          } finally {
            envoltura._profundidad -= 1;
          }
        }

        nativa.exec('BEGIN IMMEDIATE');
        envoltura._profundidad = 1;
        try {
          const resultado = funcion(...argumentos);
          nativa.exec('COMMIT');
          return resultado;
        } catch (error) {
          nativa.exec('ROLLBACK');
          throw error;
        } finally {
          envoltura._profundidad = 0;
        }
      };
    },

    cerrar() {
      nativa.close();
      if (instancia === envoltura) instancia = null;
    },

    _profundidad: 0
  };

  return envoltura;
}

/** Abre (o reutiliza) la conexion a la base de datos. */
export function abrirBaseDatos(archivo = config.rutas.baseDatos) {
  if (instancia) return instancia;

  fs.mkdirSync(path.dirname(archivo), { recursive: true });
  const nativa = new DatabaseSync(archivo);

  nativa.exec('PRAGMA journal_mode = WAL');
  nativa.exec('PRAGMA foreign_keys = ON');
  nativa.exec('PRAGMA busy_timeout = 5000');
  nativa.exec('PRAGMA synchronous = NORMAL');

  instancia = envolver(nativa);
  return instancia;
}

/** Conexion activa; la abre si aun no existe. */
export function db() {
  return instancia ?? abrirBaseDatos();
}

export function cerrarBaseDatos() {
  instancia?.cerrar();
  instancia = null;
}

/** Serializa a JSON para columnas *_json, tolerando null. */
export const aJson = (valor) => (valor == null ? null : JSON.stringify(valor));

/** Deserializa una columna *_json sin lanzar si el contenido esta corrupto. */
export const desdeJson = (texto, porDefecto = null) => {
  if (texto == null || texto === '') return porDefecto;
  try {
    return JSON.parse(texto);
  } catch {
    return porDefecto;
  }
};

/** SQLite guarda booleanos como enteros. */
export const aBool = (valor) => (valor == null ? null : Boolean(valor));
export const deBool = (valor) => (valor ? 1 : 0);
