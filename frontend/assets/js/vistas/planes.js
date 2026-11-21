/**
 * Planes de mejora: seguimiento de las acciones derivadas de recomendaciones aprobadas.
 */

import { html, crudo, delegar } from '../core/dom.js';
import { api } from '../core/api.js';
import { store } from '../core/store.js';
import { cabecera, tarjetaKpi } from '../componentes/layout.js';
import { esqueletoTabla, vacio, avisarOk, avisarError } from '../core/ui.js';
import { fecha, entero, insigniaAccion, estaAtrasada, plural } from '../core/formato.js';
import { puede } from '/shared/ica/roles.js';

export const esqueleto = () => esqueletoTabla(8);

const ESTADOS = [
  ['pendiente', 'Pendiente'],
  ['en_curso', 'En curso'],
  ['cumplida', 'Cumplida']
];

export async function render({ consulta }) {
  const filtroEstado = consulta.estado ?? '';
  const soloAtrasadas = consulta.atrasadas === '1';
  const puedeEscribir = puede(store.usuario.rol, 'planes', 'w');

  const acciones = await api.planes.acciones({
    estado: filtroEstado || null,
    atrasadas: soloAtrasadas ? '1' : null
  });

  const todas = await api.planes.acciones({});
  const atrasadas = todas.filter(estaAtrasada).length;
  const cumplidas = todas.filter((accion) => accion.estado === 'cumplida').length;
  const avanceMedio = todas.length
    ? Math.round(todas.reduce((suma, accion) => suma + accion.avance, 0) / todas.length)
    : 0;

  const cuerpo = acciones.length
    ? html`
      <div class="tabla-envoltura">
        <table>
          <caption class="solo-lectores">Acciones del plan de mejora</caption>
          <thead>
            <tr>
              <th scope="col">Predio</th>
              <th scope="col">Accion</th>
              <th scope="col">Responsable</th>
              <th scope="col">Fecha limite</th>
              <th scope="col">Estado</th>
              <th scope="col">Avance</th>
            </tr>
          </thead>
          <tbody>
            ${crudo(acciones.map((accion) => html`
              <tr>
                <td>
                  <a href="#/evaluaciones/${accion.evaluacionId}">${accion.predio ?? '—'}</a>
                  <br><span class="mono pequeno tenue">${accion.evaluacionCodigo ?? ''}</span>
                </td>
                <td>${accion.descripcion}</td>
                <td>${accion.responsable}</td>
                <td class="compacta">
                  <span class="mono">${fecha(accion.fechaLimite)}</span>
                  ${estaAtrasada(accion) ? html`<br><span class="insignia insignia--error">Atrasada</span>` : ''}
                </td>
                <td class="compacta">
                  ${puedeEscribir
                    ? html`
                      <select data-accion-estado="${accion.id}">
                        ${crudo(ESTADOS.map(([valor, texto]) => html`
                          <option value="${valor}" ${crudo(accion.estado === valor ? 'selected' : '')}>${texto}</option>
                        `).join(''))}
                      </select>
                    `
                    : crudo(insigniaAccion(accion.estado))}
                </td>
                <td style="min-width:150px">
                  <div class="fila fila--sin-salto">
                    ${puedeEscribir
                      ? html`<input type="range" min="0" max="100" step="10" value="${accion.avance}"
                                    data-accion-avance="${accion.id}" aria-label="Avance de la accion">`
                      : ''}
                    <span class="mono" data-avance-texto="${accion.id}">${accion.avance} %</span>
                  </div>
                </td>
              </tr>
            `).join(''))}
          </tbody>
        </table>
      </div>
    `
    : vacio({
        icono: '⚑',
        titulo: filtroEstado || soloAtrasadas ? 'Ninguna accion coincide con el filtro' : 'Sin acciones registradas',
        mensaje: filtroEstado || soloAtrasadas
          ? 'Pruebe a quitar el filtro.'
          : 'Las acciones nacen de aprobar una recomendacion en la forma oficial de una evaluacion cerrada.'
      });

  return html`
    ${crudo(cabecera({
      encabezillo: 'Planes de mejora',
      titulo: 'Seguimiento de acciones',
      descripcion: 'Acciones comprometidas a partir de las recomendaciones aprobadas en cada visita.'
    }))}

    <div class="rejilla rejilla--4">
      ${crudo(tarjetaKpi({ etiqueta: 'Acciones totales', valor: entero(todas.length) }))}
      ${crudo(tarjetaKpi({ etiqueta: 'Cumplidas', valor: entero(cumplidas) }))}
      ${crudo(tarjetaKpi({
        etiqueta: 'Atrasadas',
        valor: entero(atrasadas),
        insignia: atrasadas ? '<span class="insignia insignia--error">Requieren atencion</span>' : null
      }))}
      ${crudo(tarjetaKpi({ etiqueta: 'Avance promedio', valor: `${avanceMedio} %` }))}
    </div>

    ${atrasadas && !soloAtrasadas ? html`
      <div class="nota nota--alerta">
        Hay <strong>${plural(atrasadas, 'accion vencida', 'acciones vencidas')}</strong> sin cumplir.
        <a href="#/planes?atrasadas=1">Ver solo las atrasadas</a>
      </div>
    ` : ''}

    <section class="panel">
      <div class="panel__cabeza">
        <h2>Filtros</h2>
        ${filtroEstado || soloAtrasadas
          ? html`<button type="button" class="btn btn--chico btn--fantasma" data-accion="limpiar">Limpiar</button>`
          : ''}
      </div>
      <div class="barra-filtros">
        <label>Estado
          <select id="filtro-estado">
            <option value="">Todos</option>
            ${crudo(ESTADOS.map(([valor, texto]) => html`
              <option value="${valor}" ${crudo(filtroEstado === valor ? 'selected' : '')}>${texto}</option>
            `).join(''))}
          </select>
        </label>
        <label><input type="checkbox" id="filtro-atrasadas" ${crudo(soloAtrasadas ? 'checked' : '')}>
          Solo atrasadas
        </label>
      </div>
    </section>

    <p class="pequeno tenue">${acciones.length} accion(es)</p>
    ${crudo(cuerpo)}
  `;
}

