/**
 * Pruebas de integracion de la API.
 *
 * Levantan la aplicacion contra una base de datos temporal, de modo que no
 * tocan los datos reales del entorno de desarrollo.
 */

import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// La configuracion se lee al importar, asi que el entorno se prepara antes.
const temporal = fs.mkdtempSync(path.join(os.tmpdir(), 'evalcodorniz-test-'));
process.env.NODE_ENV = 'test';
process.env.DATA_DIR = temporal;
process.env.JWT_SECRET = 'secreto-de-pruebas-con-mas-de-treinta-y-dos-caracteres';
process.env.SEED_ADMIN_EMAIL = 'admin@prueba.local';
process.env.SEED_ADMIN_USERNAME = 'adminprueba';
process.env.SEED_ADMIN_PASSWORD = 'ClaveDePrueba2026';
process.env.BCRYPT_ROUNDS = '4'; // rondas bajas: las pruebas no necesitan el costo real
process.env.SMTP_HOST = '';

const { validarConfiguracion } = await import('../backend/config/env.js');
const { inicializarBaseDatos, cerrarBaseDatos } = await import('../backend/db/index.js');
const { sembrarAdministrador } = await import('../backend/db/seed.js');
const { crearApp } = await import('../api/app.js');

let servidor;
let base;
let tokenAdmin;

const pedir = async (ruta, { metodo = 'GET', cuerpo, token = tokenAdmin } = {}) => {
  const respuesta = await fetch(`${base}${ruta}`, {
    method: metodo,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined
  });
  const datos = await respuesta.json().catch(() => null);
  return { estado: respuesta.status, datos };
};

before(async () => {
  validarConfiguracion({ silencioso: true });
  inicializarBaseDatos({ silencioso: true });
  await sembrarAdministrador();

  const app = crearApp();
  servidor = app.listen(0);
  await new Promise((resolver) => servidor.once('listening', resolver));
  base = `http://127.0.0.1:${servidor.address().port}/api`;

  const { datos } = await pedir('/auth/login', {
    metodo: 'POST',
    token: null,
    cuerpo: { identificador: 'adminprueba', password: 'ClaveDePrueba2026' }
  });
  tokenAdmin = datos.token;
});

after(async () => {
  await new Promise((resolver) => servidor.close(resolver));
  cerrarBaseDatos();
  fs.rmSync(temporal, { recursive: true, force: true });
});

// --- Salud y autenticacion ---------------------------------------------------

test('GET /health responde sin autenticacion', async () => {
  const { estado, datos } = await pedir('/health', { token: null });
  assert.equal(estado, 200);
  assert.equal(datos.ok, true);
});

test('el login emite un token y devuelve el usuario', async () => {
  const { estado, datos } = await pedir('/auth/login', {
    metodo: 'POST', token: null,
    cuerpo: { identificador: 'adminprueba', password: 'ClaveDePrueba2026' }
  });
  assert.equal(estado, 200);
  assert.ok(datos.token);
  assert.equal(datos.usuario.rol, 'admin');
  assert.equal(datos.usuario.password_hash, undefined, 'nunca se expone el hash');
});

test('el login acepta tambien el correo como identificador', async () => {
  const { estado } = await pedir('/auth/login', {
    metodo: 'POST', token: null,
    cuerpo: { identificador: 'admin@prueba.local', password: 'ClaveDePrueba2026' }
  });
  assert.equal(estado, 200);
});

test('el login rechaza credenciales incorrectas sin revelar cual falla', async () => {
  const inexistente = await pedir('/auth/login', {
    metodo: 'POST', token: null,
    cuerpo: { identificador: 'nadie', password: 'loquesea12345' }
  });
  const claveMala = await pedir('/auth/login', {
    metodo: 'POST', token: null,
    cuerpo: { identificador: 'adminprueba', password: 'incorrecta123' }
  });

  assert.equal(inexistente.estado, 401);
  assert.equal(claveMala.estado, 401);
  assert.equal(inexistente.datos.mensaje, claveMala.datos.mensaje, 'el mensaje no debe distinguir ambos casos');
});

test('las rutas protegidas exigen token', async () => {
  const { estado } = await pedir('/predios', { token: null });
  assert.equal(estado, 401);
});

