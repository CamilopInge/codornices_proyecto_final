/**
 * Ciclo de vida de una evaluacion ICA.
 *
 * Decision clave: el puntaje de cada indicador lo deriva el servidor a partir de
 * los datos crudos (porcentaje observado, medidas de area, conteos). El cliente
 * envia lo que midio, no la calificacion. Antes el frontend mandaba el puntaje ya
 * calculado y el servidor lo aceptaba, de modo que cualquiera podia cerrar una
 * visita con 100 manipulando la peticion.
 */

import config from '../config/env.js';
import { ErrorValidacion, ErrorConflicto, ErrorNoEncontrado, ErrorAutorizacion } from '../errors.js';
import * as repo from '../repositories/evaluaciones.repo.js';
import * as predios from '../repositories/predios.repo.js';
import * as auditoria from '../repositories/auditoria.repo.js';
import { db } from '../db/index.js';
import {
  INDICE, TIPO_CAPTURA, VERSION_CATALOGO, GRUPO_NOMBRE
} from '../../shared/ica/catalogo.js';
import {
  ponderacion, planMuestreo, indicadoresAplicables, puntajeDesdePorcentaje,
  densidadJaula, densidadPiso, puntajeDesdeDensidad, puntajeBebederos, puntajeComederos,
  requiereSoporte
} from '../../shared/ica/reglas.js';
import { calcular, validarCierre, seleccionarMuestra, indicadoresCriticos } from '../../shared/ica/puntaje.js';
import { relajacionesActivas } from '../../shared/ica/reglas.js';
import { generarRecomendaciones } from './recomendaciones.service.js';
import { obtener as obtenerConfig, CLAVES } from '../repositories/configuracion.repo.js';

/**
 * Exigencia documental que rige para una evaluacion.
 *
 * Mientras esta en progreso sigue la configuracion vigente, de modo que
 * ajustarla en Parametrizacion surte efecto de inmediato sobre la visita que se
 * esta diligenciando. Al cerrarse queda congelada con el resultado, porque
 * forma parte de como se califico esa visita y no debe cambiar despues.
 */
function exigenciaDe(evaluacion) {
  if (evaluacion?.estado === 'cerrada') {
    return evaluacion.resultado?.exigencia ?? evaluacion.exigenciaAlAbrir ?? obtenerConfig(CLAVES.EXIGENCIA);
  }
  return obtenerConfig(CLAVES.EXIGENCIA);
}

const RE_FECHA = /^\d{4}-\d{2}-\d{2}$/;

/** Un evaluador solo ve y toca lo suyo; admin y docente ven todo. */
function verificarAcceso(evaluacion, actor, { escritura = false } = {}) {
  if (!evaluacion) throw new ErrorNoEncontrado('Evaluacion');
  const esDueno = evaluacion.usuarioId === actor.id;
  const esSupervisor = actor.rol === 'admin' || actor.rol === 'docente';

  if (!esDueno && !esSupervisor) {
    throw new ErrorAutorizacion('Solo puede consultar las evaluaciones que usted realizo.');
  }
  if (escritura && !esDueno && actor.rol !== 'admin') {
    throw new ErrorAutorizacion('Solo el evaluador que abrio la visita o un administrador pueden modificarla.');
  }
}

/**
 * Deriva el puntaje de un indicador a partir de los datos crudos que envio el cliente.
 * Para los indicadores de escala pura se acepta el nivel elegido, validando que
 * pertenezca a la escala declarada por la norma.
 */
