/**
 * Rutas de administracion de usuarios. Todas exigen rol con escritura en el modulo.
 */

import { Router } from 'express';
import { autenticar, contexto, exigirPermiso, parametroEntero, asincrono } from '../middleware/index.js';
import * as usuarios from '../../backend/services/usuarios.service.js';
import * as password from '../../backend/services/password.service.js';

const router = Router();

router.use(contexto, autenticar, exigirPermiso('usuarios'));

/** GET /api/usuarios */
router.get('/', (_req, res) => {
  res.json({ usuarios: usuarios.listar(), roles: usuarios.rolesDisponibles() });
});

/** GET /api/usuarios/:id */
router.get('/:id', parametroEntero('id'), (req, res) => {
  res.json(usuarios.obtener(req.params.id));
});

/** POST /api/usuarios  — crea la cuenta y envia la invitacion por correo */
router.post(
  '/',
  exigirPermiso('usuarios', 'w'),
  asincrono(async (req, res) => {
    const { nombre, username, email, rol } = req.body ?? {};
    const resultado = await usuarios.crear({
      nombre, username, email, rol,
      creadoPor: req.usuario,
      ...req.contexto
    });
    res.status(201).json(resultado);
  })
);

/** PATCH /api/usuarios/:id */
router.patch('/:id', parametroEntero('id'), exigirPermiso('usuarios', 'w'), (req, res) => {
  const actualizado = usuarios.actualizar(req.params.id, req.body ?? {}, {
    actor: req.usuario,
    ...req.contexto
  });
  res.json(actualizado);
});

/** POST /api/usuarios/:id/reenviar-invitacion */
router.post(
  '/:id/reenviar-invitacion',
  parametroEntero('id'),
  exigirPermiso('usuarios', 'w'),
  asincrono(async (req, res) => {
    const resultado = await usuarios.reenviarInvitacion(req.params.id, { actor: req.usuario, ...req.contexto });
    res.json(resultado);
  })
);

/** POST /api/usuarios/:id/restablecer  — el administrador fuerza el cambio */
router.post(
  '/:id/restablecer',
  parametroEntero('id'),
  exigirPermiso('usuarios', 'w'),
  asincrono(async (req, res) => {
    const resultado = await password.restablecerComoAdministrador({
      usuarioId: req.params.id,
      administrador: req.usuario,
      ...req.contexto
    });
    res.json(resultado);
  })
);

export default router;
