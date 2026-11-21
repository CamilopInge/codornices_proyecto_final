/**
 * Gestion de usuarios.
 *
 * Al crear una cuenta no se escribe ninguna contrasena: el sistema envia un
 * correo desde administrador@evalcodorniz.edu.co con un enlace para que la
 * persona defina la suya.
 */

import { html, crudo, delegar, datosFormulario, conBotonOcupado } from '../core/dom.js';
import { api } from '../core/api.js';
import { store } from '../core/store.js';
import { cabecera } from '../componentes/layout.js';
import { esqueletoTabla, vacio, avisarOk, avisarError, avisarAlerta, confirmar, abrirModal } from '../core/ui.js';
import { hace, insigniaActivo } from '../core/formato.js';
import { puede, ROL_NOMBRE, ROL_DESCRIPCION, LISTA_ROLES } from '/shared/ica/roles.js';

export const esqueleto = () => esqueletoTabla(6);

let formularioAbierto = false;

export async function render() {
  const puedeEscribir = puede(store.usuario.rol, 'usuarios', 'w');
  const { usuarios } = await api.usuarios.listar();

  return html`
    ${crudo(cabecera({
      encabezillo: 'Usuarios',
      titulo: 'Cuentas del sistema',
      descripcion: 'Al crear una cuenta se envia por correo un enlace para que la persona defina su propia contrasena. Una cuenta inactiva no puede iniciar sesion.',
      acciones: puedeEscribir
        ? html`<button type="button" class="btn btn--primario" data-accion="nuevo-usuario">
                 ${formularioAbierto ? 'Cerrar formulario' : 'Crear usuario'}
               </button>`
        : ''
    }))}

    ${formularioAbierto ? html`
      <section class="panel">
        <form id="form-usuario" class="pila" novalidate>
          <h2>Nueva cuenta</h2>
          <div class="rejilla-campos">
            <label>Nombre completo *
              <input name="nombre" required minlength="3" autocomplete="off">
            </label>
            <label>Nombre de usuario *
              <input name="username" required pattern="[a-z0-9._-]{3,32}" autocomplete="off"
                     autocapitalize="none" spellcheck="false"
                     title="Entre 3 y 32 caracteres: letras minusculas, numeros, punto, guion o guion bajo">
            </label>
            <label>Correo electronico *
              <input name="email" type="email" required autocomplete="off" autocapitalize="none" spellcheck="false">
            </label>
            <label>Rol *
              <select name="rol" required>
                ${crudo(LISTA_ROLES.map((rol) => html`
                  <option value="${rol}" ${crudo(rol === 'evaluador' ? 'selected' : '')}>${ROL_NOMBRE[rol]}</option>
                `).join(''))}
              </select>
            </label>
          </div>

          <p class="nota nota--info" id="descripcion-rol">${ROL_DESCRIPCION.evaluador}</p>
          <p class="nota nota--error" id="error-usuario" role="alert" hidden></p>

          <div class="fila fila--fin">
            <button type="button" class="btn" data-accion="cancelar-usuario">Cancelar</button>
            <button type="submit" class="btn btn--primario">Crear y enviar invitacion</button>
          </div>
        </form>
      </section>
    ` : ''}

    ${usuarios.length ? html`
      <div class="tabla-envoltura">
        <table>
          <caption class="solo-lectores">Usuarios registrados</caption>
          <thead>
            <tr>
              <th scope="col">Nombre</th>
              <th scope="col">Usuario</th>
              <th scope="col">Correo</th>
              <th scope="col">Rol</th>
              <th scope="col">Estado</th>
              <th scope="col">Ultimo acceso</th>
              <th scope="col"><span class="solo-lectores">Acciones</span></th>
            </tr>
          </thead>
          <tbody>
            ${crudo(usuarios.map((usuario) => {
              const esYo = usuario.id === store.usuario.id;
              return html`
                <tr>
                  <td>
                    <strong>${usuario.nombre}</strong>
                    ${esYo ? html`<span class="insignia insignia--marca" style="margin-left:.4rem">Usted</span>` : ''}
                  </td>
                  <td class="mono compacta">${usuario.username}</td>
                  <td class="pequeno">${usuario.email}</td>
                  <td class="compacta">
                    ${puedeEscribir && !esYo
                      ? html`
                        <select data-rol-usuario="${usuario.id}">
                          ${crudo(LISTA_ROLES.map((rol) => html`
                            <option value="${rol}" ${crudo(usuario.rol === rol ? 'selected' : '')}>${ROL_NOMBRE[rol]}</option>
                          `).join(''))}
                        </select>
                      `
                      : html`<span class="insignia">${ROL_NOMBRE[usuario.rol]}</span>`}
                  </td>
                  <td class="compacta">
                    ${insigniaActivo(usuario.activo)}
                    ${usuario.debeCambiarPassword
                      ? html`<br><span class="insignia insignia--alerta">Sin activar</span>`
                      : ''}
                  </td>
                  <td class="pequeno">
                    ${usuario.ultimoAcceso ? hace(usuario.ultimoAcceso) : '—'}
                  </td>
                  <td class="compacta">
                    ${puedeEscribir ? html`
                      <div class="fila" style="gap:.3rem">
                        <button type="button" class="btn btn--chico btn--fantasma"
                                data-accion="restablecer" data-id="${usuario.id}" data-correo="${usuario.email}">
                          Restablecer
                        </button>
                        ${!esYo ? html`
                          <button type="button" class="btn btn--chico btn--fantasma"
                                  data-accion="estado-usuario" data-id="${usuario.id}" data-activo="${usuario.activo}">
                            ${usuario.activo ? 'Inactivar' : 'Activar'}
                          </button>
                        ` : ''}
                      </div>
                    ` : ''}
                  </td>
                </tr>
              `;
            }).join(''))}
          </tbody>
        </table>
      </div>
    ` : crudo(vacio({ icono: '○', titulo: 'No hay usuarios', mensaje: 'Algo va mal: deberia existir al menos el administrador.' }))}

    <section class="panel panel--hundido">
      <h2>Roles disponibles</h2>
      <dl class="datos">
        ${crudo(LISTA_ROLES.map((rol) => html`
          <div>
            <dt>${ROL_NOMBRE[rol]}</dt>
            <dd class="pequeno" style="font-weight:400">${ROL_DESCRIPCION[rol]}</dd>
          </div>
        `).join(''))}
      </dl>
    </section>
  `;
}

