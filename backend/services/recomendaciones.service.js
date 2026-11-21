/**
 * Recomendaciones y plan de mejora.
 *
 * Las propuestas se generan con plantillas deterministas a partir del catalogo.
 * Si hay un servicio de IA configurado se puede enriquecer el texto, pero el
 * respaldo local siempre funciona y queda marcado como tal, para que nadie
 * confunda una plantilla con una recomendacion profesional revisada.
 */

import config from '../config/env.js';
import { ErrorValidacion, ErrorNoEncontrado, ErrorConflicto, ErrorServicioExterno } from '../errors.js';
import * as repo from '../repositories/evaluaciones.repo.js';
import * as auditoria from '../repositories/auditoria.repo.js';
import { INDICE } from '../../shared/ica/catalogo.js';

const VERBO_POR_GRUPO = {
  MBA: 'Intervenir el manejo de las aves',
  MBR: 'Adecuar instalaciones y recursos',
  MBG: 'Documentar y formalizar la gestion'
};

const ORDEN_PRIORIDAD = { Alta: 0, Media: 1, Baja: 2 };

/** Prioridad segun que tan lejos esta el indicador del nivel optimo. */
function prioridadDe(valor, grupo) {
  if (valor === 0) return 'Alta';
  if (grupo === 'MBA') return 'Media';
  return 'Baja';
}

/**
 * Propone una recomendacion por cada indicador que no alcanzo el nivel 100.
 * @returns {{indicador: string, prioridad: string, texto: string, fuente: string}[]}
 */
export function generarRecomendaciones({ evaluacion, respuestas }) {
  const propuestas = [];

  for (const codigo of evaluacion.indicadores) {
    const respuesta = respuestas[codigo];
    if (!respuesta || respuesta.valor == null || respuesta.valor >= 100) continue;

    const indicador = INDICE[codigo];
    if (!indicador) continue;

    const nivelOptimo = indicador.niveles[0]?.[1] ?? 'el nivel maximo de la norma';
    const texto = `${VERBO_POR_GRUPO[indicador.grupo]} en "${indicador.nombre}" hasta alcanzar el nivel 100: ${nivelOptimo}.`;

    propuestas.push({
      indicador: codigo,
      prioridad: prioridadDe(respuesta.valor, indicador.grupo),
      texto,
      fuente: 'plantilla'
    });
  }

  // Primero lo mas urgente y, a igual prioridad, el grupo que mas pesa en la nota.
  return propuestas.sort((a, b) =>
    ORDEN_PRIORIDAD[a.prioridad] - ORDEN_PRIORIDAD[b.prioridad] ||
    (evaluacion.pesos[INDICE[b.indicador].grupo] ?? 0) - (evaluacion.pesos[INDICE[a.indicador].grupo] ?? 0)
  );
}

export function listar(evaluacionId) {
  return repo.recomendacionesDe(evaluacionId);
}

/** Regenera las propuestas pendientes de una evaluacion ya cerrada. */
export function regenerar(evaluacionId, { actor, ip = null, userAgent = null }) {
  const evaluacion = repo.buscarPorId(evaluacionId);
  if (!evaluacion) throw new ErrorNoEncontrado('Evaluacion');
  if (evaluacion.estado !== 'cerrada') {
    throw new ErrorConflicto('Las recomendaciones se generan cuando la evaluacion esta cerrada.');
  }

  const respuestas = repo.mapaRespuestas(evaluacionId);
  const propuestas = generarRecomendaciones({ evaluacion, respuestas });
  const guardadas = repo.reemplazarRecomendaciones(evaluacionId, propuestas);

  auditoria.registrar({
    usuario: actor,
    accion: 'generar_recomendaciones', entidad: 'evaluacion', entidadId: evaluacionId,
    detalle: { total: guardadas.length, fuente: 'plantilla' },
    ip, userAgent
  });

  return guardadas;
}

