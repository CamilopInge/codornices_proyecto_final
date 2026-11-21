/**
 * Rutas de autenticacion y de restablecimiento de contrasena.
 *
 * Las rutas publicas (login y recuperacion) llevan limitador de tasa propio,
 * porque son las unicas alcanzables sin sesion.
 */

import { Router } from 'express';
import { autenticar, contexto, limitarTasa, asincrono } from '../middleware/index.js';
import * as auth from '../../backend/services/auth.service.js';
import * as password from '../../backend/services/password.service.js';
import config from '../../backend/config/env.js';

const router = Router();

const limitarLogin = limitarTasa({
  ventanaMinutos: config.seguridad.ventanaBloqueoMinutos,
  maximo: 20,
  mensaje: 'Demasiados intentos de acceso desde esta direccion. Espere unos minutos.'
});

const limitarRecuperacion = limitarTasa({
  ventanaMinutos: 60,
  maximo: 10,
  mensaje: 'Demasiadas solicitudes de restablecimiento desde esta direccion.'
});

router.use(contexto);

/** POST /api/auth/login */
router.post(
  '/login',
  limitarLogin,
  asincrono(async (req, res) => {
    const { identificador, usuario, email, password: clave } = req.body ?? {};
    const resultado = await auth.iniciarSesion({
      identificador: identificador ?? usuario ?? email,
      password: clave,
      ...req.contexto
    });
    res.json(resultado);
  })
);

/** GET /api/auth/me */
router.get('/me', autenticar, (req, res) => {
  res.json({ usuario: req.usuario });
});

/** POST /api/auth/logout */
router.post('/logout', autenticar, (req, res) => {
  res.json(auth.cerrarSesion({ jti: req.usuario.jti, usuario: req.usuario, ...req.contexto }));
});

/** POST /api/auth/cambiar-password  (usuario autenticado) */
router.post(
  '/cambiar-password',
  autenticar,
  asincrono(async (req, res) => {
    const { passwordActual, passwordNueva } = req.body ?? {};
    const resultado = await auth.cambiarPassword({
      usuarioId: req.usuario.id,
      passwordActual,
      passwordNueva,
      ...req.contexto
    });
    res.json(resultado);
  })
);

/** POST /api/auth/recuperar  (publica) */
router.post(
  '/recuperar',
  limitarRecuperacion,
  asincrono(async (req, res) => {
    const resultado = await password.solicitarRestablecimiento({
      correo: req.body?.correo ?? req.body?.email,
      ...req.contexto
    });
    res.json(resultado);
  })
);

/** GET /api/auth/restablecer/:token  (publica, valida el enlace antes de mostrar el formulario) */
router.get('/restablecer/:token', (req, res) => {
  res.json(password.validarToken(req.params.token));
});

/** POST /api/auth/restablecer  (publica, define la contrasena nueva) */
router.post(
  '/restablecer',
  limitarRecuperacion,
  asincrono(async (req, res) => {
    const { token, passwordNueva } = req.body ?? {};
    const resultado = await password.restablecerPassword({ token, passwordNueva, ...req.contexto });
    res.json(resultado);
  })
);

export default router;
