/**
 * Rutas del asistente de consulta.
 *
 * Disponible para cualquier usuario autenticado: el contexto que recibe el
 * modelo ya viene filtrado por rol, de modo que nadie ve por aqui datos que no
 * veria en la interfaz.
 */

import { Router } from 'express';
import { autenticar, contexto, exigirRol, limitarTasa, asincrono } from '../middleware/index.js';
import * as asistente from '../../backend/services/asistente/index.js';

const router = Router();

router.use(contexto, autenticar);

/** GET /api/asistente/estado — si esta configurado y sobre que puede responder */
router.get('/estado', (req, res) => {
  res.json(asistente.estado(req.usuario));
});

/** POST /api/asistente/preguntar  { pregunta, historial? } */
router.post(
  '/preguntar',
  // Freno adicional por direccion, ademas del limite por persona del servicio.
  limitarTasa({ ventanaMinutos: 5, maximo: 30, mensaje: 'Demasiadas consultas seguidas al asistente.' }),
  asincrono(async (req, res) => {
    const { pregunta, historial } = req.body ?? {};
    const respuesta = await asistente.preguntar({
      pregunta,
      historial: Array.isArray(historial) ? historial : [],
      actor: req.usuario,
      ...req.contexto
    });
    res.json(respuesta);
  })
);

/** GET /api/asistente/verificar — prueba de conexion, solo administradores */
router.get(
  '/verificar',
  exigirRol('admin'),
  asincrono(async (_req, res) => {
    res.json(await asistente.verificar());
  })
);

export default router;
