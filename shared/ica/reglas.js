/**
 * Reglas normativas ICA: Tabla 1 (ponderacion), Tabla 2 (niveles) y Tabla 3 (muestreo),
 * mas la logica de aplicabilidad de indicadores.
 *
 * Fuente unica de verdad. El backend las usa para calcular de forma autoritativa
 * y el frontend para dar retroalimentacion inmediata; ninguna capa las duplica.
 */

import { INDICADORES, INDICE, GRUPOS, UMBRALES_PORCENTAJE, DENSIDAD_MAXIMA, UMBRAL_SOPORTE_DOCUMENTAL, TIPO_CAPTURA } from './catalogo.js';

/** Umbral que separa los dos regimenes de la norma. 200 exactas cuenta como "mayor o igual". */
export const UMBRAL_AVES = 200;

/** Tabla 1: ponderacion porcentual de cada grupo segun el tamano del lote. */
export function ponderacion(totalAves) {
  return totalAves >= UMBRAL_AVES
    ? { MBA: 60, MBR: 25, MBG: 15 }
    : { MBA: 70, MBR: 30, MBG: 0 };
}

/** Tabla 2: niveles de bienestar, ordenados de mayor a menor minimo. */
export const NIVELES = [
  { nombre: 'Excelente', minimo: 90, tono: 'ok' },
  { nombre: 'Alto', minimo: 75, tono: 'ok' },
  { nombre: 'Medio', minimo: 50, tono: 'warn' },
  { nombre: 'Bajo', minimo: 0, tono: 'bad' }
];

/** Devuelve el nivel de la Tabla 2 que corresponde a una calificacion. */
export function nivelDe(calificacion) {
  if (calificacion == null || Number.isNaN(Number(calificacion))) return null;
  const valor = Number(calificacion);
  return NIVELES.find((nivel) => valor >= nivel.minimo) ?? NIVELES[NIVELES.length - 1];
}

/** Tabla 3: plan de muestreo. Siempre 10 aves por punto. */
export const AVES_POR_PUNTO = 10;

export function planMuestreo(totalAves) {
  const base = totalAves >= UMBRAL_AVES ? { corrales: 2, puntos: 9 } : { corrales: 1, puntos: 5 };
  return { ...base, avesPorPunto: AVES_POR_PUNTO, totalAvesMuestra: base.puntos * AVES_POR_PUNTO };
}

/** Suma el inventario por grupo etario. */
export function totalAves(inventario = {}) {
  return Number(inventario.dia || 0) + Number(inventario.levante || 0) + Number(inventario.produccion || 0);
}

/**
 * Determina si un indicador aplica a un predio concreto.
 * La regla vive como dato en el catalogo, no como cadena de condicionales.
 */
export function aplicaIndicador(indicador, { totalAves: total, sistema }) {
  const regla = indicador.aplica;
  if (!regla) return true;
  if (regla.sistema && regla.sistema !== sistema) return false;
  if (regla.minAves != null && total < regla.minAves) return false;
  if (regla.minAvesExclusivo != null && total <= regla.minAvesExclusivo) return false;
  return true;
}

/** Lista ordenada de codigos aplicables a un predio, agrupada por MBA, MBR y MBG. */
export function indicadoresAplicables({ totalAves: total, sistema }) {
  return INDICADORES
    .filter((indicador) => aplicaIndicador(indicador, { totalAves: total, sistema }))
    .sort((a, b) => GRUPOS.indexOf(a.grupo) - GRUPOS.indexOf(b.grupo) || a.codigo.localeCompare(b.codigo, 'es', { numeric: true }))
    .map((indicador) => indicador.codigo);
}

/** Texto legible de la condicion de aplicabilidad, para la vista de parametrizacion. */
export function descripcionAplicabilidad(indicador) {
  const regla = indicador.aplica;
  if (!regla) return 'Piso y jaula';
  if (regla.sistema) return regla.sistema === 'piso' ? 'Solo piso' : 'Solo jaula';
  if (regla.minAvesExclusivo != null) return `Mas de ${regla.minAvesExclusivo} aves`;
  if (regla.minAves != null) return `${regla.minAves} aves o mas`;
  return 'Piso y jaula';
}

/**
 * Exigencia documental por defecto, la que manda la norma.
 * Parametrizacion puede relajarla para trabajos de practica o capacitacion;
 * cuando se relaja, la evaluacion lo deja registrado.
 */
