/**
 * Reportes: consolidado por departamento, dashboard por predio y comparacion
 * entre dos visitas del mismo predio.
 */

import { html, crudo, delegar, conBotonOcupado } from '../core/dom.js';
import { api, descargar } from '../core/api.js';
import { store } from '../core/store.js';
import { cabecera, tarjetaKpi } from '../componentes/layout.js';
import { esqueletoPanel, vacio, avisarError, avisarOk } from '../core/ui.js';
import { numero, entero, fecha, insigniaNivel } from '../core/formato.js';

export const esqueleto = () => esqueletoPanel(4);

let modo = 'consolidado';
let predioSeleccionado = '';
let comparacionA = '';
let comparacionB = '';

/** Grafico de linea simple en SVG; evita cargar una libreria entera. */
function graficoEvolucion(puntos) {
  if (puntos.length < 2) return '';

  const ancho = 560;
  const alto = 180;
  const margen = { arriba: 12, derecha: 12, abajo: 28, izquierda: 34 };
  const util = { ancho: ancho - margen.izquierda - margen.derecha, alto: alto - margen.arriba - margen.abajo };

  const x = (indice) => margen.izquierda + (indice / (puntos.length - 1)) * util.ancho;
  const y = (valor) => margen.arriba + util.alto - (valor / 100) * util.alto;

  const linea = puntos.map((punto, indice) => `${indice === 0 ? 'M' : 'L'}${x(indice).toFixed(1)},${y(punto.calificacion).toFixed(1)}`).join(' ');

  return html`
    <svg class="grafico-evolucion" viewBox="0 0 ${ancho} ${alto}" role="img"
         aria-label="Evolucion de la calificacion a lo largo de las visitas">
      ${crudo([0, 25, 50, 75, 100].map((valor) => `
        <line class="cuadricula" x1="${margen.izquierda}" y1="${y(valor)}" x2="${ancho - margen.derecha}" y2="${y(valor)}" />
        <text class="etiqueta" x="${margen.izquierda - 6}" y="${y(valor) + 4}" text-anchor="end">${valor}</text>
      `).join(''))}

      <path class="serie" d="${linea}" />

      ${crudo(puntos.map((punto, indice) => `
        <circle class="punto-serie" cx="${x(indice).toFixed(1)}" cy="${y(punto.calificacion).toFixed(1)}" r="4">
          <title>${punto.fecha}: ${punto.calificacion} (${punto.nivel})</title>
        </circle>
      `).join(''))}

      ${crudo(puntos.map((punto, indice) => `
        <text class="etiqueta" x="${x(indice).toFixed(1)}" y="${alto - 8}" text-anchor="middle">${punto.fecha.slice(5)}</text>
      `).join(''))}
    </svg>
  `;
}

async function panelConsolidado() {
  const filas = await api.reportes.consolidado();

  if (!filas.length) {
    return vacio({
      icono: '◫',
      titulo: 'Sin datos consolidados',
      mensaje: 'El consolidado se arma con las evaluaciones cerradas.'
    });
  }

  const totalEvaluaciones = filas.reduce((suma, fila) => suma + fila.evaluaciones, 0);
  const promedioGeneral = filas.reduce((suma, fila) => suma + (fila.promedio ?? 0) * fila.evaluaciones, 0) / totalEvaluaciones;

  return html`
    <div class="panel__cabeza">
      <h2>Consolidado por departamento</h2>
      <div class="fila no-imprimir" style="gap:.4rem">
        <button type="button" class="btn btn--chico" data-accion="imprimir">Imprimir / PDF</button>
        <button type="button" class="btn btn--chico" data-accion="md-consolidado">Descargar .md</button>
        <button type="button" class="btn btn--chico" data-accion="csv-consolidado">Descargar CSV</button>
      </div>
    </div>

    <div class="tabla-envoltura">
      <table>
        <thead>
          <tr>
            <th scope="col">Departamento</th>
            <th scope="col" class="num">Predios</th>
            <th scope="col" class="num">Evaluaciones</th>
            <th scope="col" class="num">Promedio</th>
            <th scope="col">Nivel medio</th>
          </tr>
        </thead>
        <tbody>
          ${crudo(filas.map((fila) => {
            const nivel = store.niveles.find((n) => (fila.promedio ?? 0) >= n.minimo)?.nombre;
            return html`
              <tr>
                <td><strong>${fila.departamento}</strong></td>
                <td class="num">${entero(fila.predios)}</td>
                <td class="num">${entero(fila.evaluaciones)}</td>
                <td class="num">${numero(fila.promedio)}</td>
                <td>${crudo(insigniaNivel(nivel))}</td>
              </tr>
            `;
          }).join(''))}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row">Total</th>
            <th class="num">${entero(filas.reduce((s, f) => s + f.predios, 0))}</th>
            <th class="num">${entero(totalEvaluaciones)}</th>
            <th class="num">${numero(promedioGeneral)}</th>
            <th></th>
          </tr>
        </tfoot>
      </table>
    </div>
  `;
}

