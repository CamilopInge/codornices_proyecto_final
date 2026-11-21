/**
 * Predios: listado, alta, edicion y apertura de una visita.
 */

import { html, crudo, datosFormulario, conBotonOcupado, delegar } from '../core/dom.js';
import { api } from '../core/api.js';
import { store } from '../core/store.js';
import { cabecera } from '../componentes/layout.js';
import { esqueletoTabla, vacio, avisarOk, avisarError, confirmar, abrirModal } from '../core/ui.js';
import { entero, fecha, hoy, insigniaActivo } from '../core/formato.js';
import { puede } from '/shared/ica/roles.js';

export const esqueleto = () => esqueletoTabla(6);

const CARGOS = ['Dueno', 'Encargado'];

function formulario(predio, departamentos) {
  const esEdicion = Boolean(predio);
  const p = predio ?? {};
  const inv = p.inventario ?? { dia: 0, levante: 0, produccion: 0 };
  const prop = p.propietario ?? {};
  const v = (valor) => valor ?? '';

  return html`
    <form id="form-predio" class="pila" novalidate ${crudo(esEdicion ? `data-id="${p.id}"` : '')}>
      <p class="encabezillo">Datos del predio</p>
      <div class="rejilla-campos">
        <label>Nombre del predio *
          <input name="nombre" required minlength="3" value="${v(p.nombre)}">
        </label>
        <label>Codigo ICA
          <input name="codigoIca" value="${v(p.codigoIca)}" placeholder="Opcional">
        </label>
        <label>Sistema productivo *
          <select name="sistema" required>
            <option value="jaula" ${crudo(p.sistema === 'jaula' ? 'selected' : '')}>Jaula</option>
            <option value="piso" ${crudo(p.sistema === 'piso' ? 'selected' : '')}>Piso</option>
          </select>
        </label>
        <label>Especie
          <input value="Coturnix coturnix" disabled>
        </label>
        <label>Departamento *
          <select name="departamento" required>
            <option value="">Seleccione...</option>
            ${crudo(departamentos.map((d) => html`
              <option value="${d}" ${crudo(p.departamento === d ? 'selected' : '')}>${d}</option>
            `).join(''))}
          </select>
        </label>
        <label>Municipio *
          <input name="municipio" required value="${v(p.municipio)}">
        </label>
        <label>Vereda
          <input name="vereda" value="${v(p.vereda)}">
        </label>
        <label>Direccion
          <input name="direccion" value="${v(p.direccion)}">
        </label>
        <label>Latitud
          <input name="latitud" type="number" step="any" min="-5" max="14" value="${v(p.latitud)}" placeholder="Opcional">
        </label>
        <label>Longitud
          <input name="longitud" type="number" step="any" min="-82" max="-66" value="${v(p.longitud)}" placeholder="Opcional">
        </label>
      </div>

      <p class="encabezillo">Inventario de aves</p>
      <div class="rejilla-campos">
        <label>Aves de un dia *
          <input name="dia" type="number" min="0" required value="${inv.dia ?? 0}">
        </label>
        <label>Aves en levante *
          <input name="levante" type="number" min="0" required value="${inv.levante ?? 0}">
        </label>
        <label>Aves en produccion *
          <input name="produccion" type="number" min="0" required value="${inv.produccion ?? 0}">
        </label>
      </div>
      <p class="nota nota--info" id="aviso-inventario">
        El total de aves decide la ponderacion y el muestreo de la visita.
      </p>

      <p class="encabezillo">Propietario o encargado</p>
      <div class="rejilla-campos">
        <label>Nombre completo *
          <input name="propNombre" required minlength="3" value="${v(prop.nombre)}">
        </label>
        <label>Cargo *
          <select name="propCargo" required>
            ${crudo(CARGOS.map((c) => html`
              <option value="${c}" ${crudo(prop.cargo === c ? 'selected' : '')}>${c}</option>
            `).join(''))}
          </select>
        </label>
        <label>Documento de identidad *
          <input name="propDocumento" required minlength="5" value="${v(prop.documento)}">
        </label>
        <label>Telefono *
          <input name="propTelefono" type="tel" required value="${v(prop.telefono)}">
        </label>
        <label>Correo electronico
          <input name="propCorreo" type="email" value="${v(prop.correo)}" placeholder="Opcional">
        </label>
      </div>

      <p class="nota nota--error" id="error-predio" role="alert" hidden></p>

      <div class="fila fila--fin">
        <button type="button" class="btn" data-accion="cancelar-predio">Cancelar</button>
        <button type="submit" class="btn btn--primario">
          ${esEdicion ? 'Guardar cambios' : 'Registrar predio'}
        </button>
      </div>
    </form>
  `;
}

