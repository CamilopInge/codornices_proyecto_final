/**
 * Montaje de todas las rutas bajo /api.
 */

import { Router } from 'express';
import config from '../../backend/config/env.js';
import { VERSION_CATALOGO } from '../../shared/ica/catalogo.js';
import authRoutes from './auth.routes.js';
import usuariosRoutes from './usuarios.routes.js';
import prediosRoutes from './predios.routes.js';
import evaluacionesRoutes from './evaluaciones.routes.js';
import planesRoutes from './planes.routes.js';
import reportesRoutes from './reportes.routes.js';
import catalogoRoutes from './catalogo.routes.js';
import asistenteRoutes from './asistente.routes.js';
import auditoriaRoutes, { evidenciasRouter } from './auditoria.routes.js';

const router = Router();

/** GET /api/health — sin autenticacion, para monitoreo y diagnostico. */
router.get('/health', (_req, res) => {
  res.json({
    ok: true,
    servicio: 'EvalCodorniz API',
    entorno: config.entorno,
    catalogo: VERSION_CATALOGO,
    baseDatos: 'sqlite-wal',
    correo: config.correo.habilitado ? 'smtp' : 'registro-en-disco',
    ia: config.ia.habilitada,
    asistente: config.asistente.habilitado ? config.asistente.modelo : 'no configurado',
    hora: new Date().toISOString()
  });
});

router.use('/auth', authRoutes);
router.use('/usuarios', usuariosRoutes);
router.use('/predios', prediosRoutes);
router.use('/evaluaciones', evaluacionesRoutes);
router.use('/evidencias', evidenciasRouter);
router.use('/planes', planesRoutes);
router.use('/reportes', reportesRoutes);
router.use('/catalogo', catalogoRoutes);
router.use('/asistente', asistenteRoutes);
router.use('/auditoria', auditoriaRoutes);

export default router;
