/**
 * Cliente HTTP de la API.
 *
 * Centraliza la URL base, la cabecera de autorizacion, el formato de error y
 * el cierre de sesion cuando el token deja de servir. Ninguna vista llama a
 * fetch directamente.
 */

import { sesion } from './sesion.js';

const BASE = '/api';

/** Error de API con el estado y el codigo que devolvio el servidor. */
export class ErrorApi extends Error {
  constructor(mensaje, { estado, codigo, detalles } = {}) {
    super(mensaje);
    this.name = 'ErrorApi';
    this.estado = estado;
    this.codigo = codigo;
    this.detalles = detalles;
  }
}

/** Se dispara cuando el servidor rechaza la sesion, para que la app vuelva al acceso. */
const oyentesSesionInvalida = new Set();
export const alPerderSesion = (oyente) => oyentesSesionInvalida.add(oyente);

async function peticion(ruta, { metodo = 'GET', cuerpo, cabeceras = {}, esFormData = false, sinAuth = false } = {}) {
  const opciones = { method: metodo, headers: { Accept: 'application/json', ...cabeceras } };

  const token = sesion.token();
  if (token && !sinAuth) opciones.headers.Authorization = `Bearer ${token}`;

  if (cuerpo !== undefined) {
    if (esFormData) {
      // El navegador debe poner el Content-Type con su boundary.
      opciones.body = cuerpo;
    } else {
      opciones.headers['Content-Type'] = 'application/json';
      opciones.body = JSON.stringify(cuerpo);
    }
  }

  let respuesta;
  try {
    respuesta = await fetch(`${BASE}${ruta}`, opciones);
  } catch {
    throw new ErrorApi('No se pudo contactar al servidor. Verifique su conexion.', { estado: 0, codigo: 'SIN_RED' });
  }

  // 204 y 205 no traen cuerpo.
  if (respuesta.status === 204 || respuesta.status === 205) return null;

  const tipo = respuesta.headers.get('content-type') ?? '';
  const esJson = tipo.includes('application/json');
  const datos = esJson ? await respuesta.json().catch(() => null) : await respuesta.text();

  if (respuesta.ok) return datos;

  const mensaje = (esJson && datos?.mensaje) || `Error ${respuesta.status} al consultar el servidor.`;
  const error = new ErrorApi(mensaje, {
    estado: respuesta.status,
    codigo: esJson ? datos?.error : 'HTTP',
    detalles: esJson ? datos?.detalles : null
  });

  // Un 401 con sesion activa significa que el token vencio o fue revocado.
  if (respuesta.status === 401 && token && !sinAuth) {
    sesion.limpiar();
    oyentesSesionInvalida.forEach((oyente) => oyente(error));
  }

  throw error;
}

const get = (ruta) => peticion(ruta);
const post = (ruta, cuerpo, opciones) => peticion(ruta, { metodo: 'POST', cuerpo, ...opciones });
const put = (ruta, cuerpo) => peticion(ruta, { metodo: 'PUT', cuerpo });
const patch = (ruta, cuerpo) => peticion(ruta, { metodo: 'PATCH', cuerpo });
const borrar = (ruta) => peticion(ruta, { metodo: 'DELETE' });

/** Convierte un objeto de filtros en query string, omitiendo vacios. */
function consulta(parametros = {}) {
  const partes = Object.entries(parametros)
    .filter(([, valor]) => valor != null && valor !== '')
    .map(([clave, valor]) => `${encodeURIComponent(clave)}=${encodeURIComponent(valor)}`);
  return partes.length ? `?${partes.join('&')}` : '';
}

