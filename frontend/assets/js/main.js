/**
 * Punto de entrada de la aplicacion.
 *
 * Arranca el tema, restaura la sesion, registra las rutas y decide en cada
 * cambio de ruta si la vista requiere autenticacion.
 */

import { $, pintar, enfocarPrimero, delegar } from './core/dom.js';
import { api, alPerderSesion } from './core/api.js';
import { sesion, tema } from './core/sesion.js';
import { store } from './core/store.js';
import { ruta, iniciarRouter, ir, recargar } from './core/router.js';
import { avisar, avisarError, avisarOk, cargando, confirmar, abrirModal } from './core/ui.js';
import { conLayout } from './componentes/layout.js';
import { montarAsistente, desmontarAsistente } from './componentes/asistente.js';
import { puede } from '/shared/ica/roles.js';

import * as vistaLogin from './vistas/login.js';
import * as vistaRecuperar from './vistas/recuperar.js';
import * as vistaRestablecer from './vistas/restablecer.js';
import * as vistaPanel from './vistas/panel.js';
import * as vistaPredios from './vistas/predios.js';
import * as vistaEvaluaciones from './vistas/evaluaciones.js';
import * as vistaEvaluacion from './vistas/evaluacion.js';
import * as vistaPlanes from './vistas/planes.js';
import * as vistaReportes from './vistas/reportes.js';
import * as vistaParametrizacion from './vistas/parametrizacion.js';
import * as vistaUsuarios from './vistas/usuarios.js';
import * as vistaAuditoria from './vistas/auditoria.js';

const raiz = $('#app');

// --- Registro de rutas -------------------------------------------------------
// `publica` marca las que se ven sin sesion; `modulo` exige permiso de lectura.

ruta('/acceso', vistaLogin, { publica: true, sinLayout: true });
ruta('/recuperar', vistaRecuperar, { publica: true, sinLayout: true });
ruta('/restablecer', vistaRestablecer, { publica: true, sinLayout: true });

ruta('/', vistaPanel, { modulo: 'dashboard' });
ruta('/predios', vistaPredios, { modulo: 'predios' });
ruta('/predios/:id', vistaPredios, { modulo: 'predios', detalle: true });
ruta('/evaluaciones', vistaEvaluaciones, { modulo: 'evaluaciones' });
ruta('/evaluaciones/:id', vistaEvaluacion, { modulo: 'evaluaciones' });
ruta('/planes', vistaPlanes, { modulo: 'planes' });
ruta('/reportes', vistaReportes, { modulo: 'reportes' });
ruta('/parametrizacion', vistaParametrizacion, { modulo: 'parametrizacion' });
ruta('/usuarios', vistaUsuarios, { modulo: 'usuarios' });
ruta('/auditoria', vistaAuditoria, { modulo: 'auditoria' });

// --- Ciclo de vida de una vista ---------------------------------------------

let limpiarVistaAnterior = null;

