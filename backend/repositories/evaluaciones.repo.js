/**
 * Acceso a datos de evaluaciones, respuestas por indicador,
 * recomendaciones y acciones del plan de mejora.
 */

import { db, aJson, desdeJson } from '../db/index.js';
import { INDICE } from '../../shared/ica/catalogo.js';

// --- Mapeo -------------------------------------------------------------------

function mapearEvaluacion(fila) {
  if (!fila) return null;
  const snapshot = desdeJson(fila.snapshot_json, null);
  return {
    // Exigencia documental que regia al abrir la visita. Es parte de la traza:
    // la vigente la decide el servicio segun el estado de la evaluacion.
    exigenciaAlAbrir: snapshot?.exigencia ?? null,
    id: fila.id,
    codigo: fila.codigo,
    predioId: fila.predio_id,
    predio: fila.predio_nombre
      ? {
          id: fila.predio_id,
          nombre: fila.predio_nombre,
          codigoIca: fila.predio_codigo_ica,
          municipio: fila.predio_municipio,
          departamento: fila.predio_departamento,
          sistema: fila.predio_sistema
        }
      : undefined,
    usuarioId: fila.usuario_id,
    evaluador: fila.evaluador_nombre ?? undefined,
    fechaVisita: fila.fecha_visita,
    sistema: fila.sistema,
    totalAves: fila.total_aves,
    versionCatalogo: fila.version_catalogo,
    pesos: desdeJson(fila.pesos_json, {}),
    muestreo: desdeJson(fila.muestreo_json, {}),
    indicadores: desdeJson(fila.indicadores_json, []),
    inspeccion: desdeJson(fila.inspeccion_json, {}),
    estado: fila.estado,
    forma: fila.forma,
    calificacion: fila.calificacion,
    nivel: fila.nivel,
    resultado: desdeJson(fila.resultado_json, null),
    cerradaEn: fila.cerrada_en,
    provisionalHasta: fila.provisional_hasta,
    anuladaEn: fila.anulada_en,
    motivoAnulacion: fila.motivo_anulacion,
    creadaEn: fila.created_at,
    actualizadaEn: fila.updated_at
  };
}

function mapearRespuesta(fila) {
  if (!fila) return null;
  return {
    indicador: fila.indicador_codigo,
    grupo: fila.grupo,
    valor: fila.valor,
    valorCrudo: desdeJson(fila.valor_crudo_json, null),
    muestras: desdeJson(fila.muestras_json, []),
    observacion: fila.observacion ?? '',
    documento: desdeJson(fila.documento_json, {}),
    evidenciaId: fila.evidencia_id,
    evidenciaNombre: fila.evidencia_nombre ?? null
  };
}

function mapearRecomendacion(fila) {
  if (!fila) return null;
  return {
    id: fila.id,
    evaluacionId: fila.evaluacion_id,
    indicador: fila.indicador_codigo,
    prioridad: fila.prioridad,
    textoOriginal: fila.texto_original,
    texto: fila.texto,
    estado: fila.estado,
    fuente: fila.fuente,
    decididaEn: fila.decidida_en,
    accionId: fila.accion_id ?? null
  };
}

function mapearAccion(fila) {
  if (!fila) return null;
  return {
    id: fila.id,
    evaluacionId: fila.evaluacion_id,
    recomendacionId: fila.recomendacion_id,
    descripcion: fila.descripcion,
    responsable: fila.responsable,
    fechaLimite: fila.fecha_limite,
    estado: fila.estado,
    avance: fila.avance,
    cerradaEn: fila.cerrada_en,
    predio: fila.predio_nombre ?? undefined,
    evaluacionCodigo: fila.evaluacion_codigo ?? undefined
  };
}

const SELECT_EVAL = `
  SELECT e.*,
         p.nombre     AS predio_nombre,
         p.codigo_ica AS predio_codigo_ica,
         p.municipio  AS predio_municipio,
         p.departamento AS predio_departamento,
         p.sistema    AS predio_sistema,
         u.nombre     AS evaluador_nombre
  FROM evaluaciones e
  JOIN predios  p ON p.id = e.predio_id
  JOIN usuarios u ON u.id = e.usuario_id
`;

