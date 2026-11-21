/**
 * Piezas de interfaz transversales: avisos flotantes, modales de confirmacion,
 * estados de carga y formateo para presentacion.
 */

import { html, crudo, $, pintar } from './dom.js';

// --- Avisos ------------------------------------------------------------------

const contenedorAvisos = () => document.getElementById('avisos');

/** Cuantos avisos pueden verse a la vez antes de descartar los mas antiguos. */
const MAXIMO_VISIBLES = 3;

/**
 * Muestra un aviso temporal. Se anuncia en la region aria-live del documento,
 * de modo que un lector de pantalla tambien lo recibe.
 *
 * Repetir el mismo mensaje no apila tarjetas: reutiliza la que ya esta en
 * pantalla y le suma un contador. Guardar diez veces deja un aviso con "x10",
 * no diez avisos tapando la vista.
 */
export function avisar(mensaje, tipo = 'info', { duracion = 3000 } = {}) {
  const contenedor = contenedorAvisos();
  if (!contenedor) return () => {};

  const texto = String(mensaje);

  // Si el mismo mensaje ya esta visible, se agrupa en lugar de duplicarse.
  const existente = [...contenedor.children].find(
    (nodo) => nodo.dataset.mensaje === texto && nodo.dataset.tipo === tipo
  );

  if (existente) {
    const veces = Number(existente.dataset.veces ?? 1) + 1;
    existente.dataset.veces = String(veces);
    existente.querySelector('.aviso__contador').textContent = `x${veces}`;
    existente.querySelector('.aviso__contador').hidden = false;

    // Se reinicia el temporizador: el aviso vive desde la ultima repeticion.
    clearTimeout(Number(existente.dataset.temporizador));
    if (duracion > 0) {
      existente.dataset.temporizador = String(setTimeout(() => cerrar(existente), duracion));
    }
    return () => cerrar(existente);
  }

  const aviso = document.createElement('div');
  aviso.className = `aviso aviso--${tipo}`;
  aviso.dataset.mensaje = texto;
  aviso.dataset.tipo = tipo;
  aviso.dataset.veces = '1';
  aviso.innerHTML = html`
    <span class="aviso__texto">${texto}</span>
    <span class="aviso__contador" hidden></span>
    <button type="button" class="aviso__cerrar" aria-label="Cerrar aviso">&times;</button>
  `;

  aviso.querySelector('.aviso__cerrar').addEventListener('click', () => cerrar(aviso));
  contenedor.append(aviso);

  // Con muchos avisos seguidos, los mas antiguos dejan sitio a los nuevos.
  while (contenedor.children.length > MAXIMO_VISIBLES) {
    cerrar(contenedor.firstElementChild, { inmediato: true });
  }

  if (duracion > 0) {
    aviso.dataset.temporizador = String(setTimeout(() => cerrar(aviso), duracion));
  }

  return () => cerrar(aviso);
}

function cerrar(aviso, { inmediato = false } = {}) {
  if (!aviso || !aviso.isConnected) return;
  clearTimeout(Number(aviso.dataset.temporizador));

  if (inmediato) { aviso.remove(); return; }

  aviso.dataset.saliendo = 'true';
  setTimeout(() => aviso.remove(), 160);
}

export const avisarOk = (mensaje) => avisar(mensaje, 'ok');
export const avisarError = (mensaje) => avisar(mensaje, 'error', { duracion: 7000 });
export const avisarAlerta = (mensaje) => avisar(mensaje, 'alerta', { duracion: 5000 });

// --- Modal -------------------------------------------------------------------

let cerrarModalActual = null;

/**
 * Abre un modal y devuelve una promesa que resuelve con lo que confirme el usuario.
 * Atrapa el foco y cierra con Escape o clic fuera.
 */
