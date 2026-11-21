/**
 * Rutas de predios.
 */

import { Router } from 'express';
import { autenticar, contexto, exigirPermiso, parametroEntero } from '../middleware/index.js';
import * as predios from '../../backend/services/predios.service.js';

const router = Router();

router.use(contexto, autenticar, exigirPermiso('predios'));

/** GET /api/predios?soloActivos=1&departamento=&municipio=&busqueda= */
router.get('/', (req, res) => {
  const { soloActivos, departamento, municipio, busqueda } = req.query;
  res.json(
    predios.listar({
      soloActivos: soloActivos === '1' || soloActivos === 'true',
      departamento: departamento || null,
      municipio: municipio || null,
      busqueda: busqueda || null
    })
  );
});

/** GET /api/predios/:id */
router.get('/:id', parametroEntero('id'), (req, res) => {
  res.json(predios.obtener(req.params.id));
});

/** POST /api/predios */
router.post('/', exigirPermiso('predios', 'w'), (req, res) => {
  const creado = predios.crear(req.body ?? {}, { actor: req.usuario, ...req.contexto });
  res.status(201).json(creado);
});

/** PUT /api/predios/:id */
router.put('/:id', parametroEntero('id'), exigirPermiso('predios', 'w'), (req, res) => {
  res.json(predios.actualizar(req.params.id, req.body ?? {}, { actor: req.usuario, ...req.contexto }));
});

/** POST /api/predios/:id/estado  { activo: boolean } */
router.post('/:id/estado', parametroEntero('id'), exigirPermiso('predios', 'w'), (req, res) => {
  res.json(
    predios.cambiarEstado(req.params.id, Boolean(req.body?.activo), { actor: req.usuario, ...req.contexto })
  );
});

export default router;
