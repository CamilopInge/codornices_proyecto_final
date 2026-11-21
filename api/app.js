/**
 * Construccion de la aplicacion Express.
 *
 * Se separa de server.js para que las pruebas puedan levantar la app sin
 * ocupar un puerto.
 */

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import path from 'node:path';
import config from '../backend/config/env.js';
import rutas from './routes/index.js';
import { manejadorErrores, rutaNoEncontrada } from './middleware/index.js';

export function crearApp() {
  const app = express();

  // Detras de un proxy inverso, para que req.ip sea la direccion real del cliente
  // y el limitador de tasa no agrupe a todos bajo la IP del proxy.
  app.set('trust proxy', config.esProduccion ? 1 : false);
  app.disable('x-powered-by');

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'same-origin' },
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
          imgSrc: ["'self'", 'data:', 'blob:'],
          connectSrc: ["'self'"],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"]
        }
      }
    })
  );

  // Sin origenes declarados no se habilita CORS: la interfaz se sirve desde el
  // mismo origen que la API, asi que no hace falta abrirlo.
  app.use(
    cors({
      origin: config.servidor.origenesPermitidos.length ? config.servidor.origenesPermitidos : false,
      credentials: false
    })
  );

  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: false, limit: '1mb' }));

  // --- API -------------------------------------------------------------------
  app.use('/api', rutas);
  app.use('/api', rutaNoEncontrada);

  // --- Frontend estatico -----------------------------------------------------
  // El dominio compartido se sirve tal cual para que el navegador lo importe
  // como modulo ES y no exista una segunda copia de las reglas ICA.
  app.use(
    '/shared',
    express.static(config.rutas.compartido, {
      index: false,
      dotfiles: 'deny',
      setHeaders: (res) => res.set('Content-Type', 'text/javascript; charset=utf-8')
    })
  );

  app.use(
    express.static(config.rutas.frontend, {
      index: 'index.html',
      dotfiles: 'deny',
      etag: true,
      maxAge: config.esProduccion ? '1h' : 0
    })
  );

  // Cualquier otra ruta devuelve la aplicacion: el enrutado vive en el cliente.
  // Express 5 ya no acepta '*' como patron, asi que se usa un middleware sin ruta.
  app.use((req, res, siguiente) => {
    if (req.method !== 'GET' || req.path.startsWith('/api')) return siguiente();
    res.sendFile(path.join(config.rutas.frontend, 'index.html'));
  });

  app.use(manejadorErrores);

  return app;
}

export default crearApp;
