/**
 * Generacion de reportes en Markdown.
 *
 * El Markdown se produce en el servidor y no en el navegador porque es el
 * servidor quien tiene los datos autoritativos: asi el archivo exportado dice
 * exactamente lo mismo que la forma oficial, sin depender de lo que el cliente
 * tuviera en pantalla.
 *
 * El PDF no se genera aqui. Se obtiene con la impresion del navegador sobre una
 * vista preparada para papel, lo que evita arrastrar una dependencia de
 * composicion tipografica de varios megabytes para un uso ocasional.
 */

import { ErrorNoEncontrado, ErrorValidacion } from '../errors.js';
import * as repo from '../repositories/evaluaciones.repo.js';
import * as predios from '../repositories/predios.repo.js';
import { INDICE, GRUPO_NOMBRE, GRUPOS } from '../../shared/ica/catalogo.js';
import { valorIndicador } from '../../shared/ica/puntaje.js';
import * as reportes from './reportes.service.js';

const LOCALE = 'es-CO';

const numero = (valor, vacio = '—') =>
  valor == null || Number.isNaN(Number(valor))
    ? vacio
    : Number(valor).toLocaleString(LOCALE, { maximumFractionDigits: 2 });

const entero = (valor, vacio = '—') =>
  valor == null ? vacio : Number(valor).toLocaleString(LOCALE);

function fechaLarga(valor) {
  if (!valor) return '—';
  const [anio, mes, dia] = String(valor).slice(0, 10).split('-').map(Number);
  if (!anio) return String(valor);
  return new Date(anio, mes - 1, dia).toLocaleDateString(LOCALE, {
    day: 'numeric', month: 'long', year: 'numeric'
  });
}

function marcaTiempo(valor) {
  if (!valor) return '—';
  const normalizado = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(valor)
    ? `${valor.replace(' ', 'T')}Z`
    : valor;
  const fecha = new Date(normalizado);
  return Number.isNaN(fecha.getTime())
    ? String(valor)
    : fecha.toLocaleString(LOCALE, { dateStyle: 'long', timeStyle: 'short' });
}

/** Escapa los caracteres que romperian una celda de tabla Markdown. */
const celda = (texto) =>
  String(texto ?? '—').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ').trim() || '—';

/** Arma una tabla Markdown a partir de encabezados y filas. */
function tabla(encabezados, filas, alineaciones = []) {
  if (!filas.length) return '_Sin datos._';

  const separador = encabezados.map((_, i) => {
    const alineacion = alineaciones[i];
    if (alineacion === 'derecha') return '---:';
    if (alineacion === 'centro') return ':---:';
    return '---';
  });

  return [
    `| ${encabezados.map(celda).join(' | ')} |`,
    `| ${separador.join(' | ')} |`,
    ...filas.map((fila) => `| ${fila.map(celda).join(' | ')} |`)
  ].join('\n');
}

const pie = () => {
  // El formato local ya termina en "a. m." o "p. m."; anadir otro punto lo deja doble.
  const momento = new Date()
    .toLocaleString(LOCALE, { dateStyle: 'long', timeStyle: 'short' })
    .replace(/\.$/, '');

  return [
    '',
    '---',
    '',
    `_Documento generado por EvalCodorniz el ${momento}._`,
    '_Sistema de evaluacion de bienestar animal en codornices de postura segun la metodologia ICA._'
  ].join('\n');
};

// --- Forma oficial de una evaluacion ----------------------------------------