async function panelPredio(predioId) {
  if (!predioId) {
    return vacio({ icono: '⌂', titulo: 'Seleccione un predio', mensaje: 'Elija un predio para ver su historial y evolucion.' });
  }

  const datos = await api.reportes.porPredio(Number(predioId));

  if (!datos.totalEvaluaciones) {
    return vacio({
      icono: '□',
      titulo: `${datos.predio.nombre} no tiene evaluaciones cerradas`,
      mensaje: 'Cuando se cierre la primera visita aparecera aqui su evolucion.'
    });
  }

  return html`
    <div class="panel__cabeza">
      <div>
        <h2>${datos.predio.nombre}</h2>
        <p class="pequeno tenue">
          ${datos.predio.municipio}, ${datos.predio.departamento} &middot;
          ${datos.predio.sistema === 'piso' ? 'Piso' : 'Jaula'} &middot;
          ${entero(datos.predio.totalAves)} aves
        </p>
      </div>
      <div class="fila no-imprimir" style="gap:.4rem">
        <button type="button" class="btn btn--chico" data-accion="imprimir">Imprimir / PDF</button>
        <button type="button" class="btn btn--chico" data-accion="md-predio" data-id="${datos.predio.id}">Descargar .md</button>
      </div>
    </div>

    <div class="rejilla rejilla--4" style="margin-top:1rem">
      ${crudo(tarjetaKpi({ etiqueta: 'Evaluaciones', valor: entero(datos.totalEvaluaciones) }))}
      ${crudo(tarjetaKpi({
        etiqueta: 'Ultima calificacion',
        valor: numero(datos.ultima?.calificacion),
        insignia: insigniaNivel(datos.ultima?.nivel)
      }))}
      ${crudo(tarjetaKpi({
        etiqueta: 'Tendencia',
        valor: datos.tendencia == null ? '—' : `${datos.tendencia > 0 ? '+' : ''}${numero(datos.tendencia)}`,
        pie: datos.tendencia == null ? 'Se requiere mas de una visita' : 'Frente a la visita anterior'
      }))}
      ${crudo(tarjetaKpi({ etiqueta: 'Acciones del plan', valor: entero(datos.totalAcciones) }))}
    </div>

    ${datos.evolucion.length >= 2 ? html`
      <h3 style="margin-top:1.5rem">Evolucion de la calificacion</h3>
      ${crudo(graficoEvolucion(datos.evolucion))}
    ` : ''}

    <h3 style="margin-top:1.5rem">Historial</h3>
    <div class="tabla-envoltura">
      <table>
        <thead>
          <tr>
            <th scope="col">Codigo</th>
            <th scope="col">Fecha</th>
            <th scope="col" class="num">Calificacion</th>
            <th scope="col">Nivel</th>
            <th scope="col" class="num">MBA</th>
            <th scope="col" class="num">MBR</th>
            <th scope="col" class="num">MBG</th>
            <th scope="col"></th>
          </tr>
        </thead>
        <tbody>
          ${crudo(datos.evolucion.slice().reverse().map((punto) => html`
            <tr>
              <td class="mono compacta">${punto.codigo}</td>
              <td class="compacta">${fecha(punto.fecha)}</td>
              <td class="num">${numero(punto.calificacion)}</td>
              <td>${crudo(insigniaNivel(punto.nivel))}</td>
              <td class="num">${numero(punto.grupos.MBA)}</td>
              <td class="num">${numero(punto.grupos.MBR)}</td>
              <td class="num">${numero(punto.grupos.MBG)}</td>
              <td class="compacta">
                <a class="btn btn--chico btn--fantasma" href="#/evaluaciones/${datos.ultima?.id}">Ver</a>
              </td>
            </tr>
          `).join(''))}
        </tbody>
      </table>
    </div>
  `;
}

