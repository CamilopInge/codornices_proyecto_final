/**
 * Listado de evaluaciones con filtros.
 */

import { html, crudo, datosFormulario, delegar } from '../core/dom.js';
import { api } from '../core/api.js';
import { store } from '../core/store.js';
import { cabecera } from '../componentes/layout.js';
import { esqueletoTabla, vacio } from '../core/ui.js';
import { numero, fecha, insigniaNivel, insigniaEstado } from '../core/formato.js';
import { puede } from '/shared/ica/roles.js';

export const esqueleto = () => esqueletoTabla(8);

const NIVELES = ['Excelente', 'Alto', 'Medio', 'Bajo'];
const ESTADOS = [
  ['en_progreso', 'En progreso'],
  ['cerrada', 'Cerrada'],
  ['anulada', 'Anulada']
];

export async function render({ consulta }) {
  const filtros = {
    estado: consulta.estado ?? '',
    nivel: consulta.nivel ?? '',
    departamento: consulta.departamento ?? '',
    desde: consulta.desde ?? '',
    hasta: consulta.hasta ?? '',
    predioId: consulta.predio ?? ''
  };

  const evaluaciones = await api.evaluaciones.listar({
    estado: filtros.estado || null,
    nivel: filtros.nivel || null,
    departamento: filtros.departamento || null,
    desde: filtros.desde || null,
    hasta: filtros.hasta || null,
    predioId: filtros.predioId || null,
    limite: 200
  });

  const hayFiltros = Object.values(filtros).some(Boolean);

  const cuerpo = evaluaciones.length
    ? html`
      <div class="tabla-envoltura">
        <table>
          <caption class="solo-lectores">Evaluaciones registradas</caption>
          <thead>
            <tr>
              <th scope="col">Codigo</th>
              <th scope="col">Fecha</th>
              <th scope="col">Predio</th>
              <th scope="col">Evaluador</th>
              <th scope="col">Estado</th>
              <th scope="col">Forma</th>
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
                <td>
                  ${evaluacion.predio?.nombre ?? '—'}
                  <br><span class="pequeno tenue">${evaluacion.predio?.municipio ?? ''}, ${evaluacion.predio?.departamento ?? ''}</span>
                </td>
                <td>${evaluacion.evaluador ?? '—'}</td>
                <td>${crudo(insigniaEstado(evaluacion.estado))}</td>
                <td class="compacta">
                  ${evaluacion.forma
                    ? html`<span class="insignia insignia--${evaluacion.forma === 'definitiva' ? 'ok' : 'alerta'}">${evaluacion.forma}</span>`
                    : '—'}
                </td>
                <td class="num">${evaluacion.calificacion == null ? '—' : numero(evaluacion.calificacion)}</td>
                <td>${crudo(insigniaNivel(evaluacion.nivel))}</td>
                <td class="compacta">
                  <a class="btn btn--chico" href="#/evaluaciones/${evaluacion.id}">
                    ${evaluacion.estado === 'en_progreso' ? 'Continuar' : 'Ver'}
                  </a>
                </td>
              </tr>
            `).join(''))}
          </tbody>
        </table>
      </div>
    `
    : vacio({
        icono: '□',
        titulo: hayFiltros ? 'Ninguna evaluacion coincide con los filtros' : 'Aun no hay evaluaciones',
        mensaje: hayFiltros
          ? 'Pruebe a quitar algun filtro para ampliar la busqueda.'
          : 'Las visitas se abren desde el modulo de predios.',
        accion: hayFiltros
          ? '<button type="button" class="btn" data-accion="limpiar">Quitar filtros</button>'
          : puede(store.usuario.rol, 'predios')
            ? '<a class="btn btn--primario" href="#/predios">Ir a predios</a>'
            : null
      });

  return html`
    ${crudo(cabecera({
      encabezillo: 'Evaluaciones',
      titulo: 'Historial de visitas',
      descripcion: 'Visitas ordenadas de la mas reciente a la mas antigua. Para abrir una nueva, vaya a Predios y pulse Evaluar.'
    }))}

    <section class="panel">
      <div class="panel__cabeza">
        <h2>Filtros</h2>
        ${hayFiltros ? html`<button type="button" class="btn btn--chico btn--fantasma" data-accion="limpiar">Limpiar</button>` : ''}
      </div>
      <form id="form-filtros-eval" class="barra-filtros">
        <label>Estado
          <select name="estado">
            <option value="">Todos</option>
            ${crudo(ESTADOS.map(([valor, texto]) => html`
              <option value="${valor}" ${crudo(filtros.estado === valor ? 'selected' : '')}>${texto}</option>
            `).join(''))}
          </select>
        </label>
        <label>Nivel
          <select name="nivel">
            <option value="">Todos</option>
            ${crudo(NIVELES.map((nivel) => html`
              <option value="${nivel}" ${crudo(filtros.nivel === nivel ? 'selected' : '')}>${nivel}</option>
            `).join(''))}
          </select>
        </label>
        <label>Departamento
          <select name="departamento">
            <option value="">Todos</option>
            ${crudo(store.departamentos.map((d) => html`
              <option value="${d}" ${crudo(filtros.departamento === d ? 'selected' : '')}>${d}</option>
            `).join(''))}
          </select>
        </label>
        <label>Desde
          <input name="desde" type="date" value="${filtros.desde}">
        </label>
        <label>Hasta
          <input name="hasta" type="date" value="${filtros.hasta}">
        </label>
      </form>
    </section>

    <p class="pequeno tenue">${evaluaciones.length} evaluacion(es)</p>
    ${crudo(cuerpo)}
  `;
}

export function montar(raiz, { ir }) {
  const formulario = raiz.querySelector('#form-filtros-eval');

  const aplicar = () => {
    const datos = datosFormulario(formulario);
    const consulta = Object.fromEntries(Object.entries(datos).filter(([, valor]) => valor));
    ir('/evaluaciones', { consulta, reemplazar: true });
  };

  formulario?.addEventListener('change', aplicar);
  delegar(raiz, 'click', '[data-accion="limpiar"]', () => ir('/evaluaciones', { reemplazar: true }));

  return null;
}