export function abrirModal({ titulo, contenido, acciones = [], alMontar }) {
  const capa = document.getElementById('modal');
  if (!capa) return Promise.resolve(null);

  cerrarModalActual?.(null);

  return new Promise((resolver) => {
    const elementoPrevio = document.activeElement;

    const cerrar = (resultado) => {
      document.removeEventListener('keydown', alPresionarTecla);
      capa.hidden = true;
      capa.innerHTML = '';
      cerrarModalActual = null;
      elementoPrevio?.focus?.();
      resolver(resultado);
    };

    const alPresionarTecla = (ev) => {
      if (ev.key === 'Escape') { ev.preventDefault(); cerrar(null); return; }
      if (ev.key !== 'Tab') return;

      // Ciclo de foco dentro del modal.
      const enfocables = [...capa.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')]
        .filter((elemento) => !elemento.disabled && elemento.offsetParent !== null);
      if (!enfocables.length) return;

      const primero = enfocables[0];
      const ultimo = enfocables.at(-1);
      if (ev.shiftKey && document.activeElement === primero) { ev.preventDefault(); ultimo.focus(); }
      else if (!ev.shiftKey && document.activeElement === ultimo) { ev.preventDefault(); primero.focus(); }
    };

    pintar(capa, html`
      <div class="modal__caja" role="dialog" aria-modal="true" aria-labelledby="modal-titulo">
        <h2 id="modal-titulo">${titulo}</h2>
        <div class="modal__cuerpo">${crudo(contenido)}</div>
        <div class="fila fila--fin">
          ${crudo(acciones.map((accion, indice) => html`
            <button type="button" class="btn ${accion.clase ?? ''}" data-accion="${indice}">${accion.texto}</button>
          `).join(''))}
        </div>
      </div>
    `);

    capa.hidden = false;

    capa.querySelectorAll('[data-accion]').forEach((boton) => {
      boton.addEventListener('click', () => {
        const accion = acciones[Number(boton.dataset.accion)];
        if (accion.alPulsar) {
          const resultado = accion.alPulsar(capa);
          if (resultado === false) return; // la accion decidio no cerrar
          cerrar(resultado ?? accion.valor ?? true);
        } else {
          cerrar(accion.valor ?? true);
        }
      });
    });

    capa.addEventListener('click', (ev) => { if (ev.target === capa) cerrar(null); });
    document.addEventListener('keydown', alPresionarTecla);

    cerrarModalActual = cerrar;
    alMontar?.(capa);

    // El foco entra al modal; si hay un campo, directo a el.
    const primerCampo = capa.querySelector('input, select, textarea');
    (primerCampo ?? capa.querySelector('[data-accion]'))?.focus();
  });
}

/** Confirmacion simple. Resuelve true o false. */
export function confirmar({ titulo, mensaje, textoConfirmar = 'Confirmar', peligroso = false }) {
  return abrirModal({
    titulo,
    contenido: html`<p>${mensaje}</p>`,
    acciones: [
      { texto: 'Cancelar', valor: false },
      { texto: textoConfirmar, clase: peligroso ? 'btn--peligro' : 'btn--primario', valor: true }
    ]
  }).then((resultado) => resultado === true);
}

/** Confirmacion que exige escribir una palabra concreta, para acciones destructivas. */
export function confirmarConTexto({ titulo, mensaje, palabra, textoConfirmar = 'Confirmar' }) {
  return abrirModal({
    titulo,
    contenido: html`
      <p>${mensaje}</p>
      <label style="margin-top:1rem">Escriba <strong>${palabra}</strong> para continuar
        <input id="confirmacion-texto" autocomplete="off" spellcheck="false">
      </label>
    `,
    acciones: [
      { texto: 'Cancelar', valor: false },
      {
        texto: textoConfirmar,
        clase: 'btn--peligro',
        alPulsar: (capa) => {
          const campo = capa.querySelector('#confirmacion-texto');
          if (campo.value.trim() !== palabra) {
            campo.setAttribute('aria-invalid', 'true');
            campo.focus();
            return false;
          }
          return true;
        }
      }
    ]
  }).then((resultado) => resultado === true);
}

// --- Estados de carga y vacio ------------------------------------------------

export const esqueletoPanel = (cantidad = 3) =>
  html`<div class="rejilla rejilla--3">
    ${crudo(Array.from({ length: cantidad }, () => '<div class="panel esqueleto esqueleto--panel"></div>').join(''))}
  </div>`;

export const esqueletoTabla = (filas = 5) =>
  html`<div class="panel pila pila--chica">
    <div class="esqueleto esqueleto--titulo"></div>
    ${crudo(Array.from({ length: filas }, () => '<div class="esqueleto esqueleto--linea"></div>').join(''))}
  </div>`;

export const cargando = (mensaje = 'Cargando...') =>
  html`<div class="vacio"><span class="girador" aria-hidden="true"></span><p>${mensaje}</p></div>`;

export const vacio = ({ icono = '—', titulo, mensaje, accion }) =>
  html`<div class="vacio">
    <div class="vacio__icono" aria-hidden="true">${icono}</div>
    <p class="vacio__titulo">${titulo}</p>
    ${mensaje ? html`<p>${mensaje}</p>` : ''}
    ${accion ? crudo(accion) : ''}
  </div>`;

export const errorVista = (mensaje, { reintentar = true } = {}) =>
  html`<div class="vacio">
    <div class="vacio__icono" aria-hidden="true">!</div>
    <p class="vacio__titulo">No se pudo cargar la informacion</p>
    <p>${mensaje}</p>
    ${reintentar ? crudo('<button type="button" class="btn btn--primario" data-accion="recargar">Reintentar</button>') : ''}
  </div>`;