// --- Evaluaciones ------------------------------------------------------------

export function listar({ usuarioId = null, soloPropias = false, estado = null, predioId = null,
                         departamento = null, municipio = null, nivel = null,
                         desde = null, hasta = null, limite = 200, desplazamiento = 0 } = {}) {
  const condiciones = [];
  const valores = [];

  if (soloPropias && usuarioId != null) { condiciones.push('e.usuario_id = ?'); valores.push(usuarioId); }
  if (estado) { condiciones.push('e.estado = ?'); valores.push(estado); }
  if (predioId) { condiciones.push('e.predio_id = ?'); valores.push(predioId); }
  if (departamento) { condiciones.push('p.departamento = ?'); valores.push(departamento); }
  if (municipio) { condiciones.push('lower(p.municipio) LIKE ?'); valores.push(`%${municipio.toLowerCase()}%`); }
  if (nivel) { condiciones.push('e.nivel = ?'); valores.push(nivel); }
  if (desde) { condiciones.push('e.fecha_visita >= ?'); valores.push(desde); }
  if (hasta) { condiciones.push('e.fecha_visita <= ?'); valores.push(hasta); }

  const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';
  return db()
    .all(
      `${SELECT_EVAL} ${where} ORDER BY e.fecha_visita DESC, e.id DESC LIMIT ? OFFSET ?`,
      ...valores,
      limite,
      desplazamiento
    )
    .map(mapearEvaluacion);
}

export function contar(filtros = {}) {
  const condiciones = [];
  const valores = [];
  if (filtros.estado) { condiciones.push('e.estado = ?'); valores.push(filtros.estado); }
  if (filtros.predioId) { condiciones.push('e.predio_id = ?'); valores.push(filtros.predioId); }
  const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';
  const fila = db().get(`SELECT COUNT(*) AS total FROM evaluaciones e ${where}`, ...valores);
  return fila?.total ?? 0;
}

export function buscarPorId(id) {
  return mapearEvaluacion(db().get(`${SELECT_EVAL} WHERE e.id = ?`, id));
}

export function buscarPorCodigo(codigo) {
  return mapearEvaluacion(db().get(`${SELECT_EVAL} WHERE e.codigo = ?`, codigo));
}

export function buscarAbiertaDePredio(predioId) {
  return mapearEvaluacion(db().get(`${SELECT_EVAL} WHERE e.predio_id = ? AND e.estado = 'en_progreso'`, predioId));
}

/** Codigo legible y unico: EV-2026-0001. */
export function siguienteCodigo(anio = new Date().getFullYear()) {
  const fila = db().get(
    "SELECT codigo FROM evaluaciones WHERE codigo LIKE ? ORDER BY codigo DESC LIMIT 1",
    `EV-${anio}-%`
  );
  const ultimo = fila ? Number(String(fila.codigo).split('-')[2]) : 0;
  return `EV-${anio}-${String(ultimo + 1).padStart(4, '0')}`;
}

export function crear({ codigo, predioId, usuarioId, fechaVisita, sistema, totalAves,
                        versionCatalogo, pesos, muestreo, indicadores, inspeccion, snapshot }) {
  const resultado = db().run(
    `INSERT INTO evaluaciones
       (codigo, predio_id, usuario_id, fecha_visita, sistema, total_aves,
        version_catalogo, pesos_json, muestreo_json, indicadores_json, inspeccion_json, snapshot_json, estado)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'en_progreso')`,
    codigo, predioId, usuarioId, fechaVisita, sistema, totalAves,
    versionCatalogo, aJson(pesos), aJson(muestreo), aJson(indicadores),
    aJson(inspeccion ?? {}), aJson(snapshot ?? null)
  );
  return buscarPorId(Number(resultado.lastInsertRowid));
}

export function actualizarInspeccion(id, inspeccion) {
  db().run(
    "UPDATE evaluaciones SET inspeccion_json = ?, updated_at = datetime('now') WHERE id = ?",
    aJson(inspeccion),
    id
  );
  return buscarPorId(id);
}

