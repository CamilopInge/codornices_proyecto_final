/**
 * Vista de una evaluacion: diligenciamiento mientras esta en progreso y
 * forma oficial una vez cerrada.
 *
 * El cliente envia los datos crudos observados; el puntaje lo deriva el
 * servidor. Lo que se muestra aqui mientras se escribe es una vista previa.
 */

import { html, crudo, delegar, conBotonOcupado } from '../core/dom.js';
import { api, descargar } from '../core/api.js';
import { store } from '../core/store.js';
import { cabecera, migas } from '../componentes/layout.js';
import { vacio, avisarOk, avisarError, avisarAlerta, confirmar, abrirModal, esqueletoTabla } from '../core/ui.js';
import {
  numero, entero, fecha, fechaHora, bytes,
  insigniaNivel, insigniaEstado, insigniaPuntaje
} from '../core/formato.js';
import { TIPO_CAPTURA } from '/shared/ica/catalogo.js';
import { GRUPO_NOMBRE } from '/shared/ica/catalogo.js';
import { requiereSoporte, DENSIDAD_MAXIMA } from '/shared/ica/reglas.js';
import { puede } from '/shared/ica/roles.js';

export const esqueleto = () => esqueletoTabla(10);

/** Grupo visible en el diligenciamiento; se conserva entre recargas de la vista. */
let grupoActivo = 'MBA';

// --- Campos de captura por tipo de indicador --------------------------------

function camposPorcentaje(indicador, respuesta, bloqueado) {
  const etiqueta = store.catalogo?.umbrales?.porcentaje?.[indicador.codigo]?.etiqueta ?? 'Porcentaje observado';
  const valor = respuesta?.valorCrudo?.porcentaje ?? '';

  return html`
    <div class="campos-calculo">
      <label>${etiqueta}
        <input type="number" min="0" max="100" step="0.1" data-campo="porcentaje"
               value="${valor}" ${crudo(bloqueado ? 'disabled' : '')}>
      </label>
      <p class="resultado-calculo" data-resultado>${
        respuesta?.valor == null ? 'Escriba el porcentaje para calcular el puntaje.' : `Puntaje calculado: ${respuesta.valor}`
      }</p>
    </div>
    ${crudo(nivelesSoloLectura(indicador, respuesta?.valor))}
  `;
}

function camposDensidadJaula(indicador, respuesta, bloqueado) {
  const c = respuesta?.valorCrudo ?? {};
  return html`
    <div class="campos-calculo">
      <label>Area total de jaulas (AT) m2
        <input type="number" min="0" step="0.01" data-campo="at" value="${c.at ?? ''}" ${crudo(bloqueado ? 'disabled' : '')}>
      </label>
      <label>Aves en jaulas (TA)
        <input type="number" min="0" data-campo="ta" value="${c.ta ?? ''}" ${crudo(bloqueado ? 'disabled' : '')}>
      </label>
      <label>Area total del galpon (AJ) m2
        <input type="number" min="0" step="0.01" data-campo="aj" value="${c.aj ?? ''}" ${crudo(bloqueado ? 'disabled' : '')}>
      </label>
      <label>Aves en el galpon (TG)
        <input type="number" min="0" data-campo="tg" value="${c.tg ?? ''}" ${crudo(bloqueado ? 'disabled' : '')}>
      </label>
      <p class="resultado-calculo" data-resultado>${
        c.densidad != null ? `Densidad D = ${numero(c.densidad)} aves/m2 (maximo ${DENSIDAD_MAXIMA})` : 'CJ = AT/TA · IG = AJ/TG · D = (CJ + IG) / 2'
      }</p>
    </div>
    ${crudo(nivelesSoloLectura(indicador, respuesta?.valor))}
  `;
}

function camposDensidadPiso(indicador, respuesta, bloqueado) {
  const c = respuesta?.valorCrudo ?? {};
  return html`
    <div class="campos-calculo">
      <label>Total de aves (TG)
        <input type="number" min="0" data-campo="aves" value="${c.aves ?? ''}" ${crudo(bloqueado ? 'disabled' : '')}>
      </label>
      <label>Area util (AU) m2
        <input type="number" min="0" step="0.01" data-campo="metrosCuadrados" value="${c.metrosCuadrados ?? ''}" ${crudo(bloqueado ? 'disabled' : '')}>
      </label>
      <p class="resultado-calculo" data-resultado>${
        c.densidad != null ? `Densidad = ${numero(c.densidad)} aves/m2 (maximo ${DENSIDAD_MAXIMA})` : `Espacio = TG / AU. Maximo ${DENSIDAD_MAXIMA} aves/m2.`
      }</p>
    </div>
    ${crudo(nivelesSoloLectura(indicador, respuesta?.valor))}
  `;
}

function camposRatio(indicador, respuesta, bloqueado) {
  const c = respuesta?.valorCrudo ?? {};
  const esComedero = indicador.captura === TIPO_CAPTURA.RATIO_COMEDERO;

  return html`
    <div class="campos-calculo">
      <label>Total de aves
        <input type="number" min="0" data-campo="animales" value="${c.animales ?? ''}" ${crudo(bloqueado ? 'disabled' : '')}>
      </label>
      <label>${esComedero ? 'Numero de comederos' : 'Numero de bebederos'}
        <input type="number" min="0" data-campo="unidades" value="${c.unidades ?? ''}" ${crudo(bloqueado ? 'disabled' : '')}>
      </label>
      <label>Limite de aves por unidad
        <input type="number" min="0" step="0.1" data-campo="limite" value="${c.limite ?? ''}" ${crudo(bloqueado ? 'disabled' : '')}>
      </label>
      ${esComedero ? html`
        <label><input type="checkbox" data-campo="competencia" ${crudo(c.competencia ? 'checked' : '')} ${crudo(bloqueado ? 'disabled' : '')}>
          Hay competencia por el alimento
        </label>
      ` : ''}
      <p class="resultado-calculo" data-resultado>${
        c.porUnidad != null
          ? `${numero(c.porUnidad)} aves por unidad (limite ${numero(c.limite)})`
          : esComedero
            ? 'Dentro del 30% sin competencia: 100 · sobre 30% sin competencia: 55 · con competencia: 0.'
            : 'Dentro del limite: 100 · hasta 30% por encima: 55 · mas de 30%: 0.'
      }</p>
    </div>
    ${crudo(nivelesSoloLectura(indicador, respuesta?.valor))}
  `;
}

