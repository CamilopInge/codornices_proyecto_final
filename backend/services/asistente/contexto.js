/**
 * Construccion del contexto que el asistente puede leer.
 *
 * Este modulo es la frontera de datos del asistente: el modelo solo conoce lo
 * que aqui se le entrega. No hay acceso libre a la base ni ejecucion de
 * consultas sugeridas por el modelo, de modo que no puede leer nada que esta
 * funcion no haya decidido incluir.
 *
 * El contexto respeta el rol de quien pregunta: un evaluador solo ve sus
 * propias visitas, y un consultor no ve usuarios ni auditoria. Sin esto, el
 * asistente seria una via para saltarse la matriz de permisos.
 */

import { db } from '../../db/index.js';
import * as evaluaciones from '../../repositories/evaluaciones.repo.js';
import * as predios from '../../repositories/predios.repo.js';
import * as usuarios from '../../repositories/usuarios.repo.js';
import { obtener as obtenerConfig, CLAVES } from '../../repositories/configuracion.repo.js';
import { INDICE, GRUPO_NOMBRE, GRUPOS, VERSION_CATALOGO } from '../../../shared/ica/catalogo.js';
import { NIVELES, ponderacion, planMuestreo, UMBRAL_AVES, DENSIDAD_MAXIMA } from '../../../shared/ica/reglas.js';
import { puede } from '../../../shared/ica/roles.js';

/** Tope de filas por seccion: el contexto debe caber en la ventana del modelo. */
const TOPE_PREDIOS = 60;
const TOPE_EVALUACIONES = 60;
const TOPE_ACCIONES = 40;

const redondear = (valor) => (valor == null ? null : Math.round(Number(valor) * 100) / 100);

/** Reglas de la norma. Son fijas y permiten al modelo explicar el "por que". */
function reglasIca() {
  return {
    versionCatalogo: VERSION_CATALOGO,
    umbralAves: UMBRAL_AVES,
    grupos: GRUPOS.map((grupo) => ({
      clave: grupo,
      nombre: GRUPO_NOMBRE[grupo],
      indicadores: Object.values(INDICE).filter((i) => i.grupo === grupo).length
    })),
    tabla1Ponderacion: {
      [`${UMBRAL_AVES} aves o mas`]: ponderacion(UMBRAL_AVES),
      [`menos de ${UMBRAL_AVES} aves`]: ponderacion(UMBRAL_AVES - 1)
    },
    tabla2Niveles: NIVELES.map((n) => ({ nombre: n.nombre, minimo: n.minimo })),
    tabla3Muestreo: {
      [`${UMBRAL_AVES} aves o mas`]: planMuestreo(UMBRAL_AVES),
      [`menos de ${UMBRAL_AVES} aves`]: planMuestreo(UMBRAL_AVES - 1)
    },
    densidadMaximaAvesPorMetroCuadrado: DENSIDAD_MAXIMA,
    indicadoresCondicionados: {
      MBG: 'Solo aplica con 200 aves o mas',
      MBA10: 'Mortalidad: solo con mas de 200 aves',
      MBR4: 'Integridad de jaula: solo en sistema de jaula',
      MBR3: 'Calidad de la cama: solo en sistema de piso',
      MBR14: 'Espacio en piso: solo en sistema de piso'
    },
    calculoFinal: 'Calificacion = suma de (promedio del grupo x peso de la Tabla 1), redondeada a 2 decimales'
  };
}

/** Catalogo resumido: codigo, nombre y escala, sin los textos largos de cada nivel. */
function catalogoResumido() {
  return Object.values(INDICE).map((indicador) => ({
    codigo: indicador.codigo,
    grupo: indicador.grupo,
    nombre: indicador.nombre,
    metodo: indicador.metodo,
    escala: indicador.niveles.map(([puntos]) => puntos),
    requiereDocumento: indicador.requiereDocumento
  }));
}

/** Solo las evaluaciones que el rol puede ver. */
function evaluacionesVisibles(actor) {
  const soloPropias = actor.rol === 'evaluador';
  return evaluaciones
    .listar({ usuarioId: actor.id, soloPropias, limite: TOPE_EVALUACIONES })
    .map((evaluacion) => ({
      codigo: evaluacion.codigo,
      predio: evaluacion.predio?.nombre,
      municipio: evaluacion.predio?.municipio,
      departamento: evaluacion.predio?.departamento,
      sistema: evaluacion.sistema,
      totalAves: evaluacion.totalAves,
      fechaVisita: evaluacion.fechaVisita,
      evaluador: evaluacion.evaluador,
      estado: evaluacion.estado,
      forma: evaluacion.forma,
      calificacion: evaluacion.calificacion,
      nivel: evaluacion.nivel,
      promediosPorGrupo: evaluacion.resultado?.grupos
        ? Object.fromEntries(
            GRUPOS.map((grupo) => [grupo, redondear(evaluacion.resultado.grupos[grupo]?.promedio)])
          )
        : null,
      indicadoresCriticos: evaluacion.resultado?.criticos ?? []
    }));
}

