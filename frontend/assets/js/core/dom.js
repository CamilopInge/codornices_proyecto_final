/**
 * Utilidades de plantillas y DOM.
 *
 * `html` es una plantilla etiquetada que escapa TODA interpolacion por defecto.
 * El sistema anterior construia HTML concatenando cadenas y llamaba a una funcion
 * de escape a mano, asi que bastaba olvidarla una vez para abrir un XSS.
 * Aqui hay que pedir explicitamente el contenido sin escapar con `crudo()`.
 */

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export const escapar = (valor) =>
  String(valor ?? '').replace(/[&<>"']/g, (caracter) => ESCAPES[caracter]);

/** Marca una cadena como HTML ya seguro, para que `html` no la vuelva a escapar. */
class HtmlSeguro {
  constructor(texto) { this.texto = texto; }
  toString() { return this.texto; }
}

export const crudo = (texto) => new HtmlSeguro(String(texto ?? ''));

function interpolar(valor) {
  if (valor == null || valor === false) return '';
  if (valor instanceof HtmlSeguro) return valor.texto;
  if (Array.isArray(valor)) return valor.map(interpolar).join('');
  return escapar(valor);
}

/**
 * html`<p>${texto}</p>` — escapa toda interpolacion y devuelve HTML seguro.
 *
 * El resultado es un HtmlSeguro, no una cadena, para que anidar plantillas
 * funcione sin escapar dos veces: html`<div>${html`<b>x</b>`}</div>`.
 * Donde se espera texto (innerHTML, join, concatenacion) se convierte solo.
 */
export function html(fragmentos, ...valores) {
  let resultado = fragmentos[0];
  for (let i = 0; i < valores.length; i += 1) {
    resultado += interpolar(valores[i]) + fragmentos[i + 1];
  }
  return new HtmlSeguro(resultado);
}

/** Atributo opcional: devuelve ` nombre="valor"` o cadena vacia. */
export const attr = (nombre, valor) =>
  valor == null || valor === false || valor === '' ? crudo('') : crudo(` ${nombre}="${escapar(valor)}"`);

/** Clases condicionales: clases({ activo: true, oculto: false }) -> "activo". */
export const clases = (mapa) =>
  Object.entries(mapa)
    .filter(([, activo]) => Boolean(activo))
    .map(([nombre]) => nombre)
    .join(' ');

// --- Consulta y eventos ------------------------------------------------------

export const $ = (selector, raiz = document) => raiz.querySelector(selector);
export const $$ = (selector, raiz = document) => [...raiz.querySelectorAll(selector)];

/**
 * Delegacion de eventos: un solo escucha en la raiz atiende a todos los
 * descendientes que coincidan, incluso los que se creen despues.
 */
export function delegar(raiz, evento, selector, manejador) {
  raiz.addEventListener(evento, (ev) => {
    const objetivo = ev.target.closest(selector);
    if (objetivo && raiz.contains(objetivo)) manejador(ev, objetivo);
  });
}

/** Reemplaza el contenido de un nodo y devuelve el nodo. */
export function pintar(nodo, contenido) {
  nodo.innerHTML = contenido;
  return nodo;
}

/**
 * Lleva el foco al primer elemento enfocable de un contenedor.
 * Al cambiar de vista el foco debe moverse, o quien navega con teclado
 * se queda donde estaba sin saber que la pagina cambio.
 */
export function enfocarPrimero(contenedor) {
  const enfocable = contenedor?.querySelector(
    'h1, [autofocus], input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), a[href]'
  );
  if (!enfocable) return;
  if (!enfocable.hasAttribute('tabindex') && /^H[1-6]$/.test(enfocable.tagName)) {
    enfocable.setAttribute('tabindex', '-1');
  }
  enfocable.focus({ preventScroll: true });
}

/** Lee un formulario como objeto plano, con las casillas como booleanos. */
export function datosFormulario(formulario) {
  const datos = {};
  for (const campo of formulario.elements) {
    if (!campo.name || campo.disabled) continue;
    if (campo.type === 'checkbox') datos[campo.name] = campo.checked;
    else if (campo.type === 'radio') { if (campo.checked) datos[campo.name] = campo.value; }
    else if (campo.type === 'number') datos[campo.name] = campo.value === '' ? null : Number(campo.value);
    else datos[campo.name] = campo.value;
  }
  return datos;
}

/** Marca un boton como ocupado mientras dura una operacion asincrona. */
export async function conBotonOcupado(boton, operacion) {
  if (!boton) return operacion();
  const textoOriginal = boton.textContent;
  boton.dataset.ocupado = 'true';
  boton.disabled = true;
  try {
    return await operacion();
  } finally {
    delete boton.dataset.ocupado;
    boton.disabled = false;
    boton.textContent = textoOriginal;
  }
}
