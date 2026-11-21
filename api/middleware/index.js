/**
 * Middleware de la capa HTTP.
 *
 * Cada pieza hace una sola cosa: identificar al solicitante, comprobar permisos,
 * limitar la tasa de peticiones y traducir errores de dominio a respuestas JSON.
 */

import { verificarToken } from '../../backend/services/auth.service.js';
import { AppError, ErrorAutenticacion, ErrorAutorizacion, ErrorLimiteExcedido, ErrorValidacion } from '../../backend/errors.js';
import { puede } from '../../shared/ica/roles.js';
import config from '../../backend/config/env.js';

/** Adjunta ip y user agent, que casi todos los servicios registran en auditoria. */
export function contexto(req, _res, siguiente) {
  req.contexto = {
    ip: req.ip ?? req.socket?.remoteAddress ?? null,
    userAgent: String(req.get('user-agent') ?? '').slice(0, 300) || null
  };
  siguiente();
}

/** Exige un token valido y deja el usuario en req.usuario. */
export function autenticar(req, _res, siguiente) {
  const cabecera = String(req.get('authorization') ?? '');
  const token = cabecera.replace(/^Bearer\s+/i, '').trim();

  if (!token) return siguiente(new ErrorAutenticacion('Falta el token de acceso.'));

  try {
    req.usuario = verificarToken(token);
    siguiente();
  } catch (error) {
    siguiente(error);
  }
}

/** Autenticacion opcional: util en rutas que cambian su respuesta si hay sesion. */
export function autenticarOpcional(req, _res, siguiente) {
  const token = String(req.get('authorization') ?? '').replace(/^Bearer\s+/i, '').trim();
  if (!token) return siguiente();
  try {
    req.usuario = verificarToken(token);
  } catch {
    // Un token invalido aqui no es un error: simplemente no hay sesion.
  }
  siguiente();
}

/** Restringe por rol explicito. */
export function exigirRol(...roles) {
  return (req, _res, siguiente) => {
    if (!req.usuario) return siguiente(new ErrorAutenticacion());
    if (!roles.includes(req.usuario.rol)) {
      return siguiente(new ErrorAutorizacion(`Esta accion requiere uno de estos roles: ${roles.join(', ')}.`));
    }
    siguiente();
  };
}

/**
 * Restringe por la matriz de permisos compartida.
 * La misma matriz decide que ve la interfaz y que acepta la API, de modo que
 * esconder un boton y bloquear la ruta no pueden quedar desalineados.
 */
export function exigirPermiso(modulo, nivel = 'r') {
  return (req, _res, siguiente) => {
    if (!req.usuario) return siguiente(new ErrorAutenticacion());
    if (!puede(req.usuario.rol, modulo, nivel)) {
      return siguiente(
        new ErrorAutorizacion(
          nivel === 'w'
            ? `Su rol no puede modificar el modulo ${modulo}.`
            : `Su rol no tiene acceso al modulo ${modulo}.`
        )
      );
    }
    siguiente();
  };
}

/**
 * Limitador de tasa en memoria, por ventana deslizante simple.
 * Suficiente para un despliegue de un solo proceso; con varias instancias
 * habria que moverlo a un almacen compartido.
 */
export function limitarTasa({ ventanaMinutos = 15, maximo = 100, clave = (req) => req.ip, mensaje } = {}) {
  const registros = new Map();
  const ventanaMs = ventanaMinutos * 60_000;

  // Limpieza periodica para que el mapa no crezca sin control.
  const limpieza = setInterval(() => {
    const ahora = Date.now();
    for (const [llave, registro] of registros) {
      if (ahora - registro.inicio > ventanaMs) registros.delete(llave);
    }
  }, ventanaMs);
  limpieza.unref?.();

  return (req, res, siguiente) => {
    const llave = String(clave(req) ?? 'anonimo');
    const ahora = Date.now();
    const registro = registros.get(llave);

    if (!registro || ahora - registro.inicio > ventanaMs) {
      registros.set(llave, { inicio: ahora, conteo: 1 });
      return siguiente();
    }

    registro.conteo += 1;

    if (registro.conteo > maximo) {
      const segundos = Math.ceil((ventanaMs - (ahora - registro.inicio)) / 1000);
      res.set('Retry-After', String(segundos));
      return siguiente(
        new ErrorLimiteExcedido(
          mensaje ?? `Demasiadas solicitudes. Intente de nuevo en ${Math.ceil(segundos / 60)} minuto(s).`,
          segundos
        )
      );
    }

    siguiente();
  };
}

