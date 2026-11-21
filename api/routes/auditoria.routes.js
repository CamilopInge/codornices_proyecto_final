/**
 * Rutas de la bitacora de auditoria. Solo lectura y solo para roles autorizados.
 */

import { Router } from 'express';
import { autenticar, contexto, exigirPermiso, parametroEntero } from '../middleware/index.js';
import * as auditoria from '../../backend/repositories/auditoria.repo.js';
import * as evidencias from '../../backend/services/evidencias.service.js';
import * as configuracion from '../../backend/repositories/configuracion.repo.js';

const router = Router();

router.use(contexto, autenticar, exigirPermiso('auditoria'));

/** GET /api/auditoria?limite=&pagina=&entidad=&accion=&usuarioId=&desde=&hasta= */
router.get('/', (req, res) => {
  const limite = Math.min(500, Math.max(1, Number(req.query.limite) || 100));
  const pagina = Math.max(1, Number(req.query.pagina) || 1);

  const filtros = {
    usuarioId: req.query.usuarioId ? Number(req.query.usuarioId) : null,
    entidad: req.query.entidad || null,
    accion: req.query.accion || null,
    desde: req.query.desde || null,
    hasta: req.query.hasta || null
  };

  res.json({
    entradas: auditoria.listar({ ...filtros, limite, desplazamiento: (pagina - 1) * limite }),
    total: auditoria.contar(filtros),
    pagina,
    limite,
    accionesDisponibles: auditoria.accionesRegistradas()
  });
});

/** GET /api/auditoria/:entidad/:id  — historial de un registro concreto */
router.get('/:entidad/:id', (req, res) => {
  res.json(auditoria.historialDe(req.params.entidad, req.params.id));
});

/** GET /api/auditoria/correos/recientes  — trazabilidad de los correos enviados */
router.get('/correos/recientes', (_req, res) => {
  res.json(configuracion.correosRecientes(100));
});

export default router;

// La descarga de evidencias vive en su propio router porque su permiso
// depende del modulo de evaluaciones, no del de auditoria.
export const evidenciasRouter = Router()
  .use(contexto, autenticar, exigirPermiso('evaluaciones'))
  .get('/:id/archivo', parametroEntero('id'), (req, res) => {
    const { ruta, nombre } = evidencias.rutaDescarga(req.params.id, req.usuario, req.contexto);
    res.download(ruta, nombre);
  })
  .patch('/:id', parametroEntero('id'), exigirPermiso('evaluaciones', 'w'), (req, res) => {
    res.json(evidencias.actualizarMetadatos(req.params.id, req.body ?? {}, { actor: req.usuario, ...req.contexto }));
  })
  .delete('/:id', parametroEntero('id'), exigirPermiso('evaluaciones', 'w'), (req, res) => {
    res.json(evidencias.eliminar(req.params.id, { actor: req.usuario, ...req.contexto }));
  });