function camposEscala(indicador, respuesta, bloqueado) {
  return html`
    <div class="niveles" role="radiogroup" aria-label="Niveles de ${indicador.nombre}">
      ${crudo(indicador.niveles.map(([puntos, texto]) => html`
        <label class="nivel">
          <input type="radio" name="nivel-${indicador.codigo}" value="${puntos}" data-campo="nivel"
                 ${crudo(respuesta?.valor === puntos ? 'checked' : '')} ${crudo(bloqueado ? 'disabled' : '')}>
          <span class="nivel__puntos">${puntos}</span>
          <span>${texto}</span>
        </label>
      `).join(''))}
    </div>
  `;
}

/** Escala mostrada sin posibilidad de elegir: el puntaje sale del calculo. */
function nivelesSoloLectura(indicador, valorActual) {
  return html`
    <div class="niveles">
      ${crudo(indicador.niveles.map(([puntos, texto]) => html`
        <div class="nivel nivel--calculado" data-activo="${valorActual === puntos}" data-puntos="${puntos}">
          <span class="nivel__puntos">${puntos}</span>
          <span>${texto}</span>
        </div>
      `).join(''))}
    </div>
  `;
}

function bloqueDocumento(indicador, respuesta, bloqueado, evaluacionId, marcarPorDefecto) {
  const doc = respuesta?.documento ?? {};
  const esMortalidad = indicador.captura === TIPO_CAPTURA.DOCUMENTAL_PORCENTAJE;

  // Sin respuesta guardada todavia, las casillas siguen el valor configurado en
  // Parametrizacion, para no obligar a marcarlas una por una en cada indicador.
  const sinGuardar = respuesta?.documento === undefined;
  const firmado = sinGuardar ? marcarPorDefecto : Boolean(doc.firmado);
  const legible = sinGuardar ? marcarPorDefecto : Boolean(doc.legible);

  return html`
    <div class="bloque-documento">
      <p class="encabezillo">Soporte documental</p>

      ${esMortalidad ? html`
        <label>Mortalidad acumulada de los ultimos 5 ciclos (%)
          <input type="number" min="0" max="100" step="0.1" data-campo="porcentaje"
                 value="${respuesta?.valorCrudo?.porcentaje ?? ''}" ${crudo(bloqueado ? 'disabled' : '')}>
        </label>
      ` : ''}

      ${respuesta?.evidenciaId ? html`
        <div class="evidencia-actual">
          <span class="insignia insignia--ok">Adjunto</span>
          <span class="mono pequeno">${respuesta.evidenciaNombre ?? 'documento'}</span>
          <button type="button" class="btn btn--chico btn--fantasma" data-accion="descargar-evidencia"
                  data-id="${respuesta.evidenciaId}" data-nombre="${respuesta.evidenciaNombre ?? 'evidencia'}">Descargar</button>
          ${!bloqueado ? html`
            <button type="button" class="btn btn--chico btn--peligro" data-accion="quitar-evidencia"
                    data-id="${respuesta.evidenciaId}">Quitar</button>
          ` : ''}
        </div>
      ` : html`
        ${!bloqueado ? html`
          <label>Adjuntar documento (PDF, JPG o PNG; maximo 5 MB)
            <input type="file" accept=".pdf,.jpg,.jpeg,.png" data-subir-evidencia
                   data-indicador="${indicador.codigo}" data-evaluacion="${evaluacionId}">
          </label>
        ` : html`<p class="pequeno tenue">Sin evidencia adjunta.</p>`}
      `}

      <div class="bloque-documento__meta">
        <label>Vigencia hasta
          <input type="date" data-campo="docVigencia" value="${doc.vigenciaHasta ?? ''}" ${crudo(bloqueado ? 'disabled' : '')}>
        </label>
        <label>Matricula profesional
          <input type="text" data-campo="docMatricula" value="${doc.matricula ?? ''}" ${crudo(bloqueado ? 'disabled' : '')}>
        </label>
      </div>

      <div class="fila">
        <label><input type="checkbox" data-campo="docFirmado" ${crudo(firmado ? 'checked' : '')} ${crudo(bloqueado ? 'disabled' : '')}>
          Firmado por profesional
        </label>
        <label><input type="checkbox" data-campo="docLegible" ${crudo(legible ? 'checked' : '')} ${crudo(bloqueado ? 'disabled' : '')}>
          Legible y sin correcciones
        </label>
      </div>

      <p class="pequeno tenue">
        La verificacion de la firma profesional y de la matricula ante la entidad emisora queda pendiente
        de una fuente oficial; el sistema no la da por valida.
      </p>
    </div>
  `;
}

