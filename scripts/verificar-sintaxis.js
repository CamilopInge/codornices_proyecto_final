/**
 * Verificacion estatica de todos los modulos del proyecto.
 *
 *   npm run check
 *
 * Backend, API y dominio compartido se importan de verdad, asi que tambien se
 * comprueba que cada import exista. Los modulos del frontend solo se analizan
 * sintacticamente: sus imports usan rutas absolutas del navegador (/shared/...)
 * que resuelve el servidor web, no el cargador de modulos de Node.
 */

import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { pathToFileURL } from 'node:url';
import { RAIZ_PROYECTO } from '../backend/config/env.js';

const ejecutar = promisify(execFile);

const DE_SERVIDOR = ['shared', 'backend', 'api', 'scripts'];
const DE_NAVEGADOR = ['frontend/assets/js'];
const EXCLUIR = new Set(['node_modules', 'data', '.git', '.archivo-pre-refactor']);

function recolectar(carpeta) {
  const absoluta = path.join(RAIZ_PROYECTO, carpeta);
  if (!fs.existsSync(absoluta)) return [];

  const encontrados = [];
  const recorrer = (actual) => {
    for (const entrada of fs.readdirSync(actual, { withFileTypes: true })) {
      if (EXCLUIR.has(entrada.name)) continue;
      const ruta = path.join(actual, entrada.name);
      if (entrada.isDirectory()) recorrer(ruta);
      else if (entrada.name.endsWith('.js')) encontrados.push(ruta);
    }
  };
  recorrer(absoluta);
  return encontrados;
}

const relativa = (ruta) => path.relative(RAIZ_PROYECTO, ruta);
const fallos = [];

// --- Modulos de servidor: import real, valida sintaxis y rutas de import ----

const archivosServidor = DE_SERVIDOR.flatMap(recolectar)
  // Los scripts ejecutables corren su logica al importarse; solo se parsean.
  .filter((ruta) => !ruta.includes(`${path.sep}scripts${path.sep}`));

for (const archivo of archivosServidor) {
  try {
    await import(pathToFileURL(archivo).href);
  } catch (error) {
    fallos.push({ archivo: relativa(archivo), error: error.message });
  }
}

// --- Modulos de navegador y scripts: solo analisis sintactico ---------------

const archivosSoloSintaxis = [
  ...DE_NAVEGADOR.flatMap(recolectar),
  ...recolectar('scripts')
];

for (const archivo of archivosSoloSintaxis) {
  try {
    await ejecutar(process.execPath, ['--check', archivo]);
  } catch (error) {
    fallos.push({ archivo: relativa(archivo), error: (error.stderr || error.message).trim().split('\n').slice(0, 3).join('\n    ') });
  }
}

/** Los imports absolutos del frontend deben existir bajo shared/. */
for (const archivo of DE_NAVEGADOR.flatMap(recolectar)) {
  const contenido = fs.readFileSync(archivo, 'utf8');
  for (const [, ruta] of contenido.matchAll(/from\s+['"](\/shared\/[^'"]+)['"]/g)) {
    const destino = path.join(RAIZ_PROYECTO, ruta);
    if (!fs.existsSync(destino)) {
      fallos.push({ archivo: relativa(archivo), error: `import a ${ruta} pero el archivo no existe` });
    }
  }
}

const total = archivosServidor.length + archivosSoloSintaxis.length;
console.log(`\nVerificados ${total} modulo(s): ${archivosServidor.length} con resolucion de imports, ${archivosSoloSintaxis.length} solo sintaxis.`);

if (fallos.length) {
  console.error(`\n${fallos.length} con problemas:\n`);
  for (const fallo of fallos) console.error(`  ${fallo.archivo}\n    ${fallo.error}\n`);
  process.exit(1);
}

console.log('Sin errores de sintaxis ni imports rotos.\n');
