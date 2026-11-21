# Arquitectura

Documento de decisiones: qué se eligió, qué se descartó y por qué.

---

## El problema que se resolvió

La versión anterior funcionaba, pero tenía tres fallas estructurales que limitaban
cualquier crecimiento:

**1. Toda la aplicación era un único documento JSON.** Existía una tabla
`estado_aplicacion` con una columna `datos_json` que contenía fincas, evaluaciones y
bitácora completas. Cada guardado reescribía el documento entero y comparaba un número de
revisión: si otra persona había guardado primero, la sesión actual se cerraba y se perdía
lo no guardado. Dos evaluadores trabajando a la vez chocaban siempre, aunque estuvieran en
predios distintos. Las tablas normalizadas (`predios`, `evaluaciones`) existían en el
esquema pero casi no se usaban.

**2. Los datos de demostración vivían en el código del navegador.** Tres fincas y cuatro
evaluaciones estaban escritas como literales en `js/app.js` y se inyectaban al arrancar.
El panel mostraba "3 fincas, 4 evaluaciones" aunque la base estuviera vacía. Nadie podía
distinguir un dato real de uno de ejemplo.

**3. El navegador calculaba la calificación y el servidor la aceptaba.** El cliente enviaba
el puntaje ya resuelto. Cualquiera con las herramientas de desarrollo podía cerrar una
visita con 100 puntos.

A eso se sumaban dos vocabularios de roles en conflicto (la base aceptaba
`admin|evaluador|lectura`, la interfaz hablaba de `admin|docente|evaluador|consultor`, con
mapas de traducción entre ambos), una vista de reportes inalcanzable porque faltaba su
entrada en el menú, y la descarga de evidencias sin comprobación de propiedad.

---

## Las tres capas

```
navegador  ──HTTP/JSON──►  api/  ──llamadas──►  backend/  ──SQL──►  SQLite
 frontend/                (capa HTTP)        (dominio y datos)
      └──────────────── shared/ica/ ────────────────┘
```

Cada capa solo conoce a la siguiente:

| Capa | Responsabilidad | No hace |
|---|---|---|
| `frontend/` | Presentar y recoger datos. | No decide reglas de negocio. |
| `api/` | Traducir HTTP a llamadas de dominio: autenticar, autorizar, validar forma, formatear respuestas y errores. | No contiene reglas de negocio ni SQL. |
| `backend/` | Reglas de negocio y persistencia. | No conoce `req`, `res` ni códigos HTTP. |
| `shared/ica/` | La norma ICA. | No conoce base de datos ni DOM. |

La prueba de que la separación es real: `backend/` no importa Express en ningún archivo, y
`api/` no escribe una sola sentencia SQL.

### Por qué el dominio es compartido

Las reglas ICA (los 35 indicadores, las tablas 1, 2 y 3, la fórmula de densidad) se
necesitan en dos sitios: en el servidor, que calcula de forma autoritativa, y en el
navegador, que muestra el puntaje mientras se escribe.

Antes estaban duplicadas y podían divergir. Ahora viven una sola vez en `shared/ica/`, que
Express sirve como módulo ES para que el navegador lo importe igual que el backend:

```js
// backend
import { calcular } from '../../shared/ica/puntaje.js';
// navegador
import { calcular } from '/shared/ica/puntaje.js';
```

El mismo archivo, sin copias. Cambiar un umbral lo cambia en los dos lados a la vez.

---

## Decisiones

### El servidor deriva el puntaje de los datos crudos

El cliente envía **lo que midió**, no la calificación:

```json
{ "indicador": "MBA1", "valorCrudo": { "porcentaje": 85 } }
```

El servidor aplica la escala de la norma (85 % de jadeo supera el 60 %, luego vale 0) y
guarda ese resultado. Si el cliente además manda `"valor": 100`, se ignora.

Para los indicadores de escala pura, donde el evaluador sí elige un nivel, el servidor
verifica que el valor pertenezca a la escala declarada por la norma para ese indicador:
un 73 en un indicador de escala 100/55/0 se rechaza.

Hay una prueba automatizada que envía `valor: 100` con un 85 % observado y comprueba que
se guarde 0.

### Esquema normalizado, sin documento global

Doce tablas con llaves foráneas e índices. Una fila por respuesta de indicador, en vez de
un blob JSON por evaluación.

Qué permite que antes no se podía:

- Dos evaluadores trabajan en predios distintos sin pisarse.
- `SELECT` directo sobre respuestas: el panel agrega con SQL en vez de recorrer el estado
  completo en memoria.
- Un índice único parcial garantiza **una sola evaluación abierta por predio**, a nivel de
  base de datos y no solo de código:

  ```sql
  CREATE UNIQUE INDEX ux_eval_abierta_por_predio
    ON evaluaciones(predio_id) WHERE estado = 'en_progreso';
  ```

### El catálogo se congela al abrir la visita