/** Enriquecimiento opcional con el servicio de IA configurado. */
export async function regenerarConIa(evaluacionId, { actor, ip = null, userAgent = null }) {
  if (!config.ia.habilitada) {
    throw new ErrorServicioExterno('No hay un servicio de IA configurado. Configure OPENAI_API_KEY para habilitarlo.');
  }

  const evaluacion = repo.buscarPorId(evaluacionId);
  if (!evaluacion) throw new ErrorNoEncontrado('Evaluacion');
  if (evaluacion.estado !== 'cerrada') {
    throw new ErrorConflicto('Las recomendaciones se generan cuando la evaluacion esta cerrada.');
  }

  const respuestas = repo.mapaRespuestas(evaluacionId);
  const bajos = evaluacion.indicadores
    .filter((codigo) => respuestas[codigo]?.valor != null && respuestas[codigo].valor < 100)
    .map((codigo) => ({
      codigo,
      nombre: INDICE[codigo]?.nombre,
      grupo: INDICE[codigo]?.grupo,
      puntaje: respuestas[codigo].valor
    }));

  if (!bajos.length) return repo.reemplazarRecomendaciones(evaluacionId, []);

  try {
    const { default: OpenAI } = await import('openai');
    const cliente = new OpenAI({ apiKey: config.ia.clave, baseURL: config.ia.baseUrl || undefined });

    const instruccion = [
      'Eres experto en bienestar animal segun la metodologia ICA de Colombia para codornices de postura.',
      'Para cada indicador recibido propon una accion correctiva concreta, verificable y acotada al predio.',
      'No afirmes cumplimiento normativo ni cites normas que no esten en los datos.',
      'Responde unicamente con JSON: {"recomendaciones":[{"codigo":"","prioridad":"Alta|Media|Baja","texto":""}]}',
      `Indicadores: ${JSON.stringify(bajos)}`,
      `Nivel general: ${evaluacion.nivel}, calificacion ${evaluacion.calificacion}.`
    ].join('\n');

    const respuesta = await cliente.responses.create({ model: config.ia.modelo, input: instruccion });
    const texto = respuesta.output_text ?? '';
    const inicio = texto.indexOf('{');
    const fin = texto.lastIndexOf('}');

    let propuestas = [];
    if (inicio >= 0 && fin > inicio) {
      const analizado = JSON.parse(texto.slice(inicio, fin + 1));
      propuestas = (analizado.recomendaciones ?? [])
        .filter((item) => INDICE[item.codigo])
        .map((item) => ({
          indicador: item.codigo,
          prioridad: ORDEN_PRIORIDAD[item.prioridad] != null ? item.prioridad : 'Media',
          texto: String(item.texto ?? '').slice(0, 1000) || 'Revisar el indicador segun la norma ICA.',
          fuente: `ia:${config.ia.modelo}`
        }));
    }

    // Si la IA no devolvio nada utilizable se cae a las plantillas en vez de dejar la vista vacia.
    if (!propuestas.length) propuestas = generarRecomendaciones({ evaluacion, respuestas });

    const guardadas = repo.reemplazarRecomendaciones(evaluacionId, propuestas);

    auditoria.registrar({
      usuario: actor,
      accion: 'generar_recomendaciones', entidad: 'evaluacion', entidadId: evaluacionId,
      detalle: { total: guardadas.length, fuente: 'ia', modelo: config.ia.modelo },
      ip, userAgent
    });

    return guardadas;
  } catch (error) {
    const guardadas = repo.reemplazarRecomendaciones(evaluacionId, generarRecomendaciones({ evaluacion, respuestas }));
    auditoria.registrar({
      usuario: actor,
      accion: 'generar_recomendaciones', entidad: 'evaluacion', entidadId: evaluacionId,
      resultado: 'fallo',
      detalle: { motivo: error.message, respaldo: 'plantilla', total: guardadas.length },
      ip, userAgent
    });
    return guardadas;
  }
}

