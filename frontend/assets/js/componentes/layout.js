/**
 * Estructura de la aplicacion autenticada: barra superior, navegacion y contenido.
 */

import { html, crudo, clases } from '../core/dom.js';
import { tema } from '../core/sesion.js';
import { modulosVisibles, ROL_NOMBRE } from '/shared/ica/roles.js';

const ICONOS = {
  dashboard: '◰',
  predios: '⌂',
  evaluaciones: '✓',
  planes: '⚑',
  reportes: '◫',
  parametrizacion: '⚙',
  usuarios: '○',
  auditoria: '≡'
};

const RUTA_MODULO = {
  dashboard: '/',
  predios: '/predios',
  evaluaciones: '/evaluaciones',
  planes: '/planes',
  reportes: '/reportes',
  parametrizacion: '/parametrizacion',
  usuarios: '/usuarios',
  auditoria: '/auditoria'
};

export const marca = (conSubtitulo = true) => html`
  <div class="marca">
    <span class="marca__huevo" aria-hidden="true"></span>
    <span>
      <span class="marca__nombre">EvalCodorniz</span>
      ${conSubtitulo ? html`<span class="marca__sub">Bienestar animal ICA</span>` : ''}
    </span>
  </div>
`;

function navegacion(rol, caminoActual) {
  const modulos = modulosVisibles(rol);

  return html`
    <nav class="nav-lateral" aria-label="Modulos del sistema">
      ${crudo(modulos.map((modulo) => {
        const ruta = RUTA_MODULO[modulo.clave] ?? '/';
        // El panel solo esta activo en la raiz exacta; el resto, tambien en sus subrutas.
        const activo = ruta === '/' ? caminoActual === '/' : caminoActual.startsWith(ruta);
        return html`
          <a class="nav-boton" href="#${ruta}" ${crudo(activo ? 'aria-current="page"' : '')}>
            <span class="nav-boton__icono" aria-hidden="true">${ICONOS[modulo.clave] ?? '■'}</span>
            <span>${modulo.titulo}</span>
          </a>
        `;
      }).join(''))}
    </nav>
  `;
}

function barraSuperior(usuario) {
  return html`
    <header class="barra-superior">
      ${crudo(marca())}
      <div class="sesion">
        <button type="button" class="btn btn-tema" data-accion="tema"
                title="${tema.etiqueta()}" aria-label="${tema.etiqueta()}. Pulse para cambiar">
          ${tema.icono()}
        </button>
        <span class="sesion__nombre">${usuario.nombre}</span>
        <span class="insignia">${ROL_NOMBRE[usuario.rol] ?? usuario.rol}</span>
        <button type="button" class="btn" data-accion="menu-cuenta" aria-haspopup="dialog">Mi cuenta</button>
        <button type="button" class="btn" data-accion="salir">Salir</button>
      </div>
    </header>
  `;
}

/** Envuelve el contenido de una vista en la estructura de la aplicacion. */
export function conLayout({ usuario, camino, contenido }) {
  return html`
    <div class="app">
      ${crudo(barraSuperior(usuario))}
      ${crudo(navegacion(usuario.rol, camino))}
      <main class="contenido" id="contenido" tabindex="-1">${crudo(contenido)}</main>
    </div>
  `;
}

/** Cabecera estandar de una vista: titulo, descripcion y acciones. */
export function cabecera({ encabezillo, titulo, descripcion, acciones = '', migas }) {
  return html`
    ${migas ? crudo(migas) : ''}
    <div class="cabecera-vista">
      <div class="cabecera-vista__texto">
        ${encabezillo ? html`<p class="encabezillo">${encabezillo}</p>` : ''}
        <h1>${titulo}</h1>
        ${descripcion ? html`<p>${descripcion}</p>` : ''}
      </div>
      ${acciones ? html`<div class="cabecera-vista__acciones">${crudo(acciones)}</div>` : ''}
    </div>
  `;
}

export const migas = (saltos) => html`
  <nav class="migas" aria-label="Ruta de navegacion">
    ${crudo(saltos.map((salto, indice) => html`
      ${indice > 0 ? html`<span class="migas__separador" aria-hidden="true">/</span>` : ''}
      ${salto.href
        ? html`<a href="#${salto.href}">${salto.texto}</a>`
        : html`<span aria-current="page">${salto.texto}</span>`}
    `).join(''))}
  </nav>
`;

/** Tarjeta de indicador clave para el panel. */
export const tarjetaKpi = ({ etiqueta, valor, pie, insignia }) => html`
  <div class="panel kpi">
    <span class="encabezillo">${etiqueta}</span>
    <span class="kpi__valor">${valor}</span>
    ${insignia ? crudo(insignia) : ''}
    ${pie ? html`<span class="kpi__pie">${pie}</span>` : ''}
  </div>
`;

export { clases };
