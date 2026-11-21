/**
 * Cliente minimo de la API de Gemini.
 *
 * Usa fetch nativo en vez del SDK oficial: la unica operacion que hace falta es
 * generateContent, y traer una dependencia completa para una sola llamada no se
 * justifica. Tambien evita que una actualizacion del SDK rompa el despliegue.
 *
 * Documentacion: https://ai.google.dev/api/generate-content
 */

import config from '../../config/env.js';
import { ErrorServicioExterno } from '../../errors.js';

const TIEMPO_MAXIMO_MS = 30_000;

/**
 * Reintentos ante saturacion del modelo.
 *
 * Gemini devuelve 503 cuando el modelo esta congestionado y 429 al superar la
 * cuota por minuto. Ambos son transitorios: fallar a la primera convertiria un
 * pico de demanda de unos segundos en un error para quien pregunta.
 */
const REINTENTOS = 3;
const ESPERA_BASE_MS = 900;
const ESTADOS_REINTENTABLES = new Set([429, 500, 502, 503, 504]);

const esperar = (ms) => new Promise((resolver) => setTimeout(resolver, ms));

/** Traduce los errores de la API a algo accionable para quien opera el sistema. */
function explicarFallo(estado, cuerpo) {
  const mensaje = cuerpo?.error?.message ?? '';

  if (estado === 400 && /API key not valid/i.test(mensaje)) {
    return 'La clave de Gemini no es valida. Revise GEMINI_API_KEY en el archivo .env.';
  }
  if (estado === 403) {
    return 'Gemini rechazo la clave. Verifique que este habilitada para la API Generative Language.';
  }
  if (estado === 429) {
    return 'Se alcanzo el limite de uso de la API de Gemini. Intente de nuevo en unos minutos.';
  }
  if (estado === 503) {
    return `El modelo "${config.asistente.modelo}" esta saturado en este momento. ` +
           'Vuelva a intentarlo en unos segundos, o use un modelo menos demandado ' +
           '(vea: npm run probar-asistente -- --modelos).';
  }
  if (estado === 404) {
    return `El modelo "${config.asistente.modelo}" no existe o no esta disponible para esta clave. ` +
           'Google retira versiones con cierta frecuencia. Vea los disponibles con: ' +
           'npm run probar-asistente -- --modelos';
  }
  if (estado >= 500) {
    return 'El servicio de Gemini no esta disponible en este momento.';
  }
  return mensaje || `Gemini respondio con el estado ${estado}.`;
}

/**
 * Genera una respuesta.
 *
 * @param {object} opciones
 * @param {string} opciones.instruccionSistema  Reglas de comportamiento del asistente.
 * @param {{rol: 'user'|'model', texto: string}[]} opciones.mensajes  Conversacion, en orden.
 * @param {boolean} [opciones.esperarJson]  Exige que la respuesta sea JSON valido.
 * @returns {Promise<{texto: string, tokens: object}>}
 */
