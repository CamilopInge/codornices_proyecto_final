/**
 * Pruebas del dominio ICA: tablas normativas, aplicabilidad y calculo.
 * No tocan la base de datos ni la red: son funciones puras.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { INDICADORES, INDICE, GRUPOS } from '../shared/ica/catalogo.js';
import {
  ponderacion, planMuestreo, nivelDe, totalAves, aplicaIndicador,
  indicadoresAplicables, puntajeDesdePorcentaje, densidadJaula, densidadPiso,
  puntajeDesdeDensidad, puntajeBebederos, puntajeComederos, requiereSoporte, NIVELES,
  relajacionesActivas, EXIGENCIA_PREDETERMINADA
} from '../shared/ica/reglas.js';
import { calcular, valorIndicador, validarCierre, seleccionarMuestra } from '../shared/ica/puntaje.js';
import { puede, ROLES, modulosVisibles } from '../shared/ica/roles.js';

test('el catalogo tiene los 35 indicadores de la matriz ICA', () => {
  assert.equal(INDICADORES.length, 35);
  assert.equal(INDICADORES.filter((i) => i.grupo === 'MBA').length, 11);
  assert.equal(INDICADORES.filter((i) => i.grupo === 'MBR').length, 14);
  assert.equal(INDICADORES.filter((i) => i.grupo === 'MBG').length, 10);
});

test('cada indicador tiene codigo unico y escala descendente', () => {
  const codigos = new Set();
  for (const indicador of INDICADORES) {
    assert.ok(!codigos.has(indicador.codigo), `codigo duplicado: ${indicador.codigo}`);
    codigos.add(indicador.codigo);

    assert.ok(indicador.niveles.length >= 2, `${indicador.codigo} necesita al menos dos niveles`);
    assert.equal(indicador.niveles[0][0], 100, `${indicador.codigo} debe empezar en 100`);

    const puntajes = indicador.niveles.map(([p]) => p);
    const ordenados = [...puntajes].sort((a, b) => b - a);
    assert.deepEqual(puntajes, ordenados, `${indicador.codigo} debe ir de mayor a menor`);

    assert.ok(GRUPOS.includes(indicador.grupo));
  }
});

test('Tabla 1: la ponderacion cambia en el umbral de 200 aves', () => {
  assert.deepEqual(ponderacion(199), { MBA: 70, MBR: 30, MBG: 0 });
  // 200 exactas pertenece al grupo mayor.
  assert.deepEqual(ponderacion(200), { MBA: 60, MBR: 25, MBG: 15 });
  assert.deepEqual(ponderacion(1500), { MBA: 60, MBR: 25, MBG: 15 });

  for (const total of [10, 199, 200, 5000]) {
    const pesos = ponderacion(total);
    assert.equal(pesos.MBA + pesos.MBR + pesos.MBG, 100, 'los pesos deben sumar 100');
  }
});

test('Tabla 2: los niveles cubren el rango completo sin solaparse', () => {
  assert.equal(nivelDe(100).nombre, 'Excelente');
  assert.equal(nivelDe(90).nombre, 'Excelente');
  assert.equal(nivelDe(89.99).nombre, 'Alto');
  assert.equal(nivelDe(75).nombre, 'Alto');
  assert.equal(nivelDe(74.99).nombre, 'Medio');
  assert.equal(nivelDe(50).nombre, 'Medio');
  assert.equal(nivelDe(49.99).nombre, 'Bajo');
  assert.equal(nivelDe(0).nombre, 'Bajo');
  assert.equal(nivelDe(null), null);

  for (let i = 1; i < NIVELES.length; i += 1) {
    assert.ok(NIVELES[i].minimo < NIVELES[i - 1].minimo, 'los minimos deben descender');
  }
  assert.equal(NIVELES.at(-1).minimo, 0, 'el nivel mas bajo empieza en 0');
});

test('Tabla 3: el plan de muestreo cambia en el umbral de 200 aves', () => {
  assert.deepEqual(planMuestreo(199), { corrales: 1, puntos: 5, avesPorPunto: 10, totalAvesMuestra: 50 });
  assert.deepEqual(planMuestreo(200), { corrales: 2, puntos: 9, avesPorPunto: 10, totalAvesMuestra: 90 });
});

test('totalAves suma los tres grupos etarios', () => {
  assert.equal(totalAves({ dia: 50, levante: 200, produccion: 650 }), 900);
  assert.equal(totalAves({}), 0);
});

test('aplicabilidad: MBG solo con 200 aves o mas', () => {
  const mbg = INDICE.MBG1;
  assert.equal(aplicaIndicador(mbg, { totalAves: 199, sistema: 'jaula' }), false);
  assert.equal(aplicaIndicador(mbg, { totalAves: 200, sistema: 'jaula' }), true);
});

test('aplicabilidad: la mortalidad exige mas de 200 aves, no 200 exactas', () => {
  const mba10 = INDICE.MBA10;
  assert.equal(aplicaIndicador(mba10, { totalAves: 200, sistema: 'jaula' }), false);
  assert.equal(aplicaIndicador(mba10, { totalAves: 201, sistema: 'jaula' }), true);
});

test('aplicabilidad: hay indicadores exclusivos de piso y de jaula', () => {
  assert.equal(aplicaIndicador(INDICE.MBR3, { totalAves: 1000, sistema: 'piso' }), true);
  assert.equal(aplicaIndicador(INDICE.MBR3, { totalAves: 1000, sistema: 'jaula' }), false);
  assert.equal(aplicaIndicador(INDICE.MBR4, { totalAves: 1000, sistema: 'jaula' }), true);
  assert.equal(aplicaIndicador(INDICE.MBR4, { totalAves: 1000, sistema: 'piso' }), false);
  assert.equal(aplicaIndicador(INDICE.MBR14, { totalAves: 1000, sistema: 'piso' }), true);
});

test('indicadoresAplicables devuelve el conjunto correcto por escenario', () => {
  const jaulaGrande = indicadoresAplicables({ totalAves: 1500, sistema: 'jaula' });
  assert.equal(jaulaGrande.length, 33, '35 menos MBR3 y MBR14, exclusivos de piso');
  assert.ok(!jaulaGrande.includes('MBR3'));
  assert.ok(!jaulaGrande.includes('MBR14'));
  assert.ok(jaulaGrande.includes('MBR4'));
  assert.ok(jaulaGrande.includes('MBG1'));

  const pisoPequeno = indicadoresAplicables({ totalAves: 150, sistema: 'piso' });
  assert.ok(!pisoPequeno.some((codigo) => INDICE[codigo].grupo === 'MBG'), 'sin MBG bajo 200 aves');
  assert.ok(!pisoPequeno.includes('MBA10'), 'sin mortalidad bajo 200 aves');
  assert.ok(!pisoPequeno.includes('MBR4'), 'sin integridad de jaula en piso');
  assert.ok(pisoPequeno.includes('MBR3'));
});

test('porcentajes: los umbrales de cada indicador se respetan', () => {
  assert.equal(puntajeDesdePorcentaje('MBA1', 40), 100);
  assert.equal(puntajeDesdePorcentaje('MBA1', 41), 55);
  assert.equal(puntajeDesdePorcentaje('MBA1', 60), 55);
  assert.equal(puntajeDesdePorcentaje('MBA1', 61), 0);

  assert.equal(puntajeDesdePorcentaje('MBA10', 12), 100);
  assert.equal(puntajeDesdePorcentaje('MBA10', 14), 55);
  assert.equal(puntajeDesdePorcentaje('MBA10', 15), 0);

  // MBA11 invierte la escala: mas contacto aceptado es mejor.
  assert.equal(puntajeDesdePorcentaje('MBA11', 95), 100);
  assert.equal(puntajeDesdePorcentaje('MBA11', 90), 55);
  assert.equal(puntajeDesdePorcentaje('MBA11', 70), 55);
  assert.equal(puntajeDesdePorcentaje('MBA11', 69), 0);
});

test('densidad en jaula: D es el promedio de CJ e IG', () => {
  // CJ = 1500/40 = 37.5 ; IG = 1500/60 = 25 ; D = 31.25 -> dentro del limite
  const densidad = densidadJaula({ at: 40, ta: 1500, aj: 60, tg: 1500 });
  assert.equal(densidad, 31.25);
  assert.equal(puntajeDesdeDensidad(densidad), 100);

  // CJ = 1500/10 = 150 ; IG = 1500/20 = 75 ; D = 112.5 -> excede
  assert.equal(puntajeDesdeDensidad(densidadJaula({ at: 10, ta: 1500, aj: 20, tg: 1500 })), 0);

  assert.equal(densidadJaula({ at: 0, ta: 1500, aj: 60, tg: 1500 }), null);
});

test('densidad en piso: el limite son 55 aves por metro cuadrado', () => {
  assert.equal(puntajeDesdeDensidad(densidadPiso({ aves: 55, metrosCuadrados: 1 })), 100);
  assert.equal(puntajeDesdeDensidad(densidadPiso({ aves: 56, metrosCuadrados: 1 })), 0);
  assert.equal(densidadPiso({ aves: 100, metrosCuadrados: 0 }), null);
});

test('bebederos: la tolerancia es del 30% sobre el limite', () => {
  assert.equal(puntajeBebederos({ animales: 100, unidades: 10, limite: 10 }), 100);
  assert.equal(puntajeBebederos({ animales: 130, unidades: 10, limite: 10 }), 55);
  assert.equal(puntajeBebederos({ animales: 131, unidades: 10, limite: 10 }), 0);
  assert.equal(puntajeBebederos({ animales: 100, unidades: 0, limite: 10 }), null);
});

test('comederos: la competencia observada lleva el puntaje a cero', () => {
  assert.equal(puntajeComederos({ animales: 100, unidades: 10, limite: 10, competencia: false }), 100);
  assert.equal(puntajeComederos({ animales: 131, unidades: 10, limite: 10, competencia: false }), 55);
  assert.equal(puntajeComederos({ animales: 100, unidades: 10, limite: 10, competencia: true }), 0);
});

test('requiereSoporte: los MBG siempre, agua y espacio solo en predios grandes', () => {
  assert.equal(requiereSoporte('MBG1', 500), true);
  assert.equal(requiereSoporte('MBA10', 500), true);
  assert.equal(requiereSoporte('MBR1', 500), false);

  assert.equal(requiereSoporte('MBR13', 1000), false);
  assert.equal(requiereSoporte('MBR13', 1001), true);
  assert.equal(requiereSoporte('MBR8', 1001), true);
});

test('la exigencia documental configurable puede relajarse sin tocar la norma por defecto', () => {
  // Sin configuracion rige la norma completa.
  assert.equal(requiereSoporte('MBG1', 500), true);
  assert.equal(requiereSoporte('MBR13', 1500), true);

  const sinGestion = { exigirEnGestion: false, exigirEnPrediosGrandes: true };
  assert.equal(requiereSoporte('MBG1', 500, sinGestion), false);
  assert.equal(requiereSoporte('MBA10', 500, sinGestion), false);
  // Relajar la gestion no afecta a agua y espacio.
  assert.equal(requiereSoporte('MBR13', 1500, sinGestion), true);

  const sinPrediosGrandes = { exigirEnGestion: true, exigirEnPrediosGrandes: false };
  assert.equal(requiereSoporte('MBR13', 1500, sinPrediosGrandes), false);
  assert.equal(requiereSoporte('MBR8', 1500, sinPrediosGrandes), false);
  assert.equal(requiereSoporte('MBG1', 1500, sinPrediosGrandes), true);

  const ninguna = { exigirEnGestion: false, exigirEnPrediosGrandes: false };
  for (const codigo of ['MBG1', 'MBA10', 'MBR13', 'MBR8']) {
    assert.equal(requiereSoporte(codigo, 1500, ninguna), false, `${codigo} no deberia exigir soporte`);
  }
});

test('relajacionesActivas describe solo lo que se desactivo', () => {
  assert.deepEqual(relajacionesActivas(), []);
  assert.deepEqual(relajacionesActivas(EXIGENCIA_PREDETERMINADA), []);
  assert.equal(relajacionesActivas({ exigirEnGestion: false }).length, 1);
  assert.equal(relajacionesActivas({ exigirEnGestion: false, exigirEnPrediosGrandes: false }).length, 2);
  // marcarPorDefecto es una comodidad de captura, no una relajacion normativa.
  assert.deepEqual(relajacionesActivas({ marcarPorDefecto: true }), []);
});

test('validarCierre respeta la exigencia relajada al decidir si puede cerrarse', () => {
  const inspeccionValida = {
    semilla: 'x',
    corrales: ['A', 'B'],
    puntos: Array.from({ length: 9 }, (_, i) => `P${i}`),
    aves: Array.from({ length: 90 }, (_, i) => `A${i}`),
    bioseguridadVerificada: true,
    inspeccionNeutral: true
  };
  const entrada = {
    codigos: ['MBG2'],
    respuestas: { MBG2: { valor: 100 } },
    inspeccion: inspeccionValida,
    totalAves: 1500
  };

  // Con la norma completa, un documental en 100 sin soporte bloquea.
  assert.equal(validarCierre(entrada).puedeCerrar, false);

  // Relajada, deja de bloquear y tampoco advierte: el documento no se pide.
  const relajada = validarCierre({ ...entrada, exigencia: { exigirEnGestion: false } });
  assert.equal(relajada.puedeCerrar, true);
  assert.equal(relajada.avisos.length, 0);
});

test('valorIndicador promedia las observaciones punto a punto cuando existen', () => {
  assert.equal(valorIndicador({ valor: 100 }), 100);
  assert.equal(valorIndicador({ valor: 100, muestras: [100, 55, 0] }), 51.666666666666664);
  // Los valores fuera de la escala se descartan.
  assert.equal(valorIndicador({ valor: 55, muestras: [100, 77, 100] }), 100);
  assert.equal(valorIndicador({ valor: null }), null);
  assert.equal(valorIndicador(undefined), null);
});

test('calcular aplica la ponderacion de la Tabla 1', () => {
  const codigos = ['MBA1', 'MBA2', 'MBR1', 'MBR2', 'MBG2'];
  const respuestas = {
    MBA1: { valor: 100 }, MBA2: { valor: 50 },
    MBR1: { valor: 100 }, MBR2: { valor: 100 },
    MBG2: { valor: 0 }
  };
  const pesos = { MBA: 60, MBR: 25, MBG: 15 };

  const resultado = calcular({ codigos, respuestas, pesos });

  assert.equal(resultado.grupos.MBA.promedio, 75);
  assert.equal(resultado.grupos.MBR.promedio, 100);
  assert.equal(resultado.grupos.MBG.promedio, 0);
  // 75*0.60 + 100*0.25 + 0*0.15 = 45 + 25 = 70
  assert.equal(resultado.calificacion, 70);
  assert.equal(resultado.nivel, 'Medio');
  assert.equal(resultado.respondidos, 5);
});

test('calcular ignora los grupos sin indicadores respondidos', () => {
  const resultado = calcular({
    codigos: ['MBA1'],
    respuestas: { MBA1: { valor: 100 } },
    pesos: { MBA: 70, MBR: 30, MBG: 0 }
  });
  assert.equal(resultado.grupos.MBR.promedio, null);
  assert.equal(resultado.grupos.MBR.aporte, 0);
  assert.equal(resultado.calificacion, 70);
});

test('validarCierre bloquea si falta la seleccion de muestra', () => {
  const resultado = validarCierre({
    codigos: ['MBR1'],
    respuestas: { MBR1: { valor: 100 } },
    inspeccion: {},
    totalAves: 1500
  });
  assert.equal(resultado.puedeCerrar, false);
  assert.ok(resultado.bloqueos.some((b) => b.includes('seleccion reproducible')));
});

test('validarCierre bloquea un documental en 100 sin soporte completo', () => {
  const inspeccionValida = {
    semilla: 'x',
    corrales: ['A', 'B'],
    puntos: Array.from({ length: 9 }, (_, i) => `P${i}`),
    aves: Array.from({ length: 90 }, (_, i) => `A${i}`),
    bioseguridadVerificada: true,
    inspeccionNeutral: true
  };

  const sinSoporte = validarCierre({
    codigos: ['MBG2'],
    respuestas: { MBG2: { valor: 100 } },
    inspeccion: inspeccionValida,
    totalAves: 1500
  });
  assert.equal(sinSoporte.puedeCerrar, false);
  assert.ok(sinSoporte.bloqueos.some((b) => b.includes('MBG2')));

  const conSoporte = validarCierre({
    codigos: ['MBG2'],
    respuestas: { MBG2: { valor: 100, evidenciaId: 1, documento: { firmado: true, legible: true } } },
    inspeccion: inspeccionValida,
    totalAves: 1500
  });
  assert.equal(conSoporte.puedeCerrar, true);

  // En el nivel bajo solo advierte: no impide cerrar.
  const nivelBajo = validarCierre({
    codigos: ['MBG2'],
    respuestas: { MBG2: { valor: 0 } },
    inspeccion: inspeccionValida,
    totalAves: 1500
  });
  assert.equal(nivelBajo.puedeCerrar, true);
  assert.ok(nivelBajo.avisos.includes('MBG2'));
});

test('validarCierre detecta incoherencia entre jadeo y confort termico', () => {
  const resultado = validarCierre({
    codigos: ['MBA1', 'MBR11'],
    respuestas: { MBA1: { valor: 100 }, MBR11: { valor: 0 } },
    inspeccion: {},
    totalAves: 100
  });
  assert.ok(resultado.coherencia.some((c) => c.includes('MBA1')));
});

test('la seleccion de muestra es reproducible con la misma semilla', () => {
  const a = seleccionarMuestra({ semilla: 'ICA-EV-2026-0001', totalAves: 1500 });
  const b = seleccionarMuestra({ semilla: 'ICA-EV-2026-0001', totalAves: 1500 });
  const c = seleccionarMuestra({ semilla: 'ICA-EV-2026-0002', totalAves: 1500 });

  assert.deepEqual(a.corrales, b.corrales, 'la misma semilla da la misma seleccion');
  assert.deepEqual(a.puntos, b.puntos);
  assert.notDeepEqual(a.puntos, c.puntos, 'semillas distintas dan selecciones distintas');

  assert.equal(a.corrales.length, 2);
  assert.equal(a.puntos.length, 9);
  assert.equal(a.aves.length, 90);
  assert.equal(new Set(a.aves).size, 90, 'sin aves repetidas');
});

test('la matriz de permisos concede y niega lo esperado', () => {
  assert.equal(puede(ROLES.ADMIN, 'usuarios', 'w'), true);
  assert.equal(puede(ROLES.EVALUADOR, 'usuarios'), false);
  assert.equal(puede(ROLES.CONSULTOR, 'evaluaciones'), true);
  assert.equal(puede(ROLES.CONSULTOR, 'evaluaciones', 'w'), false);
  assert.equal(puede(ROLES.DOCENTE, 'evaluaciones', 'w'), false);
  assert.equal(puede(ROLES.DOCENTE, 'planes', 'w'), true);
  assert.equal(puede('inexistente', 'dashboard'), false);
});

test('todos los roles ven el panel y ninguno ve modulos sin permiso', () => {
  for (const rol of Object.values(ROLES)) {
    const modulos = modulosVisibles(rol).map((m) => m.clave);
    assert.ok(modulos.includes('dashboard'), `${rol} debe ver el panel`);
    for (const clave of modulos) {
      assert.equal(puede(rol, clave), true, `${rol} ve ${clave} pero no tiene permiso`);
    }
  }
});