function derivarPuntaje(codigo, entrada) {
  const indicador = INDICE[codigo];
  if (!indicador) throw new ErrorValidacion(`El indicador ${codigo} no existe en el catalogo ICA.`);

  const nivelesValidos = indicador.niveles.map(([puntos]) => puntos);
  const crudo = entrada.valorCrudo ?? {};

  switch (indicador.captura) {
    case TIPO_CAPTURA.PORCENTAJE:
    case TIPO_CAPTURA.DOCUMENTAL_PORCENTAJE: {
      const porcentaje = crudo.porcentaje;
      if (porcentaje == null || porcentaje === '') return { valor: null, valorCrudo: null };
      const numero = Number(porcentaje);
      if (!Number.isFinite(numero) || numero < 0 || numero > 100) {
        throw new ErrorValidacion(`${codigo}: el porcentaje debe estar entre 0 y 100.`);
      }
      return { valor: puntajeDesdePorcentaje(codigo, numero), valorCrudo: { porcentaje: numero } };
    }

    case TIPO_CAPTURA.DENSIDAD_JAULA: {
      const { at, ta, aj, tg } = crudo;
      if ([at, ta, aj, tg].some((valor) => valor == null || valor === '')) return { valor: null, valorCrudo: null };
      const densidad = densidadJaula({ at, ta, aj, tg });
      if (densidad == null) throw new ErrorValidacion(`${codigo}: las areas y los conteos deben ser mayores que cero.`);
      return {
        valor: puntajeDesdeDensidad(densidad),
        valorCrudo: { at: Number(at), ta: Number(ta), aj: Number(aj), tg: Number(tg), densidad: Math.round(densidad * 100) / 100 }
      };
    }

    case TIPO_CAPTURA.DENSIDAD_PISO: {
      const { aves, metrosCuadrados } = crudo;
      if (aves == null || metrosCuadrados == null || aves === '' || metrosCuadrados === '') {
        return { valor: null, valorCrudo: null };
      }
      const densidad = densidadPiso({ aves, metrosCuadrados });
      if (densidad == null) throw new ErrorValidacion(`${codigo}: las aves y el area util deben ser mayores que cero.`);
      return {
        valor: puntajeDesdeDensidad(densidad),
        valorCrudo: { aves: Number(aves), metrosCuadrados: Number(metrosCuadrados), densidad: Math.round(densidad * 100) / 100 }
      };
    }

    case TIPO_CAPTURA.RATIO_BEBEDERO: {
      const { animales, unidades, limite } = crudo;
      if ([animales, unidades, limite].some((valor) => valor == null || valor === '')) return { valor: null, valorCrudo: null };
      const puntaje = puntajeBebederos({ animales, unidades, limite });
      if (puntaje == null) throw new ErrorValidacion(`${codigo}: los conteos y el limite deben ser mayores que cero.`);
      return {
        valor: puntaje,
        valorCrudo: {
          animales: Number(animales), unidades: Number(unidades), limite: Number(limite),
          porUnidad: Math.round((Number(animales) / Number(unidades)) * 100) / 100
        }
      };
    }

    case TIPO_CAPTURA.RATIO_COMEDERO: {
      const { animales, unidades, limite, competencia } = crudo;
      if ([animales, unidades, limite].some((valor) => valor == null || valor === '')) return { valor: null, valorCrudo: null };
      const puntaje = puntajeComederos({ animales, unidades, limite, competencia: Boolean(competencia) });
      if (puntaje == null) throw new ErrorValidacion(`${codigo}: los conteos y el limite deben ser mayores que cero.`);
      return {
        valor: puntaje,
        valorCrudo: {
          animales: Number(animales), unidades: Number(unidades), limite: Number(limite),
          competencia: Boolean(competencia),
          porUnidad: Math.round((Number(animales) / Number(unidades)) * 100) / 100
        }
      };
    }

    default: {
      // Escala, documental y documental mixto: el evaluador elige un nivel de la norma.
      if (entrada.valor == null) return { valor: null, valorCrudo: null };
      const valor = Number(entrada.valor);
      if (!nivelesValidos.includes(valor)) {
        throw new ErrorValidacion(`${codigo}: el puntaje ${valor} no pertenece a su escala (${nivelesValidos.join(', ')}).`);
      }
      return { valor, valorCrudo: null };
    }
  }
}

/** Las observaciones punto a punto solo admiten los valores de la norma. */
function normalizarMuestras(codigo, muestras, muestrasEsperadas) {
  if (!Array.isArray(muestras) || !muestras.length) return [];
  const valores = muestras.map(Number);
  if (valores.some((valor) => ![0, 55, 100].includes(valor))) {
    throw new ErrorValidacion(`${codigo}: las observaciones de la muestra solo pueden ser 0, 55 o 100.`);
  }
  if (valores.length > muestrasEsperadas) {
    throw new ErrorValidacion(`${codigo}: se registraron ${valores.length} observaciones y el plan admite ${muestrasEsperadas}.`);
  }
  return valores;
}

// --- Consultas ---------------------------------------------------------------

export function listar(filtros, actor) {
  const soloPropias = actor.rol === 'evaluador' || actor.rol === 'consultor';
  return repo.listar({ ...filtros, usuarioId: actor.id, soloPropias: soloPropias && actor.rol === 'evaluador' });
}