export async function generar({ instruccionSistema, mensajes, esperarJson = false }) {
  if (!config.asistente.habilitado) {
    throw new ErrorServicioExterno(
      'El asistente no esta configurado. Defina GEMINI_API_KEY en el archivo .env para habilitarlo.'
    );
  }

  const url = `${config.asistente.baseUrl}/models/${encodeURIComponent(config.asistente.modelo)}:generateContent`;

  const cuerpo = {
    systemInstruction: { parts: [{ text: instruccionSistema }] },
    contents: mensajes.map((mensaje) => ({
      role: mensaje.rol === 'model' ? 'model' : 'user',
      parts: [{ text: mensaje.texto }]
    })),
    generationConfig: {
      temperature: config.asistente.temperatura,
      maxOutputTokens: config.asistente.maximoTokens,
      ...(esperarJson ? { responseMimeType: 'application/json' } : {})
    },
    // El asistente habla de bienestar animal: las categorias de dano no deberian
    // dispararse, pero se dejan en el umbral alto para no bloquear por terminos
    // clinicos como lesiones, mortalidad o sacrificio humanitario.
    safetySettings: [
      'HARM_CATEGORY_HARASSMENT',
      'HARM_CATEGORY_HATE_SPEECH',
      'HARM_CATEGORY_SEXUALLY_EXPLICIT',
      'HARM_CATEGORY_DANGEROUS_CONTENT'
    ].map((category) => ({ category, threshold: 'BLOCK_ONLY_HIGH' }))
  };

  let respuesta;
  let datos;

  for (let intento = 0; intento <= REINTENTOS; intento += 1) {
    try {
      respuesta = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // La clave va en cabecera y no en la URL, para que no quede en los
          // registros de acceso de un proxy intermedio.
          'x-goog-api-key': config.asistente.clave
        },
        body: JSON.stringify(cuerpo),
        signal: AbortSignal.timeout(TIEMPO_MAXIMO_MS)
      });
    } catch (error) {
      if (error.name === 'TimeoutError' || error.name === 'AbortError') {
        throw new ErrorServicioExterno('Gemini tardo demasiado en responder. Intente de nuevo.');
      }
      throw new ErrorServicioExterno(`No se pudo contactar a Gemini: ${error.message}`);
    }

    datos = await respuesta.json().catch(() => null);
    if (respuesta.ok) break;

    const puedeReintentarse = ESTADOS_REINTENTABLES.has(respuesta.status) && intento < REINTENTOS;
    if (!puedeReintentarse) throw new ErrorServicioExterno(explicarFallo(respuesta.status, datos));

    // Espera creciente con algo de dispersion, para no reintentar todas las
    // peticiones a la vez cuando el modelo se congestiona.
    const espera = ESPERA_BASE_MS * 2 ** intento + Math.random() * 400;
    console.warn(`[asistente] Gemini respondio ${respuesta.status}; reintento ${intento + 1} de ${REINTENTOS} en ${Math.round(espera)} ms`);
    await esperar(espera);
  }

  const candidato = datos?.candidates?.[0];

  if (candidato?.finishReason === 'SAFETY') {
    throw new ErrorServicioExterno('La respuesta fue bloqueada por los filtros de seguridad de Gemini.');
  }
  if (candidato?.finishReason === 'MAX_TOKENS') {
    // No es un fallo: se devuelve lo generado y el servicio decide que hacer.
    console.warn('[asistente] la respuesta se trunco por limite de tokens');
  }

  const texto = candidato?.content?.parts?.map((parte) => parte.text ?? '').join('') ?? '';

  if (!texto.trim()) {
    throw new ErrorServicioExterno('Gemini devolvio una respuesta vacia.');
  }

  return {
    texto,
    truncada: candidato?.finishReason === 'MAX_TOKENS',
    tokens: {
      entrada: datos?.usageMetadata?.promptTokenCount ?? null,
      salida: datos?.usageMetadata?.candidatesTokenCount ?? null,
      total: datos?.usageMetadata?.totalTokenCount ?? null
    }
  };
}

/**
 * Lista los modelos que la clave puede usar para generar texto.
 * Sirve para diagnosticar un GEMINI_MODEL obsoleto sin adivinar.
 */
export async function listarModelos() {
  if (!config.asistente.habilitado) {
    throw new ErrorServicioExterno('Defina GEMINI_API_KEY antes de listar los modelos.');
  }

  const respuesta = await fetch(`${config.asistente.baseUrl}/models`, {
    headers: { 'x-goog-api-key': config.asistente.clave },
    signal: AbortSignal.timeout(TIEMPO_MAXIMO_MS)
  });

  const datos = await respuesta.json().catch(() => null);
  if (!respuesta.ok) throw new ErrorServicioExterno(explicarFallo(respuesta.status, datos));

  return (datos.models ?? [])
    .filter((modelo) => modelo.supportedGenerationMethods?.includes('generateContent'))
    .map((modelo) => ({
      nombre: modelo.name.replace('models/', ''),
      descripcion: modelo.displayName,
      tokensEntrada: modelo.inputTokenLimit,
      tokensSalida: modelo.outputTokenLimit
    }))
    // Fuera los que no sirven para una conversacion de texto.
    .filter((modelo) => !/tts|image|embedding|aqa|vision|transcribe|lyria/i.test(modelo.nombre));
}

/** Comprueba que la clave y el modelo funcionen, sin gastar una conversacion. */
export async function verificar() {
  const resultado = await generar({
    instruccionSistema: 'Responde unicamente con la palabra OK.',
    mensajes: [{ rol: 'user', texto: 'Prueba de conexion.' }]
  });
  return { ok: true, modelo: config.asistente.modelo, respuesta: resultado.texto.trim().slice(0, 40) };
}
