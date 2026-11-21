/**
 * Acceso a datos de predios.
 */

import { db, aBool, deBool } from '../db/index.js';
import { totalAves } from '../../shared/ica/reglas.js';

function mapear(fila) {
  if (!fila) return null;
  const inventario = {
    dia: fila.aves_dia,
    levante: fila.aves_levante,
    produccion: fila.aves_produccion
  };
  return {
    id: fila.id,
    codigoIca: fila.codigo_ica,
    nombre: fila.nombre,
    sistema: fila.sistema,
    especie: fila.especie,
    departamento: fila.departamento,
    municipio: fila.municipio,
    vereda: fila.vereda,
    direccion: fila.direccion,
    latitud: fila.latitud,
    longitud: fila.longitud,
    inventario,
    totalAves: totalAves(inventario),
    propietario: {
      nombre: fila.propietario_nombre,
      cargo: fila.propietario_cargo,
      documento: fila.propietario_documento,
      telefono: fila.propietario_telefono,
      correo: fila.propietario_correo
    },
    activo: aBool(fila.activo),
    evaluacionAbierta: fila.evaluacion_abierta ?? null,
    totalEvaluaciones: fila.total_evaluaciones ?? undefined,
    creadoEn: fila.created_at,
    actualizadoEn: fila.updated_at
  };
}

const SELECT_BASE = `
  SELECT p.*,
         (SELECT e.codigo FROM evaluaciones e
          WHERE e.predio_id = p.id AND e.estado = 'en_progreso' LIMIT 1) AS evaluacion_abierta,
         (SELECT COUNT(*) FROM evaluaciones e WHERE e.predio_id = p.id) AS total_evaluaciones
  FROM predios p
`;

export function listar({ soloActivos = false, departamento = null, municipio = null, busqueda = null } = {}) {
  const condiciones = [];
  const valores = [];

  if (soloActivos) condiciones.push('p.activo = 1');
  if (departamento) { condiciones.push('p.departamento = ?'); valores.push(departamento); }
  if (municipio) { condiciones.push('lower(p.municipio) LIKE ?'); valores.push(`%${municipio.toLowerCase()}%`); }
  if (busqueda) {
    condiciones.push('(lower(p.nombre) LIKE ? OR lower(p.codigo_ica) LIKE ?)');
    valores.push(`%${busqueda.toLowerCase()}%`, `%${busqueda.toLowerCase()}%`);
  }

  const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';
  return db().all(`${SELECT_BASE} ${where} ORDER BY p.nombre COLLATE NOCASE`, ...valores).map(mapear);
}

export function buscarPorId(id) {
  return mapear(db().get(`${SELECT_BASE} WHERE p.id = ?`, id));
}

export function buscarPorCodigoIca(codigo) {
  if (!codigo) return null;
  return mapear(db().get(`${SELECT_BASE} WHERE p.codigo_ica = ?`, codigo));
}

const COLUMNAS = {
  codigoIca: 'codigo_ica',
  nombre: 'nombre',
  sistema: 'sistema',
  especie: 'especie',
  departamento: 'departamento',
  municipio: 'municipio',
  vereda: 'vereda',
  direccion: 'direccion',
  latitud: 'latitud',
  longitud: 'longitud',
  avesDia: 'aves_dia',
  avesLevante: 'aves_levante',
  avesProduccion: 'aves_produccion',
  propietarioNombre: 'propietario_nombre',
  propietarioCargo: 'propietario_cargo',
  propietarioDocumento: 'propietario_documento',
  propietarioTelefono: 'propietario_telefono',
  propietarioCorreo: 'propietario_correo',
  activo: 'activo'
};

export function crear(datos, creadoPor = null) {
  const columnas = [];
  const marcadores = [];
  const valores = [];

  for (const [clave, columna] of Object.entries(COLUMNAS)) {
    if (datos[clave] === undefined) continue;
    columnas.push(columna);
    marcadores.push('?');
    valores.push(clave === 'activo' ? deBool(datos[clave]) : datos[clave]);
  }

  columnas.push('creado_por');
  marcadores.push('?');
  valores.push(creadoPor);

  const resultado = db().run(
    `INSERT INTO predios (${columnas.join(', ')}) VALUES (${marcadores.join(', ')})`,
    ...valores
  );
  return buscarPorId(Number(resultado.lastInsertRowid));
}

export function actualizar(id, cambios) {
  const asignaciones = [];
  const valores = [];

  for (const [clave, columna] of Object.entries(COLUMNAS)) {
    if (cambios[clave] === undefined) continue;
    asignaciones.push(`${columna} = ?`);
    valores.push(clave === 'activo' ? deBool(cambios[clave]) : cambios[clave]);
  }

  if (!asignaciones.length) return buscarPorId(id);

  asignaciones.push("updated_at = datetime('now')");
  db().run(`UPDATE predios SET ${asignaciones.join(', ')} WHERE id = ?`, ...valores, id);
  return buscarPorId(id);
}

export function tieneEvaluaciones(id) {
  const fila = db().get('SELECT COUNT(*) AS total FROM evaluaciones WHERE predio_id = ?', id);
  return (fila?.total ?? 0) > 0;
}

export function departamentosConPredios() {
  return db()
    .all('SELECT DISTINCT departamento FROM predios ORDER BY departamento COLLATE NOCASE')
    .map((fila) => fila.departamento);
}

export { mapear as mapearPredio };