async function dibujar({ camino, entrada, parametros, consulta, noEncontrada }) {
  limpiarVistaAnterior?.();
  limpiarVistaAnterior = null;

  if (noEncontrada) {
    pintar(raiz, conLayout({
      usuario: store.usuario,
      camino,
      contenido: `
        <div class="vacio">
          <div class="vacio__icono" aria-hidden="true">?</div>
          <p class="vacio__titulo">Pagina no encontrada</p>
          <p>La direccion <code class="mono">#${camino}</code> no corresponde a ninguna vista.</p>
          <a class="btn btn--primario" href="#/">Ir al panel</a>
        </div>`
    }));
    return;
  }

  const hayToken = sesion.activa();

  // Ruta privada sin sesion: al acceso, recordando a donde queria ir.
  if (!entrada.publica && !hayToken) {
    const destino = camino === '/' ? '' : `?volver=${encodeURIComponent(camino)}`;
    ir(`/acceso${destino}`, { reemplazar: true });
    return;
  }

  // Ruta de acceso con sesion viva: al panel.
  if (entrada.publica && hayToken && camino === '/acceso') {
    ir('/', { reemplazar: true });
    return;
  }

  const contexto = { parametros, consulta, camino, usuario: store.usuario, ir, recargar };

  if (entrada.publica) {
    // En las pantallas de acceso no hay datos que consultar.
    desmontarAsistente();
    pintar(raiz, await entrada.render(contexto));
    raiz.setAttribute('aria-busy', 'false');
    limpiarVistaAnterior = entrada.montar?.(raiz, contexto) ?? null;
    enfocarPrimero(raiz);
    return;
  }

  // Las vistas reciben el contenedor del contenido, no #app.
  // #app sobrevive a cada redibujado, asi que los escuchas delegados que una
  // vista registrara sobre el se irian acumulando: tras N redibujados un solo
  // clic disparaba la accion N veces. El contenedor se recrea en cada render,
  // de modo que sus escuchas mueren con el.
  const contenedorDeVista = () => raiz.querySelector('#contenido') ?? raiz;

  // Las referencias (catalogo, permisos, configuracion) se cargan una sola vez.
  if (!store.catalogo) {
    pintar(raiz, conLayout({ usuario: store.usuario, camino, contenido: cargando('Cargando catalogo ICA...') }));
    try {
      await store.cargarReferencias();
    } catch (error) {
      avisarError(error.message);
      return;
    }
  }

  if (entrada.modulo && !puede(store.usuario.rol, entrada.modulo)) {
    pintar(raiz, conLayout({
      usuario: store.usuario,
      camino,
      contenido: `
        <div class="vacio">
          <div class="vacio__icono" aria-hidden="true">!</div>
          <p class="vacio__titulo">Sin acceso a este modulo</p>
          <p>Su rol no tiene permiso para ver esta seccion. Si cree que es un error, contacte al administrador.</p>
          <a class="btn btn--primario" href="#/">Volver al panel</a>
        </div>`
    }));
    return;
  }

  // Esqueleto primero y datos despues: la pantalla nunca queda en blanco.
  pintar(raiz, conLayout({
    usuario: store.usuario,
    camino,
    contenido: entrada.esqueleto?.() ?? cargando()
  }));
  raiz.setAttribute('aria-busy', 'true');

  let contenido;
  try {
    contenido = await entrada.render(contexto);
  } catch (error) {
    if (error.estado === 401) return; // el manejador de sesion ya redirige
    contenido = `
      <div class="vacio">
        <div class="vacio__icono" aria-hidden="true">!</div>
        <p class="vacio__titulo">No se pudo cargar la vista</p>
        <p>${error.message}</p>
        <button type="button" class="btn btn--primario" data-accion="recargar-vista">Reintentar</button>
      </div>`;
  }

  pintar(raiz, conLayout({ usuario: store.usuario, camino, contenido }));
  raiz.setAttribute('aria-busy', 'false');

  const principal = contenedorDeVista();
  limpiarVistaAnterior = entrada.montar?.(principal, contexto) ?? null;

  // Vive fuera del contenedor de vistas para que la conversacion sobreviva
  // al cambio de pantalla; montarlo de nuevo no lo duplica.
  montarAsistente();

  principal.focus({ preventScroll: true });
  window.scrollTo({ top: 0, behavior: 'instant' });
}

// --- Acciones globales de la barra superior ----------------------------------

