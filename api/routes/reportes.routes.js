/**
 * Rutas de reportes y analisis.
 */

import { Router } from 'express';
import { autenticar, contexto, exigirPermiso, parametroEntero } from '../middleware/index.js';
import { ErrorValidacion } from '../../backend/errors.js';
import * as reportes from '../../backend/services/reportes.service.js';
import * as exportar from '../../backend/services/exportar.service.js';

const router = Router();

router.use(contexto, autenticar, exigirPermiso('reportes'));

/** Respuesta de descarga con el tipo y el nombre de archivo correctos. */
function descargar(res, { contenido, nombre, tipo }) {
  res.set('Content-Type', `${tipo}; charset=utf-8`);
  res.set('Content-Disposition', `attachment; filename="${nombre}"`);
  // El BOM hace que Excel y algunos editores de Windows lean bien los acentos.
  res.send(`﻿${contenido}`);
}

/** GET /api/reportes/panel?departamento=&municipio=&nivel=&desde=&hasta= */
router.get('/panel', (req, res) => {
  const { departamento, municipio, nivel, desde, hasta, soloMias } = req.query;
  res.json(
    reportes.panel({
      departamento: departamento || null,
      municipio: municipio || null,
      nivel: nivel || null,
      desde: desde || null,
      hasta: hasta || null,
      usuarioId: soloMias === '1' ? req.usuario.id : null
    })
  );
});

/**
 * GET /api/reportes/predios/:id.md
 * Debe declararse ANTES de /predios/:id: sin eso, Express hace coincidir
 * "/predios/1.md" con la ruta generica capturando id = "1.md".
 */
router.get('/predios/:id.md', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id < 1) {
    throw new ErrorValidacion('El identificador del predio no es valido.');
  }
  const datos = reportes.porPredio(id);
  descargar(res, {
    contenido: exportar.markdownPredio(id),
    nombre: exportar.nombreArchivo(`historial-${datos.predio.nombre}`, 'md'),
    tipo: 'text/markdown'
  });
});

/** GET /api/reportes/predios/:id */
router.get('/predios/:id', parametroEntero('id'), (req, res) => {
  res.json(reportes.porPredio(req.params.id));
});

/** GET /api/reportes/comparar?a=1&b=2 */
router.get('/comparar', (req, res) => {
  res.json(reportes.comparar(Number(req.query.a), Number(req.query.b)));
});

/** GET /api/reportes/consolidado */
router.get('/consolidado', (_req, res) => {
  res.json(reportes.consolidado());
});

/** GET /api/reportes/consolidado.csv */
router.get('/consolidado.csv', (_req, res) => {
  descargar(res, {
    contenido: reportes.csvConsolidado(),
    nombre: exportar.nombreArchivo('consolidado-departamentos', 'csv'),
    tipo: 'text/csv'
  });
});

/** GET /api/reportes/consolidado.md */
router.get('/consolidado.md', (_req, res) => {
  descargar(res, {
    contenido: exportar.markdownConsolidado(),
    nombre: exportar.nombreArchivo('consolidado-departamentos', 'md'),
    tipo: 'text/markdown'
  });
});

/** GET /api/reportes/comparar.md?a=1&b=2 */
router.get('/comparar.md', (req, res) => {
  const a = Number(req.query.a);
  const b = Number(req.query.b);
  const datos = reportes.comparar(a, b);
  descargar(res, {
    contenido: exportar.markdownComparacion(a, b),
    nombre: exportar.nombreArchivo(`comparacion-${datos.a.codigo}-${datos.b.codigo}`, 'md'),
    tipo: 'text/markdown'
  });
});

export default router;
