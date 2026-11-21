/**
 * Panel general: indicadores clave, distribucion por nivel y actividad reciente.
 *
 * El panel anterior mostraba tres fincas y cuatro evaluaciones que no existian
 * en la base: eran datos de ejemplo incrustados en el codigo del navegador.
 * Aqui todo sale de /api/reportes/panel.
 */

import { html, crudo, datosFormulario } from '../core/dom.js';
import { api } from '../core/api.js';
import { store } from '../core/store.js';
import { cabecera, tarjetaKpi } from '../componentes/layout.js';
import { esqueletoPanel, vacio } from '../core/ui.js';
import { numero, entero, fecha, insigniaNivel, insigniaEstado, plural } from '../core/formato.js';
import { puede } from '/shared/ica/roles.js';

export const esqueleto = () => html`
  <div class="pila">
    <div class="esqueleto esqueleto--titulo"></div>
    ${crudo(esqueletoPanel(4))}
    ${crudo(esqueletoPanel(2))}
  </div>
`;

const ORDEN_NIVELES = ['Excelente', 'Alto', 'Medio', 'Bajo'];

const TONO_BARRA = { Excelente: 'ok', Alto: 'ok', Medio: 'alerta', Bajo: 'error' };

function filtros(valores, departamentos) {
  return html`
    <section class="panel" aria-labelledby="titulo-filtros">
      <div class="panel__cabeza">
        <h2 id="titulo-filtros">Filtros de consulta</h2>
        <button type="button" class="btn btn--chico btn--fantasma" data-accion="limpiar-filtros">Limpiar</button>
      </div>

      <form id="form-filtros" class="barra-filtros">
        <label>Departamento
          <select name="departamento">
            <option value="">Todos</option>
            ${crudo(departamentos.map((departamento) => html`
              <option value="${departamento}" ${crudo(valores.departamento === departamento ? 'selected' : '')}>${departamento}</option>
            `).join(''))}
          </select>
        </label>

        <label>Municipio
          <input name="municipio" value="${valores.municipio ?? ''}" placeholder="Todos">
        </label>

        <label>Nivel de bienestar
          <select name="nivel">
            <option value="">Todos</option>
            ${crudo(ORDEN_NIVELES.map((nivel) => html`
              <option value="${nivel}" ${crudo(valores.nivel === nivel ? 'selected' : '')}>${nivel}</option>
            `).join(''))}
          </select>
        </label>

        <label>Desde
          <input name="desde" type="date" value="${valores.desde ?? ''}">
        </label>

        <label>Hasta
          <input name="hasta" type="date" value="${valores.hasta ?? ''}">
        </label>
      </form>
    </section>
  `;
}

function distribucion(datos, total) {
  if (!total) {
    return vacio({
      icono: '◴',
      titulo: 'Sin evaluaciones cerradas',
      mensaje: 'Cuando se cierre la primera visita aparecera aqui la distribucion por nivel de bienestar.'
    });
  }

  const porNivel = Object.fromEntries(datos.map((fila) => [fila.nivel, fila.total]));
  const maximo = Math.max(1, ...datos.map((fila) => fila.total));

  return html`
    <div class="barras">
      ${crudo(ORDEN_NIVELES.map((nivel) => {
        const cantidad = porNivel[nivel] ?? 0;
        return html`
          <div class="barra">
            <span>${nivel}</span>
            <div class="barra__pista">
              <div class="barra__relleno barra__relleno--${TONO_BARRA[nivel]}" style="width:${(cantidad / maximo) * 100}%"></div>
            </div>
            <span class="barra__valor">${cantidad}</span>
          </div>
        `;
      }).join(''))}
    </div>
    <p class="pequeno tenue" style="margin-top:.8rem">
      Tabla 2 ICA &middot; Excelente &ge; 90 &middot; Alto &ge; 75 &middot; Medio &ge; 50 &middot; Bajo &lt; 50
    </p>
  `;
}

function incumplimientos(datos) {
  if (!datos.length) {
    return vacio({
      icono: '✓',
      titulo: 'Sin indicadores en cero',
      mensaje: 'Ninguna evaluacion cerrada registra indicadores en el nivel mas bajo.'
    });
  }

  const maximo = Math.max(1, ...datos.map((fila) => fila.total));

  return html`
    <div class="barras">
      ${crudo(datos.map((fila) => {
        const indicador = store.indicador(fila.indicador);
        return html`
          <div class="barra" title="${indicador?.nombre ?? fila.indicador}">
            <span class="mono">${fila.indicador}</span>
            <div class="barra__pista">
              <div class="barra__relleno barra__relleno--error" style="width:${(fila.total / maximo) * 100}%"></div>
            </div>
            <span class="barra__valor">${fila.total}</span>
          </div>
        `;
      }).join(''))}
    </div>
    <p class="pequeno tenue" style="margin-top:.8rem">
      Veces que el indicador quedo en 0 en evaluaciones cerradas.
    </p>
  `;
}

