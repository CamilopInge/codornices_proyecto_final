/**
 * Parametrizacion: catalogo ICA, tablas normativas, matriz de permisos y
 * catalogos editables.
 *
 * El catalogo de indicadores es de solo lectura: cambiarlo implicaria una
 * revision normativa, no un ajuste de configuracion.
 */

import { html, crudo, delegar, conBotonOcupado } from '../core/dom.js';
import { api } from '../core/api.js';
import { store } from '../core/store.js';
import { cabecera } from '../componentes/layout.js';
import { esqueletoTabla, avisarOk, avisarError } from '../core/ui.js';
import { puede, ROL_NOMBRE, LISTA_ROLES } from '/shared/ica/roles.js';

export const esqueleto = () => esqueletoTabla(10);

let pestanaActiva = 'indicadores';
let grupoActivo = 'MBA';

function tablaIndicadores(catalogo) {
  const indicadores = catalogo.indicadores.filter((indicador) => indicador.grupo === grupoActivo);

  return html`
    <div class="fila" style="margin-bottom:1rem">
      ${crudo(catalogo.grupos.map((grupo) => html`
        <button type="button" class="btn ${grupo.clave === grupoActivo ? 'btn--primario' : ''}"
                data-grupo-param="${grupo.clave}">
          ${grupo.clave} &middot; ${grupo.total}
        </button>
      `).join(''))}
    </div>

    <p class="pequeno tenue" style="margin-bottom:.8rem">
      ${catalogo.grupos.find((g) => g.clave === grupoActivo)?.nombre ?? ''}
    </p>

    <div class="tabla-envoltura">
      <table>
        <thead>
          <tr>
            <th scope="col">Codigo</th>
            <th scope="col">Indicador</th>
            <th scope="col">Metodo</th>
            <th scope="col">Tipo de captura</th>
            <th scope="col">Escala</th>
            <th scope="col">Aplica</th>
          </tr>
        </thead>
        <tbody>
          ${crudo(indicadores.map((indicador) => html`
            <tr>
              <td class="mono compacta">${indicador.codigo}</td>
              <td>
                <strong>${indicador.nombre}</strong>
                <br><span class="pequeno tenue">${indicador.pregunta}</span>
                ${indicador.notaNormativa
                  ? html`<br><span class="insignia insignia--alerta" style="margin-top:.3rem">Texto normativo pendiente</span>`
                  : ''}
              </td>
              <td class="pequeno">${indicador.metodo}</td>
              <td class="pequeno compacta">${indicador.captura.replace(/_/g, ' ')}</td>
              <td class="mono compacta">${indicador.niveles.map(([puntos]) => puntos).join(' / ')}</td>
              <td class="pequeno compacta">${indicador.aplicabilidad}</td>
            </tr>
          `).join(''))}
        </tbody>
      </table>
    </div>
  `;
}

function tablasNormativas(catalogo) {
  const { ponderacion, niveles, muestreo } = catalogo.tablas;

  return html`
    <div class="rejilla rejilla--3">
      <section class="panel panel--hundido">
        <h3>Tabla 1 &middot; Ponderacion</h3>
        <div class="tabla-envoltura" style="margin-top:.8rem">
          <table>
            <thead><tr><th>Aves</th><th class="num">MBA</th><th class="num">MBR</th><th class="num">MBG</th></tr></thead>
            <tbody>
              <tr>
                <td>&ge; ${catalogo.tablas.ponderacion.umbralAves}</td>
                <td class="num">${ponderacion.mayorIgual.MBA} %</td>
                <td class="num">${ponderacion.mayorIgual.MBR} %</td>
                <td class="num">${ponderacion.mayorIgual.MBG} %</td>
              </tr>
              <tr>
                <td>&lt; ${catalogo.tablas.ponderacion.umbralAves}</td>
                <td class="num">${ponderacion.menor.MBA} %</td>
                <td class="num">${ponderacion.menor.MBR} %</td>
                <td class="num">—</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p class="pequeno tenue" style="margin-top:.6rem">
          Un predio con exactamente ${catalogo.tablas.ponderacion.umbralAves} aves se trata como del grupo mayor.
        </p>
      </section>

      <section class="panel panel--hundido">
        <h3>Tabla 2 &middot; Niveles</h3>
        <div class="tabla-envoltura" style="margin-top:.8rem">
          <table>
            <thead><tr><th>Nivel</th><th>Rango</th></tr></thead>
            <tbody>
              ${crudo(niveles.map((nivel, indice) => {
                const superior = indice === 0 ? null : niveles[indice - 1].minimo;
                return html`
                  <tr>
                    <td>${nivel.nombre}</td>
                    <td class="mono">${superior == null ? `≥ ${nivel.minimo}` : `${nivel.minimo} – ${superior - 0.01}`}</td>
                  </tr>
                `;
              }).join(''))}
            </tbody>
          </table>
        </div>
      </section>

      <section class="panel panel--hundido">
        <h3>Tabla 3 &middot; Muestreo</h3>
        <div class="tabla-envoltura" style="margin-top:.8rem">
          <table>
            <thead><tr><th>Aves</th><th class="num">Corrales</th><th class="num">Puntos</th><th class="num">Aves</th></tr></thead>
            <tbody>
              <tr>
                <td>&lt; ${catalogo.tablas.ponderacion.umbralAves}</td>
                <td class="num">${muestreo.menor.corrales}</td>
                <td class="num">${muestreo.menor.puntos}</td>
                <td class="num">${muestreo.menor.totalAvesMuestra}</td>
              </tr>
              <tr>
                <td>&ge; ${catalogo.tablas.ponderacion.umbralAves}</td>
                <td class="num">${muestreo.mayorIgual.corrales}</td>
                <td class="num">${muestreo.mayorIgual.puntos}</td>
                <td class="num">${muestreo.mayorIgual.totalAvesMuestra}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p class="pequeno tenue" style="margin-top:.6rem">10 aves por punto en ambos casos.</p>
      </section>
    </div>
  `;
}