async function panelComparacion(a, b) {
  if (!a || !b) {
    return vacio({
      icono: '⇄',
      titulo: 'Seleccione dos evaluaciones',
      mensaje: 'Elija dos visitas cerradas del mismo predio para compararlas indicador por indicador.'
    });
  }

  let datos;
  try {
    datos = await api.reportes.comparar(Number(a), Number(b));
  } catch (error) {
    return html`<div class="nota nota--error">${error.message}</div>`;
  }

  const mejoras = datos.porIndicador.filter((fila) => fila.resultado === 'Mejoro').length;
  const retrocesos = datos.porIndicador.filter((fila) => fila.resultado === 'Empeoro').length;

  return html`
    <div class="panel__cabeza">
      <div>
        <h2>Comparacion &middot; ${datos.predio?.nombre ?? ''}</h2>
        <p class="pequeno tenue">
          ${datos.a.codigo} (${fecha(datos.a.fecha)}) frente a ${datos.b.codigo} (${fecha(datos.b.fecha)})
        </p>
      </div>
      <div class="fila no-imprimir" style="gap:.4rem">
        <button type="button" class="btn btn--chico" data-accion="imprimir">Imprimir / PDF</button>
        <button type="button" class="btn btn--chico" data-accion="md-comparacion"
                data-a="${a}" data-b="${b}">Descargar .md</button>
      </div>
    </div>

    <div class="rejilla rejilla--4" style="margin-top:1rem">
      ${crudo(tarjetaKpi({ etiqueta: datos.a.codigo, valor: numero(datos.a.calificacion), insignia: insigniaNivel(datos.a.nivel) }))}
      ${crudo(tarjetaKpi({ etiqueta: datos.b.codigo, valor: numero(datos.b.calificacion), insignia: insigniaNivel(datos.b.nivel) }))}
      ${crudo(tarjetaKpi({
        etiqueta: 'Diferencia',
        valor: `${datos.diferenciaFinal > 0 ? '+' : ''}${numero(datos.diferenciaFinal)}`,
        insignia: datos.diferenciaFinal > 0
          ? '<span class="insignia insignia--ok">Mejoro</span>'
          : datos.diferenciaFinal < 0
            ? '<span class="insignia insignia--error">Empeoro</span>'
            : '<span class="insignia">Sin cambio</span>'
      }))}
      ${crudo(tarjetaKpi({ etiqueta: 'Indicadores', valor: `${mejoras} / ${retrocesos}`, pie: 'Mejoraron / empeoraron' }))}
    </div>

    <h3 style="margin-top:1.5rem">Por grupo</h3>
    <div class="tabla-envoltura">
      <table>
        <thead>
          <tr><th scope="col">Grupo</th><th scope="col" class="num">${datos.a.codigo}</th><th scope="col" class="num">${datos.b.codigo}</th><th scope="col" class="num">Diferencia</th></tr>
        </thead>
        <tbody>
          ${crudo(datos.porGrupo.map((fila) => {
            const diferencia = fila.promedioA == null || fila.promedioB == null ? null : fila.promedioB - fila.promedioA;
            return html`
              <tr>
                <td class="mono">${fila.grupo}</td>
                <td class="num">${numero(fila.promedioA)}</td>
                <td class="num">${numero(fila.promedioB)}</td>
                <td class="num">${diferencia == null ? '—' : `${diferencia > 0 ? '+' : ''}${numero(diferencia)}`}</td>
              </tr>
            `;
          }).join(''))}
        </tbody>
      </table>
    </div>

    <h3 style="margin-top:1.5rem">Por indicador</h3>
    <div class="tabla-envoltura">
      <table>
        <thead>
          <tr>
            <th scope="col">Codigo</th><th scope="col">Indicador</th>
            <th scope="col" class="num">A</th><th scope="col" class="num">B</th>
            <th scope="col" class="num">Diferencia</th><th scope="col">Resultado</th>
          </tr>
        </thead>
        <tbody>
          ${crudo(datos.porIndicador.map((fila) => {
            const tono = fila.resultado === 'Mejoro' ? 'ok' : fila.resultado === 'Empeoro' ? 'error' : '';
            return html`
              <tr>
                <td class="mono compacta">${fila.indicador}</td>
                <td>${fila.nombre}</td>
                <td class="num">${numero(fila.valorA)}</td>
                <td class="num">${numero(fila.valorB)}</td>
                <td class="num">${fila.diferencia == null ? '—' : `${fila.diferencia > 0 ? '+' : ''}${numero(fila.diferencia)}`}</td>
                <td class="compacta"><span class="insignia insignia--${tono}">${fila.resultado}</span></td>
              </tr>
            `;
          }).join(''))}
        </tbody>
      </table>
    </div>
  `;
}