export function montar(raiz, { ir, recargar }) {
  const aplicarFiltros = () => {
    const estado = raiz.querySelector('#filtro-estado')?.value;
    const atrasadas = raiz.querySelector('#filtro-atrasadas')?.checked;
    const consulta = {};
    if (estado) consulta.estado = estado;
    if (atrasadas) consulta.atrasadas = '1';
    ir('/planes', { consulta, reemplazar: true });
  };

  raiz.querySelector('#filtro-estado')?.addEventListener('change', aplicarFiltros);
  raiz.querySelector('#filtro-atrasadas')?.addEventListener('change', aplicarFiltros);
  delegar(raiz, 'click', '[data-accion="limpiar"]', () => ir('/planes', { reemplazar: true }));

  delegar(raiz, 'change', '[data-accion-estado]', async (_ev, campo) => {
    const id = Number(campo.dataset.accionEstado);
    try {
      await api.planes.actualizarAccion(id, { estado: campo.value });
      avisarOk('Estado actualizado.');
      recargar();
    } catch (error) {
      avisarError(error.message);
      recargar();
    }
  });

  // El texto sigue al deslizador en vivo; el guardado espera a soltarlo.
  delegar(raiz, 'input', '[data-accion-avance]', (_ev, campo) => {
    const id = campo.dataset.accionAvance;
    const texto = raiz.querySelector(`[data-avance-texto="${id}"]`);
    if (texto) texto.textContent = `${campo.value} %`;
  });

  delegar(raiz, 'change', '[data-accion-avance]', async (_ev, campo) => {
    const id = Number(campo.dataset.accionAvance);
    try {
      await api.planes.actualizarAccion(id, { avance: Number(campo.value) });
      avisarOk('Avance actualizado.');
      if (Number(campo.value) === 100) recargar();
    } catch (error) {
      avisarError(error.message);
      recargar();
    }
  });

  return null;
}