function tarjetaIndicador(indicador, respuesta, { bloqueado, evaluacion }) {
  const exigeSoporte = requiereSoporte(indicador.codigo, evaluacion.totalAves, evaluacion.exigencia);
  const marcarPorDefecto = Boolean(evaluacion.exigencia?.marcarPorDefecto);
  const muestrasEsperadas = evaluacion.muestreo.totalAvesMuestra ?? 0;
  const usaMuestreo = indicador.metodo.toLowerCase().includes('muestreo');

  let campos;
  switch (indicador.captura) {
    case TIPO_CAPTURA.PORCENTAJE:
      campos = camposPorcentaje(indicador, respuesta, bloqueado); break;
    case TIPO_CAPTURA.DENSIDAD_JAULA:
      campos = camposDensidadJaula(indicador, respuesta, bloqueado); break;
    case TIPO_CAPTURA.DENSIDAD_PISO:
      campos = camposDensidadPiso(indicador, respuesta, bloqueado); break;
    case TIPO_CAPTURA.RATIO_BEBEDERO:
    case TIPO_CAPTURA.RATIO_COMEDERO:
      campos = camposRatio(indicador, respuesta, bloqueado); break;
    case TIPO_CAPTURA.DOCUMENTAL_PORCENTAJE:
      campos = nivelesSoloLectura(indicador, respuesta?.valor); break;
    default:
      campos = camposEscala(indicador, respuesta, bloqueado);
  }

  return html`
    <article class="indicador" id="indicador-${indicador.codigo}"
             data-indicador="${indicador.codigo}" data-puntaje="${respuesta?.valor ?? ''}">
      <div class="indicador__meta">
        <span class="mono negrita">${indicador.codigo}</span>
        <span data-insignia>${crudo(insigniaPuntaje(respuesta?.valor))}</span>
      </div>

      <div class="indicador__titulo">
        <h3>${indicador.nombre}</h3>
        <p class="indicador__pregunta">${indicador.pregunta}</p>
        <p class="indicador__metodo">${indicador.metodo}</p>
      </div>

      ${indicador.notaNormativa ? html`
        <p class="indicador__nota-norma">${indicador.notaNormativa}</p>
      ` : ''}

      ${crudo(campos)}

      ${exigeSoporte || indicador.captura === TIPO_CAPTURA.DOCUMENTAL_MIXTO
        ? bloqueDocumento(indicador, respuesta, bloqueado, evaluacion.id, marcarPorDefecto)
        : ''}

      ${usaMuestreo && muestrasEsperadas ? html`
        <label>Observaciones punto a punto (valores 0, 55 o 100 separados por coma)
          <textarea rows="2" data-campo="muestras" placeholder="Hasta ${muestrasEsperadas} observaciones"
                    ${crudo(bloqueado ? 'disabled' : '')}>${(respuesta?.muestras ?? []).join(', ')}</textarea>
          <span class="pequeno tenue">Si registra observaciones, el puntaje del indicador sera su promedio.</span>
        </label>
      ` : ''}

      <label>Observacion del evaluador
        <input type="text" data-campo="observacion" value="${respuesta?.observacion ?? ''}"
               maxlength="1000" ${crudo(bloqueado ? 'disabled' : '')}>
      </label>
    </article>
  `;
}

// --- Panel de control de la visita ------------------------------------------

function panelInspeccion(evaluacion, bloqueado) {
  const inspeccion = evaluacion.inspeccion ?? {};
  const plan = evaluacion.muestreo;
  const seleccionCompleta = Boolean(inspeccion.semilla);

  return html`
    <section class="panel" aria-labelledby="titulo-inspeccion">
      <div class="panel__cabeza">
        <div>
          <h2 id="titulo-inspeccion">Control de la visita</h2>
          <p class="pequeno tenue">Fase I apertura &middot; Fase II inspeccion &middot; Fase III cierre.</p>
        </div>
        <label style="min-width:11rem">Fase actual
          <select data-inspeccion="fase" ${crudo(bloqueado ? 'disabled' : '')}>
            <option value="apertura" ${crudo(inspeccion.fase === 'apertura' ? 'selected' : '')}>Apertura</option>
            <option value="inspeccion" ${crudo(inspeccion.fase === 'inspeccion' ? 'selected' : '')}>Inspeccion</option>
            <option value="cierre" ${crudo(inspeccion.fase === 'cierre' ? 'selected' : '')}>Cierre</option>
          </select>
        </label>
      </div>

      <div class="pila">
        <div class="nota ${seleccionCompleta ? 'nota--ok' : 'nota--alerta'}">
          ${seleccionCompleta
            ? html`
                <p><strong>Muestra generada.</strong> Semilla <span class="mono">${inspeccion.semilla}</span></p>
                <p class="pequeno">${inspeccion.algoritmo ?? ''}</p>
              `
            : html`<p>Aun no se ha generado la seleccion reproducible de la muestra. Es obligatoria para cerrar la visita.</p>`}
        </div>

        <div class="rejilla rejilla--3">
          <div class="panel panel--hundido">
            <p class="encabezillo">Corrales (${plan.corrales})</p>
            <p class="pequeno">${(inspeccion.corrales ?? []).join(', ') || '—'}</p>
          </div>
          <div class="panel panel--hundido">
            <p class="encabezillo">Puntos (${plan.puntos})</p>
            <p class="pequeno">${(inspeccion.puntos ?? []).join(', ') || '—'}</p>
          </div>
          <div class="panel panel--hundido">
            <p class="encabezillo">Aves (${plan.totalAvesMuestra})</p>
            <p class="pequeno">${(inspeccion.aves ?? []).length ? `${(inspeccion.aves ?? []).length} aves seleccionadas` : '—'}</p>
          </div>
        </div>

        ${!bloqueado ? html`
          <div class="fila">
            <button type="button" class="btn" data-accion="generar-muestra">
              ${seleccionCompleta ? 'Regenerar seleccion' : 'Generar seleccion ICA'}
            </button>
          </div>
        ` : ''}

        <div class="fila">
          <label><input type="checkbox" data-inspeccion="bioseguridadVerificada"
                        ${crudo(inspeccion.bioseguridadVerificada ? 'checked' : '')} ${crudo(bloqueado ? 'disabled' : '')}>
            Se verificaron las condiciones de bioseguridad
          </label>
          <label><input type="checkbox" data-inspeccion="inspeccionNeutral"
                        ${crudo(inspeccion.inspeccionNeutral ? 'checked' : '')} ${crudo(bloqueado ? 'disabled' : '')}>
            La inspeccion no altero la conducta de las aves
          </label>
        </div>
      </div>
    </section>
  `;
}

// --- Panel lateral de puntaje -----------------------------------------------