export const EXIGENCIA_PREDETERMINADA = {
  exigirEnGestion: true,
  exigirEnPrediosGrandes: true,
  marcarPorDefecto: false
};

/**
 * Indica si una respuesta exige soporte documental adjunto.
 * Los MBG y la mortalidad siempre lo exigen; agua y espacio solo en predios grandes.
 *
 * @param {object} exigencia Configuracion vigente. Sin ella rige la norma completa.
 */
export function requiereSoporte(codigo, totalAvesPredio, exigencia = EXIGENCIA_PREDETERMINADA) {
  const indicador = INDICE[codigo];
  if (!indicador) return false;

  const { exigirEnGestion = true, exigirEnPrediosGrandes = true } = exigencia ?? {};

  if (indicador.requiereDocumento) return exigirEnGestion;

  const esPredioGrande = totalAvesPredio > UMBRAL_SOPORTE_DOCUMENTAL;
  if (!esPredioGrande || !exigirEnPrediosGrandes) return false;

  if (indicador.captura === TIPO_CAPTURA.DOCUMENTAL_MIXTO) return true;
  return codigo === 'MBR13' || codigo === 'MBR14';
}

/** Resume en texto que exigencias estan relajadas, para avisarlo en la interfaz. */
export function relajacionesActivas(exigencia = EXIGENCIA_PREDETERMINADA) {
  const avisos = [];
  if (exigencia?.exigirEnGestion === false) {
    avisos.push('No se exige soporte documental en los indicadores de gestion (MBG) ni en la mortalidad.');
  }
  if (exigencia?.exigirEnPrediosGrandes === false) {
    avisos.push('No se exige soporte documental en agua y espacio para predios de mas de 1.000 aves.');
  }
  return avisos;
}

/** Puntajes validos de una muestra observada punto a punto. */
export const PUNTAJES_MUESTRA = [0, 55, 100];

/** Convierte un porcentaje capturado en el puntaje de la escala del indicador. */
export function puntajeDesdePorcentaje(codigo, porcentaje) {
  const umbral = UMBRALES_PORCENTAJE[codigo];
  if (!umbral || porcentaje == null || Number.isNaN(Number(porcentaje))) return null;
  return umbral.calcular(Number(porcentaje));
}

/** Densidad en jaula: CJ = AT/TA, IG = AJ/TG, D = (CJ + IG) / 2 segun la norma. */
export function densidadJaula({ at, ta, aj, tg }) {
  const areaJaulas = Number(at), avesJaulas = Number(ta);
  const areaGalpon = Number(aj), avesGalpon = Number(tg);
  if (!(areaJaulas > 0) || !(avesJaulas > 0) || !(areaGalpon > 0) || !(avesGalpon > 0)) return null;
  const cj = avesJaulas / areaJaulas;
  const ig = avesGalpon / areaGalpon;
  return (cj + ig) / 2;
}

/** Densidad en piso: aves por metro cuadrado de area util. */
export function densidadPiso({ aves, metrosCuadrados }) {
  const cantidad = Number(aves), area = Number(metrosCuadrados);
  if (!(cantidad > 0) || !(area > 0)) return null;
  return cantidad / area;
}

export function puntajeDesdeDensidad(densidad) {
  if (densidad == null) return null;
  return densidad <= DENSIDAD_MAXIMA ? 100 : 0;
}

/** MBR7: animales por bebedero frente al limite del fabricante. */
export function puntajeBebederos({ animales, unidades, limite }) {
  const total = Number(animales), cantidad = Number(unidades), tope = Number(limite);
  if (!(total > 0) || !(cantidad > 0) || !(tope > 0)) return null;
  const porUnidad = total / cantidad;
  if (porUnidad <= tope) return 100;
  return porUnidad <= tope * 1.3 ? 55 : 0;
}

/** MBR10: animales por comedero, donde la competencia observada degrada el puntaje a 0. */
export function puntajeComederos({ animales, unidades, limite, competencia }) {
  const total = Number(animales), cantidad = Number(unidades), tope = Number(limite);
  if (!(total > 0) || !(cantidad > 0) || !(tope > 0)) return null;
  if (competencia) return 0;
  const porUnidad = total / cantidad;
  return porUnidad <= tope * 1.3 ? 100 : 55;
}

export { DENSIDAD_MAXIMA, UMBRAL_SOPORTE_DOCUMENTAL, UMBRALES_PORCENTAJE };