/** Respuestas por indicador agregadas: cuantas veces quedo en cada puntaje. */
function desempenoPorIndicador(actor) {
  const soloPropias = actor.rol === 'evaluador';
  const filtroUsuario = soloPropias ? 'AND e.usuario_id = ?' : '';
  const parametros = soloPropias ? [actor.id] : [];

  return db().all(
    `SELECT r.indicador_codigo AS codigo,
            r.grupo,
            COUNT(*)                                   AS evaluado,
            SUM(CASE WHEN r.valor = 100 THEN 1 ELSE 0 END) AS en100,
            SUM(CASE WHEN r.valor = 0   THEN 1 ELSE 0 END) AS en0,
            AVG(r.valor)                               AS promedio
     FROM evaluacion_respuestas r
     JOIN evaluaciones e ON e.id = r.evaluacion_id
     WHERE e.estado = 'cerrada' AND r.valor IS NOT NULL ${filtroUsuario}
     GROUP BY r.indicador_codigo, r.grupo
     ORDER BY promedio ASC`,
    ...parametros
  ).map((fila) => ({
    codigo: fila.codigo,
    nombre: INDICE[fila.codigo]?.nombre,
    grupo: fila.grupo,
    vecesEvaluado: fila.evaluado,
    vecesEn100: fila.en100,
    vecesEn0: fila.en0,
    promedio: redondear(fila.promedio)
  }));
}

/**
 * Arma el contexto completo para una pregunta.
 * @param {{id: number, rol: string, nombre: string}} actor
 */
export function construir(actor) {
  const contexto = {
    generadoEn: new Date().toISOString(),
    quienPregunta: { nombre: actor.nombre, rol: actor.rol },
    normaIca: reglasIca(),
    catalogoIndicadores: catalogoResumido()
  };

  // --- Resumen general ---
  if (puede(actor.rol, 'reportes') || puede(actor.rol, 'dashboard')) {
    const resumen = evaluaciones.resumenGeneral(
      actor.rol === 'evaluador' ? { usuarioId: actor.id } : {}
    );
    contexto.resumenGeneral = {
      prediosActivos: resumen.prediosActivos,
      evaluacionesCerradas: resumen.evaluacionesCerradas,
      evaluacionesEnProgreso: resumen.evaluacionesEnProgreso,
      calificacionPromedio: resumen.calificacionPromedio,
      accionesAtrasadas: resumen.accionesAtrasadas,
      distribucionPorNivel: resumen.distribucionNivel,
      indicadoresConMasCeros: resumen.topIncumplimientos.map((i) => ({
        codigo: i.indicador,
        nombre: INDICE[i.indicador]?.nombre,
        vecesEn0: i.total
      }))
    };
    contexto.consolidadoPorDepartamento = evaluaciones.consolidadoPorDepartamento().map((fila) => ({
      departamento: fila.departamento,
      predios: fila.predios,
      evaluaciones: fila.evaluaciones,
      promedio: redondear(fila.promedio)
    }));
  }

  // --- Predios ---
  if (puede(actor.rol, 'predios')) {
    contexto.predios = predios.listar().slice(0, TOPE_PREDIOS).map((predio) => ({
      nombre: predio.nombre,
      codigoIca: predio.codigoIca,
      sistema: predio.sistema,
      departamento: predio.departamento,
      municipio: predio.municipio,
      vereda: predio.vereda,
      inventario: predio.inventario,
      totalAves: predio.totalAves,
      activo: predio.activo,
      propietario: predio.propietario.nombre,
      cargoPropietario: predio.propietario.cargo,
      tieneVisitaAbierta: Boolean(predio.evaluacionAbierta),
      totalEvaluaciones: predio.totalEvaluaciones
    }));
  }

  // --- Evaluaciones ---
  if (puede(actor.rol, 'evaluaciones')) {
    contexto.evaluaciones = evaluacionesVisibles(actor);
    contexto.desempenoPorIndicador = desempenoPorIndicador(actor);
  }

  // --- Plan de mejora ---
  if (puede(actor.rol, 'planes')) {
    const hoy = new Date().toLocaleDateString('en-CA');
    contexto.accionesDeMejora = evaluaciones.listarAcciones({}).slice(0, TOPE_ACCIONES).map((accion) => ({
      predio: accion.predio,
      evaluacion: accion.evaluacionCodigo,
      descripcion: accion.descripcion,
      responsable: accion.responsable,
      fechaLimite: accion.fechaLimite,
      estado: accion.estado,
      avance: accion.avance,
      atrasada: accion.estado !== 'cumplida' && accion.fechaLimite < hoy
    }));
  }

  // --- Usuarios: solo quien administra cuentas, y nunca datos sensibles ---
  if (puede(actor.rol, 'usuarios')) {
    contexto.usuarios = usuarios.listar().map((usuario) => ({
      nombre: usuario.nombre,
      rol: usuario.rol,
      activo: usuario.activo,
      pendienteDeActivar: usuario.debeCambiarPassword,
      ultimoAcceso: usuario.ultimoAcceso
    }));
  }

  // --- Parametrizacion ---
  if (puede(actor.rol, 'parametrizacion')) {
    contexto.configuracion = {
      exigenciaDocumental: obtenerConfig(CLAVES.EXIGENCIA),
      departamentosEnCatalogo: obtenerConfig(CLAVES.CATALOGOS)?.departamentos?.length ?? 0
    };
  }

  return contexto;
}

/**
 * Secciones presentes, para que el modelo sepa de que puede hablar
 * y la interfaz pueda mostrarlo.
 */
export function seccionesDisponibles(contexto) {
  const nombres = {
    resumenGeneral: 'resumen general',
    consolidadoPorDepartamento: 'consolidado por departamento',
    predios: 'predios',
    evaluaciones: 'evaluaciones',
    desempenoPorIndicador: 'desempeno por indicador',
    accionesDeMejora: 'plan de mejora',
    usuarios: 'usuarios',
    configuracion: 'parametrizacion',
    normaIca: 'reglas de la metodologia ICA',
    catalogoIndicadores: 'catalogo de los 35 indicadores'
  };
  return Object.keys(nombres).filter((clave) => contexto[clave] != null).map((clave) => nombres[clave]);
}
