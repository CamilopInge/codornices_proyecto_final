/**
 * Rutas de evaluaciones: ciclo completo de la visita y sus evidencias.
 */

import { Router } from 'express';
import multer from 'multer';
import crypto from 'node:crypto';
import path from 'node:path';
import { autenticar, contexto, exigirPermiso, parametroEntero, asincrono } from '../middleware/index.js';
import config from '../../backend/config/env.js';
import * as evaluaciones from '../../backend/services/evaluaciones.service.js';
import * as evidencias from '../../backend/services/evidencias.service.js';
import * as reportes from '../../backend/services/reportes.service.js';
import * as exportar from '../../backend/services/exportar.service.js';

const router = Router();

/** Almacenamiento en disco fuera de la raiz publica, con nombre no adivinable. */
const subida = multer({
  storage: multer.diskStorage({
    destination: (_req, _archivo, cb) => cb(null, config.rutas.evidencias),
    filename: (_req, archivo, cb) => {
      const extension = path.extname(archivo.originalname).toLowerCase();
      cb(null, `${Date.now()}-${crypto.randomUUID()}${extension}`);
    }
  }),
  limits: { fileSize: config.archivos.tamanoMaximoBytes, files: 1 },
  fileFilter: (_req, archivo, cb) => {
    const extension = path.extname(archivo.originalname).toLowerCase();
    const esperado = config.archivos.tiposPermitidos[extension];
    if (!esperado || esperado !== archivo.mimetype) {
      return cb(new Error('Formato no permitido. Adjunte un archivo PDF, JPG o PNG.'));
    }
    cb(null, true);
  }
});

router.use(contexto, autenticar, exigirPermiso('evaluaciones'));

/** GET /api/evaluaciones */
router.get('/', (req, res) => {
  const { estado, predioId, departamento, municipio, nivel, desde, hasta, limite, pagina } = req.query;
  const tope = Math.min(500, Math.max(1, Number(limite) || 100));
  const numeroPagina = Math.max(1, Number(pagina) || 1);

  res.json(
    evaluaciones.listar(
      {
        estado: estado || null,
        predioId: predioId ? Number(predioId) : null,
        departamento: departamento || null,
        municipio: municipio || null,
        nivel: nivel || null,
        desde: desde || null,
        hasta: hasta || null,
        limite: tope,
        desplazamiento: (numeroPagina - 1) * tope
      },
      req.usuario
    )
  );
});

/** GET /api/evaluaciones/:id */
router.get('/:id', parametroEntero('id'), (req, res) => {
  res.json(evaluaciones.obtenerDetalle(req.params.id, req.usuario));
});

/** POST /api/evaluaciones  { predioId, fechaVisita } */
router.post('/', exigirPermiso('evaluaciones', 'w'), (req, res) => {
  const creada = evaluaciones.crear(req.body ?? {}, { actor: req.usuario, ...req.contexto });
  res.status(201).json(creada);
});

/** PATCH /api/evaluaciones/:id/inspeccion */
router.patch('/:id/inspeccion', parametroEntero('id'), exigirPermiso('evaluaciones', 'w'), (req, res) => {
  res.json(evaluaciones.actualizarInspeccion(req.params.id, req.body ?? {}, { actor: req.usuario, ...req.contexto }));
});

/** POST /api/evaluaciones/:id/muestra  — genera la seleccion reproducible */
router.post('/:id/muestra', parametroEntero('id'), exigirPermiso('evaluaciones', 'w'), (req, res) => {
  res.json(evaluaciones.generarMuestra(req.params.id, { actor: req.usuario, ...req.contexto }));
});

/** PUT /api/evaluaciones/:id/respuestas  { respuestas: [...] } */
router.put('/:id/respuestas', parametroEntero('id'), exigirPermiso('evaluaciones', 'w'), (req, res) => {
  const lote = Array.isArray(req.body) ? req.body : req.body?.respuestas;
  res.json(evaluaciones.guardarRespuestas(req.params.id, lote, { actor: req.usuario, ...req.contexto }));
});

/** GET /api/evaluaciones/:id/validacion */
router.get('/:id/validacion', parametroEntero('id'), (req, res) => {
  res.json(evaluaciones.validar(req.params.id, req.usuario));
});

/** POST /api/evaluaciones/:id/cerrar */
router.post('/:id/cerrar', parametroEntero('id'), exigirPermiso('evaluaciones', 'w'), (req, res) => {
  res.json(evaluaciones.cerrar(req.params.id, { actor: req.usuario, ...req.contexto }));
});

/** POST /api/evaluaciones/:id/definitiva */
router.post('/:id/definitiva', parametroEntero('id'), exigirPermiso('evaluaciones', 'w'), (req, res) => {
  res.json(evaluaciones.emitirDefinitiva(req.params.id, { actor: req.usuario, ...req.contexto }));
});

/** POST /api/evaluaciones/:id/anular  { motivo } — solo administrador */
router.post('/:id/anular', parametroEntero('id'), (req, res) => {
  res.json(evaluaciones.anular(req.params.id, req.body?.motivo, { actor: req.usuario, ...req.contexto }));
});

/** GET /api/evaluaciones/:id/forma-oficial */
router.get('/:id/forma-oficial', parametroEntero('id'), (req, res) => {
  evaluaciones.obtenerDetalle(req.params.id, req.usuario); // valida el acceso
  res.json(reportes.formaOficial(req.params.id));
});

/** GET /api/evaluaciones/:id/csv */
router.get('/:id/csv', parametroEntero('id'), (req, res) => {
  const detalle = evaluaciones.obtenerDetalle(req.params.id, req.usuario);
  res.set('Content-Type', 'text/csv; charset=utf-8');
  res.set('Content-Disposition', `attachment; filename="${detalle.codigo}-indicadores.csv"`);
  res.send(`﻿${reportes.csvEvaluacion(req.params.id)}`); // BOM para que Excel lea bien los acentos
});

/** GET /api/evaluaciones/:id/reporte.md — forma oficial completa en Markdown */
router.get('/:id/reporte.md', parametroEntero('id'), (req, res) => {
  const detalle = evaluaciones.obtenerDetalle(req.params.id, req.usuario); // valida el acceso
  res.set('Content-Type', 'text/markdown; charset=utf-8');
  res.set('Content-Disposition', `attachment; filename="${exportar.nombreArchivo(`forma-${detalle.codigo}`, 'md')}"`);
  res.send(`﻿${exportar.markdownEvaluacion(req.params.id)}`);
});

// --- Evidencias de la evaluacion ---------------------------------------------

/** GET /api/evaluaciones/:id/evidencias */
router.get('/:id/evidencias', parametroEntero('id'), (req, res) => {
  res.json(evidencias.listar(req.params.id, req.usuario));
});

/** POST /api/evaluaciones/:id/evidencias  (multipart: archivo, indicador, metadatos) */
router.post(
  '/:id/evidencias',
  parametroEntero('id'),
  exigirPermiso('evaluaciones', 'w'),
  subida.single('archivo'),
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'VALIDACION', mensaje: 'Adjunte un archivo PDF, JPG o PNG.' });
    }
    const registrada = evidencias.registrar({
      evaluacionId: req.params.id,
      indicador: req.body?.indicador,
      archivo: req.file,
      metadatos: {
        vigenciaHasta: req.body?.vigenciaHasta || null,
        firmado: req.body?.firmado === 'true' || req.body?.firmado === '1',
        legible: req.body?.legible === 'true' || req.body?.legible === '1',
        matricula: req.body?.matricula || null
      },
      actor: req.usuario,
      ...req.contexto
    });
    res.status(201).json(registrada);
  }
);

export default router;
