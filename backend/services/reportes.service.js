/**
 * Reportes, analisis comparativo y exportaciones.
 * Las agregaciones las resuelve SQL, no un recorrido en memoria del estado completo.
 */

import { ErrorNoEncontrado, ErrorValidacion } from '../errors.js';
import * as repo from '../repositories/evaluaciones.repo.js';
import * as predios from '../repositories/predios.repo.js';
import { INDICE, GRUPOS } from '../../shared/ica/catalogo.js';
import { valorIndicador } from '../../shared/ica/puntaje.js';

/** Indicadores del panel general, con los filtros aplicados en la consulta. */
export function panel(filtros = {}) {
  return repo.resumenGeneral(filtros);
}

/** Dashboard de un predio: historial y evolucion. */
export function porPredio(predioId) {
  const predio = predios.buscarPorId(predioId);
  if (!predio) throw new ErrorNoEncontrado('Predio');

  const cerradas = repo.listar({ predioId, estado: 'cerrada', limite: 500 });
  const ultima = cerradas[0] ?? null;

  const evolucion = cerradas
    .slice()
    .reverse()
    .map((evaluacion) => ({
      codigo: evaluacion.codigo,
      fecha: evaluacion.fechaVisita,
      calificacion: evaluacion.calificacion,
      nivel: evaluacion.nivel,
      grupos: Object.fromEntries(
        GRUPOS.map((grupo) => [grupo, evaluacion.resultado?.grupos?.[grupo]?.promedio ?? null])
      )
    }));

  const totalAcciones = cerradas.reduce((suma, evaluacion) => suma + repo.accionesDe(evaluacion.id).length, 0);

  return {
    predio,
    totalEvaluaciones: cerradas.length,
    ultima,
    evolucion,
    totalAcciones,
    tendencia:
      evolucion.length >= 2
        ? Math.round((evolucion.at(-1).calificacion - evolucion.at(-2).calificacion) * 100) / 100
        : null
  };
}

/** Compara dos evaluaciones del mismo predio, indicador por indicador. */
export function comparar(idA, idB) {
  const a = repo.buscarPorId(idA);
  const b = repo.buscarPorId(idB);

  if (!a || !b) throw new ErrorNoEncontrado('Evaluacion');
  if (a.predioId !== b.predioId) {
    throw new ErrorValidacion('Solo se pueden comparar evaluaciones del mismo predio.');
  }
  if (a.estado !== 'cerrada' || b.estado !== 'cerrada') {
    throw new ErrorValidacion('Ambas evaluaciones deben estar cerradas.');
  }

  const respA = repo.mapaRespuestas(a.id);
  const respB = repo.mapaRespuestas(b.id);
  const codigos = [...new Set([...a.indicadores, ...b.indicadores])].sort();

  const porIndicador = codigos.map((codigo) => {
    const valorA = valorIndicador(respA[codigo]);
    const valorB = valorIndicador(respB[codigo]);
    const diferencia = valorA == null || valorB == null ? null : Math.round((valorB - valorA) * 100) / 100;

    return {
      indicador: codigo,
      nombre: INDICE[codigo]?.nombre ?? '',
      grupo: INDICE[codigo]?.grupo ?? '',
      valorA,
      valorB,
      diferencia,
      resultado:
        diferencia == null ? 'No comparable' : diferencia > 0 ? 'Mejoro' : diferencia < 0 ? 'Empeoro' : 'Sin cambio'
    };
  });

  const porGrupo = GRUPOS.map((grupo) => ({
    grupo,
    promedioA: a.resultado?.grupos?.[grupo]?.promedio ?? null,
    promedioB: b.resultado?.grupos?.[grupo]?.promedio ?? null
  }));

  return {
    predio: a.predio,
    a: { codigo: a.codigo, fecha: a.fechaVisita, calificacion: a.calificacion, nivel: a.nivel },
    b: { codigo: b.codigo, fecha: b.fechaVisita, calificacion: b.calificacion, nivel: b.nivel },
    diferenciaFinal: Math.round((b.calificacion - a.calificacion) * 100) / 100,
    porGrupo,
    porIndicador
  };
}

