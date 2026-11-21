/**
 * Estado compartido del cliente.
 *
 * Guarda lo que vale la pena no volver a pedir (catalogo ICA, configuracion,
 * usuario) y nada mas. Los datos de cada vista se piden al entrar en ella, para
 * que la pantalla siempre refleje el servidor y no una copia que se quedo vieja.
 */

import { api } from './api.js';
import { sesion } from './sesion.js';

const estado = {
  usuario: null,
  catalogo: null,
  permisos: null,
  configuracion: null,
  // Filtros del panel: se conservan mientras dure la sesion de navegacion.
  filtrosPanel: { departamento: '', municipio: '', nivel: '', desde: '', hasta: '' }
};

const suscriptores = new Set();

const notificar = () => suscriptores.forEach((oyente) => oyente(estado));

export const store = {
  get estado() { return estado; },
  get usuario() { return estado.usuario; },
  get catalogo() { return estado.catalogo; },
  get configuracion() { return estado.configuracion; },

  suscribir(oyente) {
    suscriptores.add(oyente);
    return () => suscriptores.delete(oyente);
  },

  establecerUsuario(usuario) {
    estado.usuario = usuario;
    if (usuario) sesion.actualizarUsuario(usuario);
    notificar();
  },

  /** Carga el catalogo ICA y la configuracion una sola vez por sesion. */
  async cargarReferencias({ forzar = false } = {}) {
    if (estado.catalogo && estado.permisos && estado.configuracion && !forzar) return;

    const [catalogo, permisos, configuracion] = await Promise.all([
      api.catalogo.obtener(),
      api.catalogo.permisos(),
      api.catalogo.configuracion()
    ]);

    estado.catalogo = catalogo;
    estado.permisos = permisos;
    estado.configuracion = configuracion;
    notificar();
  },

  /** Indicador del catalogo por codigo. */
  indicador(codigo) {
    return estado.catalogo?.indicadores.find((item) => item.codigo === codigo) ?? null;
  },

  get departamentos() {
    return estado.configuracion?.catalogos?.departamentos ?? [];
  },

  get niveles() {
    return estado.catalogo?.tablas?.niveles ?? [];
  },

  actualizarFiltrosPanel(cambios) {
    Object.assign(estado.filtrosPanel, cambios);
    notificar();
  },

  limpiar() {
    estado.usuario = null;
    estado.catalogo = null;
    estado.permisos = null;
    estado.configuracion = null;
    estado.filtrosPanel = { departamento: '', municipio: '', nivel: '', desde: '', hasta: '' };
    notificar();
  }
};

export default store;