function panelPuntaje(detalle, puedeEscribir) {
  const { resumen, validacion, muestreo } = detalle;
  const nivel = resumen.nivel;

  return html`
    <aside class="panel-puntaje">
      <div class="panel pila pila--chica">
        <p class="encabezillo">Calificacion parcial</p>
        <div class="puntaje-grande" data-puntaje-total>${numero(resumen.calificacion)}</div>
        <p class="pequeno tenue">
          ${resumen.respondidos} de ${resumen.totalIndicadores} indicadores respondidos
        </p>

        <div class="escala-niveles" aria-hidden="true">
          ${crudo(['Bajo', 'Medio', 'Alto', 'Excelente'].map((n) => html`
            <span data-activo="${resumen.respondidos > 0 && nivel === n}">${n}</span>
          `).join(''))}
        </div>

        <div class="pila pila--chica" style="margin-top:.5rem">
          ${crudo(['MBA', 'MBR', 'MBG'].map((grupo) => {
            const dato = resumen.grupos[grupo];
            const ancho = dato.promedio ?? 0;
            return html`
              <div class="linea-grupo">
                <span class="mono">${grupo}</span>
                <div class="linea-grupo__pista">
                  <div class="linea-grupo__relleno" style="width:${ancho}%"></div>
                </div>
                <span>${dato.total ? `${numero(dato.promedio)} % · ${dato.peso} %` : 'no aplica'}</span>
              </div>
            `;
          }).join(''))}
        </div>

        <p class="pequeno tenue">Final = suma de (promedio del grupo x peso de la Tabla 1).</p>
      </div>

      <div class="panel pila pila--chica">
        <p class="encabezillo">Plan de muestreo · Tabla 3</p>
        <div class="plan-muestreo">
          <div><b>${muestreo.corrales}</b><span>corrales</span></div>
          <div><b>${muestreo.puntos}</b><span>puntos</span></div>
          <div><b>${muestreo.totalAvesMuestra}</b><span>aves</span></div>
        </div>
        <p class="pequeno tenue">10 aves por punto, de 4 semanas o mas en produccion.</p>
      </div>

      ${validacion.puedeCerrar ? html`
        <div class="nota nota--ok">
          Todo listo para cerrar.
          ${validacion.avisos.length ? html`<br>Se cerrara con ${validacion.avisos.length} aviso(s) documental(es).` : ''}
        </div>
      ` : html`
        <div class="nota nota--alerta">
          <p><strong>Falta para poder cerrar:</strong></p>
          <ul>
            ${validacion.faltantes.length ? html`<li>${validacion.faltantes.length} indicador(es) sin responder</li>` : ''}
            ${crudo(validacion.bloqueos.map((bloqueo) => html`<li>${bloqueo}</li>`).join(''))}
          </ul>
        </div>
      `}

      ${validacion.coherencia.length ? html`
        <div class="nota nota--info">
          <p><strong>Revise la coherencia:</strong></p>
          <ul>${crudo(validacion.coherencia.map((aviso) => html`<li>${aviso}</li>`).join(''))}</ul>
        </div>
      ` : ''}

      ${puedeEscribir ? html`
        <div class="pila pila--chica">
          <button type="button" class="btn btn--bloque" data-accion="guardar">Guardar avance</button>
          <button type="button" class="btn btn--primario btn--bloque" data-accion="cerrar"
                  ${crudo(validacion.puedeCerrar ? '' : 'disabled')}>Cerrar evaluacion</button>
        </div>
      ` : ''}
    </aside>
  `;
}

// --- Modo diligenciamiento ---------------------------------------------------

/** Aviso cuando la parametrizacion relajo la exigencia documental de la norma. */
const avisoRelajacion = (relajaciones) =>
  relajaciones?.length
    ? html`
      <div class="nota nota--alerta">
        <p><strong>Esta visita se califica con la exigencia documental relajada.</strong></p>
        <ul>${relajaciones.map((texto) => html`<li>${texto}</li>`)}</ul>
        <p class="pequeno">Configurado en Parametrizacion. Para una visita oficial debe exigirse el soporte completo.</p>
      </div>
    `
    : '';

function vistaDiligenciamiento(detalle, puedeEscribir) {
  const bloqueado = !puedeEscribir;
  const porGrupo = {};

  for (const codigo of detalle.indicadores) {
    const indicador = store.indicador(codigo);
    if (!indicador) continue;
    (porGrupo[indicador.grupo] ??= []).push(indicador);
  }

  const gruposDisponibles = ['MBA', 'MBR', 'MBG'].filter((grupo) => porGrupo[grupo]?.length);
  if (!gruposDisponibles.includes(grupoActivo)) grupoActivo = gruposDisponibles[0];

  const respuestasPorCodigo = Object.fromEntries(detalle.respuestas.map((r) => [r.indicador, r]));
  const deEsteGrupo = porGrupo[grupoActivo] ?? [];

  return html`
    ${avisoRelajacion(detalle.relajaciones)}
    ${crudo(panelInspeccion(detalle, bloqueado))}

    <div class="rejilla-evaluacion">
      <div class="pila">
        <div class="pestanas" role="tablist">
          ${crudo(gruposDisponibles.map((grupo) => {
            const total = porGrupo[grupo].length;
            const respondidos = porGrupo[grupo].filter((ind) => respuestasPorCodigo[ind.codigo]?.valor != null).length;
            return html`
              <button type="button" class="pestana" role="tab" data-grupo="${grupo}"
                      aria-selected="${grupo === grupoActivo}">
                ${grupo}
                <span class="pestana__conteo">${respondidos}/${total}</span>
              </button>
            `;
          }).join(''))}
        </div>

        <p class="pequeno tenue">
          ${GRUPO_NOMBRE[grupoActivo]} &middot; peso ${detalle.pesos[grupoActivo]} % de la calificacion final
        </p>

        <div class="pila" id="lista-indicadores">
          ${crudo(deEsteGrupo.map((indicador) =>
            tarjetaIndicador(indicador, respuestasPorCodigo[indicador.codigo], { bloqueado, evaluacion: detalle })
          ).join(''))}
        </div>
      </div>

      ${crudo(panelPuntaje(detalle, puedeEscribir))}
    </div>
  `;
}

// --- Modo forma oficial ------------------------------------------------------