test('un token manipulado se rechaza', async () => {
  const { estado } = await pedir('/predios', { token: `${tokenAdmin}x` });
  assert.equal(estado, 401);
});

// --- Restablecimiento de contrasena -----------------------------------------

test('recuperar responde igual exista o no la cuenta', async () => {
  const existente = await pedir('/auth/recuperar', {
    metodo: 'POST', token: null, cuerpo: { correo: 'admin@prueba.local' }
  });
  const inexistente = await pedir('/auth/recuperar', {
    metodo: 'POST', token: null, cuerpo: { correo: 'nadie@prueba.local' }
  });

  assert.equal(existente.estado, 200);
  assert.equal(inexistente.estado, 200);
  assert.equal(existente.datos.mensaje, inexistente.datos.mensaje);
});

test('un token de restablecimiento solo sirve una vez', async () => {
  const solicitud = await pedir('/auth/recuperar', {
    metodo: 'POST', token: null, cuerpo: { correo: 'admin@prueba.local' }
  });
  const token = new URL(solicitud.datos.enlaceDesarrollo).hash.split('token=')[1];

  const valida = await pedir(`/auth/restablecer/${token}`, { token: null });
  assert.equal(valida.datos.valido, true);

  const primera = await pedir('/auth/restablecer', {
    metodo: 'POST', token: null,
    cuerpo: { token: decodeURIComponent(token), passwordNueva: 'OtraClaveSegura2026' }
  });
  assert.equal(primera.estado, 200);

  const segunda = await pedir('/auth/restablecer', {
    metodo: 'POST', token: null,
    cuerpo: { token: decodeURIComponent(token), passwordNueva: 'TerceraClave2026xy' }
  });
  assert.equal(segunda.estado, 400, 'el token ya se uso');

  // Se restaura la clave original para no romper las pruebas siguientes.
  const nueva = await pedir('/auth/recuperar', {
    metodo: 'POST', token: null, cuerpo: { correo: 'admin@prueba.local' }
  });
  const token2 = decodeURIComponent(new URL(nueva.datos.enlaceDesarrollo).hash.split('token=')[1]);
  await pedir('/auth/restablecer', {
    metodo: 'POST', token: null, cuerpo: { token: token2, passwordNueva: 'ClaveDePrueba2026' }
  });

  const relogin = await pedir('/auth/login', {
    metodo: 'POST', token: null,
    cuerpo: { identificador: 'adminprueba', password: 'ClaveDePrueba2026' }
  });
  tokenAdmin = relogin.datos.token;
});

test('el restablecimiento rechaza contrasenas cortas', async () => {
  const solicitud = await pedir('/auth/recuperar', {
    metodo: 'POST', token: null, cuerpo: { correo: 'admin@prueba.local' }
  });
  const token = decodeURIComponent(new URL(solicitud.datos.enlaceDesarrollo).hash.split('token=')[1]);

  const { estado, datos } = await pedir('/auth/restablecer', {
    metodo: 'POST', token: null, cuerpo: { token, passwordNueva: 'corta' }
  });
  assert.equal(estado, 400);
  assert.match(datos.mensaje, /12 caracteres/);
});

// --- Predios -----------------------------------------------------------------

const predioValido = {
  nombre: 'Predio de prueba',
  sistema: 'jaula',
  departamento: 'Boyaca',
  municipio: 'Tunja',
  inventario: { dia: 0, levante: 300, produccion: 1200 },
  propietario: {
    nombre: 'Persona Responsable', cargo: 'Dueno',
    documento: '12345678', telefono: '3001234567'
  }
};

test('se puede crear un predio y trae sus metadatos ICA', async () => {
  const { estado, datos } = await pedir('/predios', { metodo: 'POST', cuerpo: predioValido });
  assert.equal(estado, 201);
  assert.equal(datos.totalAves, 1500);
  assert.deepEqual(datos.ica.ponderacion, { MBA: 60, MBR: 25, MBG: 15 });
  assert.equal(datos.ica.indicadoresAplicables, 33);
  assert.equal(datos.ica.muestreo.totalAvesMuestra, 90);
});