function tablaRecientes(evaluaciones) {
  if (!evaluaciones.length) {
    return vacio({
      icono: '□',
      titulo: 'Aun no hay evaluaciones',
      mensaje: 'Registre un predio y abra su primera visita para empezar.',
      accion: puede(store.usuario.rol, 'predios', 'w')
        ? '<a class="btn btn--primario" href="#/predios">Ir a predios</a>'
        : null
    });
  }

  return html`
    <div class="tabla-envoltura">
      <table>
        <caption class="solo-lectores">Evaluaciones mas recientes</caption>
        <thead>
          <tr>
            <th scope="col">Codigo</th>
            <th scope="col">Fecha</th>
            <th scope="col">Predio</th>
            <th scope="col">Evaluador</th>
            <th scope="col">Estado</th>
            <th scope="col" class="num">Calificacion</th>
            <th scope="col">Nivel</th>
            <th scope="col"><span class="solo-lectores">Acciones</span></th>
          </tr>
        </thead>
        <tbody>
          ${crudo(evaluaciones.map((evaluacion) => html`
            <tr>
              <td class="mono compacta">${evaluacion.codigo}</td>
              <td class="compacta">${fecha(evaluacion.fechaVisita)}</td>
              <td>${evaluacion.predio?.nombre ?? '—'}</td>
              <td>${evaluacion.evaluador ?? '—'}</td>
              <td>${crudo(insigniaEstado(evaluacion.estado))}</td>
              <td class="num">${evaluacion.calificacion == null ? '—' : numero(evaluacion.calificacion)}</td>
              <td>${crudo(insigniaNivel(evaluacion.nivel))}</td>
              <td class="compacta">
                <a class="btn btn--chico" href="#/evaluaciones/${evaluacion.id}">
                  ${evaluacion.estado === 'cerrada' ? 'Ver forma' : 'Continuar'}
                </a>
              </td>
            </tr>
          `).join(''))}
        </tbody>
      </table>
    </div>
  `;
}

export async function render() {
  const valores = store.estado.filtrosPanel;

  const [resumen, recientes] = await Promise.all([
    api.reportes.panel(valores),
    api.evaluaciones.listar({ limite: 6 })
  ]);

  const nivelPromedio = resumen.calificacionPromedio == null
    ? null
    : store.niveles.find((nivel) => resumen.calificacionPromedio >= nivel.minimo)?.nombre;

  return html`
    ${crudo(cabecera({
      encabezillo: 'Panel general',
      titulo: 'Bienestar animal en los predios evaluados',
      descripcion: 'Resumen de las visitas cerradas segun la metodologia ICA para codornices de postura.'
    }))}

    ${crudo(filtros(valores, store.departamentos))}

    <div class="rejilla rejilla--4">
      ${crudo(tarjetaKpi({
        etiqueta: 'Predios activos',
        valor: entero(resumen.prediosActivos)
      }))}
      ${crudo(tarjetaKpi({
        etiqueta: 'Evaluaciones cerradas',
        valor: entero(resumen.evaluacionesCerradas)
      }))}
      ${crudo(tarjetaKpi({
        etiqueta: 'En progreso',
        valor: entero(resumen.evaluacionesEnProgreso),
        pie: resumen.evaluacionesEnProgreso ? 'Visitas sin cerrar' : null
      }))}
      ${crudo(tarjetaKpi({
        etiqueta: 'Calificacion promedio',
        valor: resumen.calificacionPromedio == null ? '—' : numero(resumen.calificacionPromedio),
        insignia: nivelPromedio ? insigniaNivel(nivelPromedio) : null
      }))}
    </div>

    ${resumen.accionesAtrasadas ? html`
      <div class="nota nota--alerta">
        Hay <strong>${plural(resumen.accionesAtrasadas, 'accion vencida', 'acciones vencidas')}</strong>
        en los planes de mejora.
        <a href="#/planes">Ver planes de mejora</a>
      </div>
    ` : ''}

    <div class="rejilla rejilla--2">
      <section class="panel">
        <h2>Distribucion por nivel de bienestar</h2>
        ${crudo(distribucion(resumen.distribucionNivel, resumen.evaluacionesCerradas))}
      </section>

      <section class="panel">
        <h2>Indicadores con mas incumplimientos</h2>
        ${crudo(incumplimientos(resumen.topIncumplimientos))}
      </section>
    </div>

    <section class="panel">
      <div class="panel__cabeza">
        <h2>Evaluaciones recientes</h2>
        <a class="btn btn--chico btn--fantasma" href="#/evaluaciones">Ver todas</a>
      </div>
      ${crudo(tablaRecientes(recientes))}
    </section>
  `;
}

export function montar(raiz, { recargar }) {
  const formulario = raiz.querySelector('#form-filtros');
  if (!formulario) return null;

  let temporizador;

  const aplicar = () => {
    store.actualizarFiltrosPanel(datosFormulario(formulario));
    recargar();
  };

  // Los selectores y fechas aplican al instante; el texto espera a que se deje de escribir.
  const alCambiar = (ev) => {
    if (ev.target.type === 'text') return;
    aplicar();
  };

  const alEscribir = () => {
    clearTimeout(temporizador);
    temporizador = setTimeout(aplicar, 450);
  };

  const alLimpiar = () => {
    store.actualizarFiltrosPanel({ departamento: '', municipio: '', nivel: '', desde: '', hasta: '' });
    recargar();
  };

  const alEnviar = (ev) => { ev.preventDefault(); aplicar(); };

  formulario.addEventListener('change', alCambiar);
  formulario.addEventListener('input', alEscribir);
  formulario.addEventListener('submit', alEnviar);
  raiz.querySelector('[data-accion="limpiar-filtros"]')?.addEventListener('click', alLimpiar);

  return () => {
    clearTimeout(temporizador);
    formulario.removeEventListener('change', alCambiar);
    formulario.removeEventListener('input', alEscribir);
    formulario.removeEventListener('submit', alEnviar);
  };
}
