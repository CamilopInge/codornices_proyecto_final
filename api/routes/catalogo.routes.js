/**
 * Rutas del catalogo ICA y de la parametrizacion.
 * El catalogo es de solo lectura: cambiarlo exigiria una migracion normativa.
 */

import { Router } from 'express';
import { autenticar, contexto, exigirPermiso } from '../middleware/index.js';
import * as configuracion from '../../backend/repositories/configuracion.repo.js';
import * as auditoria from '../../backend/repositories/auditoria.repo.js';
import { ErrorValidacion } from '../../backend/errors.js';
import {
  INDICADORES, GRUPOS, GRUPO_NOMBRE, VERSION_CATALOGO, UMBRALES_PORCENTAJE, DENSIDAD_MAXIMA
} from '../../shared/ica/catalogo.js';
import { NIVELES, ponderacion, planMuestreo, descripcionAplicabilidad, UMBRAL_AVES } from '../../shared/ica/reglas.js';
import { PERMISOS, MODULOS, ROL_NOMBRE, ROL_DESCRIPCION, LISTA_ROLES } from '../../shared/ica/roles.js';

const router = Router();

router.use(contexto, autenticar);

/** GET /api/catalogo  — indicadores y tablas normativas */
router.get('/', (_req, res) => {
  res.json({
    version: VERSION_CATALOGO,
    grupos: GRUPOS.map((grupo) => ({
      clave: grupo,
      nombre: GRUPO_NOMBRE[grupo],
      total: INDICADORES.filter((indicador) => indicador.grupo === grupo).length
    })),
    indicadores: INDICADORES.map((indicador) => ({
      ...indicador,
      aplicabilidad: descripcionAplicabilidad(indicador)
    })),
    tablas: {
      ponderacion: {
        umbralAves: UMBRAL_AVES,
        mayorIgual: ponderacion(UMBRAL_AVES),
        menor: ponderacion(UMBRAL_AVES - 1)
      },
      niveles: NIVELES,
      muestreo: {
        mayorIgual: planMuestreo(UMBRAL_AVES),
        menor: planMuestreo(UMBRAL_AVES - 1)
      }
    },
    umbrales: {
      porcentaje: Object.fromEntries(
        Object.entries(UMBRALES_PORCENTAJE).map(([codigo, dato]) => [codigo, { etiqueta: dato.etiqueta }])
      ),
      densidadMaxima: DENSIDAD_MAXIMA
    }
  });
});

/** GET /api/catalogo/permisos  — matriz de roles y modulos */
router.get('/permisos', (_req, res) => {
  res.json({
    modulos: MODULOS,
    roles: LISTA_ROLES.map((rol) => ({
      valor: rol,
      nombre: ROL_NOMBRE[rol],
      descripcion: ROL_DESCRIPCION[rol]
    })),
    matriz: PERMISOS
  });
});

/** GET /api/catalogo/configuracion */
router.get('/configuracion', (_req, res) => {
  res.json(configuracion.obtenerTodo());
});

/** PUT /api/catalogo/configuracion  — catalogos editables */
router.put('/configuracion', exigirPermiso('parametrizacion', 'w'), (req, res) => {
  const { catalogos, niveles, exigencia } = req.body ?? {};
  const guardado = {};

  if (exigencia) {
    const booleanos = ['exigirEnGestion', 'exigirEnPrediosGrandes', 'marcarPorDefecto'];
    for (const clave of booleanos) {
      if (exigencia[clave] !== undefined && typeof exigencia[clave] !== 'boolean') {
        throw new ErrorValidacion(`El campo ${clave} debe ser verdadero o falso.`);
      }
    }
    const actual = configuracion.obtener(configuracion.CLAVES.EXIGENCIA);
    guardado.exigencia = configuracion.guardar(
      configuracion.CLAVES.EXIGENCIA,
      {
        exigirEnGestion: exigencia.exigirEnGestion ?? actual.exigirEnGestion,
        exigirEnPrediosGrandes: exigencia.exigirEnPrediosGrandes ?? actual.exigirEnPrediosGrandes,
        marcarPorDefecto: exigencia.marcarPorDefecto ?? actual.marcarPorDefecto
      },
      { usuarioId: req.usuario.id }
    );
  }

  if (catalogos) {
    const { departamentos, gruposEtarios, formatosEvidencia, tamanoMaximoMB } = catalogos;

    if (departamentos !== undefined) {
      if (!Array.isArray(departamentos) || !departamentos.length) {
        throw new ErrorValidacion('La lista de departamentos no puede quedar vacia.');
      }
    }
    if (tamanoMaximoMB !== undefined) {
      const mb = Number(tamanoMaximoMB);
      if (!Number.isInteger(mb) || mb < 1 || mb > 50) {
        throw new ErrorValidacion('El tamano maximo de evidencia debe ser un entero entre 1 y 50 MB.');
      }
    }

    const actual = configuracion.obtener(configuracion.CLAVES.CATALOGOS);
    guardado.catalogos = configuracion.guardar(
      configuracion.CLAVES.CATALOGOS,
      {
        departamentos: departamentos ?? actual.departamentos,
        gruposEtarios: gruposEtarios ?? actual.gruposEtarios,
        formatosEvidencia: formatosEvidencia ?? actual.formatosEvidencia,
        tamanoMaximoMB: tamanoMaximoMB ?? actual.tamanoMaximoMB
      },
      { usuarioId: req.usuario.id }
    );
  }

  if (niveles) {
    if (!Array.isArray(niveles) || niveles.length !== 4) {
      throw new ErrorValidacion('Debe indicar los cuatro niveles de la Tabla 2.');
    }
    const minimos = niveles.map((nivel) => Number(nivel.minimo));
    if (minimos.some((minimo) => !Number.isFinite(minimo) || minimo < 0 || minimo > 100)) {
      throw new ErrorValidacion('Los minimos de cada nivel deben estar entre 0 y 100.');
    }
    // Deben quedar estrictamente descendentes para que los rangos no se solapen.
    for (let i = 1; i < minimos.length; i += 1) {
      if (minimos[i] >= minimos[i - 1]) {
        throw new ErrorValidacion('Los niveles deben ir de mayor a menor y sus rangos no pueden solaparse.');
      }
    }
    if (minimos.at(-1) !== 0) throw new ErrorValidacion('El nivel mas bajo debe empezar en 0.');

    guardado.niveles = configuracion.guardar(configuracion.CLAVES.NIVELES, niveles, { usuarioId: req.usuario.id });
  }

  auditoria.registrar({
    usuario: req.usuario,
    accion: 'actualizar', entidad: 'configuracion',
    datosDespues: guardado,
    ...req.contexto
  });

  res.json(configuracion.obtenerTodo());
});

export default router;