/** Consolidado por departamento para el reporte institucional. */
export function consolidado() {
  const filas = repo.consolidadoPorDepartamento();
  return filas.map((fila) => ({
    departamento: fila.departamento,
    predios: fila.predios,
    evaluaciones: fila.evaluaciones,
    promedio: fila.promedio == null ? null : Math.round(fila.promedio * 100) / 100
  }));
}

const escaparCsv = (valor) => `"${String(valor ?? '').replaceAll('"', '""')}"`;

/** CSV con el detalle por indicador de una evaluacion. */
export function csvEvaluacion(evaluacionId) {
  const evaluacion = repo.buscarPorId(evaluacionId);
  if (!evaluacion) throw new ErrorNoEncontrado('Evaluacion');

  const respuestas = repo.mapaRespuestas(evaluacionId);
  const encabezado = [
    'evaluacion', 'fecha_visita', 'predio', 'municipio', 'departamento', 'sistema', 'total_aves',
    'codigo', 'indicador', 'grupo', 'puntaje', 'valor_efectivo', 'descripcion_nivel',
    'observacion', 'evidencia', 'observaciones_muestra'
  ];

  const filas = [encabezado];

  for (const codigo of evaluacion.indicadores) {
    const indicador = INDICE[codigo];
    const respuesta = respuestas[codigo] ?? {};
    const nivel = indicador?.niveles.find(([puntos]) => puntos === respuesta.valor);

    filas.push([
      evaluacion.codigo,
      evaluacion.fechaVisita,
      evaluacion.predio?.nombre ?? '',
      evaluacion.predio?.municipio ?? '',
      evaluacion.predio?.departamento ?? '',
      evaluacion.sistema,
      evaluacion.totalAves,
      codigo,
      indicador?.nombre ?? '',
      indicador?.grupo ?? '',
      respuesta.valor ?? '',
      valorIndicador(respuesta) ?? '',
      nivel?.[1] ?? '',
      respuesta.observacion ?? '',
      respuesta.evidenciaNombre ?? '',
      (respuesta.muestras ?? []).join(' ')
    ]);
  }

  return filas.map((fila) => fila.map(escaparCsv).join(',')).join('\r\n');
}

/** CSV del consolidado por departamento. */
export function csvConsolidado() {
  const filas = [['departamento', 'predios', 'evaluaciones_cerradas', 'calificacion_promedio']];
  for (const item of consolidado()) {
    filas.push([item.departamento, item.predios, item.evaluaciones, item.promedio ?? '']);
  }
  return filas.map((fila) => fila.map(escaparCsv).join(',')).join('\r\n');
}

/** Datos completos de la forma oficial, listos para imprimir desde el navegador. */
export function formaOficial(evaluacionId) {
  const evaluacion = repo.buscarPorId(evaluacionId);
  if (!evaluacion) throw new ErrorNoEncontrado('Evaluacion');
  if (evaluacion.estado !== 'cerrada') {
    throw new ErrorValidacion('La forma oficial solo se emite para evaluaciones cerradas.');
  }

  const respuestas = repo.respuestasDe(evaluacionId);
  const recomendaciones = repo.recomendacionesDe(evaluacionId).filter((rec) => rec.estado === 'aprobada');

  return {
    evaluacion,
    predio: predios.buscarPorId(evaluacion.predioId),
    respuestas: respuestas.map((respuesta) => ({
      ...respuesta,
      nombre: INDICE[respuesta.indicador]?.nombre ?? '',
      pregunta: INDICE[respuesta.indicador]?.pregunta ?? '',
      descripcionNivel: INDICE[respuesta.indicador]?.niveles.find(([puntos]) => puntos === respuesta.valor)?.[1] ?? ''
    })),
    criticos: respuestas.filter((respuesta) => respuesta.valor === 0),
    recomendaciones,
    acciones: repo.accionesDe(evaluacionId),
    emitidaEn: new Date().toISOString()
  };
}
