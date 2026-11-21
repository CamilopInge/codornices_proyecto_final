/**
 * Pantalla de acceso.
 */

import { html, crudo, datosFormulario, conBotonOcupado } from '../core/dom.js';
import { api } from '../core/api.js';
import { sesion } from '../core/sesion.js';
import { store } from '../core/store.js';
import { marca } from '../componentes/layout.js';
import { avisarOk } from '../core/ui.js';

export function render({ consulta }) {
  // Si llegamos aqui desde una ruta protegida, se vuelve a ella tras entrar.
  const volver = consulta?.volver ?? '';

  return html`
    <div class="acceso">
      <div class="acceso__tarjeta">
        <div class="acceso__marca">${crudo(marca(false))}</div>

        <div class="acceso__titulo">
          <h1>Iniciar sesion</h1>
          <p>Sistema de evaluacion de bienestar animal en codornices de postura, metodologia ICA.</p>
        </div>

        <form id="form-acceso" class="pila" novalidate>
          <input type="hidden" name="volver" value="${volver}">

          <label>Usuario o correo electronico
            <input name="identificador" autocomplete="username" autocapitalize="none"
                   spellcheck="false" required autofocus>
          </label>

          <label>Contrasena
            <input name="password" type="password" autocomplete="current-password" required>
          </label>

          <p class="nota nota--error" id="error-acceso" role="alert" hidden></p>

          <button type="submit" class="btn btn--primario btn--grande btn--bloque">Ingresar</button>
        </form>

        <div class="acceso__pie">
          <a href="#/recuperar">Olvide mi contrasena</a>
          <span class="tenue pequeno">v2.0</span>
        </div>
      </div>
    </div>
  `;
}

export function montar(raiz, { ir }) {
  const formulario = raiz.querySelector('#form-acceso');
  const error = raiz.querySelector('#error-acceso');

  const alEnviar = async (ev) => {
    ev.preventDefault();
    error.hidden = true;

    const datos = datosFormulario(formulario);
    if (!datos.identificador?.trim() || !datos.password) {
      error.textContent = 'Indique su usuario o correo y su contrasena.';
      error.hidden = false;
      return;
    }

    const boton = formulario.querySelector('button[type="submit"]');

    await conBotonOcupado(boton, async () => {
      try {
        const respuesta = await api.auth.login(datos.identificador.trim(), datos.password);
        sesion.guardar({ token: respuesta.token, usuario: respuesta.usuario });
        store.establecerUsuario(respuesta.usuario);

        avisarOk(`Bienvenido, ${respuesta.usuario.nombre}.`);

        // Solo se acepta un destino interno, nunca una URL absoluta.
        const destino = datos.volver && datos.volver.startsWith('/') ? datos.volver : '/';
        ir(destino, { reemplazar: true });
      } catch (fallo) {
        error.textContent = fallo.message;
        error.hidden = false;
        formulario.elements.password.value = '';
        formulario.elements.password.focus();
      }
    });
  };

  formulario.addEventListener('submit', alEnviar);
  return () => formulario.removeEventListener('submit', alEnviar);
}
