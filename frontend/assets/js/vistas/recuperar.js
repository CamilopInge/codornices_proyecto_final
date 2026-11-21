/**
 * Solicitud de restablecimiento de contrasena.
 *
 * La respuesta es la misma exista o no la cuenta, para que el formulario no
 * sirva para averiguar que correos estan registrados.
 */

import { html, crudo, datosFormulario, conBotonOcupado } from '../core/dom.js';
import { api } from '../core/api.js';
import { marca } from '../componentes/layout.js';

export function render() {
  return html`
    <div class="acceso">
      <div class="acceso__tarjeta">
        <div class="acceso__marca">${crudo(marca(false))}</div>

        <div class="acceso__titulo">
          <h1>Recuperar acceso</h1>
          <p>Indique el correo de su cuenta. Si esta registrado, le enviaremos un enlace para crear una contrasena nueva.</p>
        </div>

        <form id="form-recuperar" class="pila" novalidate>
          <label>Correo electronico
            <input name="correo" type="email" autocomplete="email" autocapitalize="none"
                   spellcheck="false" required autofocus placeholder="nombre@evalcodorniz.edu.co">
          </label>

          <p class="nota nota--error" id="error-recuperar" role="alert" hidden></p>

          <button type="submit" class="btn btn--primario btn--grande btn--bloque">Enviar enlace</button>
        </form>

        <div id="resultado-recuperar" hidden></div>

        <div class="acceso__pie">
          <a href="#/acceso">Volver al inicio de sesion</a>
        </div>
      </div>
    </div>
  `;
}

export function montar(raiz) {
  const formulario = raiz.querySelector('#form-recuperar');
  const error = raiz.querySelector('#error-recuperar');
  const resultado = raiz.querySelector('#resultado-recuperar');

  const alEnviar = async (ev) => {
    ev.preventDefault();
    error.hidden = true;

    const { correo } = datosFormulario(formulario);
    if (!correo?.trim()) {
      error.textContent = 'Indique su correo electronico.';
      error.hidden = false;
      return;
    }

    const boton = formulario.querySelector('button[type="submit"]');

    await conBotonOcupado(boton, async () => {
      try {
        const respuesta = await api.auth.recuperar(correo.trim());

        formulario.hidden = true;
        resultado.hidden = false;
        resultado.innerHTML = html`
          <div class="nota nota--ok">
            <p><strong>Revise su correo.</strong></p>
            <p>${respuesta.mensaje}</p>
            <p class="pequeno">El enlace vence en una hora y solo puede usarse una vez. Si no lo ve, revise la carpeta de correo no deseado.</p>
          </div>
          ${respuesta.enlaceDesarrollo ? html`
            <div class="nota nota--info" style="margin-top:1rem">
              <p><strong>Modo desarrollo</strong></p>
              <p class="pequeno">No hay servidor SMTP configurado, asi que el correo no se envio. Use este enlace directamente:</p>
              <p class="pequeno"><a href="${respuesta.enlaceDesarrollo}">Abrir el enlace de restablecimiento</a></p>
            </div>
          ` : ''}
        `;
      } catch (fallo) {
        error.textContent = fallo.message;
        error.hidden = false;
      }
    });
  };

  formulario.addEventListener('submit', alEnviar);
  return () => formulario.removeEventListener('submit', alEnviar);
}