export function cerrar(id, { calificacion, nivel, resultado, provisionalHasta }) {
  db().run(
    `UPDATE evaluaciones
     SET estado = 'cerrada', forma = 'provisional',
         calificacion = ?, nivel = ?, resultado_json = ?,
         cerrada_en = datetime('now'), provisional_hasta = ?, updated_at = datetime('now')
     WHERE id = ?`,
    calificacion, nivel, aJson(resultado), provisionalHasta, id
  );
  return buscarPorId(id);
}

export function emitirDefinitiva(id) {
  db().run(
    "UPDATE evaluaciones SET forma = 'definitiva', updated_at = datetime('now') WHERE id = ?",
    id
  );
  return buscarPorId(id);
}

export function anular(id, motivo) {
  db().run(
    `UPDATE evaluaciones
     SET estado = 'anulada', anulada_en = datetime('now'), motivo_anulacion = ?, updated_at = datetime('now')
     WHERE id = ?`,
    motivo, id
  );
  return buscarPorId(id);
}

// --- Respuestas --------------------------------------------------------------

export function respuestasDe(evaluacionId) {
  return db()
    .all(
      `SELECT r.*, ev.nombre_original AS evidencia_nombre
       FROM evaluacion_respuestas r
       LEFT JOIN evidencias ev ON ev.id = r.evidencia_id
       WHERE r.evaluacion_id = ?
       ORDER BY r.indicador_codigo`,
      evaluacionId
    )
    .map(mapearRespuesta);
}

/** Respuestas en forma de diccionario, como las consume el motor de puntaje. */
export function mapaRespuestas(evaluacionId) {
  const mapa = {};
  for (const respuesta of respuestasDe(evaluacionId)) mapa[respuesta.indicador] = respuesta;
  return mapa;
}

export function guardarRespuesta(evaluacionId, { indicador, valor, valorCrudo, muestras, observacion, documento, evidenciaId }) {
  const grupo = INDICE[indicador]?.grupo;
  if (!grupo) throw new Error(`Indicador desconocido: ${indicador}`);

  db().run(
    `INSERT INTO evaluacion_respuestas
       (evaluacion_id, indicador_codigo, grupo, valor, valor_crudo_json, muestras_json, observacion, documento_json, evidencia_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (evaluacion_id, indicador_codigo) DO UPDATE SET
       valor            = excluded.valor,
       valor_crudo_json = excluded.valor_crudo_json,
       muestras_json    = excluded.muestras_json,
       observacion      = excluded.observacion,
       documento_json   = excluded.documento_json,
       evidencia_id     = COALESCE(excluded.evidencia_id, evaluacion_respuestas.evidencia_id),
       updated_at       = datetime('now')`,
    evaluacionId,
    indicador,
    grupo,
    valor ?? null,
    aJson(valorCrudo ?? null),
    aJson(muestras ?? []),
    observacion ?? '',
    aJson(documento ?? {}),
    evidenciaId ?? null
  );
}

/** Guarda un lote de respuestas en una sola transaccion. */
export function guardarRespuestas(evaluacionId, respuestas) {
  return db().transaccion(() => {
    for (const respuesta of respuestas) guardarRespuesta(evaluacionId, respuesta);
    db().run("UPDATE evaluaciones SET updated_at = datetime('now') WHERE id = ?", evaluacionId);
    return respuestasDe(evaluacionId);
  })();
}

export function vincularEvidencia(evaluacionId, indicador, evidenciaId) {
  db().run(
    `UPDATE evaluacion_respuestas SET evidencia_id = ?, updated_at = datetime('now')
     WHERE evaluacion_id = ? AND indicador_codigo = ?`,
    evidenciaId, evaluacionId, indicador
  );
}

/**
 * Fusiona metadatos del documento en la respuesta, sin tocar el resto.
 * Se usa al subir una evidencia con sus marcas de firmado y legible, para que
 * la respuesta y la evidencia no guarden versiones distintas del mismo hecho.
 */
