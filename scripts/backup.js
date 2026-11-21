/**
 * Respaldo de la base de datos y de los archivos de evidencia.
 *
 *   npm run backup
 *
 * La copia se escribe fuera del proyecto (BACKUP_DIR o ~/bienestarica-backups)
 * para que un despliegue o un git clean no se la lleve por delante.
 */

import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync, backup } from 'node:sqlite';
import config, { validarConfiguracion } from '../backend/config/env.js';

/**
 * @param {{etiqueta?: string}} opciones
 * @returns {Promise<string>} carpeta del respaldo creado
 */
export async function crearRespaldo({ etiqueta = '' } = {}) {
  if (!fs.existsSync(config.rutas.baseDatos)) {
    throw new Error(`No se encontro la base de datos en ${config.rutas.baseDatos}`);
  }

  const marca = new Date().toISOString().replace(/[:.]/g, '-');
  const sufijo = etiqueta ? `-${etiqueta}` : '';
  const destino = path.join(config.rutas.respaldos, `bienestarica-${marca}${sufijo}`);

  fs.mkdirSync(destino, { recursive: true });

  try {
    // La API de respaldo de SQLite produce una copia consistente aunque el
    // servidor este escribiendo; copiar el archivo a mano no lo garantiza.
    const origen = new DatabaseSync(config.rutas.baseDatos, { readOnly: true });
    try {
      await backup(origen, path.join(destino, 'bienestar-ica.sqlite'));
    } finally {
      origen.close();
    }

    if (fs.existsSync(config.rutas.evidencias)) {
      fs.cpSync(config.rutas.evidencias, path.join(destino, 'evidencias'), { recursive: true });
    }

    const manifiesto = {
      creadoEn: new Date().toISOString(),
      origen: config.rutas.baseDatos,
      entorno: config.entorno,
      etiqueta: etiqueta || null,
      incluyeEvidencias: fs.existsSync(config.rutas.evidencias)
    };
    fs.writeFileSync(path.join(destino, 'manifiesto.json'), JSON.stringify(manifiesto, null, 2), 'utf8');

    return destino;
  } catch (error) {
    // Un respaldo a medias confunde mas que no tenerlo.
    fs.rmSync(destino, { recursive: true, force: true });
    throw error;
  }
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('backup.js')) {
  validarConfiguracion({ silencioso: true });
  crearRespaldo()
    .then((destino) => console.log(`\nRespaldo creado en:\n  ${destino}\n`))
    .catch((error) => {
      console.error(`\nNo se pudo crear el respaldo: ${error.message}\n`);
      process.exit(1);
    });
}