/** Aprueba o descarta una recomendacion, con el texto editado por el evaluador. */
export function decidir(recomendacionId, { estado, texto, actor, ip = null, userAgent = null }) {
  if (!['aprobada', 'descartada'].includes(estado)) {
    throw new ErrorValidacion('El estado debe ser aprobada o descartada.');
  }

  const recomendacion = repo.buscarRecomendacion(recomendacionId);
  if (!recomendacion) throw new ErrorNoEncontrado('Recomendacion');
  if (recomendacion.estado !== 'pendiente') {
    throw new ErrorConflicto(`La recomendacion ya fue ${recomendacion.estado}.`);
  }

  const textoLimpio = texto === undefined ? undefined : String(texto).trim().slice(0, 1000);
  if (textoLimpio !== undefined && textoLimpio.length < 10) {
    throw new ErrorValidacion('El texto de la recomendacion debe tener al menos 10 caracteres.');
  }

  const actualizada = repo.decidirRecomendacion(recomendacionId, { estado, texto: textoLimpio, usuarioId: actor.id });

  auditoria.registrar({
    usuario: actor,
    accion: estado === 'aprobada' ? 'aprobar_recomendacion' : 'descartar_recomendacion',
    entidad: 'recomendacion', entidadId: recomendacionId,
    datosAntes: { estado: recomendacion.estado, texto: recomendacion.texto },
    datosDespues: { estado, texto: actualizada.texto },
    ip, userAgent
  });

  return actualizada;
}

// --- Plan de mejora ----------------------------------------------------------

const RE_FECHA = /^\d{4}-\d{2}-\d{2}$/;

export function listarAcciones(filtros = {}) {
  return repo.listarAcciones(filtros);
}

export function crearAccion({ recomendacionId, descripcion, responsable, fechaLimite }, { actor, ip = null, userAgent = null }) {
  const recomendacion = repo.buscarRecomendacion(recomendacionId);
  if (!recomendacion) throw new ErrorNoEncontrado('Recomendacion');
  if (recomendacion.estado !== 'aprobada') {
    throw new ErrorConflicto('Solo las recomendaciones aprobadas se convierten en acciones del plan.');
  }
  if (recomendacion.accionId) {
    throw new ErrorConflicto('Esta recomendacion ya tiene una accion en el plan de mejora.');
  }

  const texto = String(descripcion || '').trim();
  const responsableLimpio = String(responsable || '').trim();
  const fecha = String(fechaLimite || '').trim();

  if (texto.length < 10) throw new ErrorValidacion('Describa la accion con al menos 10 caracteres.');
  if (responsableLimpio.length < 3) throw new ErrorValidacion('Indique el responsable de la accion.');
  if (!RE_FECHA.test(fecha)) throw new ErrorValidacion('La fecha limite debe tener el formato AAAA-MM-DD.');
  if (fecha < new Date().toLocaleDateString('en-CA')) {
    throw new ErrorValidacion('La fecha limite no puede estar en el pasado.');
  }

  const accion = repo.crearAccion({
    evaluacionId: recomendacion.evaluacionId,
    recomendacionId,
    descripcion: texto,
    responsable: responsableLimpio,
    fechaLimite: fecha
  });

  auditoria.registrar({
    usuario: actor,
    accion: 'crear', entidad: 'accion_mejora', entidadId: accion.id,
    datosDespues: { descripcion: texto, responsable: responsableLimpio, fechaLimite: fecha },
    ip, userAgent
  });

  return accion;
}

export function actualizarAccion(id, { estado, avance }, { actor, ip = null, userAgent = null }) {
  const actual = repo.buscarAccion(id);
  if (!actual) throw new ErrorNoEncontrado('Accion');

  const cambios = {};

  if (estado !== undefined) {
    if (!['pendiente', 'en_curso', 'cumplida'].includes(estado)) {
      throw new ErrorValidacion('El estado debe ser pendiente, en_curso o cumplida.');
    }
    cambios.estado = estado;
    // Marcar cumplida implica avance total: evita el estado incoherente del sistema anterior.
    if (estado === 'cumplida') cambios.avance = 100;
  }

  if (avance !== undefined) {
    const numero = Number(avance);
    if (!Number.isInteger(numero) || numero < 0 || numero > 100) {
      throw new ErrorValidacion('El avance debe ser un entero entre 0 y 100.');
    }
    if (cambios.estado !== 'cumplida') cambios.avance = numero;
    // Un avance del 100% sin estado explicito pasa la accion a cumplida.
    if (numero === 100 && estado === undefined) cambios.estado = 'cumplida';
  }

  const actualizada = repo.actualizarAccion(id, cambios);

  auditoria.registrar({
    usuario: actor,
    accion: 'actualizar', entidad: 'accion_mejora', entidadId: id,
    datosAntes: { estado: actual.estado, avance: actual.avance },
    datosDespues: { estado: actualizada.estado, avance: actualizada.avance },
    ip, userAgent
  });

  return actualizada;
}
