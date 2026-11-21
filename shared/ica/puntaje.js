/**
 * Motor de calificacion ICA.
 *
 * El backend lo ejecuta al cerrar una evaluacion y el resultado que guarda es el
 * autoritativo. El frontend lo ejecuta solo para mostrar la calificacion parcial
 * mientras se diligencia; nunca se confia en el valor que envie el cliente.
 */

import { INDICE, GRUPOS } from './catalogo.js';
import { nivelDe, PUNTAJES_MUESTRA, requiereSoporte, planMuestreo, EXIGENCIA_PREDETERMINADA } from './reglas.js';

/**
 * Valor efectivo de un indicador.
 * Si hay observaciones punto a punto se promedian; si no, vale el nivel elegido.
 */
export function valorIndicador(respuesta) {
  if (!respuesta || respuesta.valor == null) return null;
  const muestras = Array.isArray(respuesta.muestras) ? respuesta.muestras : [];
  const validas = muestras.map(Number).filter((valor) => PUNTAJES_MUESTRA.includes(valor));
  if (validas.length) return validas.reduce((suma, valor) => suma + valor, 0) / validas.length;
  return Number(respuesta.valor);
}

/**
 * Calcula la calificacion de una evaluacion.
 * Final = suma de (promedio del grupo x peso de la Tabla 1), redondeada a 2 decimales.
 */
export function calcular({ codigos, respuestas, pesos }) {
  const detalle = {};
  let final = 0;

  for (const grupo of GRUPOS) {
    const delGrupo = codigos.filter((codigo) => INDICE[codigo]?.grupo === grupo);
    const valores = delGrupo
      .map((codigo) => valorIndicador(respuestas[codigo]))
      .filter((valor) => valor != null);

    const promedio = valores.length
      ? valores.reduce((suma, valor) => suma + valor, 0) / valores.length
      : null;

    detalle[grupo] = {
      total: delGrupo.length,
      respondidos: valores.length,
      promedio,
      peso: pesos[grupo] ?? 0,
      aporte: promedio == null ? 0 : (promedio * (pesos[grupo] ?? 0)) / 100
    };

    if (promedio != null) final += detalle[grupo].aporte;
  }

  const calificacion = Math.round(final * 100) / 100;
  const nivel = nivelDe(calificacion);

  return {
    grupos: detalle,
    calificacion,
    nivel: nivel?.nombre ?? null,
    respondidos: GRUPOS.reduce((suma, grupo) => suma + detalle[grupo].respondidos, 0),
    totalIndicadores: codigos.length
  };
}

/** Indicadores que quedaron en cero: los criticos de la forma oficial. */
export function indicadoresCriticos({ codigos, respuestas }) {
  return codigos.filter((codigo) => respuestas[codigo]?.valor === 0);
}

/**
 * Valida que una evaluacion pueda cerrarse.
 * Devuelve bloqueos (impiden el cierre), avisos (permiten cierre provisional)
 * y alertas de coherencia entre indicadores relacionados.
 */