test('un predio sin aves se rechaza', async () => {
  const { estado } = await pedir('/predios', {
    metodo: 'POST',
    cuerpo: { ...predioValido, nombre: 'Sin aves', inventario: { dia: 0, levante: 0, produccion: 0 } }
  });
  assert.equal(estado, 400);
});

test('un sistema productivo invalido se rechaza', async () => {
  const { estado } = await pedir('/predios', {
    metodo: 'POST', cuerpo: { ...predioValido, nombre: 'Sistema malo', sistema: 'flotante' }
  });
  assert.equal(estado, 400);
});

test('el codigo ICA no se puede duplicar', async () => {
  await pedir('/predios', { metodo: 'POST', cuerpo: { ...predioValido, nombre: 'Con codigo', codigoIca: 'ICA-DUP-1' } });
  const { estado } = await pedir('/predios', {
    metodo: 'POST', cuerpo: { ...predioValido, nombre: 'Otro', codigoIca: 'ICA-DUP-1' }
  });
  assert.equal(estado, 409);
});

// --- Evaluaciones ------------------------------------------------------------

test('el servidor deriva el puntaje de los datos crudos, no del valor enviado', async () => {
  const predio = await pedir('/predios', { metodo: 'POST', cuerpo: { ...predioValido, nombre: 'Para puntaje' } });
  const evaluacion = await pedir('/evaluaciones', {
    metodo: 'POST',
    cuerpo: { predioId: predio.datos.id, fechaVisita: new Date().toLocaleDateString('en-CA') }
  });
  assert.equal(evaluacion.estado, 201);

  // El cliente afirma 100 pero observa un 85% de jadeo, que la norma puntua en 0.
  const guardado = await pedir(`/evaluaciones/${evaluacion.datos.id}/respuestas`, {
    metodo: 'PUT',
    cuerpo: { respuestas: [{ indicador: 'MBA1', valor: 100, valorCrudo: { porcentaje: 85 } }] }
  });

  const respuesta = guardado.datos.respuestas.find((r) => r.indicador === 'MBA1');
  assert.equal(respuesta.valor, 0, 'el servidor recalcula a partir del porcentaje observado');
});

test('no se acepta un puntaje fuera de la escala del indicador', async () => {
  const predio = await pedir('/predios', { metodo: 'POST', cuerpo: { ...predioValido, nombre: 'Escala' } });
  const evaluacion = await pedir('/evaluaciones', {
    metodo: 'POST', cuerpo: { predioId: predio.datos.id, fechaVisita: new Date().toLocaleDateString('en-CA') }
  });

  const { estado } = await pedir(`/evaluaciones/${evaluacion.datos.id}/respuestas`, {
    metodo: 'PUT', cuerpo: { respuestas: [{ indicador: 'MBR1', valor: 73 }] }
  });
  assert.equal(estado, 400);
});

test('no se aceptan indicadores que no aplican al predio', async () => {
  const predio = await pedir('/predios', { metodo: 'POST', cuerpo: { ...predioValido, nombre: 'No aplica' } });
  const evaluacion = await pedir('/evaluaciones', {
    metodo: 'POST', cuerpo: { predioId: predio.datos.id, fechaVisita: new Date().toLocaleDateString('en-CA') }
  });

  // MBR3 es exclusivo de piso y el predio es de jaula.
  const { estado } = await pedir(`/evaluaciones/${evaluacion.datos.id}/respuestas`, {
    metodo: 'PUT', cuerpo: { respuestas: [{ indicador: 'MBR3', valor: 100 }] }
  });
  assert.equal(estado, 400);
});

test('solo puede haber una evaluacion abierta por predio', async () => {
  const predio = await pedir('/predios', { metodo: 'POST', cuerpo: { ...predioValido, nombre: 'Una abierta' } });
  const hoy = new Date().toLocaleDateString('en-CA');

  const primera = await pedir('/evaluaciones', { metodo: 'POST', cuerpo: { predioId: predio.datos.id, fechaVisita: hoy } });
  assert.equal(primera.estado, 201);

  const segunda = await pedir('/evaluaciones', { metodo: 'POST', cuerpo: { predioId: predio.datos.id, fechaVisita: hoy } });
  assert.equal(segunda.estado, 409);
});