function vistaFormaOficial(detalle, puedeGestionarPlan) {
  const { resumen } = detalle;
  const criticos = detalle.respuestas.filter((r) => r.valor === 0);
  const esProvisional = detalle.forma === 'provisional';

  const porGrupoCriticos = {};
  for (const respuesta of criticos) {
    (porGrupoCriticos[respuesta.grupo] ??= []).push(respuesta);
  }

  return html`
    ${esProvisional ? html`
      <div class="nota nota--alerta no-imprimir">
        <p><strong>Forma provisional.</strong> Hay un dia habil para subsanar los documentos pendientes.
        Cuando esten completos, emita la forma definitiva.</p>
        ${puedeGestionarPlan ? html`
          <button type="button" class="btn btn--chico" data-accion="definitiva" style="margin-top:.5rem">
            Emitir forma definitiva
          </button>
        ` : ''}
      </div>
    ` : ''}

    ${avisoRelajacion(detalle.resultado?.relajaciones ?? detalle.relajaciones)}

    <div class="forma-oficial">
      <section class="panel">
        <h2>Datos generales de la visita</h2>
        <dl class="datos">
          <div><dt>Codigo</dt><dd class="mono">${detalle.codigo}</dd></div>
          <div><dt>Predio</dt><dd>${detalle.predio?.nombre ?? '—'}</dd></div>
          <div><dt>Ubicacion</dt><dd>${detalle.predio?.municipio}, ${detalle.predio?.departamento}</dd></div>
          <div><dt>Sistema</dt><dd>${detalle.sistema === 'piso' ? 'Piso' : 'Jaula'}</dd></div>
          <div><dt>Numero de aves</dt><dd>${entero(detalle.totalAves)}</dd></div>
          <div><dt>Fecha de visita</dt><dd>${fecha(detalle.fechaVisita, { largo: true })}</dd></div>
          <div><dt>Evaluador</dt><dd>${detalle.evaluador ?? '—'}</dd></div>
          <div><dt>Cerrada</dt><dd>${fechaHora(detalle.cerradaEn)}</dd></div>
          <div><dt>Indicadores</dt><dd>${detalle.indicadores.length}</dd></div>
          <div><dt>Ponderacion</dt><dd>${['MBA', 'MBR', 'MBG'].map((g) => detalle.pesos[g]).join(' / ')}</dd></div>
          <div><dt>Catalogo</dt><dd class="mono pequeno">${detalle.versionCatalogo}</dd></div>
          <div><dt>Semilla de muestra</dt><dd class="mono pequeno">${detalle.inspeccion?.semilla ?? '—'}</dd></div>
        </dl>
      </section>

      <div class="rejilla rejilla--2">
        <section class="panel pila">
          <p class="encabezillo">Calificacion final</p>
          <div class="fila" style="align-items:baseline">
            <span class="puntaje-grande">${numero(detalle.calificacion)}</span>
            ${crudo(insigniaNivel(detalle.nivel))}
          </div>
          <div class="pila pila--chica">
            ${crudo(['MBA', 'MBR', 'MBG'].map((grupo) => {
              const dato = resumen.grupos[grupo];
              return html`
                <div class="linea-grupo">
                  <span class="mono">${grupo}</span>
                  <div class="linea-grupo__pista">
                    <div class="linea-grupo__relleno" style="width:${dato.promedio ?? 0}%"></div>
                  </div>
                  <span>${dato.total ? `${numero(dato.promedio)} % x ${dato.peso} % = ${numero(dato.aporte)}` : 'no aplica'}</span>
                </div>
              `;
            }).join(''))}
          </div>
        </section>

        <section class="panel">
          <h2>Indicadores criticos</h2>
          ${criticos.length
            ? crudo(Object.entries(porGrupoCriticos).map(([grupo, lista]) => html`
                <p class="encabezillo" style="margin:.6rem 0 .3rem">${grupo}</p>
                <div class="pila pila--chica">
                  ${crudo(lista.map((respuesta) => html`
                    <div class="fila">
                      <span class="insignia insignia--error">0</span>
                      <span class="mono">${respuesta.indicador}</span>
                      <span class="pequeno">${store.indicador(respuesta.indicador)?.nombre ?? ''}</span>
                    </div>
                  `).join(''))}
                </div>
              `).join(''))
            : html`<p class="nota nota--ok">No hay indicadores criticos en esta evaluacion.</p>`}
        </section>
      </div>

      <section class="panel">
        <div class="panel__cabeza">
          <h2>Recomendaciones</h2>
          ${puedeGestionarPlan ? html`
            <button type="button" class="btn btn--chico no-imprimir" data-accion="regenerar-recomendaciones">
              Regenerar propuestas
            </button>
          ` : ''}
        </div>
        ${detalle.recomendaciones.length
          ? html`<div class="pila pila--chica">
              ${crudo(detalle.recomendaciones.map((rec) => tarjetaRecomendacion(rec, puedeGestionarPlan)).join(''))}
            </div>`
          : vacio({
              icono: '○',
              titulo: 'Sin recomendaciones',
              mensaje: 'Se proponen automaticamente para cada indicador por debajo de 100.'
            })}
      </section>

      <section class="panel">
        <div class="panel__cabeza">
          <h2>Plan de mejora</h2>
          ${detalle.acciones.length
            ? crudo(detalle.acciones.every((a) => a.estado === 'cumplida')
                ? '<span class="insignia insignia--ok">Plan cerrado</span>'
                : '<span class="insignia insignia--alerta">Plan abierto</span>')
            : ''}
        </div>
        ${detalle.acciones.length
          ? html`
            <div class="tabla-envoltura">
              <table>
                <thead>
                  <tr>
                    <th scope="col">Accion</th>
                    <th scope="col">Responsable</th>
                    <th scope="col">Fecha limite</th>
                    <th scope="col">Estado</th>
                    <th scope="col" class="num">Avance</th>
                  </tr>
                </thead>
                <tbody>
                  ${crudo(detalle.acciones.map((accion) => html`
                    <tr>
                      <td>${accion.descripcion}</td>
                      <td>${accion.responsable}</td>
                      <td class="mono compacta">${fecha(accion.fechaLimite)}</td>
                      <td class="compacta">${accion.estado}</td>
                      <td class="num">${accion.avance} %</td>
                    </tr>
                  `).join(''))}
                </tbody>
              </table>
            </div>
          `
          : html`<p class="tenue pequeno">Sin acciones. Apruebe una recomendacion y conviertala en accion del plan.</p>`}
      </section>

      <section class="panel">
        <h2>Detalle por indicador</h2>
        <div class="tabla-envoltura">
          <table>
            <thead>
              <tr>
                <th scope="col">Codigo</th>
                <th scope="col">Indicador</th>
                <th scope="col">Respuesta registrada</th>
                <th scope="col" class="num">Puntaje</th>
              </tr>
            </thead>
            <tbody>
              ${crudo(detalle.respuestas.map((respuesta) => {
                const indicador = store.indicador(respuesta.indicador);
                const nivel = indicador?.niveles.find(([puntos]) => puntos === respuesta.valor);
                const crudoTexto = respuesta.valorCrudo
                  ? Object.entries(respuesta.valorCrudo)
                      .filter(([clave]) => clave !== 'competencia')
                      .map(([clave, valor]) => `${clave}: ${valor}`)
                      .join(' · ')
                  : '';
                return html`
                  <tr>
                    <td class="mono compacta">${respuesta.indicador}</td>
                    <td>${indicador?.nombre ?? ''}</td>
                    <td class="pequeno">
                      ${nivel?.[1] ?? '—'}
                      ${crudoTexto ? html`<br><span class="tenue mono diminuto">${crudoTexto}</span>` : ''}
                      ${respuesta.observacion ? html`<br><span class="tenue">Obs.: ${respuesta.observacion}</span>` : ''}
                      ${respuesta.evidenciaNombre ? html`<br><span class="tenue">Soporte: ${respuesta.evidenciaNombre}</span>` : ''}
                    </td>
                    <td class="num">${crudo(insigniaPuntaje(respuesta.valor))}</td>
                  </tr>
                `;
              }).join(''))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  `;
}