export function montar(raiz, { recargar }) {
  delegar(raiz, 'click', '[data-accion="nuevo-usuario"]', () => {
    formularioAbierto = !formularioAbierto;
    recargar();
  });

  delegar(raiz, 'click', '[data-accion="cancelar-usuario"]', () => {
    formularioAbierto = false;
    recargar();
  });

  // La descripcion del rol cambia con el selector, para que quede claro que concede.
  const selectorRol = raiz.querySelector('#form-usuario select[name="rol"]');
  selectorRol?.addEventListener('change', (ev) => {
    const descripcion = raiz.querySelector('#descripcion-rol');
    if (descripcion) descripcion.textContent = ROL_DESCRIPCION[ev.target.value] ?? '';
  });

  const formulario = raiz.querySelector('#form-usuario');
  formulario?.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const error = raiz.querySelector('#error-usuario');
    error.hidden = true;

    if (!formulario.reportValidity()) return;

    const datos = datosFormulario(formulario);
    const boton = formulario.querySelector('button[type="submit"]');

    await conBotonOcupado(boton, async () => {
      try {
        const resultado = await api.usuarios.crear(datos);

        if (resultado.correoEnviado) {
          avisarOk(`Cuenta creada. Se envio la invitacion a ${resultado.usuario.email}.`);
        } else if (resultado.enlaceDesarrollo) {
          avisarAlerta('Cuenta creada. SMTP no esta configurado, asi que el enlace se muestra en pantalla.');
          await abrirModal({
            titulo: 'Enlace de activacion',
            contenido: html`
              <p>No hay servidor de correo configurado, por lo que la invitacion no se envio.
                 Entregue este enlace a <strong>${resultado.usuario.email}</strong>:</p>
              <p class="nota nota--info" style="word-break:break-all">
                <a href="${resultado.enlaceDesarrollo}">${resultado.enlaceDesarrollo}</a>
              </p>
              <p class="pequeno tenue">Vence en una hora y solo puede usarse una vez.</p>
            `,
            acciones: [{ texto: 'Entendido', clase: 'btn--primario', valor: true }]
          });
        } else {
          avisarOk('Cuenta creada.');
        }

        formularioAbierto = false;
        recargar();
      } catch (fallo) {
        error.textContent = fallo.message;
        error.hidden = false;
      }
    });
  });

  delegar(raiz, 'change', '[data-rol-usuario]', async (_ev, campo) => {
    const id = Number(campo.dataset.rolUsuario);
    try {
      await api.usuarios.actualizar(id, { rol: campo.value });
      avisarOk('Rol actualizado.');
      recargar();
    } catch (error) {
      avisarError(error.message);
      recargar();
    }
  });

  delegar(raiz, 'click', '[data-accion="estado-usuario"]', async (_ev, boton) => {
    const id = Number(boton.dataset.id);
    const activo = boton.dataset.activo === 'true';

    const confirmado = await confirmar({
      titulo: activo ? 'Inactivar cuenta' : 'Activar cuenta',
      mensaje: activo
        ? 'La persona no podra iniciar sesion y sus sesiones abiertas se cerraran de inmediato.'
        : 'La persona volvera a poder iniciar sesion.',
      textoConfirmar: activo ? 'Inactivar' : 'Activar',
      peligroso: activo
    });
    if (!confirmado) return;

    try {
      await api.usuarios.actualizar(id, { activo: !activo });
      avisarOk(activo ? 'Cuenta inactivada.' : 'Cuenta activada.');
      recargar();
    } catch (error) {
      avisarError(error.message);
    }
  });

  delegar(raiz, 'click', '[data-accion="restablecer"]', async (_ev, boton) => {
    const id = Number(boton.dataset.id);
    const correo = boton.dataset.correo;

    const confirmado = await confirmar({
      titulo: 'Restablecer contrasena',
      mensaje: `Se enviara a ${correo} un enlace para definir una contrasena nueva y se cerraran sus sesiones abiertas.`,
      textoConfirmar: 'Enviar enlace'
    });
    if (!confirmado) return;

    await conBotonOcupado(boton, async () => {
      try {
        const resultado = await api.usuarios.restablecer(id);
        avisarOk(resultado.mensaje);

        if (resultado.enlaceDesarrollo) {
          await abrirModal({
            titulo: 'Enlace de restablecimiento',
            contenido: html`
              <p>SMTP no esta configurado. Entregue este enlace a <strong>${correo}</strong>:</p>
              <p class="nota nota--info" style="word-break:break-all">
                <a href="${resultado.enlaceDesarrollo}">${resultado.enlaceDesarrollo}</a>
              </p>
            `,
            acciones: [{ texto: 'Entendido', clase: 'btn--primario', valor: true }]
          });
        }
        recargar();
      } catch (error) {
        avisarError(error.message);
      }
    });
  });

  return null;
}