function matrizPermisos(permisos) {
  return html`
    <div class="tabla-envoltura">
      <table class="matriz-permisos">
        <thead>
          <tr>
            <th scope="col">Modulo</th>
            ${crudo(LISTA_ROLES.map((rol) => html`<th scope="col">${ROL_NOMBRE[rol]}</th>`).join(''))}
          </tr>
        </thead>
        <tbody>
          ${crudo(permisos.modulos.map((modulo) => html`
            <tr>
              <td>${modulo.titulo}</td>
              ${crudo(LISTA_ROLES.map((rol) => {
                const acceso = permisos.matriz[rol]?.[modulo.clave];
                return html`<td>${crudo(
                  acceso === 'w'
                    ? '<span class="insignia insignia--ok">Edicion</span>'
                    : acceso === 'r'
                      ? '<span class="insignia">Lectura</span>'
                      : '<span class="tenue">—</span>'
                )}</td>`;
              }).join(''))}
            </tr>
          `).join(''))}
        </tbody>
      </table>
    </div>
  `;
}

function exigenciaDocumental(configuracion, puedeEscribir) {
  const exigencia = configuracion.exigencia_documental ?? {};
  const bloqueado = puedeEscribir ? '' : 'disabled';
  const relajada = exigencia.exigirEnGestion === false || exigencia.exigirEnPrediosGrandes === false;

  return html`
    <section class="panel panel--hundido pila" style="grid-column:1/-1">
      <h3>Exigencia de soporte documental</h3>
      <p class="pequeno tenue">
        Define en que casos el sistema pide adjuntar un documento para poder cerrar una visita.
        Se aplica a todos los predios y queda registrada en cada evaluacion que se abra.
      </p>

      <label>
        <input type="checkbox" name="exigirEnGestion"
               ${crudo(exigencia.exigirEnGestion !== false ? 'checked' : '')} ${crudo(bloqueado)}>
        Exigir documento en los indicadores de gestion (MBG) y en la mortalidad
      </label>

      <label>
        <input type="checkbox" name="exigirEnPrediosGrandes"
               ${crudo(exigencia.exigirEnPrediosGrandes !== false ? 'checked' : '')} ${crudo(bloqueado)}>
        Exigir documento en agua y espacio cuando el predio supera las 1.000 aves
      </label>

      <hr class="separador" style="margin:.5rem 0">

      <label>
        <input type="checkbox" name="marcarPorDefecto"
               ${crudo(exigencia.marcarPorDefecto ? 'checked' : '')} ${crudo(bloqueado)}>
        Marcar "firmado" y "legible" por defecto al adjuntar un documento
      </label>
      <p class="pequeno tenue" style="margin-top:-.4rem">
        Evita tener que marcar las dos casillas en cada indicador. El evaluador puede
        desmarcarlas cuando el documento no cumpla.
      </p>

      ${relajada ? html`
        <div class="nota nota--alerta">
          <p><strong>La exigencia esta relajada respecto a la norma.</strong></p>
          <p class="pequeno">
            Es util para practicas y capacitacion, pero las visitas que se abran asi lo
            declararan en su forma oficial. Para una visita oficial deje ambas casillas marcadas.
          </p>
        </div>
      ` : ''}
    </section>
  `;
}

