/**
 * Formateo para presentacion: numeros, fechas y etiquetas de dominio.
 */

import { html } from './dom.js';

const LOCALE = 'es-CO';

/** Numero con separador de miles y hasta 2 decimales; em dash si no hay valor. */
export function numero(valor, { decimales = 2, vacio = '—' } = {}) {
  if (valor == null || Number.isNaN(Number(valor))) return vacio;
  const n = Number(valor);
  return n.toLocaleString(LOCALE, {
    maximumFractionDigits: decimales,
    minimumFractionDigits: n % 1 === 0 ? 0 : decimales
  });
}

export const entero = (valor, vacio = '—') =>
  valor == null || Number.isNaN(Number(valor)) ? vacio : Number(valor).toLocaleString(LOCALE);

export const porcentaje = (valor, vacio = '—') =>
  valor == null || Number.isNaN(Number(valor)) ? vacio : `${numero(valor)} %`;

/** AAAA-MM-DD -> 6 de marzo de 2026. Se parsea como local para no restar un dia. */
export function fecha(valor, { largo = false } = {}) {
  if (!valor) return '—';
  const soloFecha = String(valor).slice(0, 10);
  const [anio, mes, dia] = soloFecha.split('-').map(Number);
  if (!anio || !mes || !dia) return String(valor);

  const objeto = new Date(anio, mes - 1, dia);
  return objeto.toLocaleDateString(LOCALE,
    largo ? { day: 'numeric', month: 'long', year: 'numeric' } : { day: '2-digit', month: '2-digit', year: 'numeric' }
  );
}

/** Marca de tiempo completa en zona local. */
export function fechaHora(valor) {
  if (!valor) return '—';
  // SQLite devuelve "AAAA-MM-DD HH:MM:SS" en UTC sin indicador de zona.
  const normalizado = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(valor)
    ? `${valor.replace(' ', 'T')}Z`
    : valor;
  const objeto = new Date(normalizado);
  if (Number.isNaN(objeto.getTime())) return String(valor);
  return objeto.toLocaleString(LOCALE, { dateStyle: 'medium', timeStyle: 'short' });
}

/** Distancia temporal legible: "hace 3 dias". */
export function hace(valor) {
  if (!valor) return '—';
  const normalizado = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(valor)
    ? `${valor.replace(' ', 'T')}Z`
    : valor;
  const objeto = new Date(normalizado);
  if (Number.isNaN(objeto.getTime())) return String(valor);

  const segundos = Math.round((Date.now() - objeto.getTime()) / 1000);
  const formateador = new Intl.RelativeTimeFormat(LOCALE, { numeric: 'auto' });
  const escalas = [
    [60, 'second', 1],
    [3600, 'minute', 60],
    [86400, 'hour', 3600],
    [604800, 'day', 86400],
    [2629800, 'week', 604800],
    [31557600, 'month', 2629800],
    [Infinity, 'year', 31557600]
  ];

  for (const [limite, unidad, divisor] of escalas) {
    if (Math.abs(segundos) < limite) return formateador.format(-Math.round(segundos / divisor), unidad);
  }
  return fechaHora(valor);
}

/** Fecha de hoy en formato AAAA-MM-DD, en zona local. */
export const hoy = () => new Date().toLocaleDateString('en-CA');

export const bytes = (valor) => {
  if (!valor) return '—';
  const unidades = ['B', 'KB', 'MB', 'GB'];
  let n = Number(valor);
  let i = 0;
  while (n >= 1024 && i < unidades.length - 1) { n /= 1024; i += 1; }
  return `${n.toFixed(i === 0 ? 0 : 1)} ${unidades[i]}`;
};

// --- Etiquetas de dominio ----------------------------------------------------

const TONO_NIVEL = { Excelente: 'excelente', Alto: 'alto', Medio: 'medio', Bajo: 'bajo' };

export const insigniaNivel = (nivel) =>
  nivel
    ? html`<span class="insignia insignia--${TONO_NIVEL[nivel] ?? ''}">${nivel}</span>`
    : html`<span class="insignia">—</span>`;

const ESTADO_EVALUACION = {
  en_progreso: { texto: 'En progreso', tono: 'alerta' },
  cerrada: { texto: 'Cerrada', tono: 'marca' },
  anulada: { texto: 'Anulada', tono: 'error' }
};

export const insigniaEstado = (estado) => {
  const dato = ESTADO_EVALUACION[estado] ?? { texto: estado, tono: '' };
  return html`<span class="insignia insignia--${dato.tono}">${dato.texto}</span>`;
};

const ESTADO_ACCION = {
  pendiente: { texto: 'Pendiente', tono: '' },
  en_curso: { texto: 'En curso', tono: 'info' },
  cumplida: { texto: 'Cumplida', tono: 'ok' }
};

export const insigniaAccion = (estado) => {
  const dato = ESTADO_ACCION[estado] ?? { texto: estado, tono: '' };
  return html`<span class="insignia insignia--${dato.tono}">${dato.texto}</span>`;
};

/** Estado activo/inactivo de un predio o una cuenta. */
export const insigniaActivo = (activo) =>
  activo
    ? html`<span class="insignia insignia--ok">Activo</span>`
    : html`<span class="insignia">Inactivo</span>`;

/** Resultado de una entrada de auditoria. */
export const insigniaResultado = (resultado) =>
  resultado === 'fallo'
    ? html`<span class="insignia insignia--error">Fallo</span>`
    : html`<span class="insignia insignia--ok">Exito</span>`;

export const insigniaPuntaje = (valor) => {
  if (valor == null) return html`<span class="insignia">Sin responder</span>`;
  const tono = valor === 100 ? 'ok' : valor === 0 ? 'error' : 'alerta';
  return html`<span class="insignia insignia--${tono}">${valor} pts</span>`;
};

export const tonoPuntaje = (valor) =>
  valor == null ? '' : valor === 100 ? 'ok' : valor === 0 ? 'error' : 'alerta';

export const nombreEstadoAccion = (estado) => ESTADO_ACCION[estado]?.texto ?? estado;

/** Una accion esta atrasada si no se cumplio y su fecha limite ya paso. */
export const estaAtrasada = (accion) => accion.estado !== 'cumplida' && accion.fechaLimite < hoy();

export const plural = (cantidad, singular, pluralTexto) =>
  `${entero(cantidad)} ${cantidad === 1 ? singular : pluralTexto ?? `${singular}s`}`;