function tarjetaRecomendacion(rec, puedeGestionar) {
  const tonoPrioridad = { Alta: 'error', Media: 'alerta', Baja: 'marca' }[rec.prioridad] ?? '';
  const indicador = store.indicador(rec.indicador);

  return html`
    <div class="tarjeta-recomendacion" data-estado="${rec.estado}" data-rec="${rec.id}">
      <div class="fila fila--entre">
        <div class="fila">
          <span class="insignia insignia--${tonoPrioridad}">Prioridad ${rec.prioridad.toLowerCase()}</span>
          <span class="mono">${rec.indicador}</span>
          <span class="pequeno tenue">${indicador?.nombre ?? ''}</span>
        </div>
        <span class="insignia ${rec.estado === 'aprobada' ? 'insignia--ok' : ''}">
          ${rec.estado.charAt(0).toUpperCase() + rec.estado.slice(1)}
        </span>
      </div>

      ${rec.estado === 'pendiente' && puedeGestionar
        ? html`<textarea data-texto-rec="${rec.id}" rows="3">${rec.texto}</textarea>`
        : html`<p>${rec.texto}</p>`}

      ${rec.texto !== rec.textoOriginal
        ? html`<p class="pequeno tenue">Texto original: ${rec.textoOriginal}</p>`
        : ''}

      ${puedeGestionar && rec.estado === 'pendiente' ? html`
        <div class="fila no-imprimir">
          <button type="button" class="btn btn--chico btn--primario" data-accion="aprobar-rec" data-id="${rec.id}">Aprobar</button>
          <button type="button" class="btn btn--chico" data-accion="descartar-rec" data-id="${rec.id}">Descartar</button>
        </div>
      ` : ''}

      ${puedeGestionar && rec.estado === 'aprobada' && !rec.accionId ? html`
        <div class="fila no-imprimir">
          <button type="button" class="btn btn--chico" data-accion="crear-accion" data-id="${rec.id}">
            Convertir en accion del plan
          </button>
        </div>
      ` : ''}

      ${rec.accionId ? html`<p class="pequeno tenue">Ya esta en el plan de mejora.</p>` : ''}
    </div>
  `;
}

// --- Render principal --------------------------------------------------------

export async function render({ parametros }) {
  const detalle = await api.evaluaciones.obtener(Number(parametros.id));
  const esDueno = detalle.usuarioId === store.usuario.id;
  const puedeEscribir =
    puede(store.usuario.rol, 'evaluaciones', 'w') &&
    (esDueno || store.usuario.rol === 'admin') &&
    detalle.estado === 'en_progreso';
  const puedeGestionarPlan = puede(store.usuario.rol, 'planes', 'w');

  const acciones = detalle.estado === 'cerrada'
    ? html`
        <button type="button" class="btn" data-accion="imprimir">Imprimir / PDF</button>
        <button type="button" class="btn" data-accion="markdown">Descargar .md</button>
        <button type="button" class="btn" data-accion="csv">Descargar CSV</button>
      `
    : '';

  return html`
    ${crudo(cabecera({
      migas: migas([
        { texto: 'Evaluaciones', href: '/evaluaciones' },
        { texto: detalle.codigo }
      ]),
      encabezillo: detalle.estado === 'cerrada'
        ? `Forma oficial · ${detalle.forma ?? ''}`
        : `Visita en progreso · ${fecha(detalle.fechaVisita)}`,
      titulo: detalle.predio?.nombre ?? detalle.codigo,
      descripcion: `${detalle.sistema === 'piso' ? 'Piso' : 'Jaula'} · ${entero(detalle.totalAves)} aves · ${detalle.predio?.municipio ?? ''}, ${detalle.predio?.departamento ?? ''} · Evaluador: ${detalle.evaluador ?? ''}`,
      acciones
    }))}

    ${detalle.estado === 'anulada' ? html`
      <div class="nota nota--error">
        <p><strong>Evaluacion anulada</strong> el ${fechaHora(detalle.anuladaEn)}.</p>
        <p>Motivo: ${detalle.motivoAnulacion}</p>
      </div>
    ` : ''}

    ${detalle.estado === 'cerrada'
      ? crudo(vistaFormaOficial(detalle, puedeGestionarPlan))
      : crudo(vistaDiligenciamiento(detalle, puedeEscribir))}
  `;
}

// --- Interaccion -------------------------------------------------------------

