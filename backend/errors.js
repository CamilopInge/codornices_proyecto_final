/**
 * Errores de dominio tipados.
 *
 * Los servicios lanzan estos errores y un unico middleware de la API los traduce
 * a respuestas HTTP. Asi la logica de negocio no conoce codigos de estado y las
 * rutas no repiten el mismo manejo de errores.
 */

export class AppError extends Error {
  constructor(mensaje, { estado = 500, codigo = 'ERROR_INTERNO', detalles = null } = {}) {
    super(mensaje);
    this.name = new.target.name;
    this.estado = estado;
    this.codigo = codigo;
    this.detalles = detalles;
    this.esOperacional = true;
    Error.captureStackTrace?.(this, new.target);
  }

  aJSON() {
    return {
      error: this.codigo,
      mensaje: this.message,
      ...(this.detalles ? { detalles: this.detalles } : {})
    };
  }
}

export class ErrorValidacion extends AppError {
  constructor(mensaje = 'Los datos enviados no son validos.', detalles = null) {
    super(mensaje, { estado: 400, codigo: 'VALIDACION', detalles });
  }
}

export class ErrorAutenticacion extends AppError {
  constructor(mensaje = 'Credenciales invalidas.') {
    super(mensaje, { estado: 401, codigo: 'NO_AUTENTICADO' });
  }
}

export class ErrorAutorizacion extends AppError {
  constructor(mensaje = 'No tiene permisos para realizar esta accion.') {
    super(mensaje, { estado: 403, codigo: 'SIN_PERMISO' });
  }
}

export class ErrorNoEncontrado extends AppError {
  constructor(recurso = 'Recurso') {
    super(`${recurso} no encontrado.`, { estado: 404, codigo: 'NO_ENCONTRADO' });
  }
}

export class ErrorConflicto extends AppError {
  constructor(mensaje = 'La operacion entra en conflicto con el estado actual.', detalles = null) {
    super(mensaje, { estado: 409, codigo: 'CONFLICTO', detalles });
  }
}

export class ErrorLimiteExcedido extends AppError {
  constructor(mensaje = 'Demasiadas solicitudes. Intente mas tarde.', reintentarEn = null) {
    super(mensaje, { estado: 429, codigo: 'LIMITE_EXCEDIDO', detalles: reintentarEn ? { reintentarEn } : null });
    this.reintentarEn = reintentarEn;
  }
}

export class ErrorServicioExterno extends AppError {
  constructor(mensaje = 'Un servicio externo no respondio.', detalles = null) {
    super(mensaje, { estado: 502, codigo: 'SERVICIO_EXTERNO', detalles });
  }
}