/** Evaluacion completa con respuestas, recomendaciones y plan. */
export function obtenerDetalle(id, actor) {
  const evaluacion = repo.buscarPorId(id);
  verificarAcceso(evaluacion, actor);

  const respuestas = repo.respuestasDe(evaluacion.id);
  const mapa = Object.fromEntries(respuestas.map((r) => [r.indicador, r]));
  const exigencia = exigenciaDe(evaluacion);

  return {
    ...evaluacion,
    exigencia,
    relajaciones: relajacionesActivas(exigencia),
    respuestas,
    resumen: calcular({ codigos: evaluacion.indicadores, respuestas: mapa, pesos: evaluacion.pesos }),
    validacion: validarCierre({
      codigos: evaluacion.indicadores,
      respuestas: mapa,
      inspeccion: evaluacion.inspeccion,
      totalAves: evaluacion.totalAves,
      exigencia
    }),
    recomendaciones: repo.recomendacionesDe(evaluacion.id),
    acciones: repo.accionesDe(evaluacion.id),
    catalogo: evaluacion.indicadores.map((codigo) => INDICE[codigo]).filter(Boolean),
    gruposNombre: GRUPO_NOMBRE
  };
}

// --- Creacion ----------------------------------------------------------------

export function crear({ predioId, fechaVisita }, { actor, ip = null, userAgent = null }) {
  const predio = predios.buscarPorId(predioId);
  if (!predio) throw new ErrorNoEncontrado('Predio');
  if (!predio.activo) throw new ErrorValidacion('El predio esta inactivo; activelo antes de evaluarlo.');

  const fecha = String(fechaVisita || '').trim();
  if (!RE_FECHA.test(fecha)) throw new ErrorValidacion('La fecha de visita debe tener el formato AAAA-MM-DD.');
  if (fecha > new Date().toLocaleDateString('en-CA')) {
    throw new ErrorValidacion('La fecha de visita no puede ser futura.');
  }

  if (predio.totalAves < 1) throw new ErrorValidacion('El predio no tiene inventario de aves registrado.');
  if (repo.buscarAbiertaDePredio(predio.id)) {
    throw new ErrorConflicto('Ya existe una evaluacion en progreso para este predio.');
  }

  const total = predio.totalAves;
  const pesos = ponderacion(total);
  const muestreo = planMuestreo(total);
  const codigos = indicadoresAplicables({ totalAves: total, sistema: predio.sistema });

  // Se congela el catalogo vigente: la visita se califica con las reglas de hoy
  // aunque la parametrizacion cambie manana.
  const exigencia = obtenerConfig(CLAVES.EXIGENCIA);

  const snapshot = {
    version: VERSION_CATALOGO,
    generadoEn: new Date().toISOString(),
    indicadores: codigos.map((codigo) => INDICE[codigo]),
    pesos,
    muestreo,
    exigencia
  };

  const creada = db().transaccion(() => {
    const codigo = repo.siguienteCodigo(Number(fecha.slice(0, 4)));
    return repo.crear({
      codigo,
      predioId: predio.id,
      usuarioId: actor.id,
      fechaVisita: fecha,
      sistema: predio.sistema,
      totalAves: total,
      versionCatalogo: VERSION_CATALOGO,
      pesos,
      muestreo,
      indicadores: codigos,
      inspeccion: { fase: 'apertura', corrales: [], puntos: [], aves: [], bioseguridadVerificada: false, inspeccionNeutral: false },
      snapshot
    });
  })();

  auditoria.registrar({
    usuario: actor,
    accion: 'crear', entidad: 'evaluacion', entidadId: creada.id,
    datosDespues: { codigo: creada.codigo, predio: predio.nombre, totalAves: total, indicadores: codigos.length },
    ip, userAgent
  });

  return obtenerDetalle(creada.id, actor);
}

// --- Inspeccion y muestreo ---------------------------------------------------