export function validarCierre({ codigos, respuestas, inspeccion, totalAves, exigencia = EXIGENCIA_PREDETERMINADA }) {
  const faltantes = [];
  const bloqueos = [];
  const avisos = [];
  const coherencia = [];

  const esperado = planMuestreo(totalAves);
  const seleccion = inspeccion ?? {};

  if (!seleccion.semilla) {
    bloqueos.push('Falta generar la seleccion reproducible de la muestra ICA.');
  }
  if ((seleccion.corrales?.length ?? 0) !== esperado.corrales) {
    bloqueos.push(`La Tabla 3 exige ${esperado.corrales} corral(es) seleccionado(s).`);
  }
  if ((seleccion.puntos?.length ?? 0) !== esperado.puntos) {
    bloqueos.push(`La Tabla 3 exige ${esperado.puntos} punto(s) de observacion.`);
  }
  if ((seleccion.aves?.length ?? 0) !== esperado.totalAvesMuestra) {
    bloqueos.push(`La Tabla 3 exige ${esperado.totalAvesMuestra} aves observadas.`);
  }
  if (!seleccion.bioseguridadVerificada) {
    bloqueos.push('Falta confirmar la verificacion de bioseguridad previa a la visita.');
  }
  if (!seleccion.inspeccionNeutral) {
    bloqueos.push('Falta confirmar que la inspeccion se hizo sin alterar la conducta de las aves.');
  }

  for (const codigo of codigos) {
    const respuesta = respuestas[codigo];
    if (!respuesta || respuesta.valor == null) {
      faltantes.push(codigo);
      continue;
    }
    if (!requiereSoporte(codigo, totalAves, exigencia)) continue;

    const documento = respuesta.documento ?? {};
    const soporteCompleto = Boolean(respuesta.evidenciaId) && documento.legible === true && documento.firmado === true;
    if (soporteCompleto) continue;

    // Un indicador en 100 sin soporte no puede cerrarse; en niveles bajos solo advierte.
    if (respuesta.valor === 100) bloqueos.push(`${codigo} esta en 100 sin soporte documental completo.`);
    else avisos.push(codigo);
  }

  const jadeo = respuestas.MBA1?.valor;
  const confortTermico = respuestas.MBR11?.valor;
  if (jadeo != null && confortTermico != null && Math.abs(jadeo - confortTermico) === 100) {
    coherencia.push('Jadeo (MBA1) y confort termico (MBR11) quedaron en extremos opuestos; revise la coherencia antes de cerrar.');
  }

  const mortalidad = respuestas.MBA10?.valor;
  if (mortalidad === 0 && respuestas.MBG3?.valor === 100) {
    coherencia.push('La mortalidad (MBA10) esta en el peor nivel mientras la gestion sanitaria (MBG3) esta en 100; verifique los soportes.');
  }

  return {
    faltantes,
    bloqueos,
    avisos,
    coherencia,
    puedeCerrar: faltantes.length === 0 && bloqueos.length === 0
  };
}

/**
 * Generador determinista para la seleccion de la muestra.
 * Dada la misma semilla produce siempre la misma seleccion, de modo que una
 * auditoria posterior puede reproducir exactamente que se observo.
 */
export function generadorDeterminista(semilla) {
  let estado = 2166136261;
  for (const caracter of String(semilla)) {
    estado = Math.imul(estado ^ caracter.charCodeAt(0), 16777619);
  }
  return () => {
    estado += 0x6d2b79f5;
    let valor = estado;
    valor = Math.imul(valor ^ (valor >>> 15), valor | 1);
    valor ^= valor + Math.imul(valor ^ (valor >>> 7), valor | 61);
    return ((valor ^ (valor >>> 14)) >>> 0) / 4294967296;
  };
}

/** Seleccion reproducible de corrales, puntos y aves segun la Tabla 3. */
export function seleccionarMuestra({ semilla, totalAves }) {
  const plan = planMuestreo(totalAves);
  const aleatorio = generadorDeterminista(semilla);

  const mezclar = (lista) => {
    const copia = [...lista];
    for (let i = copia.length - 1; i > 0; i -= 1) {
      const j = Math.floor(aleatorio() * (i + 1));
      [copia[i], copia[j]] = [copia[j], copia[i]];
    }
    return copia;
  };

  const universoCorrales = Array.from({ length: Math.max(plan.corrales, 4) }, (_, i) => `Corral ${i + 1}`);
  const universoPuntos = Array.from({ length: Math.max(plan.puntos, 12) }, (_, i) => `Punto ${i + 1}`);
  const universoAves = Array.from({ length: Math.max(plan.totalAvesMuestra, 120) }, (_, i) => `Ave-${String(i + 1).padStart(3, '0')}`);

  return {
    semilla,
    algoritmo: 'Fisher-Yates determinista sobre la poblacion disponible',
    corrales: mezclar(universoCorrales).slice(0, plan.corrales),
    puntos: mezclar(universoPuntos).slice(0, plan.puntos),
    aves: mezclar(universoAves).slice(0, plan.totalAvesMuestra)
  };
}

export { indicadoresCriticos as criticos };