function catalogosEditables(configuracion, puedeEscribir) {
  const catalogos = configuracion.catalogos ?? {};
  const niveles = configuracion.niveles_bienestar ?? [];
  const bloqueado = puedeEscribir ? '' : 'disabled';

  return html`
    <form id="form-configuracion" class="rejilla rejilla--2">
      ${exigenciaDocumental(configuracion, puedeEscribir)}
      <section class="panel panel--hundido pila">
        <h3>Catalogos base</h3>
        <label>Departamentos (uno por linea)
          <textarea name="departamentos" rows="8" ${crudo(bloqueado)}>${(catalogos.departamentos ?? []).join('\n')}</textarea>
        </label>
        <label>Grupos etarios (separados por coma)
          <input name="gruposEtarios" value="${(catalogos.gruposEtarios ?? []).join(', ')}" ${crudo(bloqueado)}>
        </label>
        <label>Formatos de evidencia permitidos
          <input name="formatosEvidencia" value="${(catalogos.formatosEvidencia ?? []).join(', ')}" ${crudo(bloqueado)}>
        </label>
        <label>Tamano maximo de evidencia (MB)
          <input name="tamanoMaximoMB" type="number" min="1" max="50" value="${catalogos.tamanoMaximoMB ?? 5}" ${crudo(bloqueado)}>
        </label>
      </section>

      <section class="panel panel--hundido pila">
        <h3>Rangos de la Tabla 2</h3>
        <p class="pequeno tenue">
          Los minimos deben ir de mayor a menor y el ultimo nivel debe empezar en 0.
          Las evaluaciones ya cerradas conservan el nivel con el que se calcularon.
        </p>
        ${crudo(niveles.map((nivel, indice) => html`
          <label>${nivel.nombre} (minimo)
            <input name="nivel-${indice}" type="number" min="0" max="100" value="${nivel.minimo}" ${crudo(bloqueado)}>
          </label>
        `).join(''))}

        <p class="nota nota--error" id="error-config" role="alert" hidden></p>

        ${puedeEscribir ? html`
          <div class="fila fila--fin">
            <button type="submit" class="btn btn--primario">Guardar configuracion</button>
          </div>
        ` : html`<p class="nota">Su rol puede consultar la parametrizacion pero no modificarla.</p>`}
      </section>
    </form>
  `;
}

const PESTANAS = [
  ['indicadores', 'Indicadores'],
  ['tablas', 'Tablas normativas'],
  ['permisos', 'Matriz de permisos'],
  ['catalogos', 'Catalogos editables']
];

export async function render() {
  const puedeEscribir = puede(store.usuario.rol, 'parametrizacion', 'w');
  const catalogo = store.catalogo;
  const permisos = store.estado.permisos;
  const configuracion = store.configuracion;

  let contenido;
  if (pestanaActiva === 'indicadores') contenido = tablaIndicadores(catalogo);
  else if (pestanaActiva === 'tablas') contenido = tablasNormativas(catalogo);
  else if (pestanaActiva === 'permisos') contenido = matrizPermisos(permisos);
  else contenido = catalogosEditables(configuracion, puedeEscribir);

  return html`
    ${crudo(cabecera({
      encabezillo: 'Parametrizacion',
      titulo: 'Configuracion de la metodologia',
      descripcion: `Catalogo ICA version ${catalogo.version}. Los indicadores y las tablas normativas son de solo lectura; los catalogos de apoyo si se pueden ajustar.`
    }))}

    <section class="panel">
      <div class="pestanas" role="tablist">
        ${crudo(PESTANAS.map(([clave, titulo]) => html`
          <button type="button" class="pestana" role="tab" data-pestana="${clave}"
                  aria-selected="${clave === pestanaActiva}">${titulo}</button>
        `).join(''))}
      </div>

      <div style="margin-top:1.2rem">${crudo(contenido)}</div>
    </section>
  `;
}

export function montar(raiz, { recargar }) {
  delegar(raiz, 'click', '[data-pestana]', (_ev, boton) => {
    pestanaActiva = boton.dataset.pestana;
    recargar();
  });

  delegar(raiz, 'click', '[data-grupo-param]', (_ev, boton) => {
    grupoActivo = boton.dataset.grupoParam;
    recargar();
  });

  const formulario = raiz.querySelector('#form-configuracion');
  formulario?.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const error = raiz.querySelector('#error-config');
    error.hidden = true;

    const elementos = formulario.elements;
    const nivelesOriginales = store.configuracion.niveles_bienestar ?? [];

    const niveles = nivelesOriginales.map((nivel, indice) => ({
      nombre: nivel.nombre,
      minimo: Number(elementos[`nivel-${indice}`]?.value ?? nivel.minimo)
    }));

    const cuerpo = {
      catalogos: {
        departamentos: elementos.departamentos.value.split('\n').map((t) => t.trim()).filter(Boolean),
        gruposEtarios: elementos.gruposEtarios.value.split(',').map((t) => t.trim()).filter(Boolean),
        formatosEvidencia: elementos.formatosEvidencia.value.split(',').map((t) => t.trim()).filter(Boolean),
        tamanoMaximoMB: Number(elementos.tamanoMaximoMB.value)
      },
      niveles,
      exigencia: {
        exigirEnGestion: elementos.exigirEnGestion.checked,
        exigirEnPrediosGrandes: elementos.exigirEnPrediosGrandes.checked,
        marcarPorDefecto: elementos.marcarPorDefecto.checked
      }
    };

    const boton = formulario.querySelector('button[type="submit"]');

    await conBotonOcupado(boton, async () => {
      try {
        await api.catalogo.guardarConfiguracion(cuerpo);
        await store.cargarReferencias({ forzar: true });
        avisarOk('Configuracion guardada.');
        recargar();
      } catch (fallo) {
        error.textContent = fallo.message;
        error.hidden = false;
      }
    });
  });

  return null;
}