export function generarMuestra(id, { actor, ip = null, userAgent = null }) {
  const evaluacion = repo.buscarPorId(id);
  verificarAcceso(evaluacion, actor, { escritura: true });
  if (evaluacion.estado !== 'en_progreso') throw new ErrorConflicto('La evaluacion ya no esta en progreso.');

  const semilla = `ICA-${evaluacion.codigo}-${evaluacion.fechaVisita}-${evaluacion.totalAves}`;
  const seleccion = seleccionarMuestra({ semilla, totalAves: evaluacion.totalAves });

  const inspeccion = {
    ...evaluacion.inspeccion,
    ...seleccion,
    fase: 'inspeccion'
  };

  const actualizada = repo.actualizarInspeccion(evaluacion.id, inspeccion);

  auditoria.registrar({
    usuario: actor,
    accion: 'generar_muestra', entidad: 'evaluacion', entidadId: evaluacion.id,
    detalle: { semilla, corrales: seleccion.corrales.length, puntos: seleccion.puntos.length, aves: seleccion.aves.length },
    ip, userAgent
  });

  return actualizada;
}

export function actualizarInspeccion(id, datos, { actor, ip = null, userAgent = null }) {
  const evaluacion = repo.buscarPorId(id);
  verificarAcceso(evaluacion, actor, { escritura: true });
  if (evaluacion.estado !== 'en_progreso') throw new ErrorConflicto('La evaluacion ya no esta en progreso.');

  const fases = ['apertura', 'inspeccion', 'cierre'];
  const inspeccion = { ...evaluacion.inspeccion };

  if (datos.fase !== undefined) {
    if (!fases.includes(datos.fase)) throw new ErrorValidacion('La fase debe ser apertura, inspeccion o cierre.');
    inspeccion.fase = datos.fase;
  }
  if (datos.bioseguridadVerificada !== undefined) inspeccion.bioseguridadVerificada = Boolean(datos.bioseguridadVerificada);
  if (datos.inspeccionNeutral !== undefined) inspeccion.inspeccionNeutral = Boolean(datos.inspeccionNeutral);
  if (datos.entrevista !== undefined) inspeccion.entrevista = String(datos.entrevista).slice(0, 2000);

  return repo.actualizarInspeccion(evaluacion.id, inspeccion);
}

// --- Respuestas --------------------------------------------------------------

export function guardarRespuestas(id, lote, { actor, ip = null, userAgent = null }) {
  const evaluacion = repo.buscarPorId(id);
  verificarAcceso(evaluacion, actor, { escritura: true });
  if (evaluacion.estado === 'cerrada') throw new ErrorConflicto('Las evaluaciones cerradas son inmutables.');
  if (evaluacion.estado === 'anulada') throw new ErrorConflicto('La evaluacion esta anulada.');

  if (!Array.isArray(lote) || !lote.length) throw new ErrorValidacion('Envie al menos una respuesta.');

  const permitidos = new Set(evaluacion.indicadores);
  const esperadas = evaluacion.muestreo.totalAvesMuestra ?? 0;

  const normalizadas = lote.map((entrada) => {
    const codigo = String(entrada.indicador || '').trim().toUpperCase();
    if (!permitidos.has(codigo)) {
      throw new ErrorValidacion(`El indicador ${codigo} no aplica a esta evaluacion.`);
    }

    const { valor, valorCrudo } = derivarPuntaje(codigo, entrada);
    const muestras = normalizarMuestras(codigo, entrada.muestras, esperadas);

    const documento = entrada.documento ?? {};
    return {
      indicador: codigo,
      valor,
      valorCrudo,
      muestras,
      observacion: String(entrada.observacion ?? '').slice(0, 1000),
      documento: {
        vigenciaHasta: documento.vigenciaHasta ?? null,
        firmado: Boolean(documento.firmado),
        legible: Boolean(documento.legible),
        matricula: String(documento.matricula ?? '').slice(0, 60) || null
      },
      evidenciaId: entrada.evidenciaId ?? undefined
    };
  });

  repo.guardarRespuestas(evaluacion.id, normalizadas);

  auditoria.registrar({
    usuario: actor,
    accion: 'guardar_respuestas', entidad: 'evaluacion', entidadId: evaluacion.id,
    detalle: { indicadores: normalizadas.map((r) => r.indicador) },
    ip, userAgent
  });

  return obtenerDetalle(evaluacion.id, actor);
}

// --- Cierre ------------------------------------------------------------------

export function validar(id, actor) {
  const evaluacion = repo.buscarPorId(id);
  verificarAcceso(evaluacion, actor);
  return validarCierre({
    codigos: evaluacion.indicadores,
    respuestas: repo.mapaRespuestas(evaluacion.id),
    inspeccion: evaluacion.inspeccion,
    totalAves: evaluacion.totalAves,
    exigencia: exigenciaDe(evaluacion)
  });
}