test('la fecha de visita no puede ser futura', async () => {
  const predio = await pedir('/predios', { metodo: 'POST', cuerpo: { ...predioValido, nombre: 'Futuro' } });
  const manana = new Date(Date.now() + 86400000).toLocaleDateString('en-CA');

  const { estado } = await pedir('/evaluaciones', {
    metodo: 'POST', cuerpo: { predioId: predio.datos.id, fechaVisita: manana }
  });
  assert.equal(estado, 400);
});

test('la seleccion de muestra es reproducible entre llamadas', async () => {
  const predio = await pedir('/predios', { metodo: 'POST', cuerpo: { ...predioValido, nombre: 'Muestra' } });
  const evaluacion = await pedir('/evaluaciones', {
    metodo: 'POST', cuerpo: { predioId: predio.datos.id, fechaVisita: new Date().toLocaleDateString('en-CA') }
  });
  const id = evaluacion.datos.id;

  const primera = await pedir(`/evaluaciones/${id}/muestra`, { metodo: 'POST' });
  const segunda = await pedir(`/evaluaciones/${id}/muestra`, { metodo: 'POST' });

  assert.deepEqual(primera.datos.inspeccion.puntos, segunda.datos.inspeccion.puntos);
  assert.equal(primera.datos.inspeccion.aves.length, 90);
});

// --- Permisos ----------------------------------------------------------------

test('un consultor no puede escribir ni ver modulos ajenos a su rol', async () => {
  const creado = await pedir('/usuarios', {
    metodo: 'POST',
    cuerpo: { nombre: 'Consultor Prueba', username: 'consultorp', email: 'consultor@prueba.local', rol: 'consultor' }
  });
  assert.equal(creado.estado, 201);

  const enlace = creado.datos.enlaceDesarrollo;
  const token = decodeURIComponent(new URL(enlace).hash.split('token=')[1]);
  await pedir('/auth/restablecer', {
    metodo: 'POST', token: null, cuerpo: { token, passwordNueva: 'ClaveConsultor2026' }
  });

  const sesion = await pedir('/auth/login', {
    metodo: 'POST', token: null,
    cuerpo: { identificador: 'consultorp', password: 'ClaveConsultor2026' }
  });
  const tokenConsultor = sesion.datos.token;

  assert.equal((await pedir('/evaluaciones', { token: tokenConsultor })).estado, 200);
  assert.equal((await pedir('/reportes/panel', { token: tokenConsultor })).estado, 200);
  assert.equal((await pedir('/predios', { token: tokenConsultor })).estado, 403);
  assert.equal((await pedir('/usuarios', { token: tokenConsultor })).estado, 403);
  assert.equal((await pedir('/auditoria', { token: tokenConsultor })).estado, 403);
  assert.equal(
    (await pedir('/predios', { metodo: 'POST', token: tokenConsultor, cuerpo: predioValido })).estado,
    403
  );
});

test('no se puede crear un usuario con correo repetido', async () => {
  const { estado } = await pedir('/usuarios', {
    metodo: 'POST',
    cuerpo: { nombre: 'Repetido', username: 'otrousuario', email: 'consultor@prueba.local', rol: 'evaluador' }
  });
  assert.equal(estado, 409);
});

test('el administrador no puede desactivarse a si mismo', async () => {
  const { datos: yo } = await pedir('/auth/me');
  const { estado } = await pedir(`/usuarios/${yo.usuario.id}`, { metodo: 'PATCH', cuerpo: { activo: false } });
  assert.equal(estado, 400);
});

// --- Auditoria ---------------------------------------------------------------

test('la auditoria registra los accesos y los cambios', async () => {
  const { estado, datos } = await pedir('/auditoria?limite=200');
  assert.equal(estado, 200);
  assert.ok(datos.total > 0);

  const acciones = new Set(datos.entradas.map((e) => e.accion));
  assert.ok(acciones.has('login'));
  assert.ok(acciones.has('crear'));

  const fallos = datos.entradas.filter((e) => e.resultado === 'fallo');
  assert.ok(fallos.length > 0, 'tambien se registran los intentos fallidos');
});

test('rutas inexistentes bajo /api devuelven 404 en JSON', async () => {
  const { estado, datos } = await pedir('/no-existe');
  assert.equal(estado, 404);
  assert.equal(datos.error, 'NO_ENCONTRADO');
});
