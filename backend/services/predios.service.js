/**
 * Gestion de predios.
 * Valida los datos de entrada y mantiene la traza de auditoria con antes y despues.
 */

import { ErrorValidacion, ErrorConflicto, ErrorNoEncontrado } from '../errors.js';
import * as predios from '../repositories/predios.repo.js';
import * as auditoria from '../repositories/auditoria.repo.js';
import { obtener as obtenerConfig, CLAVES } from '../repositories/configuracion.repo.js';
import { totalAves, indicadoresAplicables, ponderacion, planMuestreo } from '../../shared/ica/reglas.js';

const SISTEMAS = ['piso', 'jaula'];
const CARGOS = ['Dueno', 'Encargado'];
const RE_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function enteroNoNegativo(valor, campo) {
  const numero = Number(valor ?? 0);
  if (!Number.isInteger(numero) || numero < 0) {
    throw new ErrorValidacion(`${campo} debe ser un numero entero igual o mayor que cero.`);
  }
  return numero;
}

function coordenada(valor, campo, minimo, maximo) {
  if (valor == null || valor === '') return null;
  const numero = Number(valor);
  if (!Number.isFinite(numero) || numero < minimo || numero > maximo) {
    throw new ErrorValidacion(`${campo} debe estar entre ${minimo} y ${maximo}.`);
  }
  return numero;
}

/** Normaliza y valida el payload de un predio. */
function normalizar(datos, { esCreacion }) {
  const limpio = {};

  const texto = (valor) => String(valor ?? '').trim();

  if (esCreacion || datos.nombre !== undefined) {
    const nombre = texto(datos.nombre);
    if (nombre.length < 3) throw new ErrorValidacion('El nombre del predio debe tener al menos 3 caracteres.');
    limpio.nombre = nombre;
  }

  if (esCreacion || datos.sistema !== undefined) {
    const sistema = texto(datos.sistema).toLowerCase();
    if (!SISTEMAS.includes(sistema)) throw new ErrorValidacion('El sistema productivo debe ser piso o jaula.');
    limpio.sistema = sistema;
  }

  if (esCreacion || datos.departamento !== undefined) {
    const departamento = texto(datos.departamento);
    if (!departamento) throw new ErrorValidacion('El departamento es obligatorio.');
    const permitidos = obtenerConfig(CLAVES.CATALOGOS)?.departamentos ?? [];
    if (permitidos.length && !permitidos.includes(departamento)) {
      throw new ErrorValidacion(`El departamento "${departamento}" no esta en el catalogo configurado.`);
    }
    limpio.departamento = departamento;
  }

  if (esCreacion || datos.municipio !== undefined) {
    const municipio = texto(datos.municipio);
    if (!municipio) throw new ErrorValidacion('El municipio es obligatorio.');
    limpio.municipio = municipio;
  }

  if (datos.codigoIca !== undefined) limpio.codigoIca = texto(datos.codigoIca) || null;
  if (datos.vereda !== undefined) limpio.vereda = texto(datos.vereda) || null;
  if (datos.direccion !== undefined) limpio.direccion = texto(datos.direccion) || null;
  if (datos.latitud !== undefined) limpio.latitud = coordenada(datos.latitud, 'La latitud', -5, 14);
  if (datos.longitud !== undefined) limpio.longitud = coordenada(datos.longitud, 'La longitud', -82, -66);

  if (datos.especie !== undefined) {
    const especie = texto(datos.especie) || 'Coturnix coturnix';
    if (especie !== 'Coturnix coturnix') {
      throw new ErrorValidacion('Solo esta habilitada la especie Coturnix coturnix.');
    }
    limpio.especie = especie;
  }

  const inventario = datos.inventario ?? {};
  if (esCreacion || inventario.dia !== undefined) limpio.avesDia = enteroNoNegativo(inventario.dia, 'Las aves de un dia');
  if (esCreacion || inventario.levante !== undefined) limpio.avesLevante = enteroNoNegativo(inventario.levante, 'Las aves en levante');
  if (esCreacion || inventario.produccion !== undefined) limpio.avesProduccion = enteroNoNegativo(inventario.produccion, 'Las aves en produccion');

  const propietario = datos.propietario ?? {};
  if (esCreacion || propietario.nombre !== undefined) {
    const nombre = texto(propietario.nombre);
    if (nombre.length < 3) throw new ErrorValidacion('El nombre del propietario o encargado es obligatorio.');
    limpio.propietarioNombre = nombre;
  }
  if (esCreacion || propietario.cargo !== undefined) {
    const cargo = texto(propietario.cargo) || 'Dueno';
    if (!CARGOS.includes(cargo)) throw new ErrorValidacion('El cargo debe ser Dueno o Encargado.');
    limpio.propietarioCargo = cargo;
  }
  if (esCreacion || propietario.documento !== undefined) {
    const documento = texto(propietario.documento);
    if (documento.length < 5) throw new ErrorValidacion('El documento de identidad del propietario es obligatorio.');
    limpio.propietarioDocumento = documento;
  }
  if (esCreacion || propietario.telefono !== undefined) {
    const telefono = texto(propietario.telefono);
    if (!/^[\d+\s()-]{7,20}$/.test(telefono)) throw new ErrorValidacion('El telefono del propietario no tiene un formato valido.');
    limpio.propietarioTelefono = telefono;
  }
  if (propietario.correo !== undefined) {
    const correo = texto(propietario.correo);
    if (correo && !RE_CORREO.test(correo)) throw new ErrorValidacion('El correo del propietario no es valido.');
    limpio.propietarioCorreo = correo || null;
  }

  if (datos.activo !== undefined) {
    if (typeof datos.activo !== 'boolean') throw new ErrorValidacion('El estado activo debe ser verdadero o falso.');
    limpio.activo = datos.activo;
  }

  return limpio;
}