export function markdownEvaluacion(evaluacionId) {
  const evaluacion = repo.buscarPorId(evaluacionId);
  if (!evaluacion) throw new ErrorNoEncontrado('Evaluacion');

  const predio = predios.buscarPorId(evaluacion.predioId);
  const respuestas = repo.respuestasDe(evaluacionId);
  const recomendaciones = repo.recomendacionesDe(evaluacionId);
  const acciones = repo.accionesDe(evaluacionId);
  const resultado = evaluacion.resultado ?? {};
  const criticos = respuestas.filter((r) => r.valor === 0);

  const partes = [];

  partes.push(`# Forma oficial de visita · ${evaluacion.codigo}`);
  partes.push('');
  partes.push(`**${predio?.nombre ?? '—'}** · ${predio?.municipio ?? ''}, ${predio?.departamento ?? ''}`);
  partes.push('');

  if (evaluacion.estado !== 'cerrada') {
    partes.push(`> **Evaluacion ${evaluacion.estado.replace('_', ' ')}.** Este documento no constituye una forma oficial.`);
    partes.push('');
  }
  if (evaluacion.forma === 'provisional') {
    partes.push('> **Forma provisional.** Hay un dia habil para subsanar los documentos pendientes.');
    partes.push('');
  }
  if (resultado.relajaciones?.length) {
    partes.push('> **Exigencia documental relajada respecto a la norma:**');
    resultado.relajaciones.forEach((texto) => partes.push(`> - ${texto}`));
    partes.push('');
  }

  // --- Datos generales ---
  partes.push('## Datos generales');
  partes.push('');
  partes.push(tabla(['Campo', 'Valor'], [
    ['Codigo', evaluacion.codigo],
    ['Predio', predio?.nombre],
    ['Codigo ICA', predio?.codigoIca ?? 'No registrado'],
    ['Ubicacion', `${predio?.municipio ?? ''}, ${predio?.departamento ?? ''}`],
    ['Vereda', predio?.vereda ?? '—'],
    ['Sistema productivo', evaluacion.sistema === 'piso' ? 'Piso' : 'Jaula'],
    ['Especie', predio?.especie ?? 'Coturnix coturnix'],
    ['Numero de aves', entero(evaluacion.totalAves)],
    ['Fecha de visita', fechaLarga(evaluacion.fechaVisita)],
    ['Evaluador', evaluacion.evaluador],
    ['Estado', evaluacion.estado.replace('_', ' ')],
    ['Forma', evaluacion.forma ?? '—'],
    ['Cerrada el', marcaTiempo(evaluacion.cerradaEn)],
    ['Version del catalogo', evaluacion.versionCatalogo],
    ['Semilla de la muestra', evaluacion.inspeccion?.semilla ?? '—']
  ]));
  partes.push('');

  // --- Propietario ---
  if (predio?.propietario) {
    partes.push('## Propietario o encargado');
    partes.push('');
    partes.push(tabla(['Campo', 'Valor'], [
      ['Nombre', predio.propietario.nombre],
      ['Cargo', predio.propietario.cargo],
      ['Documento', predio.propietario.documento],
      ['Telefono', predio.propietario.telefono],
      ['Correo', predio.propietario.correo ?? '—']
    ]));
    partes.push('');
  }

  // --- Calificacion ---
  partes.push('## Calificacion');
  partes.push('');

  if (evaluacion.estado === 'cerrada') {
    partes.push(`### ${numero(evaluacion.calificacion)} puntos · Nivel ${evaluacion.nivel}`);
    partes.push('');
    partes.push(tabla(
      ['Grupo', 'Descripcion', 'Indicadores', 'Promedio', 'Peso', 'Aporte'],
      GRUPOS.map((grupo) => {
        const dato = resultado.grupos?.[grupo] ?? {};
        return [
          grupo,
          GRUPO_NOMBRE[grupo],
          dato.total ? `${dato.respondidos}/${dato.total}` : 'No aplica',
          dato.promedio == null ? '—' : `${numero(dato.promedio)} %`,
          `${dato.peso ?? 0} %`,
          numero(dato.aporte ?? 0)
        ];
      }),
      ['', '', 'centro', 'derecha', 'derecha', 'derecha']
    ));
    partes.push('');
    partes.push('_Calificacion final = suma de (promedio del grupo x peso de la Tabla 1)._');
  } else {
    partes.push('_La evaluacion aun no se ha cerrado, por lo que no tiene calificacion definitiva._');
  }
  partes.push('');

  // --- Plan de muestreo ---
  partes.push('## Plan de muestreo aplicado (Tabla 3)');
  partes.push('');
  partes.push(tabla(['Concepto', 'Cantidad'], [
    ['Corrales o galpones', entero(evaluacion.muestreo?.corrales)],
    ['Puntos de observacion', entero(evaluacion.muestreo?.puntos)],
    ['Aves por punto', entero(evaluacion.muestreo?.avesPorPunto)],
    ['Total de aves observadas', entero(evaluacion.muestreo?.totalAvesMuestra)]
  ], ['', 'derecha']));
  partes.push('');

  const inspeccion = evaluacion.inspeccion ?? {};
  if (inspeccion.corrales?.length) {
    partes.push(`**Corrales seleccionados:** ${inspeccion.corrales.join(', ')}`);
    partes.push('');
    partes.push(`**Puntos evaluados:** ${inspeccion.puntos?.join(', ') ?? '—'}`);
    partes.push('');
    partes.push(`**Bioseguridad verificada:** ${inspeccion.bioseguridadVerificada ? 'Si' : 'No'} · ` +
                `**Inspeccion neutral:** ${inspeccion.inspeccionNeutral ? 'Si' : 'No'}`);
    partes.push('');
  }

  // --- Indicadores criticos ---
  partes.push('## Indicadores criticos');
  partes.push('');
  if (criticos.length) {
    partes.push(`Se registraron **${criticos.length}** indicadores en el nivel mas bajo (0 puntos).`);
    partes.push('');
    partes.push(tabla(
      ['Codigo', 'Grupo', 'Indicador', 'Observacion'],
      criticos.map((r) => [r.indicador, r.grupo, INDICE[r.indicador]?.nombre, r.observacion || '—'])
    ));
  } else {
    partes.push('_No se registraron indicadores criticos en esta evaluacion._');
  }
  partes.push('');

  // --- Detalle por indicador ---
  partes.push('## Detalle por indicador');
  partes.push('');
  for (const grupo of GRUPOS) {
    const delGrupo = respuestas.filter((r) => r.grupo === grupo);
    if (!delGrupo.length) continue;

    partes.push(`### ${grupo} · ${GRUPO_NOMBRE[grupo]}`);
    partes.push('');
    partes.push(tabla(
      ['Codigo', 'Indicador', 'Respuesta registrada', 'Puntaje', 'Soporte'],
      delGrupo.map((r) => {
        const indicador = INDICE[r.indicador];
        const nivel = indicador?.niveles.find(([puntos]) => puntos === r.valor);
        const efectivo = valorIndicador(r);
        const puntaje = r.valor == null
          ? 'Sin responder'
          : efectivo !== r.valor
            ? `${r.valor} (muestra: ${numero(efectivo)})`
            : String(r.valor);
        return [
          r.indicador,
          indicador?.nombre,
          nivel?.[1] ?? '—',
          puntaje,
          r.evidenciaNombre ?? '—'
        ];
      }),
      ['', '', '', 'derecha', '']
    ));
    partes.push('');
  }

  // --- Recomendaciones ---
  const aprobadas = recomendaciones.filter((r) => r.estado === 'aprobada');
  partes.push('## Recomendaciones aprobadas');
  partes.push('');
  if (aprobadas.length) {
    for (const rec of aprobadas) {
      partes.push(`- **${rec.indicador} · prioridad ${rec.prioridad.toLowerCase()}** — ${rec.texto}`);
    }
  } else {
    partes.push('_No hay recomendaciones aprobadas._');
  }
  partes.push('');

  // --- Plan de mejora ---
  partes.push('## Plan de mejora');
  partes.push('');
  if (acciones.length) {
    partes.push(tabla(
      ['Accion', 'Responsable', 'Fecha limite', 'Estado', 'Avance'],
      acciones.map((a) => [
        a.descripcion, a.responsable, fechaLarga(a.fechaLimite),
        a.estado.replace('_', ' '), `${a.avance} %`
      ]),
      ['', '', '', '', 'derecha']
    ));
  } else {
    partes.push('_Sin acciones registradas en el plan de mejora._');
  }

  partes.push(pie());
  return partes.join('\n');
}