Cada evaluación guarda `snapshot_json` con el catálogo, los pesos y el plan de muestreo
vigentes el día que se abrió. Si mañana cambian los rangos de la Tabla 2, las visitas ya
cerradas conservan el nivel con el que se calcularon.

Una evaluación es un documento oficial fechado, no una vista que se recalcula.

### Un solo vocabulario de roles

Cuatro roles (`admin`, `docente`, `evaluador`, `consultor`) definidos en
`shared/ica/roles.js` junto a la matriz de permisos. La base los restringe con un `CHECK`,
la API los verifica con esa matriz y la interfaz arma el menú con la misma función:

```js
export function puede(rol, modulo, nivel = 'r') { … }
```

Esconder un botón y bloquear la ruta dejan de ser dos decisiones que pueden desalinearse.

### Errores tipados en el dominio, traducidos en la API

Los servicios lanzan errores de negocio sin saber de HTTP:

```js
throw new ErrorConflicto('Ya existe una evaluacion en progreso para este predio.');
```

Un único middleware los traduce a su código de estado. Las rutas no repiten manejo de
errores y el dominio no conoce el protocolo.

### Frontend sin paso de compilación

Módulos ES nativos que el navegador carga directamente. No hay bundler, ni `node_modules`
en el cliente, ni build que mantener. Para un sistema que se despliega en equipos locales
con Node y poco más, el costo de un pipeline no se justificaba.

El precio: se usan `fetch`, `:has()` en CSS y módulos ES, que requieren navegador moderno
(Chrome 105+, Firefox 121+, Safari 15.4+). Es un intercambio aceptable para un sistema
institucional interno.

### Escapado de HTML por omisión

El código anterior concatenaba cadenas y llamaba a una función de escape a mano: bastaba
olvidarla una vez. Ahora hay una plantilla etiquetada que escapa **toda** interpolación y
obliga a pedir explícitamente lo contrario:

```js
html`<p>${textoDelUsuario}</p>`        // escapado siempre
html`<div>${crudo(htmlYaSeguro)}</div>` // explícito y localizable con una búsqueda
```

`html` devuelve un objeto `HtmlSeguro`, no una cadena, para que anidar plantillas no
escape dos veces.

---

## Seguridad

| Riesgo | Cómo se aborda |
|---|---|
| Fuerza bruta sobre una cuenta | Bloqueo por cuenta tras N intentos, **además** del límite por IP. Antes solo había límite por IP, así que bastaba rotar direcciones. |
| Enumeración de correos | Login y recuperación responden igual exista o no la cuenta. El hash se compara siempre, incluso sin usuario, para no delatar por tiempo de respuesta. |
| Sesión robada | Cada token lleva un `jti` registrado en `sesiones` y se puede revocar antes de vencer. Desactivar una cuenta corta sus sesiones de inmediato. |
| Acceso a evidencias ajenas | La descarga comprueba de quién es la evaluación. Antes solo exigía estar autenticado, así que cualquier usuario podía bajar el archivo de otro probando identificadores. |
| Archivo malicioso disfrazado | Se verifica la firma binaria además de la extensión y el tipo declarado. Un `.txt` renombrado a `.pdf` se rechaza y el archivo se elimina. |
| Filtración de la base | Los tokens de restablecimiento se guardan solo como hash SHA-256. |
| Manipulación del historial | La auditoría es *append-only*: el repositorio no expone funciones de actualización ni de borrado. |
| Escalada de privilegios | Los permisos se comprueban en cada ruta. Nadie puede quitarse el rol de administrador ni desactivar su propia cuenta, y el sistema exige que quede al menos un administrador activo. |

---

## Qué se dejó fuera, a propósito

**Un framework de frontend.** La aplicación son doce vistas que renderizan HTML a partir
de datos del servidor. Añadir React o Vue habría traído un build, un árbol de dependencias
y un modelo de estado para un problema que se resuelve con plantillas y un enrutador de
cien líneas.

**Un ORM.** Las consultas son explícitas y los repositorios aíslan el SQL. Un ORM habría
añadido una capa de traducción sin resolver nada que el proyecto necesite.

**Un sistema de migraciones externo.** El ejecutor son setenta líneas: lee los `.sql` de
una carpeta, los aplica en orden y registra cuáles corrieron con su checksum.

**Microservicios.** Es un sistema de un solo despliegue con una base local.

---

## Límites conocidos

- **El limitador de tasa vive en memoria.** Con varias instancias detrás de un balanceador
  habría que moverlo a un almacén compartido.
- **SQLite es de un solo escritor.** Suficiente para decenas de usuarios concurrentes; para
  cientos habría que migrar a PostgreSQL. Los repositorios aíslan el SQL, de modo que el
  cambio quedaría contenido en `backend/repositories/` y `backend/db/`.
- **No hay paginación en predios ni en planes.** Con miles de registros habría que añadirla;
  el patrón ya está implementado en auditoría y evaluaciones.
- **El frontend recarga la vista completa tras cada cambio.** Es simple y correcto, pero en
  listas muy largas se notaría. La solución sería actualizar solo la fila afectada.