export function cerrar(id, { actor, ip = null, userAgent = null }) {
  const evaluacion = repo.buscarPorId(id);
  verificarAcceso(evaluacion, actor, { escritura: true });
  if (evaluacion.estado !== 'en_progreso') throw new ErrorConflicto('La evaluacion ya fue cerrada o anulada.');

  const respuestas = repo.mapaRespuestas(evaluacion.id);
  const exigencia = exigenciaDe(evaluacion);
  const validacion = validarCierre({
    codigos: evaluacion.indicadores,
    respuestas,
    inspeccion: evaluacion.inspeccion,
    totalAves: evaluacion.totalAves,
    exigencia
  });

  if (!validacion.puedeCerrar) {
    throw new ErrorConflicto('La evaluacion no cumple los requisitos para cerrarse.', validacion);
  }

  const resultado = calcular({ codigos: evaluacion.indicadores, respuestas, pesos: evaluacion.pesos });
  const criticos = indicadoresCriticos({ codigos: evaluacion.indicadores, respuestas });

  // La forma queda provisional un dia habil para subsanar documentos pendientes.
  const provisionalHasta = new Date(Date.now() + 86_400_000).toISOString();

  const cerrada = db().transaccion(() => {
    const actualizada = repo.cerrar(evaluacion.id, {
      calificacion: resultado.calificacion,
      nivel: resultado.nivel,
      resultado: {
        ...resultado,
        criticos,
        avisos: validacion.avisos,
        coherencia: validacion.coherencia,
        // Se guarda con que exigencia documental se califico, para que la forma
        // oficial pueda declararlo si se habia relajado.
        exigencia,
        relajaciones: relajacionesActivas(exigencia)
      },
      provisionalHasta
    });

    const propuestas = generarRecomendaciones({ evaluacion: actualizada, respuestas });
    if (propuestas.length) repo.reemplazarRecomendaciones(evaluacion.id, propuestas);

    return actualizada;
  })();

  auditoria.registrar({
    usuario: actor,
    accion: 'cerrar', entidad: 'evaluacion', entidadId: evaluacion.id,
    datosDespues: { calificacion: cerrada.calificacion, nivel: cerrada.nivel, criticos: criticos.length },
    detalle: { avisos: validacion.avisos },
    ip, userAgent
  });

  return obtenerDetalle(evaluacion.id, actor);
}

export function emitirDefinitiva(id, { actor, ip = null, userAgent = null }) {
  const evaluacion = repo.buscarPorId(id);
  verificarAcceso(evaluacion, actor, { escritura: true });
  if (evaluacion.estado !== 'cerrada') throw new ErrorConflicto('Solo una evaluacion cerrada puede pasar a forma definitiva.');
  if (evaluacion.forma === 'definitiva') throw new ErrorConflicto('La forma ya es definitiva.');

  const actualizada = repo.emitirDefinitiva(evaluacion.id);

  auditoria.registrar({
    usuario: actor,
    accion: 'emitir_definitiva', entidad: 'evaluacion', entidadId: evaluacion.id,
    ip, userAgent
  });

  return actualizada;
}

export function anular(id, motivo, { actor, ip = null, userAgent = null }) {
  if (actor.rol !== 'admin') throw new ErrorAutorizacion('Solo un administrador puede anular una evaluacion.');

  const evaluacion = repo.buscarPorId(id);
  if (!evaluacion) throw new ErrorNoEncontrado('Evaluacion');
  if (evaluacion.estado === 'anulada') throw new ErrorConflicto('La evaluacion ya esta anulada.');

  const razon = String(motivo || '').trim();
  if (razon.length < 10) throw new ErrorValidacion('Indique el motivo de la anulacion (al menos 10 caracteres).');

  const anulada = repo.anular(evaluacion.id, razon);

  auditoria.registrar({
    usuario: actor,
    accion: 'anular', entidad: 'evaluacion', entidadId: evaluacion.id,
    datosAntes: { estado: evaluacion.estado, calificacion: evaluacion.calificacion },
    detalle: { motivo: razon },
    ip, userAgent
  });

  return anulada;
}

export { verificarAcceso, requiereSoporte, config as configuracion };
