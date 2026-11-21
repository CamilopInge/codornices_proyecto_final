/**
 * Acceso a datos de evidencias documentales.
 * Los archivos viven fuera de la raiz publica; aqui solo se guardan sus metadatos.
 */

import { db, aJson, desdeJson, aBool, deBool } from '../db/index.js';

function mapear(fila) {
  if (!fila) return null;
  return {
    id: fila.id,
    evaluacionId: fila.evaluacion_id,
    evaluacionCodigo: fila.evaluacion_codigo ?? undefined,
    indicador: fila.indicador_codigo,
    usuarioId: fila.usuario_id,
    nombreOriginal: fila.nombre_original,
    nombreAlmacenado: fila.nombre_almacenado,
    mime: fila.mime,
    tamanoBytes: fila.tamano_bytes,
    sha256: fila.sha256,
    vigenciaHasta: fila.vigencia_hasta,
    firmado: aBool(fila.firmado),
    legible: aBool(fila.legible),
    matricula: fila.matricula,
    validacion: desdeJson(fila.validacion_json, {}),
    eliminadaEn: fila.eliminada_en,
    creadaEn: fila.created_at
  };
}

const SELECT_BASE = `
  SELECT ev.*, e.codigo AS evaluacion_codigo, e.usuario_id AS evaluacion_usuario_id
  FROM evidencias ev
  JOIN evaluaciones e ON e.id = ev.evaluacion_id
`;

export function buscarPorId(id) {
  return mapear(db().get(`${SELECT_BASE} WHERE ev.id = ?`, id));
}

/** Incluye el dueno de la evaluacion, para que el servicio verifique el acceso. */
export function buscarConPropietario(id) {
  const fila = db().get(`${SELECT_BASE} WHERE ev.id = ?`, id);
  if (!fila) return null;
  return { ...mapear(fila), evaluacionUsuarioId: fila.evaluacion_usuario_id };
}

export function listarDeEvaluacion(evaluacionId) {
  return db()
    .all(`${SELECT_BASE} WHERE ev.evaluacion_id = ? AND ev.eliminada_en IS NULL ORDER BY ev.created_at DESC`, evaluacionId)
    .map(mapear);
}

export function crear({ evaluacionId, indicador, usuarioId, nombreOriginal, nombreAlmacenado,
                        mime, tamanoBytes, sha256, vigenciaHasta, firmado, legible, matricula, validacion }) {
  const resultado = db().run(
    `INSERT INTO evidencias
       (evaluacion_id, indicador_codigo, usuario_id, nombre_original, nombre_almacenado,
        mime, tamano_bytes, sha256, vigencia_hasta, firmado, legible, matricula, validacion_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    evaluacionId, indicador, usuarioId, nombreOriginal, nombreAlmacenado,
    mime, tamanoBytes, sha256, vigenciaHasta ?? null,
    deBool(firmado), deBool(legible), matricula ?? null, aJson(validacion ?? {})
  );
  return buscarPorId(Number(resultado.lastInsertRowid));
}

export function actualizarMetadatos(id, { vigenciaHasta, firmado, legible, matricula }) {
  const asignaciones = [];
  const valores = [];
  if (vigenciaHasta !== undefined) { asignaciones.push('vigencia_hasta = ?'); valores.push(vigenciaHasta); }
  if (firmado !== undefined) { asignaciones.push('firmado = ?'); valores.push(deBool(firmado)); }
  if (legible !== undefined) { asignaciones.push('legible = ?'); valores.push(deBool(legible)); }
  if (matricula !== undefined) { asignaciones.push('matricula = ?'); valores.push(matricula); }
  if (!asignaciones.length) return buscarPorId(id);

  db().run(`UPDATE evidencias SET ${asignaciones.join(', ')} WHERE id = ?`, ...valores, id);
  return buscarPorId(id);
}

/** Baja logica: el archivo se conserva para la trazabilidad de la auditoria. */
export function marcarEliminada(id) {
  db().run("UPDATE evidencias SET eliminada_en = datetime('now') WHERE id = ?", id);
}

/** Detecta duplicados exactos dentro de la misma evaluacion. */
export function buscarPorHash(evaluacionId, sha256) {
  return mapear(
    db().get(`${SELECT_BASE} WHERE ev.evaluacion_id = ? AND ev.sha256 = ? AND ev.eliminada_en IS NULL`, evaluacionId, sha256)
  );
}

export { mapear as mapearEvidencia };
