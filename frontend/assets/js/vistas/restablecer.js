/**
 * Definicion de la contrasena nueva desde el enlace recibido por correo.
 *
 * El token se valida contra el servidor antes de mostrar el formulario, para
 * no pedir una contrasena que luego sera rechazada por un enlace vencido.
 */

import { html, crudo, datosFormulario, conBotonOcupado } from '../core/dom.js';
import { api } from '../core/api.js';
import { marca } from '../componentes/layout.js';
import { avisarOk } from '../core/ui.js';

const MINIMO = 12;

/** Reglas visibles mientras se escribe; las mismas que valida el servidor. */
const REQUISITOS = [
  { clave: 'longitud', texto: `Al menos ${MINIMO} caracteres`, cumple: (v) => v.length >= MINIMO },
  { clave: 'mayuscula', texto: 'Una letra mayuscula', cumple: (v) => /[A-ZÁÉÍÓÚÑ]/.test(v) },
  { clave: 'minuscula', texto: 'Una letra minuscula', cumple: (v) => /[a-záéíóúñ]/.test(v) },
  { clave: 'numero', texto: 'Un numero', cumple: (v) => /\d/.test(v) },
  { clave: 'simbolo', texto: 'Un simbolo (! @ # $ ...)', cumple: (v) => /[^\w\s]/.test(v) }
];

function fuerza(valor) {
  const cumplidos = REQUISITOS.filter((regla) => regla.cumple(valor)).length;
  if (!valor) return { nivel: null, texto: '', segmentos: 0 };
  if (cumplidos <= 2) return { nivel: 'debil', texto: 'Contrasena debil', segmentos: 1 };
  if (cumplidos <= 4) return { nivel: 'media', texto: 'Contrasena aceptable', segmentos: 2 };
  return { nivel: 'fuerte', texto: 'Contrasena robusta', segmentos: 3 };
}

const tarjeta = (contenido) => html`
  <div class="acceso">
    <div class="acceso__tarjeta">
      <div class="acceso__marca">${crudo(marca(false))}</div>
      ${crudo(contenido)}
    </div>
  </div>
`;

export async function render({ consulta }) {
  const token = consulta?.token ?? '';

  if (!token) {
    return tarjeta(html`
      <div class="acceso__titulo">
        <h1>Enlace incompleto</h1>
        <p>La direccion no incluye un token de restablecimiento. Abra el enlace tal como llego en el correo.</p>
      </div>
      <a class="btn btn--primario btn--bloque" href="#/recuperar">Solicitar un enlace nuevo</a>
    `);
  }

  let validacion;
  try {
    validacion = await api.auth.validarTokenReset(token);
  } catch (error) {
    return tarjeta(html`
      <div class="acceso__titulo">
        <h1>No se pudo verificar el enlace</h1>
        <p>${error.message}</p>
      </div>
      <a class="btn btn--primario btn--bloque" href="#/recuperar">Solicitar un enlace nuevo</a>
    `);
  }

  if (!validacion.valido) {
    return tarjeta(html`
      <div class="acceso__titulo">
        <h1>Enlace no valido</h1>
        <p>${validacion.mensaje}</p>
      </div>
      <a class="btn btn--primario btn--bloque" href="#/recuperar">Solicitar un enlace nuevo</a>
      <div class="acceso__pie"><a href="#/acceso">Volver al inicio de sesion</a></div>
    `);
  }

  return tarjeta(html`
    <div class="acceso__titulo">
      <h1>Defina su contrasena</h1>
      <p>Cuenta: <strong>${validacion.correo}</strong></p>
    </div>

    <form id="form-restablecer" class="pila" novalidate>
      <input type="hidden" name="token" value="${token}">

      <label>Contrasena nueva
        <input name="passwordNueva" type="password" autocomplete="new-password"
               minlength="${MINIMO}" required autofocus>
      </label>

      <div class="medidor">
        <div class="medidor__pista" aria-hidden="true">
          <span class="medidor__segmento"></span>
          <span class="medidor__segmento"></span>
          <span class="medidor__segmento"></span>
        </div>
        <p class="medidor__texto" id="texto-fuerza" role="status"></p>
      </div>

      <div class="requisitos" id="requisitos">
        ${crudo(REQUISITOS.map((regla) => html`
          <span class="requisito" data-regla="${regla.clave}" data-cumple="false">
            <span class="requisito__marca" aria-hidden="true">○</span>${regla.texto}
          </span>
        `).join(''))}
      </div>

      <label>Confirmar contrasena
        <input name="confirmacion" type="password" autocomplete="new-password" required>
      </label>

      <p class="nota nota--error" id="error-restablecer" role="alert" hidden></p>

      <button type="submit" class="btn btn--primario btn--grande btn--bloque">Guardar contrasena</button>
    </form>

    <div class="acceso__pie"><a href="#/acceso">Volver al inicio de sesion</a></div>
  `);
}

export function montar(raiz, { ir }) {
  const formulario = raiz.querySelector('#form-restablecer');
  if (!formulario) return null;

  const error = raiz.querySelector('#error-restablecer');
  const campoPassword = formulario.elements.passwordNueva;
  const segmentos = raiz.querySelectorAll('.medidor__segmento');
  const textoFuerza = raiz.querySelector('#texto-fuerza');

  const alEscribir = () => {
    const valor = campoPassword.value;
    const resultado = fuerza(valor);

    segmentos.forEach((segmento, indice) => {
      if (indice < resultado.segmentos) segmento.dataset.activo = resultado.nivel;
      else delete segmento.dataset.activo;
    });
    textoFuerza.textContent = resultado.texto;

    for (const regla of REQUISITOS) {
      const elemento = raiz.querySelector(`[data-regla="${regla.clave}"]`);
      const cumple = regla.cumple(valor);
      elemento.dataset.cumple = String(cumple);
      elemento.querySelector('.requisito__marca').textContent = cumple ? '✓' : '○';
    }
  };

  const alEnviar = async (ev) => {
    ev.preventDefault();
    error.hidden = true;

    const datos = datosFormulario(formulario);

    if (datos.passwordNueva.length < MINIMO) {
      error.textContent = `La contrasena debe tener al menos ${MINIMO} caracteres.`;
      error.hidden = false;
      return;
    }
    if (datos.passwordNueva !== datos.confirmacion) {
      error.textContent = 'Las dos contrasenas no coinciden.';
      error.hidden = false;
      formulario.elements.confirmacion.focus();
      return;
    }

    const boton = formulario.querySelector('button[type="submit"]');

    await conBotonOcupado(boton, async () => {
      try {
        await api.auth.restablecer(datos.token, datos.passwordNueva);
        avisarOk('Contrasena guardada. Ya puede iniciar sesion.');
        ir('/acceso', { reemplazar: true });
      } catch (fallo) {
        error.textContent = fallo.message;
        error.hidden = false;
      }
    });
  };

  campoPassword.addEventListener('input', alEscribir);
  formulario.addEventListener('submit', alEnviar);

  return () => {
    campoPassword.removeEventListener('input', alEscribir);
    formulario.removeEventListener('submit', alEnviar);
  };
}
