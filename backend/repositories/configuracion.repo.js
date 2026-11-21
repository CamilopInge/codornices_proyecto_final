/**
 * Configuracion y catalogos editables desde Parametrizacion.
 * Almacen clave-valor con payload JSON.
 */

import { db, aJson, desdeJson } from '../db/index.js';

export const CLAVES = {
  CATALOGOS: 'catalogos',
  NIVELES: 'niveles_bienestar',
  EXIGENCIA: 'exigencia_documental'
};

/** Valores por defecto cuando la base aun no tiene nada guardado. */
export const PREDETERMINADOS = {
  [CLAVES.CATALOGOS]: {
    departamentos: [
      'Amazonas', 'Antioquia', 'Arauca', 'Atlantico', 'Bolivar', 'Boyaca', 'Caldas', 'Caqueta',
      'Casanare', 'Cauca', 'Cesar', 'Choco', 'Cordoba', 'Cundinamarca', 'Guainia', 'Guaviare',
      'Huila', 'La Guajira', 'Magdalena', 'Meta', 'Narino', 'Norte de Santander', 'Putumayo',
      'Quindio', 'Risaralda', 'San Andres y Providencia', 'Santander', 'Sucre', 'Tolima',
      'Valle del Cauca', 'Vaupes', 'Vichada'
    ],
    gruposEtarios: ['dia', 'levante', 'produccion'],
    formatosEvidencia: ['PDF', 'JPG', 'PNG'],
    tamanoMaximoMB: 5
  },
  [CLAVES.NIVELES]: [
    { nombre: 'Excelente', minimo: 90 },
    { nombre: 'Alto', minimo: 75 },
    { nombre: 'Medio', minimo: 50 },
    { nombre: 'Bajo', minimo: 0 }
  ],
  // Por defecto rige la norma completa. Relajarla es una decision explicita
  // que queda registrada en la auditoria y visible en la forma oficial.
  [CLAVES.EXIGENCIA]: {
    exigirEnGestion: true,
    exigirEnPrediosGrandes: true,
    marcarPorDefecto: false
  }
};

export function obtener(clave) {
  const fila = db().get('SELECT valor_json FROM configuracion WHERE clave = ?', clave);
  if (!fila) return PREDETERMINADOS[clave] ?? null;
  return desdeJson(fila.valor_json, PREDETERMINADOS[clave] ?? null);
}

export function obtenerTodo() {
  const resultado = {};
  for (const clave of Object.values(CLAVES)) resultado[clave] = obtener(clave);
  return resultado;
}

export function guardar(clave, valor, { usuarioId = null, descripcion = null } = {}) {
  db().run(
    `INSERT INTO configuracion (clave, valor_json, descripcion, updated_by, updated_at)
     VALUES (?, ?, ?, ?, datetime('now'))
     ON CONFLICT (clave) DO UPDATE SET
       valor_json  = excluded.valor_json,
       descripcion = COALESCE(excluded.descripcion, configuracion.descripcion),
       updated_by  = excluded.updated_by,
       updated_at  = datetime('now')`,
    clave,
    aJson(valor),
    descripcion,
    usuarioId
  );
  return obtener(clave);
}

export function registrarCorreo({ destinatario, remitente, asunto, plantilla, estado, error = null }) {
  db().run(
    `INSERT INTO correos_enviados (destinatario, remitente, asunto, plantilla, estado, error)
     VALUES (?, ?, ?, ?, ?, ?)`,
    destinatario, remitente, asunto, plantilla, estado, error
  );
}

export function correosRecientes(limite = 50) {
  return db().all('SELECT * FROM correos_enviados ORDER BY id DESC LIMIT ?', limite);
}