export function actualizarDocumentoRespuesta(evaluacionId, indicador, documento) {
  const fila = db().get(
    'SELECT documento_json FROM evaluacion_respuestas WHERE evaluacion_id = ? AND indicador_codigo = ?',
    evaluacionId, indicador
  );

  const fusionado = { ...desdeJson(fila?.documento_json, {}), ...documento };

  if (fila) {
    db().run(
      `UPDATE evaluacion_respuestas SET documento_json = ?, updated_at = datetime('now')
       WHERE evaluacion_id = ? AND indicador_codigo = ?`,
      aJson(fusionado), evaluacionId, indicador
    );
    return;
  }

  // Aun no hay respuesta para ese indicador: se crea con el documento y sin puntaje.
  const grupo = INDICE[indicador]?.grupo;
  if (!grupo) return;
  db().run(
    `INSERT INTO evaluacion_respuestas (evaluacion_id, indicador_codigo, grupo, documento_json)
     VALUES (?, ?, ?, ?)`,
    evaluacionId, indicador, grupo, aJson(fusionado)
  );
}

// --- Recomendaciones ---------------------------------------------------------

const SELECT_REC = `
  SELECT r.*, (SELECT a.id FROM acciones_mejora a WHERE a.recomendacion_id = r.id LIMIT 1) AS accion_id
  FROM recomendaciones r
`;

export function recomendacionesDe(evaluacionId) {
  return db()
    .all(`${SELECT_REC} WHERE r.evaluacion_id = ? ORDER BY
            CASE r.prioridad WHEN 'Alta' THEN 0 WHEN 'Media' THEN 1 ELSE 2 END, r.id`, evaluacionId)
    .map(mapearRecomendacion);
}

export function buscarRecomendacion(id) {
  return mapearRecomendacion(db().get(`${SELECT_REC} WHERE r.id = ?`, id));
}

export function reemplazarRecomendaciones(evaluacionId, recomendaciones) {
  return db().transaccion(() => {
    db().run("DELETE FROM recomendaciones WHERE evaluacion_id = ? AND estado = 'pendiente'", evaluacionId);
    for (const rec of recomendaciones) {
      db().run(
        `INSERT INTO recomendaciones (evaluacion_id, indicador_codigo, prioridad, texto_original, texto, fuente)
         VALUES (?, ?, ?, ?, ?, ?)`,
        evaluacionId, rec.indicador, rec.prioridad, rec.texto, rec.texto, rec.fuente ?? 'plantilla'
      );
    }
    return recomendacionesDe(evaluacionId);
  })();
}

export function decidirRecomendacion(id, { estado, texto, usuarioId }) {
  db().run(
    `UPDATE recomendaciones
     SET estado = ?, texto = COALESCE(?, texto), decidida_por = ?, decidida_en = datetime('now'),
         updated_at = datetime('now')
     WHERE id = ?`,
    estado, texto ?? null, usuarioId, id
  );
  return buscarRecomendacion(id);
}

// --- Acciones del plan de mejora ---------------------------------------------

const SELECT_ACCION = `
  SELECT a.*, e.codigo AS evaluacion_codigo, p.nombre AS predio_nombre
  FROM acciones_mejora a
  JOIN evaluaciones e ON e.id = a.evaluacion_id
  JOIN predios      p ON p.id = e.predio_id
`;

export function accionesDe(evaluacionId) {
  return db().all(`${SELECT_ACCION} WHERE a.evaluacion_id = ? ORDER BY a.fecha_limite`, evaluacionId).map(mapearAccion);
}

export function listarAcciones({ estado = null, soloAtrasadas = false } = {}) {
  const condiciones = [];
  const valores = [];
  if (estado) { condiciones.push('a.estado = ?'); valores.push(estado); }
  if (soloAtrasadas) condiciones.push("a.estado <> 'cumplida' AND date(a.fecha_limite) < date('now')");
  const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';
  return db().all(`${SELECT_ACCION} ${where} ORDER BY a.fecha_limite`, ...valores).map(mapearAccion);
}

export function buscarAccion(id) {
  return mapearAccion(db().get(`${SELECT_ACCION} WHERE a.id = ?`, id));
}

export function crearAccion({ evaluacionId, recomendacionId, descripcion, responsable, fechaLimite }) {
  const resultado = db().run(
    `INSERT INTO acciones_mejora (evaluacion_id, recomendacion_id, descripcion, responsable, fecha_limite)
     VALUES (?, ?, ?, ?, ?)`,
    evaluacionId, recomendacionId ?? null, descripcion, responsable, fechaLimite
  );
  return buscarAccion(Number(resultado.lastInsertRowid));
}