/** Lee de una tarjeta todos los campos y arma la respuesta para el servidor. */
function leerTarjeta(tarjeta) {
  const codigo = tarjeta.dataset.indicador;
  const indicador = store.indicador(codigo);
  const valorDe = (campo) => tarjeta.querySelector(`[data-campo="${campo}"]`);
  const num = (campo) => {
    const elemento = valorDe(campo);
    return elemento && elemento.value !== '' ? Number(elemento.value) : null;
  };

  const respuesta = { indicador: codigo };
  const observacion = valorDe('observacion');
  if (observacion) respuesta.observacion = observacion.value;

  const muestras = valorDe('muestras');
  if (muestras && muestras.value.trim()) {
    respuesta.muestras = muestras.value
      .split(/[,\s]+/)
      .filter(Boolean)
      .map(Number);
  }

  const docVigencia = valorDe('docVigencia');
  if (docVigencia) {
    respuesta.documento = {
      vigenciaHasta: docVigencia.value || null,
      firmado: valorDe('docFirmado')?.checked ?? false,
      legible: valorDe('docLegible')?.checked ?? false,
      matricula: valorDe('docMatricula')?.value || null
    };
  }

  switch (indicador?.captura) {
    case TIPO_CAPTURA.PORCENTAJE:
    case TIPO_CAPTURA.DOCUMENTAL_PORCENTAJE:
      respuesta.valorCrudo = { porcentaje: num('porcentaje') };
      break;
    case TIPO_CAPTURA.DENSIDAD_JAULA:
      respuesta.valorCrudo = { at: num('at'), ta: num('ta'), aj: num('aj'), tg: num('tg') };
      break;
    case TIPO_CAPTURA.DENSIDAD_PISO:
      respuesta.valorCrudo = { aves: num('aves'), metrosCuadrados: num('metrosCuadrados') };
      break;
    case TIPO_CAPTURA.RATIO_BEBEDERO:
      respuesta.valorCrudo = { animales: num('animales'), unidades: num('unidades'), limite: num('limite') };
      break;
    case TIPO_CAPTURA.RATIO_COMEDERO:
      respuesta.valorCrudo = {
        animales: num('animales'), unidades: num('unidades'), limite: num('limite'),
        competencia: valorDe('competencia')?.checked ?? false
      };
      break;
    default: {
      const elegido = tarjeta.querySelector('[data-campo="nivel"]:checked');
      respuesta.valor = elegido ? Number(elegido.value) : null;
    }
  }

  return respuesta;
}

const tarjetasConCambios = new Set();

