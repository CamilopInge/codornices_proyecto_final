/**
 * Evidencias documentales.
 *
 * Correccion de seguridad respecto a la version anterior: la descarga exigia
 * estar autenticado pero no comprobaba de quien era la evidencia, asi que
 * cualquier usuario podia bajar el archivo de otro probando identificadores.
 * Aqui toda lectura pasa por verificarAcceso.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import config from '../config/env.js';
import { ErrorValidacion, ErrorNoEncontrado, ErrorConflicto, ErrorAutorizacion } from '../errors.js';
import * as repo from '../repositories/evidencias.repo.js';
import * as evaluaciones from '../repositories/evaluaciones.repo.js';
import * as auditoria from '../repositories/auditoria.repo.js';
import { INDICE } from '../../shared/ica/catalogo.js';

/** Firmas binarias: el contenido debe coincidir con la extension declarada. */
const FIRMAS = {
  'application/pdf': (buffer) => buffer.subarray(0, 5).toString() === '%PDF-',
  'image/jpeg': (buffer) => buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff,
  'image/png': (buffer) => buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
};

function verificarAcceso(evaluacion, actor) {
  if (!evaluacion) throw new ErrorNoEncontrado('Evaluacion');
  const esDueno = evaluacion.usuarioId === actor.id;
  const esSupervisor = actor.rol === 'admin' || actor.rol === 'docente';
  if (!esDueno && !esSupervisor) {
    throw new ErrorAutorizacion('No tiene acceso a las evidencias de esta evaluacion.');
  }
}

function borrarArchivo(nombreAlmacenado) {
  const ruta = path.join(config.rutas.evidencias, nombreAlmacenado);
  // Nunca se construye una ruta fuera del directorio de evidencias.
  if (!ruta.startsWith(config.rutas.evidencias)) return;
  fs.rmSync(ruta, { force: true });
}

/**
 * Registra una evidencia ya subida por multer y la vincula a la respuesta.
 * Si el contenido no coincide con el formato declarado, el archivo se elimina.
 */
export function registrar({ evaluacionId, indicador, archivo, metadatos = {}, actor, ip = null, userAgent = null }) {
  const evaluacion = evaluaciones.buscarPorId(evaluacionId);
  verificarAcceso(evaluacion, actor);

  if (evaluacion.estado !== 'en_progreso') {
    borrarArchivo(archivo.filename);
    throw new ErrorConflicto('Solo se pueden adjuntar evidencias mientras la evaluacion esta en progreso.');
  }

  const codigo = String(indicador || '').trim().toUpperCase();
  if (!INDICE[codigo]) {
    borrarArchivo(archivo.filename);
    throw new ErrorValidacion(`El indicador ${codigo} no existe en el catalogo ICA.`);
  }
  if (!evaluacion.indicadores.includes(codigo)) {
    borrarArchivo(archivo.filename);
    throw new ErrorValidacion(`El indicador ${codigo} no aplica a esta evaluacion.`);
  }

  const ruta = path.join(config.rutas.evidencias, archivo.filename);
  const contenido = fs.readFileSync(ruta);

  const verificarFirma = FIRMAS[archivo.mimetype];
  if (!verificarFirma || !verificarFirma(contenido)) {
    borrarArchivo(archivo.filename);
    throw new ErrorValidacion('El contenido del archivo no corresponde al formato declarado.');
  }

  const sha256 = crypto.createHash('sha256').update(contenido).digest('hex');

  const duplicada = repo.buscarPorHash(evaluacion.id, sha256);
  if (duplicada) {
    borrarArchivo(archivo.filename);
    throw new ErrorConflicto(
      `Este archivo ya esta adjunto en esta evaluacion para el indicador ${duplicada.indicador}.`
    );
  }

  const validacion = {
    extension: path.extname(archivo.originalname).toLowerCase(),
    mimeDeclarado: archivo.mimetype,
    firmaBinariaValida: true,
    sha256,
    verificadoEn: new Date().toISOString(),
    // Estas comprobaciones requieren una fuente oficial que el sistema aun no consulta.
    firmaProfesional: 'pendiente_verificacion_oficial',
    matriculaComvezcol: 'pendiente_verificacion_oficial',
    entidadEmisora: 'pendiente_verificacion_oficial',
    contenido: 'requiere_revision_humana'
  };

  const evidencia = repo.crear({
    evaluacionId: evaluacion.id,
    indicador: codigo,
    usuarioId: actor.id,
    nombreOriginal: archivo.originalname,
    nombreAlmacenado: archivo.filename,
    mime: archivo.mimetype,
    tamanoBytes: archivo.size,
    sha256,
    vigenciaHasta: metadatos.vigenciaHasta ?? null,
    firmado: Boolean(metadatos.firmado),
    legible: Boolean(metadatos.legible),
    matricula: metadatos.matricula ?? null,
    validacion
  });

  evaluaciones.vincularEvidencia(evaluacion.id, codigo, evidencia.id);

  // Las marcas del documento se reflejan tambien en la respuesta, que es lo que
  // lee la validacion de cierre; asi no quedan dos versiones del mismo dato.
  evaluaciones.actualizarDocumentoRespuesta(evaluacion.id, codigo, {
    vigenciaHasta: metadatos.vigenciaHasta ?? null,
    firmado: Boolean(metadatos.firmado),
    legible: Boolean(metadatos.legible),
    matricula: metadatos.matricula ?? null
  });

  auditoria.registrar({
    usuario: actor,
    accion: 'subir_evidencia', entidad: 'evidencia', entidadId: evidencia.id,
    datosDespues: {
      evaluacion: evaluacion.codigo, indicador: codigo,
      archivo: archivo.originalname, sha256, tamanoBytes: archivo.size
    },
    ip, userAgent
  });

  return evidencia;
}