export async function render() {
  const [predios, cerradas] = await Promise.all([
    api.predios.listar(),
    api.evaluaciones.listar({ estado: 'cerrada', limite: 200 })
  ]);

  if (!predioSeleccionado && predios.length) predioSeleccionado = String(predios[0].id);
  if (!comparacionA && cerradas.length) comparacionA = String(cerradas[0].id);
  if (!comparacionB && cerradas.length > 1) comparacionB = String(cerradas[1].id);

  let contenido;
  if (modo === 'consolidado') contenido = await panelConsolidado();
  else if (modo === 'predio') contenido = await panelPredio(predioSeleccionado);
  else contenido = await panelComparacion(comparacionA, comparacionB);

  const opcionesEvaluacion = cerradas.map((evaluacion) => ({
    valor: String(evaluacion.id),
    texto: `${evaluacion.codigo} · ${evaluacion.predio?.nombre ?? ''} · ${fecha(evaluacion.fechaVisita)}`
  }));

  return html`
    ${crudo(cabecera({
      encabezillo: 'Reportes y analisis',
      titulo: 'Reportes',
      descripcion: 'Consolidado institucional, evolucion por predio y comparacion entre visitas.'
    }))}

    <section class="panel">
      <div class="pestanas" role="tablist">
        <button type="button" class="pestana" role="tab" data-modo="consolidado" aria-selected="${modo === 'consolidado'}">Consolidado</button>
        <button type="button" class="pestana" role="tab" data-modo="predio" aria-selected="${modo === 'predio'}">Por predio</button>
        <button type="button" class="pestana" role="tab" data-modo="comparar" aria-selected="${modo === 'comparar'}">Comparar visitas</button>
      </div>

      ${modo === 'predio' ? html`
        <div class="barra-filtros" style="margin-top:1rem">
          <label>Predio
            <select id="selector-predio">
              ${crudo(predios.map((predio) => html`
                <option value="${predio.id}" ${crudo(String(predio.id) === predioSeleccionado ? 'selected' : '')}>
                  ${predio.nombre}
                </option>
              `).join(''))}
            </select>
          </label>
        </div>
      ` : ''}

      ${modo === 'comparar' ? html`
        <div class="barra-filtros" style="margin-top:1rem">
          <label>Evaluacion A
            <select id="selector-a">
              ${crudo(opcionesEvaluacion.map((opcion) => html`
                <option value="${opcion.valor}" ${crudo(opcion.valor === comparacionA ? 'selected' : '')}>${opcion.texto}</option>
              `).join(''))}
            </select>
          </label>
          <label>Evaluacion B
            <select id="selector-b">
              ${crudo(opcionesEvaluacion.map((opcion) => html`
                <option value="${opcion.valor}" ${crudo(opcion.valor === comparacionB ? 'selected' : '')}>${opcion.texto}</option>
              `).join(''))}
            </select>
          </label>
        </div>
      ` : ''}
    </section>

    <section class="panel">${crudo(contenido)}</section>
  `;
}

export function montar(raiz, { recargar }) {
  delegar(raiz, 'click', '[data-modo]', (_ev, boton) => {
    modo = boton.dataset.modo;
    recargar();
  });

  raiz.querySelector('#selector-predio')?.addEventListener('change', (ev) => {
    predioSeleccionado = ev.target.value;
    recargar();
  });

  raiz.querySelector('#selector-a')?.addEventListener('change', (ev) => {
    comparacionA = ev.target.value;
    recargar();
  });

  raiz.querySelector('#selector-b')?.addEventListener('change', (ev) => {
    comparacionB = ev.target.value;
    recargar();
  });

  /** Descarga con el boton en estado ocupado y el error a la vista. */
  const bajar = (selector, url, nombre) =>
    delegar(raiz, 'click', selector, async (_ev, boton) => {
      await conBotonOcupado(boton, async () => {
        try {
          await descargar(typeof url === 'function' ? url(boton) : url, nombre);
          avisarOk('Reporte descargado.');
        } catch (error) {
          avisarError(error.message);
        }
      });
    });

  bajar('[data-accion="csv-consolidado"]', api.reportes.urlConsolidadoCsv(), 'consolidado.csv');
  bajar('[data-accion="md-consolidado"]', api.reportes.urlConsolidadoMarkdown(), 'consolidado.md');
  bajar('[data-accion="md-predio"]', (boton) => api.reportes.urlPredioMarkdown(boton.dataset.id), 'historial.md');
  bajar(
    '[data-accion="md-comparacion"]',
    (boton) => api.reportes.urlComparacionMarkdown(boton.dataset.a, boton.dataset.b),
    'comparacion.md'
  );

  delegar(raiz, 'click', '[data-accion="imprimir"]', () => window.print());

  return null;
}