/** Datos derivados de la norma que la interfaz muestra junto al predio. */
function conMetadatosIca(predio) {
  if (!predio) return null;
  const total = predio.totalAves;
  return {
    ...predio,
    ica: {
      ponderacion: ponderacion(total),
      muestreo: planMuestreo(total),
      indicadoresAplicables: indicadoresAplicables({ totalAves: total, sistema: predio.sistema }).length,
      evaluaGestion: total >= 200
    }
  };
}

export function listar(filtros = {}) {
  return predios.listar(filtros).map(conMetadatosIca);
}

export function obtener(id) {
  const predio = predios.buscarPorId(id);
  if (!predio) throw new ErrorNoEncontrado('Predio');
  return conMetadatosIca(predio);
}

export function crear(datos, { actor, ip = null, userAgent = null }) {
  const limpio = normalizar(datos, { esCreacion: true });

  const total = totalAves({
    dia: limpio.avesDia,
    levante: limpio.avesLevante,
    produccion: limpio.avesProduccion
  });
  if (total < 1) throw new ErrorValidacion('El predio debe tener al menos un ave registrada.');

  if (limpio.codigoIca && predios.buscarPorCodigoIca(limpio.codigoIca)) {
    throw new ErrorConflicto(`Ya existe un predio con el codigo ICA ${limpio.codigoIca}.`);
  }

  const creado = predios.crear(limpio, actor?.id ?? null);

  auditoria.registrar({
    usuario: actor,
    accion: 'crear', entidad: 'predio', entidadId: creado.id,
    datosDespues: { nombre: creado.nombre, municipio: creado.municipio, totalAves: creado.totalAves },
    ip, userAgent
  });

  return conMetadatosIca(creado);
}

export function actualizar(id, datos, { actor, ip = null, userAgent = null }) {
  const actual = predios.buscarPorId(id);
  if (!actual) throw new ErrorNoEncontrado('Predio');

  const limpio = normalizar(datos, { esCreacion: false });

  const inventarioNuevo = {
    dia: limpio.avesDia ?? actual.inventario.dia,
    levante: limpio.avesLevante ?? actual.inventario.levante,
    produccion: limpio.avesProduccion ?? actual.inventario.produccion
  };
  if (totalAves(inventarioNuevo) < 1) {
    throw new ErrorValidacion('El predio debe tener al menos un ave registrada.');
  }

  if (limpio.codigoIca) {
    const otro = predios.buscarPorCodigoIca(limpio.codigoIca);
    if (otro && otro.id !== Number(id)) {
      throw new ErrorConflicto(`El codigo ICA ${limpio.codigoIca} ya pertenece a otro predio.`);
    }
  }

  // Cambiar el sistema productivo altera que indicadores aplican, asi que no se
  // permite mientras haya una visita en curso sobre ese predio.
  if (limpio.sistema && limpio.sistema !== actual.sistema && actual.evaluacionAbierta) {
    throw new ErrorConflicto('No se puede cambiar el sistema productivo mientras hay una evaluacion en progreso.');
  }

  const actualizado = predios.actualizar(id, limpio);

  auditoria.registrar({
    usuario: actor,
    accion: 'actualizar', entidad: 'predio', entidadId: id,
    datosAntes: { nombre: actual.nombre, sistema: actual.sistema, totalAves: actual.totalAves, activo: actual.activo },
    datosDespues: { nombre: actualizado.nombre, sistema: actualizado.sistema, totalAves: actualizado.totalAves, activo: actualizado.activo },
    ip, userAgent
  });

  return conMetadatosIca(actualizado);
}

/** Baja o alta logica: nunca se borra un predio con historial. */
export function cambiarEstado(id, activo, { actor, ip = null, userAgent = null }) {
  const actual = predios.buscarPorId(id);
  if (!actual) throw new ErrorNoEncontrado('Predio');

  if (!activo && actual.evaluacionAbierta) {
    throw new ErrorConflicto('No se puede inactivar un predio con una evaluacion en progreso. Cierrela o anulela primero.');
  }

  const actualizado = predios.actualizar(id, { activo });

  auditoria.registrar({
    usuario: actor,
    accion: activo ? 'activar' : 'inactivar', entidad: 'predio', entidadId: id,
    datosAntes: { activo: actual.activo }, datosDespues: { activo },
    ip, userAgent
  });

  return conMetadatosIca(actualizado);
}