/** Envuelve un manejador async para que sus rechazos lleguen al middleware de errores. */
export const asincrono = (manejador) => (req, res, siguiente) =>
  Promise.resolve(manejador(req, res, siguiente)).catch(siguiente);

/** Valida y normaliza el cuerpo con una funcion declarada por la ruta. */
export function validarCuerpo(validador) {
  return (req, _res, siguiente) => {
    try {
      req.datos = validador(req.body ?? {});
      siguiente();
    } catch (error) {
      siguiente(error instanceof AppError ? error : new ErrorValidacion(error.message));
    }
  };
}

/** Entero positivo de un parametro de ruta. */
export function parametroEntero(nombre) {
  return (req, _res, siguiente) => {
    const valor = Number(req.params[nombre]);
    if (!Number.isSafeInteger(valor) || valor < 1) {
      return siguiente(new ErrorValidacion(`El parametro ${nombre} debe ser un identificador valido.`));
    }
    req.params[nombre] = valor;
    siguiente();
  };
}

/** Respuesta uniforme para rutas inexistentes bajo /api. */
export function rutaNoEncontrada(req, res) {
  res.status(404).json({
    error: 'NO_ENCONTRADO',
    mensaje: `La ruta ${req.method} ${req.originalUrl} no existe en esta API.`
  });
}

/**
 * Traductor unico de errores a HTTP.
 * Los errores de dominio llevan su propio estado; el resto se reporta como 500
 * sin filtrar detalles internos al cliente.
 */
export function manejadorErrores(error, req, res, _siguiente) {
  if (error instanceof AppError) {
    if (error.reintentarEn) res.set('Retry-After', String(error.reintentarEn));
    return res.status(error.estado).json(error.aJSON());
  }

  // Errores conocidos de dependencias, traducidos a algo accionable.
  if (error?.code === 'LIMIT_FILE_SIZE') {
    const mb = Math.round(config.archivos.tamanoMaximoBytes / 1024 / 1024);
    return res.status(413).json({ error: 'ARCHIVO_GRANDE', mensaje: `El archivo supera el maximo de ${mb} MB.` });
  }
  if (error?.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({ error: 'VALIDACION', mensaje: 'Campo de archivo inesperado.' });
  }
  if (error?.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'VALIDACION', mensaje: 'El cuerpo de la solicitud no es JSON valido.' });
  }
  if (error?.type === 'entity.too.large') {
    return res.status(413).json({ error: 'CUERPO_GRANDE', mensaje: 'El cuerpo de la solicitud es demasiado grande.' });
  }
  if (error?.code === 'SQLITE_CONSTRAINT_UNIQUE') {
    return res.status(409).json({ error: 'CONFLICTO', mensaje: 'Ya existe un registro con esos datos unicos.' });
  }
  if (error?.code?.startsWith?.('SQLITE_CONSTRAINT')) {
    return res.status(409).json({ error: 'CONFLICTO', mensaje: 'La operacion viola una restriccion de integridad de los datos.' });
  }
  if (error?.message?.includes('Formato no permitido')) {
    return res.status(400).json({ error: 'VALIDACION', mensaje: error.message });
  }

  console.error(`[api] error no controlado en ${req.method} ${req.originalUrl}:`, error);
  res.status(500).json({
    error: 'ERROR_INTERNO',
    mensaje: 'Ocurrio un error interno. Si persiste, revise los registros del servidor.',
    ...(config.esProduccion ? {} : { detalle: error?.message })
  });
}
