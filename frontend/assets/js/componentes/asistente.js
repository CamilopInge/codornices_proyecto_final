/**
 * Asistente de consulta: panel flotante disponible en toda la aplicacion.
 *
 * Se monta una sola vez, fuera del contenedor de vistas, de modo que la
 * conversacion sobrevive al cambio de pantalla. El historial vive en memoria y
 * se pierde al recargar: son consultas de apoyo, no un registro que convenga
 * conservar en el navegador.
 */

import { html, crudo, escapar } from '../core/dom.js';
import { api } from '../core/api.js';
import { avisarError } from '../core/ui.js';

const CLAVE_ABIERTO = 'evalcodorniz.asistente.abierto';
const MAXIMO_CARACTERES = 500;

let montado = false;
let estadoServicio = null;
const conversacion = [];

const SUGERENCIAS = [
  'Cuantos predios activos hay',
  'Cual es la calificacion promedio',
  'Que indicadores fallan mas',
  'Hay acciones de mejora atrasadas'
];

// --- Persistencia del panel abierto o cerrado -------------------------------

const leerAbierto = () => {
  try { return localStorage.getItem(CLAVE_ABIERTO) === '1'; } catch { return false; }
};
const guardarAbierto = (abierto) => {
  try { localStorage.setItem(CLAVE_ABIERTO, abierto ? '1' : '0'); } catch { /* sin almacenamiento */ }
};

// --- Presentacion de los mensajes -------------------------------------------

/**
 * Convierte la respuesta a HTML seguro.
 * Solo se reconocen listas con guion, negrita y saltos de parrafo: lo justo
 * para que una respuesta se lea bien, sin interpretar Markdown arbitrario que
 * venga de un modelo.
 */
function formatearRespuesta(texto) {
  const bloques = String(texto).trim().split(/\n{2,}/);

  return bloques.map((bloque) => {
    const lineas = bloque.split('\n').map((l) => l.trim()).filter(Boolean);
    const esLista = lineas.length > 1 && lineas.every((l) => /^[-*•]\s+/.test(l));

    if (esLista) {
      const elementos = lineas
        .map((l) => `<li>${negrita(l.replace(/^[-*•]\s+/, ''))}</li>`)
        .join('');
      return `<ul>${elementos}</ul>`;
    }
    return `<p>${lineas.map(negrita).join('<br>')}</p>`;
  }).join('');
}

/** Interpreta **negrita** sobre texto ya escapado. */
function negrita(linea) {
  return escapar(linea).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
}

function pintarMensajes(lista) {
  if (!conversacion.length) {
    lista.innerHTML = html`
      <div class="asistente__bienvenida">
        <p class="asistente__titulo-bienvenida">Pregunte sobre los datos del sistema</p>
        <p class="pequeno tenue">
          Respondo sobre predios, evaluaciones, indicadores ICA, planes de mejora y reportes.
          No respondo nada fuera de eso.
        </p>
        <div class="asistente__sugerencias">
          ${SUGERENCIAS.map((texto) => html`
            <button type="button" class="asistente__sugerencia" data-sugerencia="${texto}">${texto}</button>
          `)}
        </div>
      </div>
    `;
    return;
  }

  lista.innerHTML = conversacion.map((mensaje) => {
    if (mensaje.rol === 'usuario') {
      return html`<div class="asistente__mensaje asistente__mensaje--usuario"><p>${mensaje.texto}</p></div>`;
    }

    if (mensaje.pensando) {
      return html`
        <div class="asistente__mensaje asistente__mensaje--asistente">
          <div class="asistente__pensando" aria-label="Consultando">
            <span></span><span></span><span></span>
          </div>
        </div>
      `;
    }

    const clase = mensaje.error
      ? 'asistente__mensaje--error'
      : mensaje.fueraDeAlcance
        ? 'asistente__mensaje--limite'
        : 'asistente__mensaje--asistente';

    return html`
      <div class="asistente__mensaje ${clase}">
        ${crudo(formatearRespuesta(mensaje.texto))}
        ${mensaje.datosUsados?.length
          ? html`<p class="asistente__fuente">Basado en: ${mensaje.datosUsados.join(', ')}</p>`
          : ''}
      </div>
    `;
  }).join('');

  lista.scrollTop = lista.scrollHeight;
}

// --- Estructura del panel ----------------------------------------------------

function plantilla() {
  const abierto = leerAbierto();

  return html`
    <button type="button" class="asistente__lanzador" data-asistente="alternar"
            aria-expanded="${abierto}" aria-controls="asistente-panel"
            title="Asistente de consulta">
      <span class="asistente__lanzador-icono" aria-hidden="true">?</span>
      <span class="solo-lectores">Abrir el asistente de consulta</span>
    </button>

    <section id="asistente-panel" class="asistente__panel" role="dialog"
             aria-label="Asistente de consulta" ${crudo(abierto ? '' : 'hidden')}>
      <header class="asistente__cabecera">
        <div>
          <p class="asistente__nombre">Asistente de consulta</p>
          <p class="asistente__estado" data-asistente="estado">Comprobando...</p>
        </div>
        <button type="button" class="asistente__cerrar" data-asistente="cerrar" aria-label="Cerrar el asistente">
          &times;
        </button>
      </header>

      <div class="asistente__mensajes" data-asistente="mensajes" role="log" aria-live="polite"></div>

      <form class="asistente__entrada" data-asistente="formulario">
        <label class="solo-lectores" for="asistente-pregunta">Escriba su pregunta</label>
        <textarea id="asistente-pregunta" data-asistente="pregunta" rows="1"
                  maxlength="${MAXIMO_CARACTERES}" placeholder="Escriba su pregunta..."
                  autocomplete="off"></textarea>
        <button type="submit" class="btn btn--primario btn--chico" data-asistente="enviar">Enviar</button>
      </form>

      <p class="asistente__pie">
        Responde solo con los datos de este sistema y segun sus permisos.
        Verifique las cifras antes de usarlas en un documento oficial.
      </p>
    </section>
  `;
}