export function listar(evaluacionId, actor) {
  const evaluacion = evaluaciones.buscarPorId(evaluacionId);
  verificarAcceso(evaluacion, actor);
  return repo.listarDeEvaluacion(evaluacionId);
}

/** Devuelve la ruta del archivo, tras comprobar que el usuario puede verlo. */
export function rutaDescarga(evidenciaId, actor, { ip = null, userAgent = null } = {}) {
  const evidencia = repo.buscarConPropietario(evidenciaId);
  if (!evidencia || evidencia.eliminadaEn) throw new ErrorNoEncontrado('Evidencia');

  const esDueno = evidencia.evaluacionUsuarioId === actor.id;
  const esSupervisor = actor.rol === 'admin' || actor.rol === 'docente';
  if (!esDueno && !esSupervisor) {
    auditoria.registrar({
      usuario: actor,
      accion: 'descargar_evidencia', entidad: 'evidencia', entidadId: evidenciaId,
      resultado: 'fallo', detalle: { motivo: 'sin acceso' }, ip, userAgent
    });
    throw new ErrorAutorizacion('No tiene acceso a esta evidencia.');
  }

  const ruta = path.join(config.rutas.evidencias, evidencia.nombreAlmacenado);
  if (!ruta.startsWith(config.rutas.evidencias) || !fs.existsSync(ruta)) {
    throw new ErrorNoEncontrado('El archivo de la evidencia');
  }

  auditoria.registrar({
    usuario: actor,
    accion: 'descargar_evidencia', entidad: 'evidencia', entidadId: evidenciaId,
    detalle: { archivo: evidencia.nombreOriginal }, ip, userAgent
  });

  return { ruta, nombre: evidencia.nombreOriginal, mime: evidencia.mime };
}

export function actualizarMetadatos(evidenciaId, metadatos, { actor, ip = null, userAgent = null }) {
  const evidencia = repo.buscarConPropietario(evidenciaId);
  if (!evidencia) throw new ErrorNoEncontrado('Evidencia');

  const evaluacion = evaluaciones.buscarPorId(evidencia.evaluacionId);
  verificarAcceso(evaluacion, actor);
  if (evaluacion.estado !== 'en_progreso') {
    throw new ErrorConflicto('La evaluacion ya esta cerrada; sus evidencias no se modifican.');
  }

  const actualizada = repo.actualizarMetadatos(evidenciaId, metadatos);
  evaluaciones.actualizarDocumentoRespuesta(evidencia.evaluacionId, evidencia.indicador, metadatos);

  auditoria.registrar({
    usuario: actor,
    accion: 'actualizar', entidad: 'evidencia', entidadId: evidenciaId,
    datosAntes: { firmado: evidencia.firmado, legible: evidencia.legible, vigenciaHasta: evidencia.vigenciaHasta },
    datosDespues: metadatos,
    ip, userAgent
  });

  return actualizada;
}

/** Baja logica: el archivo se conserva para que la auditoria siga siendo verificable. */
export function eliminar(evidenciaId, { actor, ip = null, userAgent = null }) {
  const evidencia = repo.buscarConPropietario(evidenciaId);
  if (!evidencia) throw new ErrorNoEncontrado('Evidencia');

  const evaluacion = evaluaciones.buscarPorId(evidencia.evaluacionId);
  verificarAcceso(evaluacion, actor);
  if (evaluacion.estado !== 'en_progreso') {
    throw new ErrorConflicto('No se pueden quitar evidencias de una evaluacion cerrada.');
  }

  repo.marcarEliminada(evidenciaId);
  evaluaciones.vincularEvidencia(evidencia.evaluacionId, evidencia.indicador, null);

  // Sin archivo, las marcas de firmado y legible dejan de estar respaldadas.
  evaluaciones.actualizarDocumentoRespuesta(evidencia.evaluacionId, evidencia.indicador, {
    firmado: false,
    legible: false
  });

  auditoria.registrar({
    usuario: actor,
    accion: 'eliminar_evidencia', entidad: 'evidencia', entidadId: evidenciaId,
    datosAntes: { archivo: evidencia.nombreOriginal, indicador: evidencia.indicador },
    ip, userAgent
  });

  return { mensaje: 'Evidencia retirada de la evaluacion.' };
}
