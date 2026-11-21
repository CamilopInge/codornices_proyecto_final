/**
 * Bitacora de auditoria: registro de solo lectura de las acciones relevantes.
 *
 * Cada entrada guarda quien, que, sobre que, desde donde y, cuando aplica,
 * el estado anterior y el posterior.
 */

import { html, crudo, delegar } from '../core/dom.js';
import { api } from '../core/api.js';
import { cabecera } from '../componentes/layout.js';
import { esqueletoTabla, vacio, abrirModal, avisarError } from '../core/ui.js';
import { fechaHora, hace, entero, insigniaResultado } from '../core/formato.js';

export const esqueleto = () => esqueletoTabla(12);

const ENTIDADES = ['usuario', 'predio', 'evaluacion', 'evidencia', 'recomendacion', 'accion_mejora', 'configuracion'];

const TONO_ACCION = {
  login: 'info', logout: '', crear: 'ok', actualizar: '', eliminar_evidencia: 'error',
  cerrar: 'marca', anular: 'error', restablecer_password: 'alerta', solicitar_reset: 'alerta',
  forzar_reset: 'alerta', cambiar_password: 'alerta', sembrar: 'marca'
};

export async function render({ consulta }) {
  const pagina = Math.max(1, Number(consulta.pagina) || 1);
  const filtros = {
    entidad: consulta.entidad ?? '',
    accion: consulta.accion ?? '',
    desde: consulta.desde ?? '',
    hasta: consulta.hasta ?? ''
  };

  const datos = await api.auditoria.listar({
    ...Object.fromEntries(Object.entries(filtros).filter(([, v]) => v)),
    pagina,
    limite: 50
  });

  const totalPaginas = Math.max(1, Math.ceil(datos.total / datos.limite));
  const hayFiltros = Object.values(filtros).some(Boolean);

  const cuerpo = datos.entradas.length
    ? html`
      <div class="tabla-envoltura">
        <table>
          <caption class="solo-lectores">Registro de auditoria</caption>
          <thead>
            <tr>
              <th scope="col">Fecha</th>
              <th scope="col">Usuario</th>
              <th scope="col">Accion</th>
              <th scope="col">Entidad</th>
              <th scope="col">Resultado</th>
              <th scope="col">Origen</th>
              <th scope="col"><span class="solo-lectores">Detalle</span></th>
            </tr>
          </thead>
          <tbody>
            ${crudo(datos.entradas.map((entrada) => html`
              <tr>
                <td class="compacta pequeno">
                  ${fechaHora(entrada.fecha)}
                  <br><span class="tenue diminuto">${hace(entrada.fecha)}</span>
                </td>
                <td class="pequeno">
                  ${entrada.usuario ?? html`<span class="tenue">Sistema</span>`}
                  ${entrada.rol ? html`<br><span class="tenue diminuto">${entrada.rol}</span>` : ''}
                </td>
                <td class="compacta">
                  <span class="insignia insignia--${TONO_ACCION[entrada.accion] ?? ''}">${entrada.accion}</span>
                </td>
                <td class="compacta pequeno">
                  ${entrada.entidad}
                  ${entrada.entidadId ? html`<span class="mono tenue"> #${entrada.entidadId}</span>` : ''}
                </td>
                <td class="compacta">${insigniaResultado(entrada.resultado)}</td>
                <td class="mono diminuto tenue">${entrada.ip ?? '—'}</td>
                <td class="compacta">
                  <button type="button" class="btn btn--chico btn--fantasma"
                          data-accion="ver-detalle" data-id="${entrada.id}">Ver</button>
                </td>
              </tr>
            `).join(''))}
          </tbody>
        </table>
      </div>

      <div class="paginacion">
        <span>${entero(datos.total)} entrada(s) &middot; pagina ${pagina} de ${totalPaginas}</span>
        <div class="paginacion__controles">
          <button type="button" class="btn btn--chico" data-pagina="${pagina - 1}"
                  ${crudo(pagina <= 1 ? 'disabled' : '')}>Anterior</button>
          <button type="button" class="btn btn--chico" data-pagina="${pagina + 1}"
                  ${crudo(pagina >= totalPaginas ? 'disabled' : '')}>Siguiente</button>
        </div>
      </div>
    `
    : vacio({
        icono: '≡',
        titulo: hayFiltros ? 'Ninguna entrada coincide con los filtros' : 'La bitacora esta vacia',
        mensaje: hayFiltros ? 'Pruebe a ampliar el rango de fechas.' : 'Las acciones se registran automaticamente.'
      });

  return html`
    ${crudo(cabecera({
      encabezillo: 'Auditoria',
      titulo: 'Bitacora del sistema',
      descripcion: 'Registro inmutable de accesos, cambios y operaciones. No se puede editar ni borrar.',
      acciones: '<button type="button" class="btn" data-accion="ver-correos">Correos enviados</button>'
    }))}

    <section class="panel">
      <div class="panel__cabeza">
        <h2>Filtros</h2>
        ${hayFiltros ? html`<button type="button" class="btn btn--chico btn--fantasma" data-accion="limpiar">Limpiar</button>` : ''}
      </div>
      <div class="barra-filtros">
        <label>Entidad
          <select id="filtro-entidad">
            <option value="">Todas</option>
            ${crudo(ENTIDADES.map((entidad) => html`
              <option value="${entidad}" ${crudo(filtros.entidad === entidad ? 'selected' : '')}>${entidad}</option>
            `).join(''))}
          </select>
        </label>
        <label>Accion
          <select id="filtro-accion">
            <option value="">Todas</option>
            ${crudo((datos.accionesDisponibles ?? []).map((accion) => html`
              <option value="${accion}" ${crudo(filtros.accion === accion ? 'selected' : '')}>${accion}</option>
            `).join(''))}
          </select>
        </label>
        <label>Desde
          <input id="filtro-desde" type="date" value="${filtros.desde}">
        </label>
        <label>Hasta
          <input id="filtro-hasta" type="date" value="${filtros.hasta}">
        </label>
      </div>
    </section>

    ${crudo(cuerpo)}
  `;
}