// --- Consolidado por departamento -------------------------------------------

export function markdownConsolidado() {
  const filas = reportes.consolidado();
  const panel = reportes.panel({});

  const partes = [];
  partes.push('# Reporte consolidado por departamento');
  partes.push('');
  partes.push('## Resumen general');
  partes.push('');
  partes.push(tabla(['Indicador', 'Valor'], [
    ['Predios activos', entero(panel.prediosActivos)],
    ['Evaluaciones cerradas', entero(panel.evaluacionesCerradas)],
    ['Evaluaciones en progreso', entero(panel.evaluacionesEnProgreso)],
    ['Calificacion promedio', numero(panel.calificacionPromedio)],
    ['Acciones de mejora atrasadas', entero(panel.accionesAtrasadas)]
  ], ['', 'derecha']));
  partes.push('');

  partes.push('## Por departamento');
  partes.push('');
  if (filas.length) {
    const totalPredios = filas.reduce((s, f) => s + f.predios, 0);
    const totalEvaluaciones = filas.reduce((s, f) => s + f.evaluaciones, 0);
    const promedioGeneral = totalEvaluaciones
      ? filas.reduce((s, f) => s + (f.promedio ?? 0) * f.evaluaciones, 0) / totalEvaluaciones
      : null;

    partes.push(tabla(
      ['Departamento', 'Predios', 'Evaluaciones', 'Promedio'],
      [
        ...filas.map((f) => [f.departamento, entero(f.predios), entero(f.evaluaciones), numero(f.promedio)]),
        ['**Total**', `**${entero(totalPredios)}**`, `**${entero(totalEvaluaciones)}**`, `**${numero(promedioGeneral)}**`]
      ],
      ['', 'derecha', 'derecha', 'derecha']
    ));
  } else {
    partes.push('_Aun no hay evaluaciones cerradas._');
  }
  partes.push('');

  // --- Distribucion por nivel ---
  partes.push('## Distribucion por nivel de bienestar');
  partes.push('');
  if (panel.distribucionNivel?.length) {
    partes.push(tabla(
      ['Nivel', 'Evaluaciones'],
      panel.distribucionNivel.map((d) => [d.nivel, entero(d.total)]),
      ['', 'derecha']
    ));
    partes.push('');
    partes.push('_Tabla 2 ICA: Excelente ≥ 90 · Alto ≥ 75 · Medio ≥ 50 · Bajo < 50._');
  } else {
    partes.push('_Sin evaluaciones cerradas._');
  }
  partes.push('');

  // --- Indicadores con mas incumplimientos ---
  partes.push('## Indicadores con mas incumplimientos');
  partes.push('');
  if (panel.topIncumplimientos?.length) {
    partes.push(tabla(
      ['Codigo', 'Indicador', 'Veces en 0'],
      panel.topIncumplimientos.map((i) => [i.indicador, INDICE[i.indicador]?.nombre, entero(i.total)]),
      ['', '', 'derecha']
    ));
  } else {
    partes.push('_Ningun indicador quedo en el nivel mas bajo._');
  }

  partes.push(pie());
  return partes.join('\n');
}