// --- Comportamiento ----------------------------------------------------------

async function preguntar(texto, nodos) {
  conversacion.push({ rol: 'usuario', texto });
  conversacion.push({ rol: 'asistente', pensando: true });
  pintarMensajes(nodos.mensajes);

  nodos.pregunta.value = '';
  nodos.pregunta.style.height = 'auto';
  nodos.enviar.disabled = true;

  // Solo se reenvian los turnos completos, no el marcador "pensando".
  const historial = conversacion
    .filter((m) => !m.pensando && !m.error)
    .slice(0, -1)
    .slice(-6)
    .map((m) => ({ rol: m.rol, texto: m.texto }));

  try {
    const respuesta = await api.asistente.preguntar(texto, historial);
    conversacion.pop();
    conversacion.push({
      rol: 'asistente',
      texto: respuesta.respuesta,
      datosUsados: respuesta.datosUsados,
      fueraDeAlcance: !respuesta.enAlcance
    });
  } catch (error) {
    conversacion.pop();
    conversacion.push({ rol: 'asistente', texto: error.message, error: true });
  } finally {
    nodos.enviar.disabled = false;
    pintarMensajes(nodos.mensajes);
    nodos.pregunta.focus();
  }
}

async function cargarEstado(nodos) {
  try {
    estadoServicio = await api.asistente.estado();
  } catch {
    estadoServicio = { habilitado: false, mensajeSinConfigurar: 'No se pudo consultar el estado del asistente.' };
  }

  if (estadoServicio.habilitado) {
    nodos.estado.textContent = 'Listo para consultar';
    nodos.estado.dataset.tono = 'ok';
    return;
  }

  nodos.estado.textContent = 'No configurado';
  nodos.estado.dataset.tono = 'alerta';
  nodos.pregunta.disabled = true;
  nodos.enviar.disabled = true;
  nodos.pregunta.placeholder = 'Asistente no disponible';

  nodos.mensajes.innerHTML = html`
    <div class="asistente__bienvenida">
      <p class="asistente__titulo-bienvenida">Asistente no configurado</p>
      <p class="pequeno tenue">${estadoServicio.mensajeSinConfigurar}</p>
      <p class="pequeno tenue">Consulte <code class="mono">docs/ASISTENTE-IA.md</code> para habilitarlo.</p>
    </div>
  `;
}

/** Monta el asistente. Idempotente: llamarlo de nuevo no duplica nada. */
export function montarAsistente() {
  if (montado) return;

  const contenedor = document.createElement('div');
  contenedor.className = 'asistente no-imprimir';
  contenedor.innerHTML = plantilla();
  document.body.append(contenedor);
  montado = true;

  const nodos = {
    panel: contenedor.querySelector('#asistente-panel'),
    lanzador: contenedor.querySelector('[data-asistente="alternar"]'),
    estado: contenedor.querySelector('[data-asistente="estado"]'),
    mensajes: contenedor.querySelector('[data-asistente="mensajes"]'),
    formulario: contenedor.querySelector('[data-asistente="formulario"]'),
    pregunta: contenedor.querySelector('[data-asistente="pregunta"]'),
    enviar: contenedor.querySelector('[data-asistente="enviar"]')
  };

  const alternar = (abrir) => {
    const visible = abrir ?? nodos.panel.hidden;
    nodos.panel.hidden = !visible;
    nodos.lanzador.setAttribute('aria-expanded', String(visible));
    guardarAbierto(visible);
    if (visible) nodos.pregunta.focus();
  };

  nodos.lanzador.addEventListener('click', () => alternar());
  contenedor.querySelector('[data-asistente="cerrar"]').addEventListener('click', () => alternar(false));

  // El textarea crece con el texto, hasta un tope.
  nodos.pregunta.addEventListener('input', () => {
    nodos.pregunta.style.height = 'auto';
    nodos.pregunta.style.height = `${Math.min(nodos.pregunta.scrollHeight, 120)}px`;
  });

  // Enter envia; Mayus+Enter hace salto de linea.
  nodos.pregunta.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter' && !ev.shiftKey) {
      ev.preventDefault();
      nodos.formulario.requestSubmit();
    }
  });

  nodos.formulario.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const texto = nodos.pregunta.value.trim();
    if (!texto || nodos.enviar.disabled) return;
    preguntar(texto, nodos);
  });

  contenedor.addEventListener('click', (ev) => {
    const sugerencia = ev.target.closest('[data-sugerencia]');
    if (sugerencia) preguntar(sugerencia.dataset.sugerencia, nodos);
  });

  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape' && !nodos.panel.hidden) alternar(false);
  });

  pintarMensajes(nodos.mensajes);
  cargarEstado(nodos);
}

/** Lo retira al cerrar sesion, para no dejar la conversacion de otra persona. */
export function desmontarAsistente() {
  document.querySelector('.asistente')?.remove();
  conversacion.length = 0;
  estadoServicio = null;
  montado = false;
}