function tabla(predios, puedeEscribir, puedeEvaluar) {
  if (!predios.length) {
    return vacio({
      icono: '⌂',
      titulo: 'No hay predios registrados',
      mensaje: 'Registre el primer predio para poder abrir visitas de evaluacion.',
      accion: puedeEscribir
        ? '<button type="button" class="btn btn--primario" data-accion="nuevo-predio">Registrar predio</button>'
        : null
    });
  }

  return html`
    <div class="tabla-envoltura">
      <table>
        <caption class="solo-lectores">Predios registrados</caption>
        <thead>
          <tr>
            <th scope="col">Predio</th>
            <th scope="col">Sistema</th>
            <th scope="col">Ubicacion</th>
            <th scope="col">Propietario</th>
            <th scope="col" class="num">Aves</th>
            <th scope="col">Indicadores</th>
            <th scope="col">Estado</th>
            <th scope="col"><span class="solo-lectores">Acciones</span></th>
          </tr>
        </thead>
        <tbody>
          ${crudo(predios.map((predio) => html`
            <tr>
              <td>
                <strong>${predio.nombre}</strong>
                ${predio.codigoIca ? html`<br><span class="mono pequeno tenue">${predio.codigoIca}</span>` : ''}
              </td>
              <td class="compacta">${predio.sistema === 'piso' ? 'Piso' : 'Jaula'}</td>
              <td>
                ${predio.municipio}, ${predio.departamento}
                ${predio.vereda ? html`<br><span class="pequeno tenue">Vda. ${predio.vereda}</span>` : ''}
              </td>
              <td>
                ${predio.propietario.nombre}
                <br><span class="pequeno tenue">${predio.propietario.cargo} &middot; ${predio.propietario.telefono}</span>
              </td>
              <td class="num">${entero(predio.totalAves)}</td>
              <td class="compacta">
                <span class="mono">${predio.ica.indicadoresAplicables}</span>
                <span class="pequeno tenue">${predio.ica.evaluaGestion ? 'MBA·MBR·MBG' : 'MBA·MBR'}</span>
              </td>
              <td class="compacta">${insigniaActivo(predio.activo)}</td>
              <td class="compacta">
                <div class="fila" style="gap:.35rem">
                  ${predio.evaluacionAbierta
                    ? html`<a class="btn btn--chico btn--primario" href="#/evaluaciones?predio=${predio.id}">Visita abierta</a>`
                    : puedeEvaluar && predio.activo
                      ? html`<button type="button" class="btn btn--chico btn--primario" data-accion="evaluar" data-id="${predio.id}">Evaluar</button>`
                      : ''}
                  ${puedeEscribir ? html`
                    <button type="button" class="btn btn--chico btn--fantasma" data-accion="editar" data-id="${predio.id}">Editar</button>
                    <button type="button" class="btn btn--chico btn--fantasma" data-accion="estado" data-id="${predio.id}" data-activo="${predio.activo}">
                      ${predio.activo ? 'Inactivar' : 'Activar'}
                    </button>
                  ` : ''}
                </div>
              </td>
            </tr>
          `).join(''))}
        </tbody>
      </table>
    </div>
  `;
}

// El formulario se abre y cierra sin recargar la vista entera.
let formularioAbierto = false;
let predioEnEdicion = null;

export async function render() {
  const puedeEscribir = puede(store.usuario.rol, 'predios', 'w');
  const puedeEvaluar = puede(store.usuario.rol, 'evaluaciones', 'w');
  const predios = await api.predios.listar();

  return html`
    ${crudo(cabecera({
      encabezillo: 'Predios',
      titulo: 'Predios registrados',
      descripcion: 'Cada predio guarda su sistema productivo y su inventario. Esos datos determinan que indicadores ICA aplican y cual es el tamano de la muestra.',
      acciones: puedeEscribir
        ? html`<button type="button" class="btn btn--primario" data-accion="nuevo-predio">
                 ${formularioAbierto && !predioEnEdicion ? 'Cerrar formulario' : 'Registrar predio'}
               </button>`
        : ''
    }))}

    <div id="zona-formulario">
      ${formularioAbierto
        ? crudo(`<section class="panel">${formulario(predioEnEdicion, store.departamentos)}</section>`)
        : ''}
    </div>

    ${crudo(tabla(predios, puedeEscribir, puedeEvaluar))}
  `;
}