export function montar(raiz, { ir, consulta }) {
  const aplicar = (extra = {}) => {
    const nueva = {
      entidad: raiz.querySelector('#filtro-entidad')?.value,
      accion: raiz.querySelector('#filtro-accion')?.value,
      desde: raiz.querySelector('#filtro-desde')?.value,
      hasta: raiz.querySelector('#filtro-hasta')?.value,
      ...extra
    };
    const limpia = Object.fromEntries(Object.entries(nueva).filter(([, valor]) => valor));
    ir('/auditoria', { consulta: limpia, reemplazar: true });
  };

  ['#filtro-entidad', '#filtro-accion', '#filtro-desde', '#filtro-hasta'].forEach((selector) => {
    raiz.querySelector(selector)?.addEventListener('change', () => aplicar({ pagina: null }));
  });

  delegar(raiz, 'click', '[data-accion="limpiar"]', () => ir('/auditoria', { reemplazar: true }));
  delegar(raiz, 'click', '[data-pagina]', (_ev, boton) => aplicar({ pagina: boton.dataset.pagina }));

  delegar(raiz, 'click', '[data-accion="ver-detalle"]', async (_ev, boton) => {
    const id = Number(boton.dataset.id);
    const pagina = Math.max(1, Number(consulta.pagina) || 1);

    // La entrada ya esta en la pagina cargada; se busca ahi en vez de pedirla otra vez.
    const datos = await api.auditoria.listar({ pagina, limite: 50 });
    const entrada = datos.entradas.find((item) => item.id === id);
    if (!entrada) return;

    const bloque = (titulo, contenido) =>
      contenido
        ? html`<h4 style="margin-top:1rem">${titulo}</h4>
               <pre class="nota mono diminuto" style="overflow-x:auto;white-space:pre-wrap">${JSON.stringify(contenido, null, 2)}</pre>`
        : '';

    await abrirModal({
      titulo: `Entrada #${entrada.id}`,
      contenido: html`
        <dl class="datos">
          <div><dt>Fecha</dt><dd>${fechaHora(entrada.fecha)}</dd></div>
          <div><dt>Usuario</dt><dd>${entrada.usuario ?? 'Sistema'}</dd></div>
          <div><dt>Rol</dt><dd>${entrada.rol ?? '—'}</dd></div>
          <div><dt>Accion</dt><dd>${entrada.accion}</dd></div>
          <div><dt>Entidad</dt><dd>${entrada.entidad} ${entrada.entidadId ?? ''}</dd></div>
          <div><dt>Resultado</dt><dd>${entrada.resultado}</dd></div>
          <div><dt>Origen</dt><dd class="mono pequeno">${entrada.ip ?? '—'}</dd></div>
        </dl>
        ${entrada.userAgent ? html`<p class="pequeno tenue" style="margin-top:.8rem">${entrada.userAgent}</p>` : ''}
        ${crudo(bloque('Antes', entrada.datosAntes))}
        ${crudo(bloque('Despues', entrada.datosDespues))}
        ${crudo(bloque('Detalle', Object.keys(entrada.detalle ?? {}).length ? entrada.detalle : null))}
      `,
      acciones: [{ texto: 'Cerrar', clase: 'btn--primario', valor: true }]
    });
  });

  delegar(raiz, 'click', '[data-accion="ver-correos"]', async () => {
    try {
      const correos = await api.auditoria.correos();
      await abrirModal({
        titulo: 'Correos enviados',
        contenido: correos.length
          ? html`
            <div class="tabla-envoltura">
              <table>
                <thead><tr><th>Fecha</th><th>Destinatario</th><th>Plantilla</th><th>Estado</th></tr></thead>
                <tbody>
                  ${crudo(correos.map((correo) => html`
                    <tr>
                      <td class="pequeno compacta">${fechaHora(correo.created_at)}</td>
                      <td class="pequeno">${correo.destinatario}</td>
                      <td class="pequeno">${correo.plantilla}</td>
                      <td class="compacta">
                        <span class="insignia insignia--${correo.estado === 'enviado' ? 'ok' : correo.estado === 'fallido' ? 'error' : 'alerta'}">
                          ${correo.estado}
                        </span>
                      </td>
                    </tr>
                  `).join(''))}
                </tbody>
              </table>
            </div>
            <p class="pequeno tenue" style="margin-top:.8rem">
              "Registrado" significa que no hay SMTP configurado y el mensaje se guardo en data/correos-salientes.
            </p>
          `
          : '<p>Aun no se ha enviado ningun correo.</p>',
        acciones: [{ texto: 'Cerrar', clase: 'btn--primario', valor: true }]
      });
    } catch (error) {
      avisarError(error.message);
    }
  });

  return null;
}