export function actualizarAccion(id, { estado, avance }) {
  const asignaciones = [];
  const valores = [];
  if (estado !== undefined) { asignaciones.push('estado = ?'); valores.push(estado); }
  if (avance !== undefined) { asignaciones.push('avance = ?'); valores.push(avance); }
  if (estado === 'cumplida') asignaciones.push("cerrada_en = datetime('now')");
  if (!asignaciones.length) return buscarAccion(id);

  asignaciones.push("updated_at = datetime('now')");
  db().run(`UPDATE acciones_mejora SET ${asignaciones.join(', ')} WHERE id = ?`, ...valores, id);
  return buscarAccion(id);
}

// --- Agregados para el panel y los reportes ----------------------------------

export function resumenGeneral(filtros = {}) {
  const condiciones = ["e.estado = 'cerrada'"];
  const valores = [];
  if (filtros.departamento) { condiciones.push('p.departamento = ?'); valores.push(filtros.departamento); }
  if (filtros.municipio) { condiciones.push('lower(p.municipio) LIKE ?'); valores.push(`%${filtros.municipio.toLowerCase()}%`); }
  if (filtros.usuarioId) { condiciones.push('e.usuario_id = ?'); valores.push(filtros.usuarioId); }
  if (filtros.nivel) { condiciones.push('e.nivel = ?'); valores.push(filtros.nivel); }
  if (filtros.desde) { condiciones.push('e.fecha_visita >= ?'); valores.push(filtros.desde); }
  if (filtros.hasta) { condiciones.push('e.fecha_visita <= ?'); valores.push(filtros.hasta); }
  const where = `WHERE ${condiciones.join(' AND ')}`;

  const totales = db().get(
    `SELECT COUNT(*) AS cerradas, AVG(e.calificacion) AS promedio
     FROM evaluaciones e JOIN predios p ON p.id = e.predio_id ${where}`,
    ...valores
  );

  const distribucion = db().all(
    `SELECT e.nivel, COUNT(*) AS total
     FROM evaluaciones e JOIN predios p ON p.id = e.predio_id ${where}
     GROUP BY e.nivel`,
    ...valores
  );

  const incumplimientos = db().all(
    `SELECT r.indicador_codigo AS indicador, COUNT(*) AS total
     FROM evaluacion_respuestas r
     JOIN evaluaciones e ON e.id = r.evaluacion_id
     JOIN predios      p ON p.id = e.predio_id
     ${where} AND r.valor = 0
     GROUP BY r.indicador_codigo
     ORDER BY total DESC, r.indicador_codigo
     LIMIT 8`,
    ...valores
  );

  const enProgreso = db().get("SELECT COUNT(*) AS total FROM evaluaciones WHERE estado = 'en_progreso'");
  const prediosActivos = db().get('SELECT COUNT(*) AS total FROM predios WHERE activo = 1');
  const accionesAtrasadas = db().get(
    "SELECT COUNT(*) AS total FROM acciones_mejora WHERE estado <> 'cumplida' AND date(fecha_limite) < date('now')"
  );

  return {
    prediosActivos: prediosActivos?.total ?? 0,
    evaluacionesCerradas: totales?.cerradas ?? 0,
    evaluacionesEnProgreso: enProgreso?.total ?? 0,
    calificacionPromedio: totales?.promedio == null ? null : Math.round(totales.promedio * 100) / 100,
    accionesAtrasadas: accionesAtrasadas?.total ?? 0,
    distribucionNivel: distribucion,
    topIncumplimientos: incumplimientos
  };
}

export function consolidadoPorDepartamento() {
  return db().all(
    `SELECT p.departamento,
            COUNT(*)            AS evaluaciones,
            COUNT(DISTINCT p.id) AS predios,
            AVG(e.calificacion) AS promedio
     FROM evaluaciones e
     JOIN predios p ON p.id = e.predio_id
     WHERE e.estado = 'cerrada'
     GROUP BY p.departamento
     ORDER BY p.departamento COLLATE NOCASE`
  );
}

export { mapearEvaluacion, mapearRespuesta, mapearRecomendacion, mapearAccion };
