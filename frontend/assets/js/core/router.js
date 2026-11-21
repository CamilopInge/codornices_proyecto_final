/**
 * Enrutador basado en el hash de la URL.
 *
 * El sistema anterior guardaba la vista activa en una variable, asi que no se
 * podia compartir un enlace a una evaluacion ni usar el boton atras del
 * navegador. Aqui cada vista tiene su propia direccion.
 */

const rutas = [];
let alCambiar = null;
let rutaActual = null;

/**
 * Registra una ruta.
 * El patron admite parametros con :nombre, por ejemplo '/evaluaciones/:id'.
 *
 * `vista` es el modulo de la vista; sus exportaciones (render, montar,
 * esqueleto) quedan en la entrada para que el despachador las use directamente.
 */
export function ruta(patron, vista, opciones = {}) {
  const nombres = [];
  const expresion = new RegExp(
    `^${patron
      .replace(/\//g, '\\/')
      .replace(/:(\w+)/g, (_, nombre) => { nombres.push(nombre); return '([^/]+)'; })}$`
  );
  rutas.push({ patron, expresion, nombres, ...vista, ...opciones });
}

function analizarHash() {
  const crudo = window.location.hash.replace(/^#/, '') || '/';
  const [camino, consulta = ''] = crudo.split('?');
  return {
    camino: camino.startsWith('/') ? camino : `/${camino}`,
    parametrosConsulta: Object.fromEntries(new URLSearchParams(consulta))
  };
}

function resolver(camino) {
  for (const entrada of rutas) {
    const coincidencia = camino.match(entrada.expresion);
    if (!coincidencia) continue;
    const parametros = Object.fromEntries(
      entrada.nombres.map((nombre, indice) => [nombre, decodeURIComponent(coincidencia[indice + 1])])
    );
    return { entrada, parametros };
  }
  return null;
}

async function despachar() {
  const { camino, parametrosConsulta } = analizarHash();
  const resuelta = resolver(camino);

  rutaActual = { camino, parametros: resuelta?.parametros ?? {}, consulta: parametrosConsulta };

  if (!resuelta) {
    await alCambiar?.({ camino, noEncontrada: true });
    return;
  }

  await alCambiar?.({
    camino,
    entrada: resuelta.entrada,
    parametros: resuelta.parametros,
    consulta: parametrosConsulta
  });
}

/** Arranca el enrutador. `manejador` recibe cada cambio de ruta. */
export function iniciarRouter(manejador) {
  alCambiar = manejador;
  window.addEventListener('hashchange', despachar);
  return despachar();
}

/** Navega a una ruta. `reemplazar` evita dejar entrada en el historial. */
export function ir(camino, { reemplazar = false, consulta } = {}) {
  const cadena = consulta ? `?${new URLSearchParams(consulta)}` : '';
  const destino = `#${camino}${cadena}`;

  if (reemplazar) {
    window.history.replaceState(null, '', destino);
    despachar();
  } else if (window.location.hash === destino) {
    despachar(); // misma ruta: forzar recarga de la vista
  } else {
    window.location.hash = destino;
  }
}

export const actual = () => rutaActual;

/** Vuelve a ejecutar la vista actual, util tras guardar un cambio. */
export const recargar = () => despachar();