function registrarAccionesGlobales() {
  delegar(raiz, 'click', '[data-accion="tema"]', (_ev, boton) => {
    const nuevo = tema.alternar();
    boton.textContent = tema.icono(nuevo);
    boton.title = tema.etiqueta(nuevo);
    boton.setAttribute('aria-label', `${tema.etiqueta(nuevo)}. Pulse para cambiar`);
  });

  delegar(raiz, 'click', '[data-accion="salir"]', async () => {
    const confirmado = await confirmar({
      titulo: 'Cerrar sesion',
      mensaje: 'Se cerrara su sesion en este equipo. Los cambios sin guardar se perderan.',
      textoConfirmar: 'Cerrar sesion'
    });
    if (!confirmado) return;

    try { await api.auth.logout(); } catch { /* el token local se limpia igual */ }
    sesion.limpiar();
    store.limpiar();
    // La conversacion es de quien cerro sesion: no debe quedar para el siguiente.
    desmontarAsistente();
    ir('/acceso', { reemplazar: true });
    avisar('Sesion cerrada.');
  });

  delegar(raiz, 'click', '[data-accion="menu-cuenta"]', () => abrirCuenta());
  delegar(raiz, 'click', '[data-accion="recargar-vista"]', () => recargar());
}

/** Modal de cuenta: datos del usuario y cambio de contrasena. */
async function abrirCuenta() {
  const usuario = store.usuario;

  await abrirModal({
    titulo: 'Mi cuenta',
    contenido: `
      <dl class="datos">
        <div><dt>Nombre</dt><dd>${usuario.nombre}</dd></div>
        <div><dt>Usuario</dt><dd class="mono">${usuario.username}</dd></div>
        <div><dt>Correo</dt><dd>${usuario.email}</dd></div>
        <div><dt>Rol</dt><dd>${usuario.rol}</dd></div>
      </dl>
      <hr class="separador">
      <form id="form-password" class="pila pila--chica">
        <h3>Cambiar contrasena</h3>
        <label>Contrasena actual
          <input type="password" name="passwordActual" autocomplete="current-password" required>
        </label>
        <label>Contrasena nueva (minimo 12 caracteres)
          <input type="password" name="passwordNueva" autocomplete="new-password" minlength="12" required>
        </label>
        <p class="pequeno tenue">Al cambiarla se cerraran todas sus sesiones abiertas.</p>
        <p class="nota nota--error" id="error-password" hidden></p>
      </form>`,
    acciones: [
      { texto: 'Cerrar', valor: false },
      {
        texto: 'Cambiar contrasena',
        clase: 'btn--primario',
        alPulsar: async (capa) => {
          const formulario = capa.querySelector('#form-password');
          const error = capa.querySelector('#error-password');
          if (!formulario.reportValidity()) return false;

          const actual = formulario.elements.passwordActual.value;
          const nueva = formulario.elements.passwordNueva.value;

          try {
            await api.auth.cambiarPassword(actual, nueva);
            avisarOk('Contrasena actualizada. Inicie sesion de nuevo.');
            sesion.limpiar();
            store.limpiar();
            ir('/acceso', { reemplazar: true });
            return true;
          } catch (fallo) {
            error.textContent = fallo.message;
            error.hidden = false;
            return false;
          }
        }
      }
    ]
  });
}

// --- Arranque ----------------------------------------------------------------

async function arrancar() {
  tema.inicializar();
  registrarAccionesGlobales();

  // Un 401 en cualquier peticion devuelve al acceso sin dejar la vista a medias.
  alPerderSesion(() => {
    store.limpiar();
    avisarError('Su sesion vencio. Inicie sesion de nuevo.');
    ir('/acceso', { reemplazar: true });
  });

  // Con token guardado se confirma contra el servidor antes de pintar nada.
  if (sesion.activa()) {
    try {
      const { usuario } = await api.auth.yo();
      store.establecerUsuario(usuario);
    } catch {
      sesion.limpiar();
      store.limpiar();
    }
  }

  await iniciarRouter(dibujar);
}

arrancar().catch((error) => {
  console.error('[app] fallo al arrancar:', error);
  pintar(raiz, `
    <div class="acceso">
      <div class="acceso__tarjeta">
        <h1>No se pudo iniciar la aplicacion</h1>
        <p class="tenue">${error.message}</p>
        <button type="button" class="btn btn--primario" onclick="location.reload()">Recargar</button>
      </div>
    </div>`);
});
