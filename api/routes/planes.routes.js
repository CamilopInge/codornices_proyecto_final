/**
 * Rutas de recomendaciones y plan de mejora.
 */

import { Router } from 'express';
import { autenticar, contexto, exigirPermiso, parametroEntero, asincrono } from '../middleware/index.js';
import * as planes from '../../backend/services/recomendaciones.service.js';

const router = Router();

router.use(contexto, autenticar, exigirPermiso('planes'));

/** GET /api/planes/acciones?estado=&atrasadas=1 */
router.get('/acciones', (req, res) => {
  res.json(
    planes.listarAcciones({
      estado: req.query.estado || null,
      soloAtrasadas: req.query.atrasadas === '1' || req.query.atrasadas === 'true'
    })
  );
});

/** POST /api/planes/acciones  { recomendacionId, descripcion, responsable, fechaLimite } */
router.post('/acciones', exigirPermiso('planes', 'w'), (req, res) => {
  const creada = planes.crearAccion(req.body ?? {}, { actor: req.usuario, ...req.contexto });
  res.status(201).json(creada);
});

/** PATCH /api/planes/acciones/:id  { estado, avance } */
router.patch('/acciones/:id', parametroEntero('id'), exigirPermiso('planes', 'w'), (req, res) => {
  res.json(planes.actualizarAccion(req.params.id, req.body ?? {}, { actor: req.usuario, ...req.contexto }));
});

/** GET /api/planes/evaluaciones/:id/recomendaciones */
router.get('/evaluaciones/:id/recomendaciones', parametroEntero('id'), (req, res) => {
  res.json(planes.listar(req.params.id));
});

/** POST /api/planes/evaluaciones/:id/recomendaciones  { conIa?: boolean } */
router.post(
  '/evaluaciones/:id/recomendaciones',
  parametroEntero('id'),
  exigirPermiso('planes', 'w'),
  asincrono(async (req, res) => {
    const contextoLlamada = { actor: req.usuario, ...req.contexto };
    const resultado = req.body?.conIa
      ? await planes.regenerarConIa(req.params.id, contextoLlamada)
      : planes.regenerar(req.params.id, contextoLlamada);
    res.json(resultado);
  })
);

/** PATCH /api/planes/recomendaciones/:id  { estado, texto } */
router.patch('/recomendaciones/:id', parametroEntero('id'), exigirPermiso('planes', 'w'), (req, res) => {
  res.json(
    planes.decidir(req.params.id, {
      estado: req.body?.estado,
      texto: req.body?.texto,
      actor: req.usuario,
      ...req.contexto
    })
  );
});

export default router;
