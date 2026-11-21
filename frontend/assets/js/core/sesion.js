/**
 * Sesion del usuario en el navegador.
 *
 * El token vive en sessionStorage: se pierde al cerrar la pestana, que es lo
 * deseable en equipos compartidos. El acceso siempre va envuelto en try/catch
 * porque en modo privado o con las cookies bloqueadas el acceso puede lanzar.
 */

const CLAVE_TOKEN = 'evalcodorniz.token';
const CLAVE_USUARIO = 'evalcodorniz.usuario';
const CLAVE_TEMA = 'evalcodorniz.tema';

const leer = (clave, almacen = sessionStorage) => {
  try { return almacen.getItem(clave); } catch { return null; }
};

const escribir = (clave, valor, almacen = sessionStorage) => {
  try {
    if (valor == null) almacen.removeItem(clave);
    else almacen.setItem(clave, valor);
  } catch {
    // Sin almacenamiento la sesion dura lo que la pagina: aceptable.
  }
};

let usuarioEnMemoria = null;

export const sesion = {
  token: () => leer(CLAVE_TOKEN),

  usuario() {
    if (usuarioEnMemoria) return usuarioEnMemoria;
    const crudo = leer(CLAVE_USUARIO);
    if (!crudo) return null;
    try {
      usuarioEnMemoria = JSON.parse(crudo);
      return usuarioEnMemoria;
    } catch {
      return null;
    }
  },

  guardar({ token, usuario }) {
    escribir(CLAVE_TOKEN, token);
    escribir(CLAVE_USUARIO, JSON.stringify(usuario));
    usuarioEnMemoria = usuario;
  },

  actualizarUsuario(usuario) {
    escribir(CLAVE_USUARIO, JSON.stringify(usuario));
    usuarioEnMemoria = usuario;
  },

  limpiar() {
    escribir(CLAVE_TOKEN, null);
    escribir(CLAVE_USUARIO, null);
    usuarioEnMemoria = null;
  },

  activa() {
    return Boolean(leer(CLAVE_TOKEN));
  }
};

// --- Tema claro / oscuro -----------------------------------------------------
// La preferencia es por dispositivo, no por cuenta, asi que va en localStorage.

const TEMAS = ['auto', 'claro', 'oscuro'];

export const tema = {
  actual() {
    const guardado = leer(CLAVE_TEMA, localStorage);
    return TEMAS.includes(guardado) ? guardado : 'auto';
  },

  aplicar(valor) {
    const elegido = TEMAS.includes(valor) ? valor : 'auto';
    document.documentElement.dataset.tema = elegido;
    escribir(CLAVE_TEMA, elegido, localStorage);
    return elegido;
  },

  /** Rota auto -> claro -> oscuro -> auto. */
  alternar() {
    const indice = TEMAS.indexOf(this.actual());
    return this.aplicar(TEMAS[(indice + 1) % TEMAS.length]);
  },

  icono(valor = this.actual()) {
    return { auto: '◑', claro: '☀', oscuro: '☾' }[valor] ?? '◑';
  },

  etiqueta(valor = this.actual()) {
    return { auto: 'Tema automatico', claro: 'Tema claro', oscuro: 'Tema oscuro' }[valor] ?? 'Tema';
  },

  inicializar() {
    this.aplicar(this.actual());
  }
};

export default sesion;
