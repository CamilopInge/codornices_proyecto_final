/**
 * Roles y matriz de permisos.
 *
 * El sistema anterior manejaba dos vocabularios distintos (la base aceptaba
 * admin/evaluador/lectura y la interfaz hablaba de admin/docente/evaluador/consultor)
 * con mapas de traduccion entre ambos. Aqui hay un unico vocabulario que la base,
 * la API y la interfaz comparten.
 */

export const ROLES = {
  ADMIN: 'admin',
  DOCENTE: 'docente',
  EVALUADOR: 'evaluador',
  CONSULTOR: 'consultor'
};

export const LISTA_ROLES = Object.values(ROLES);

export const ROL_NOMBRE = {
  [ROLES.ADMIN]: 'Administrador',
  [ROLES.DOCENTE]: 'Docente',
  [ROLES.EVALUADOR]: 'Evaluador',
  [ROLES.CONSULTOR]: 'Consultor'
};

export const ROL_DESCRIPCION = {
  [ROLES.ADMIN]: 'Control total: usuarios, parametrizacion, auditoria y datos.',
  [ROLES.DOCENTE]: 'Supervisa predios y planes de mejora; consulta evaluaciones sin diligenciarlas.',
  [ROLES.EVALUADOR]: 'Diligencia visitas, cierra evaluaciones y gestiona planes de mejora.',
  [ROLES.CONSULTOR]: 'Acceso de solo lectura a evaluaciones y reportes.'
};

/** Modulos de la aplicacion, en el orden en que aparecen en la navegacion. */
export const MODULOS = [
  { clave: 'dashboard', titulo: 'Panel general', icono: 'panel' },
  { clave: 'predios', titulo: 'Predios', icono: 'predio' },
  { clave: 'evaluaciones', titulo: 'Evaluaciones', icono: 'evaluacion' },
  { clave: 'planes', titulo: 'Planes de mejora', icono: 'plan' },
  { clave: 'reportes', titulo: 'Reportes', icono: 'reporte' },
  { clave: 'parametrizacion', titulo: 'Parametrizacion', icono: 'parametro' },
  { clave: 'usuarios', titulo: 'Usuarios', icono: 'usuario' },
  { clave: 'auditoria', titulo: 'Auditoria', icono: 'auditoria' }
];

const LECTURA = 'r';
const ESCRITURA = 'w';

/**
 * Matriz modulo -> nivel de acceso por rol.
 * 'w' implica 'r'. La ausencia de clave significa sin acceso.
 */
export const PERMISOS = {
  [ROLES.ADMIN]: {
    dashboard: LECTURA,
    predios: ESCRITURA,
    evaluaciones: ESCRITURA,
    planes: ESCRITURA,
    reportes: LECTURA,
    parametrizacion: ESCRITURA,
    usuarios: ESCRITURA,
    auditoria: LECTURA
  },
  [ROLES.DOCENTE]: {
    dashboard: LECTURA,
    predios: ESCRITURA,
    evaluaciones: LECTURA,
    planes: ESCRITURA,
    reportes: LECTURA,
    parametrizacion: LECTURA
  },
  [ROLES.EVALUADOR]: {
    dashboard: LECTURA,
    predios: ESCRITURA,
    evaluaciones: ESCRITURA,
    planes: ESCRITURA,
    reportes: LECTURA
  },
  [ROLES.CONSULTOR]: {
    dashboard: LECTURA,
    evaluaciones: LECTURA,
    reportes: LECTURA
  }
};

/** Comprueba si un rol puede leer o escribir en un modulo. */
export function puede(rol, modulo, nivel = LECTURA) {
  const acceso = PERMISOS[rol]?.[modulo];
  if (!acceso) return false;
  return nivel === LECTURA ? true : acceso === ESCRITURA;
}

/** Modulos visibles en la navegacion para un rol. */
export function modulosVisibles(rol) {
  return MODULOS.filter((modulo) => puede(rol, modulo.clave));
}

export function esRolValido(rol) {
  return LISTA_ROLES.includes(rol);
}

export const NIVEL = { LECTURA, ESCRITURA };