export function montar(raiz, { recargar, ir }) {
  const alternarFormulario = (predio = null) => {
    const mismoEstado = formularioAbierto && predioEnEdicion?.id === predio?.id;
    formularioAbierto = !mismoEstado;
    predioEnEdicion = formularioAbierto ? predio : null;
    recargar();
  };

  delegar(raiz, 'click', '[data-accion="nuevo-predio"]', () => alternarFormulario(null));
  delegar(raiz, 'click', '[data-accion="cancelar-predio"]', () => {
    formularioAbierto = false;
    predioEnEdicion = null;
    recargar();
  });

  delegar(raiz, 'click', '[data-accion="editar"]', async (_ev, boton) => {
    try {
      const predio = await api.predios.obtener(Number(boton.dataset.id));
      formularioAbierto = true;
      predioEnEdicion = predio;
      recargar();
    } catch (error) {
      avisarError(error.message);
    }
  });

  delegar(raiz, 'click', '[data-accion="estado"]', async (_ev, boton) => {
    const id = Number(boton.dataset.id);
    const activo = boton.dataset.activo === 'true';

    const confirmado = await confirmar({
      titulo: activo ? 'Inactivar predio' : 'Activar predio',
      mensaje: activo
        ? 'El predio dejara de aparecer para nuevas visitas. Su historial se conserva.'
        : 'El predio volvera a estar disponible para abrir visitas.',
      textoConfirmar: activo ? 'Inactivar' : 'Activar'
    });
    if (!confirmado) return;

    try {
      await api.predios.cambiarEstado(id, !activo);
      avisarOk(activo ? 'Predio inactivado.' : 'Predio activado.');
      recargar();
    } catch (error) {
      avisarError(error.message);
    }
  });

  delegar(raiz, 'click', '[data-accion="evaluar"]', async (_ev, boton) => {
    const id = Number(boton.dataset.id);

    const fechaVisita = await abrirModal({
      titulo: 'Abrir visita de evaluacion',
      contenido: html`
        <p>Se creara una evaluacion con el catalogo ICA vigente y el plan de muestreo que corresponda al inventario del predio.</p>
        <label style="margin-top:1rem">Fecha de la visita
          <input id="fecha-visita" type="date" value="${hoy()}" max="${hoy()}" required>
        </label>
      `,
      acciones: [
        { texto: 'Cancelar', valor: null },
        {
          texto: 'Abrir visita',
          clase: 'btn--primario',
          alPulsar: (capa) => {
            const campo = capa.querySelector('#fecha-visita');
            if (!campo.value) { campo.setAttribute('aria-invalid', 'true'); return false; }
            return campo.value;
          }
        }
      ]
    });

    if (!fechaVisita) return;

    try {
      const evaluacion = await api.evaluaciones.crear(id, fechaVisita);
      avisarOk(`Visita abierta: ${evaluacion.codigo} con ${evaluacion.indicadores.length} indicadores.`);
      ir(`/evaluaciones/${evaluacion.id}`);
    } catch (error) {
      avisarError(error.message);
    }
  });

  // --- Envio del formulario ---
  const formularioPredio = raiz.querySelector('#form-predio');
  if (!formularioPredio) return null;

  const avisoInventario = raiz.querySelector('#aviso-inventario');

  const recalcularInventario = () => {
    const datos = datosFormulario(formularioPredio);
    const total = (datos.dia ?? 0) + (datos.levante ?? 0) + (datos.produccion ?? 0);

    if (total < 1) {
      avisoInventario.className = 'nota nota--alerta';
      avisoInventario.textContent = 'Debe registrar al menos un ave.';
      return;
    }

    const grande = total >= 200;
    avisoInventario.className = 'nota nota--info';
    avisoInventario.innerHTML = html`
      Total: <strong>${entero(total)} aves</strong>.
      Ponderacion ${grande ? '60/25/15 (MBA/MBR/MBG)' : '70/30 (MBA/MBR, sin gestion)'} &middot;
      muestreo de ${grande ? '2 corrales, 9 puntos y 90 aves' : '1 corral, 5 puntos y 50 aves'}.
    `;
  };

  recalcularInventario();
  formularioPredio.addEventListener('input', (ev) => {
    if (['dia', 'levante', 'produccion'].includes(ev.target.name)) recalcularInventario();
  });

  formularioPredio.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const error = raiz.querySelector('#error-predio');
    error.hidden = true;

    if (!formularioPredio.reportValidity()) return;

    const datos = datosFormulario(formularioPredio);
    const cuerpo = {
      nombre: datos.nombre,
      codigoIca: datos.codigoIca || null,
      sistema: datos.sistema,
      departamento: datos.departamento,
      municipio: datos.municipio,
      vereda: datos.vereda || null,
      direccion: datos.direccion || null,
      latitud: datos.latitud,
      longitud: datos.longitud,
      inventario: { dia: datos.dia ?? 0, levante: datos.levante ?? 0, produccion: datos.produccion ?? 0 },
      propietario: {
        nombre: datos.propNombre,
        cargo: datos.propCargo,
        documento: datos.propDocumento,
        telefono: datos.propTelefono,
        correo: datos.propCorreo || null
      }
    };

    const boton = formularioPredio.querySelector('button[type="submit"]');
    const id = formularioPredio.dataset.id;

    await conBotonOcupado(boton, async () => {
      try {
        if (id) {
          await api.predios.actualizar(Number(id), cuerpo);
          avisarOk('Predio actualizado.');
        } else {
          await api.predios.crear(cuerpo);
          avisarOk('Predio registrado.');
        }
        formularioAbierto = false;
        predioEnEdicion = null;
        recargar();
      } catch (fallo) {
        error.textContent = fallo.message;
        error.hidden = false;
        error.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    });
  });

  return null;
}