export function montar(raiz, { parametros, recargar }) {
  const evaluacionId = Number(parametros.id);
  tarjetasConCambios.clear();

  // --- Cambio de grupo ---
  delegar(raiz, 'click', '[data-grupo]', (_ev, boton) => {
    grupoActivo = boton.dataset.grupo;
    recargar();
  });

  // --- Marcado de cambios pendientes ---
  const alCambiarCampo = (ev) => {
    const tarjeta = ev.target.closest('[data-indicador]');
    if (tarjeta) tarjetasConCambios.add(tarjeta.dataset.indicador);
  };
  raiz.addEventListener('input', alCambiarCampo);
  raiz.addEventListener('change', alCambiarCampo);

  const guardar = async ({ silencioso = false } = {}) => {
    const tarjetas = [...raiz.querySelectorAll('[data-indicador]')]
      .filter((tarjeta) => tarjetasConCambios.has(tarjeta.dataset.indicador));

    if (!tarjetas.length) {
      if (!silencioso) avisarOk('No hay cambios por guardar.');
      return true;
    }

    try {
      await api.evaluaciones.guardarRespuestas(evaluacionId, tarjetas.map(leerTarjeta));
      tarjetasConCambios.clear();
      if (!silencioso) avisarOk('Avance guardado.');
      return true;
    } catch (error) {
      avisarError(error.message);
      return false;
    }
  };

  delegar(raiz, 'click', '[data-accion="guardar"]', async (_ev, boton) => {
    await conBotonOcupado(boton, async () => {
      if (await guardar()) recargar();
    });
  });

  // --- Inspeccion ---
  delegar(raiz, 'change', '[data-inspeccion]', async (ev, campo) => {
    const clave = campo.dataset.inspeccion;
    const valor = campo.type === 'checkbox' ? campo.checked : campo.value;
    try {
      await api.evaluaciones.actualizarInspeccion(evaluacionId, { [clave]: valor });
    } catch (error) {
      avisarError(error.message);
      recargar();
    }
  });

  delegar(raiz, 'click', '[data-accion="generar-muestra"]', async (_ev, boton) => {
    await conBotonOcupado(boton, async () => {
      try {
        const resultado = await api.evaluaciones.generarMuestra(evaluacionId);
        avisarOk(`Muestra generada: ${resultado.inspeccion.corrales.length} corrales, ${resultado.inspeccion.puntos.length} puntos, ${resultado.inspeccion.aves.length} aves.`);
        recargar();
      } catch (error) {
        avisarError(error.message);
      }
    });
  });

  // --- Evidencias ---
  delegar(raiz, 'change', '[data-subir-evidencia]', async (_ev, campo) => {
    const archivo = campo.files?.[0];
    if (!archivo) return;

    const tarjeta = campo.closest('[data-indicador]');
    const datos = new FormData();
    datos.append('archivo', archivo);
    datos.append('indicador', campo.dataset.indicador);

    const vigencia = tarjeta?.querySelector('[data-campo="docVigencia"]')?.value;
    const matricula = tarjeta?.querySelector('[data-campo="docMatricula"]')?.value;
    if (vigencia) datos.append('vigenciaHasta', vigencia);
    if (matricula) datos.append('matricula', matricula);
    datos.append('firmado', String(tarjeta?.querySelector('[data-campo="docFirmado"]')?.checked ?? false));
    datos.append('legible', String(tarjeta?.querySelector('[data-campo="docLegible"]')?.checked ?? false));

    campo.disabled = true;
    try {
      await api.evaluaciones.subirEvidencia(evaluacionId, datos);
      avisarOk(`Evidencia adjuntada (${bytes(archivo.size)}).`);
      recargar();
    } catch (error) {
      avisarError(error.message);
      campo.value = '';
      campo.disabled = false;
    }
  });

  delegar(raiz, 'click', '[data-accion="descargar-evidencia"]', async (_ev, boton) => {
    try {
      await descargar(api.evidencias.urlDescarga(boton.dataset.id), boton.dataset.nombre);
    } catch (error) {
      avisarError(error.message);
    }
  });

  delegar(raiz, 'click', '[data-accion="quitar-evidencia"]', async (_ev, boton) => {
    const confirmado = await confirmar({
      titulo: 'Quitar evidencia',
      mensaje: 'La evidencia dejara de estar vinculada al indicador. El archivo se conserva para la auditoria.',
      textoConfirmar: 'Quitar',
      peligroso: true
    });
    if (!confirmado) return;

    try {
      await api.evidencias.eliminar(Number(boton.dataset.id));
      avisarOk('Evidencia retirada.');
      recargar();
    } catch (error) {
      avisarError(error.message);
    }
  });

  // --- Cierre ---
  delegar(raiz, 'click', '[data-accion="cerrar"]', async (_ev, boton) => {
    await conBotonOcupado(boton, async () => {
      if (!(await guardar({ silencioso: true }))) return;

      let validacion;
      try {
        validacion = await api.evaluaciones.validar(evaluacionId);
      } catch (error) {
        avisarError(error.message);
        return;
      }

      if (!validacion.puedeCerrar) {
        avisarAlerta('La evaluacion aun no cumple los requisitos para cerrarse.');
        recargar();
        return;
      }

      const confirmado = await confirmar({
        titulo: 'Cerrar evaluacion',
        mensaje: validacion.avisos.length
          ? `Se cerrara con ${validacion.avisos.length} aviso(s) documental(es) y quedara como forma provisional. Una vez cerrada no se puede modificar.`
          : 'Se calculara la calificacion final y la evaluacion quedara inmutable como forma provisional.',
        textoConfirmar: 'Cerrar evaluacion'
      });
      if (!confirmado) return;

      try {
        const resultado = await api.evaluaciones.cerrar(evaluacionId);
        avisarOk(`Evaluacion cerrada: ${numero(resultado.calificacion)} puntos, nivel ${resultado.nivel}.`);
        recargar();
      } catch (error) {
        avisarError(error.message);
        recargar();
      }
    });
  });

  delegar(raiz, 'click', '[data-accion="definitiva"]', async (_ev, boton) => {
    const confirmado = await confirmar({
      titulo: 'Emitir forma definitiva',
      mensaje: 'La forma dejara de ser provisional. Confirme que los documentos pendientes fueron subsanados.',
      textoConfirmar: 'Emitir definitiva'
    });
    if (!confirmado) return;

    await conBotonOcupado(boton, async () => {
      try {
        await api.evaluaciones.emitirDefinitiva(evaluacionId);
        avisarOk('Forma definitiva emitida.');
        recargar();
      } catch (error) {
        avisarError(error.message);
      }
    });
  });

  // --- Recomendaciones ---
  delegar(raiz, 'click', '[data-accion="regenerar-recomendaciones"]', async (_ev, boton) => {
    await conBotonOcupado(boton, async () => {
      try {
        const lista = await api.planes.generarRecomendaciones(evaluacionId);
        avisarOk(`${lista.length} recomendacion(es) propuesta(s).`);
        recargar();
      } catch (error) {
        avisarError(error.message);
      }
    });
  });

  const decidir = async (id, estado) => {
    const texto = raiz.querySelector(`[data-texto-rec="${id}"]`)?.value;
    try {
      await api.planes.decidirRecomendacion(Number(id), estado, texto);
      avisarOk(estado === 'aprobada' ? 'Recomendacion aprobada.' : 'Recomendacion descartada.');
      recargar();
    } catch (error) {
      avisarError(error.message);
    }
  };

  delegar(raiz, 'click', '[data-accion="aprobar-rec"]', (_ev, boton) => decidir(boton.dataset.id, 'aprobada'));
  delegar(raiz, 'click', '[data-accion="descartar-rec"]', (_ev, boton) => decidir(boton.dataset.id, 'descartada'));

  delegar(raiz, 'click', '[data-accion="crear-accion"]', async (_ev, boton) => {
    const recomendacionId = Number(boton.dataset.id);
    const hoyTexto = new Date().toLocaleDateString('en-CA');

    const datos = await abrirModal({
      titulo: 'Nueva accion del plan de mejora',
      contenido: html`
        <div class="pila pila--chica">
          <label>Accion concreta
            <input id="accion-descripcion" required minlength="10" placeholder="Que se va a hacer">
          </label>
          <label>Responsable
            <input id="accion-responsable" required minlength="3" placeholder="Quien lo ejecuta">
          </label>
          <label>Fecha limite
            <input id="accion-fecha" type="date" min="${hoyTexto}" required>
          </label>
          <p class="nota nota--error" id="accion-error" hidden></p>
        </div>
      `,
      acciones: [
        { texto: 'Cancelar', valor: null },
        {
          texto: 'Crear accion',
          clase: 'btn--primario',
          alPulsar: (capa) => {
            const descripcion = capa.querySelector('#accion-descripcion').value.trim();
            const responsable = capa.querySelector('#accion-responsable').value.trim();
            const fechaLimite = capa.querySelector('#accion-fecha').value;
            const error = capa.querySelector('#accion-error');

            if (descripcion.length < 10) {
              error.textContent = 'Describa la accion con al menos 10 caracteres.';
              error.hidden = false;
              return false;
            }
            if (responsable.length < 3) {
              error.textContent = 'Indique el responsable.';
              error.hidden = false;
              return false;
            }
            if (!fechaLimite) {
              error.textContent = 'Indique la fecha limite.';
              error.hidden = false;
              return false;
            }
            return { descripcion, responsable, fechaLimite };
          }
        }
      ]
    });

    if (!datos) return;

    try {
      await api.planes.crearAccion({ recomendacionId, ...datos });
      avisarOk('Accion agregada al plan de mejora.');
      recargar();
    } catch (error) {
      avisarError(error.message);
    }
  });

  // --- Exportaciones ---
  delegar(raiz, 'click', '[data-accion="imprimir"]', () => window.print());

  delegar(raiz, 'click', '[data-accion="csv"]', async (_ev, boton) => {
    await conBotonOcupado(boton, async () => {
      try {
        await descargar(api.evaluaciones.urlCsv(evaluacionId), 'indicadores.csv');
      } catch (error) {
        avisarError(error.message);
      }
    });
  });

  delegar(raiz, 'click', '[data-accion="markdown"]', async (_ev, boton) => {
    await conBotonOcupado(boton, async () => {
      try {
        await descargar(api.evaluaciones.urlMarkdown(evaluacionId), 'forma-oficial.md');
        avisarOk('Reporte descargado en Markdown.');
      } catch (error) {
        avisarError(error.message);
      }
    });
  });

  // --- Aviso al salir con cambios sin guardar ---
  const alSalir = (ev) => {
    if (!tarjetasConCambios.size) return;
    ev.preventDefault();
    ev.returnValue = '';
  };
  window.addEventListener('beforeunload', alSalir);

  return () => {
    window.removeEventListener('beforeunload', alSalir);
    raiz.removeEventListener('input', alCambiarCampo);
    raiz.removeEventListener('change', alCambiarCampo);
  };
}