// --- Historial de un predio --------------------------------------------------

export function markdownPredio(predioId) {
  const datos = reportes.porPredio(predioId);
  const { predio } = datos;

  const partes = [];
  partes.push(`# Historial de evaluaciones · ${predio.nombre}`);
  partes.push('');
  partes.push(tabla(['Campo', 'Valor'], [
    ['Codigo ICA', predio.codigoIca ?? 'No registrado'],
    ['Ubicacion', `${predio.municipio}, ${predio.departamento}`],
    ['Vereda', predio.vereda ?? '—'],
    ['Sistema productivo', predio.sistema === 'piso' ? 'Piso' : 'Jaula'],
    ['Aves de un dia', entero(predio.inventario.dia)],
    ['Aves en levante', entero(predio.inventario.levante)],
    ['Aves en produccion', entero(predio.inventario.produccion)],
    ['Total de aves', entero(predio.totalAves)],
    ['Estado', predio.activo ? 'Activo' : 'Inactivo'],
    ['Propietario', `${predio.propietario.nombre} (${predio.propietario.cargo})`]
  ]));
  partes.push('');

  partes.push('## Resumen');
  partes.push('');
  partes.push(tabla(['Indicador', 'Valor'], [
    ['Evaluaciones cerradas', entero(datos.totalEvaluaciones)],
    ['Ultima calificacion', datos.ultima ? `${numero(datos.ultima.calificacion)} (${datos.ultima.nivel})` : '—'],
    ['Tendencia frente a la visita anterior', datos.tendencia == null ? '—' : `${datos.tendencia > 0 ? '+' : ''}${numero(datos.tendencia)}`],
    ['Acciones en el plan de mejora', entero(datos.totalAcciones)]
  ], ['', 'derecha']));
  partes.push('');

  partes.push('## Evolucion');
  partes.push('');
  if (datos.evolucion.length) {
    partes.push(tabla(
      ['Codigo', 'Fecha', 'Calificacion', 'Nivel', 'MBA', 'MBR', 'MBG'],
      datos.evolucion.slice().reverse().map((punto) => [
        punto.codigo, fechaLarga(punto.fecha), numero(punto.calificacion), punto.nivel,
        numero(punto.grupos.MBA), numero(punto.grupos.MBR), numero(punto.grupos.MBG)
      ]),
      ['', '', 'derecha', '', 'derecha', 'derecha', 'derecha']
    ));
  } else {
    partes.push('_Este predio aun no tiene evaluaciones cerradas._');
  }

  partes.push(pie());
  return partes.join('\n');
}