export const api = {
  salud: () => peticion('/health', { sinAuth: true }),

  auth: {
    login: (identificador, password) =>
      post('/auth/login', { identificador, password }, { sinAuth: true }),
    yo: () => get('/auth/me'),
    logout: () => post('/auth/logout'),
    cambiarPassword: (passwordActual, passwordNueva) =>
      post('/auth/cambiar-password', { passwordActual, passwordNueva }),
    recuperar: (correo) => post('/auth/recuperar', { correo }, { sinAuth: true }),
    validarTokenReset: (token) => peticion(`/auth/restablecer/${encodeURIComponent(token)}`, { sinAuth: true }),
    restablecer: (token, passwordNueva) =>
      post('/auth/restablecer', { token, passwordNueva }, { sinAuth: true })
  },

  usuarios: {
    listar: () => get('/usuarios'),
    obtener: (id) => get(`/usuarios/${id}`),
    crear: (datos) => post('/usuarios', datos),
    actualizar: (id, cambios) => patch(`/usuarios/${id}`, cambios),
    reenviarInvitacion: (id) => post(`/usuarios/${id}/reenviar-invitacion`),
    restablecer: (id) => post(`/usuarios/${id}/restablecer`)
  },

  predios: {
    listar: (filtros) => get(`/predios${consulta(filtros)}`),
    obtener: (id) => get(`/predios/${id}`),
    crear: (datos) => post('/predios', datos),
    actualizar: (id, datos) => put(`/predios/${id}`, datos),
    cambiarEstado: (id, activo) => post(`/predios/${id}/estado`, { activo })
  },

  evaluaciones: {
    listar: (filtros) => get(`/evaluaciones${consulta(filtros)}`),
    obtener: (id) => get(`/evaluaciones/${id}`),
    crear: (predioId, fechaVisita) => post('/evaluaciones', { predioId, fechaVisita }),
    actualizarInspeccion: (id, datos) => patch(`/evaluaciones/${id}/inspeccion`, datos),
    generarMuestra: (id) => post(`/evaluaciones/${id}/muestra`),
    guardarRespuestas: (id, respuestas) => put(`/evaluaciones/${id}/respuestas`, { respuestas }),
    validar: (id) => get(`/evaluaciones/${id}/validacion`),
    cerrar: (id) => post(`/evaluaciones/${id}/cerrar`),
    emitirDefinitiva: (id) => post(`/evaluaciones/${id}/definitiva`),
    anular: (id, motivo) => post(`/evaluaciones/${id}/anular`, { motivo }),
    formaOficial: (id) => get(`/evaluaciones/${id}/forma-oficial`),
    urlCsv: (id) => `${BASE}/evaluaciones/${id}/csv`,
    urlMarkdown: (id) => `${BASE}/evaluaciones/${id}/reporte.md`,
    evidencias: (id) => get(`/evaluaciones/${id}/evidencias`),
    subirEvidencia: (id, formData) =>
      post(`/evaluaciones/${id}/evidencias`, formData, { esFormData: true })
  },

  evidencias: {
    urlDescarga: (id) => `${BASE}/evidencias/${id}/archivo`,
    actualizar: (id, metadatos) => patch(`/evidencias/${id}`, metadatos),
    eliminar: (id) => borrar(`/evidencias/${id}`)
  },

  planes: {
    acciones: (filtros) => get(`/planes/acciones${consulta(filtros)}`),
    crearAccion: (datos) => post('/planes/acciones', datos),
    actualizarAccion: (id, cambios) => patch(`/planes/acciones/${id}`, cambios),
    recomendaciones: (evaluacionId) => get(`/planes/evaluaciones/${evaluacionId}/recomendaciones`),
    generarRecomendaciones: (evaluacionId, conIa = false) =>
      post(`/planes/evaluaciones/${evaluacionId}/recomendaciones`, { conIa }),
    decidirRecomendacion: (id, estado, texto) => patch(`/planes/recomendaciones/${id}`, { estado, texto })
  },

  reportes: {
    panel: (filtros) => get(`/reportes/panel${consulta(filtros)}`),
    porPredio: (id) => get(`/reportes/predios/${id}`),
    comparar: (a, b) => get(`/reportes/comparar${consulta({ a, b })}`),
    consolidado: () => get('/reportes/consolidado'),
    urlConsolidadoCsv: () => `${BASE}/reportes/consolidado.csv`,
    urlConsolidadoMarkdown: () => `${BASE}/reportes/consolidado.md`,
    urlPredioMarkdown: (id) => `${BASE}/reportes/predios/${id}.md`,
    urlComparacionMarkdown: (a, b) => `${BASE}/reportes/comparar.md${consulta({ a, b })}`
  },

  asistente: {
    estado: () => get('/asistente/estado'),
    preguntar: (pregunta, historial) => post('/asistente/preguntar', { pregunta, historial })
  },

  catalogo: {
    obtener: () => get('/catalogo'),
    permisos: () => get('/catalogo/permisos'),
    configuracion: () => get('/catalogo/configuracion'),
    guardarConfiguracion: (datos) => put('/catalogo/configuracion', datos)
  },

  auditoria: {
    listar: (filtros) => get(`/auditoria${consulta(filtros)}`),
    historial: (entidad, id) => get(`/auditoria/${entidad}/${id}`),
    correos: () => get('/auditoria/correos/recientes')
  }
};

/**
 * Descarga autenticada: fetch con token, Blob y enlace temporal.
 * Un <a href> normal no llevaria la cabecera Authorization.
 */
export async function descargar(url, nombreSugerido) {
  const respuesta = await fetch(url, { headers: { Authorization: `Bearer ${sesion.token()}` } });
  if (!respuesta.ok) {
    throw new ErrorApi('No se pudo descargar el archivo.', { estado: respuesta.status });
  }

  const blob = await respuesta.blob();
  const cabecera = respuesta.headers.get('content-disposition') ?? '';
  const nombreEnCabecera = cabecera.match(/filename="?([^";]+)"?/)?.[1];

  const enlace = document.createElement('a');
  enlace.href = URL.createObjectURL(blob);
  enlace.download = nombreEnCabecera ?? nombreSugerido ?? 'descarga';
  document.body.append(enlace);
  enlace.click();
  enlace.remove();
  URL.revokeObjectURL(enlace.href);
}

export default api;