// --- Comparacion entre dos visitas -------------------------------------------

export function markdownComparacion(idA, idB) {
  const datos = reportes.comparar(idA, idB);

  const partes = [];
  partes.push(`# Comparacion de visitas · ${datos.predio?.nombre ?? ''}`);
  partes.push('');
  partes.push(`**${datos.a.codigo}** (${fechaLarga(datos.a.fecha)}) frente a **${datos.b.codigo}** (${fechaLarga(datos.b.fecha)})`);
  partes.push('');

  partes.push('## Resultado general');
  partes.push('');
  partes.push(tabla(
    ['Visita', 'Fecha', 'Calificacion', 'Nivel'],
    [
      [datos.a.codigo, fechaLarga(datos.a.fecha), numero(datos.a.calificacion), datos.a.nivel],
      [datos.b.codigo, fechaLarga(datos.b.fecha), numero(datos.b.calificacion), datos.b.nivel]
    ],
    ['', '', 'derecha', '']
  ));
  partes.push('');

  const signo = datos.diferenciaFinal > 0 ? '+' : '';
  const sentido = datos.diferenciaFinal > 0 ? 'mejoro' : datos.diferenciaFinal < 0 ? 'empeoro' : 'no cambio';
  partes.push(`**Diferencia:** ${signo}${numero(datos.diferenciaFinal)} puntos — el predio ${sentido}.`);
  partes.push('');

  partes.push('## Por grupo');
  partes.push('');
  partes.push(tabla(
    ['Grupo', datos.a.codigo, datos.b.codigo, 'Diferencia'],
    datos.porGrupo.map((fila) => {
      const diferencia = fila.promedioA == null || fila.promedioB == null ? null : fila.promedioB - fila.promedioA;
      return [
        fila.grupo, numero(fila.promedioA), numero(fila.promedioB),
        diferencia == null ? '—' : `${diferencia > 0 ? '+' : ''}${numero(diferencia)}`
      ];
    }),
    ['', 'derecha', 'derecha', 'derecha']
  ));
  partes.push('');

  const mejoraron = datos.porIndicador.filter((f) => f.resultado === 'Mejoro');
  const empeoraron = datos.porIndicador.filter((f) => f.resultado === 'Empeoro');

  partes.push(`## Por indicador (${mejoraron.length} mejoraron, ${empeoraron.length} empeoraron)`);
  partes.push('');
  partes.push(tabla(
    ['Codigo', 'Indicador', datos.a.codigo, datos.b.codigo, 'Diferencia', 'Resultado'],
    datos.porIndicador.map((fila) => [
      fila.indicador, fila.nombre, numero(fila.valorA), numero(fila.valorB),
      fila.diferencia == null ? '—' : `${fila.diferencia > 0 ? '+' : ''}${numero(fila.diferencia)}`,
      fila.resultado
    ]),
    ['', '', 'derecha', 'derecha', 'derecha', '']
  ));

  partes.push(pie());
  return partes.join('\n');
}

/** Nombre de archivo seguro para la descarga. */
export function nombreArchivo(base, extension) {
  const limpio = String(base)
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9-_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
  const fecha = new Date().toISOString().slice(0, 10);
  return `${limpio || 'reporte'}-${fecha}.${extension}`;
}

export { ErrorValidacion };
