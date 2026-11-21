# Auditoría exacta del bloque RF29–RF32 — EvalCodorniz unificado

**Fecha de auditoría:** 2026-11-06  
**Alcance:** historial, comparación, dashboard general y dashboard por finca.  
**Criterio:** contraste directo entre archivos declarados, documento de requisitos, metodología ICA y matriz de indicadores. No se modificaron archivos del aplicativo ni fuentes normativas.

## 1. Dictamen ejecutivo

El bloque está funcionalmente presente en el prototipo local, conserva el formato visual existente y cuenta con funciones identificables para historial, comparación y dos niveles de dashboard. Sin embargo, no debe calificarse como completamente implementado para un uso operativo multiusuario: las vistas consultan principalmente `S.evals` y `S.fincas` en memoria/localStorage; el frontend no implementa una carga/sincronización de historial desde `GET /api/evaluaciones`. Además, el dashboard por finca no satisface el núcleo visual de RF32: no muestra puntaje por criterio, no lista/resalta indicadores críticos y no muestra el estado del plan de mejora, sino únicamente KPIs resumidos, historial y conteo de acciones.

**Resultado global del bloque:**

- **RF29 — Parcial:** historial local ordenado y con los datos exigidos; falta una fuente persistente/autoritativa conectada y una vista de finca como flujo principal.
- **RF30 — Implementado local:** comparación de dos evaluaciones de la misma finca por criterio e indicador, con diferencia y clasificación de mejora/empeoramiento; queda brecha de persistencia/sincronización y de tratamiento explícito de grupos no aplicables.
- **RF31 — Parcial:** agregados, distribución, incumplimientos y filtros funcionan en el dashboard local; el KPI de “Fincas activas” no es el indicador contractual “fincas evaluadas” y el panel no consume el conjunto servidor.
- **RF32 — Parcial:** permite elegir una finca y muestra última calificación, nivel, número de acciones e historial; faltan puntajes por criterio, indicadores críticos resaltados y estado del plan.

No se clasifica ningún RF como **Requiere servicio externo** por definición del requisito: el servicio externo/backend no es necesario para dibujar las vistas. Sí es necesario conectar el backend existente para cerrar las brechas de persistencia, consistencia multiusuario y auditoría operativa.

## 2. Fuentes y evidencia normativa revisada

1. `/home/ubuntu/evalcodorniz-work/js/app.js` — vistas y lógica de historial, comparación y dashboards.
2. `/home/ubuntu/evalcodorniz-work/js/data.js` — catálogo ICA y parámetros.
3. `/home/ubuntu/evalcodorniz-work/server/index.js` — API, persistencia SQLite, autenticación y evaluaciones.
4. `/home/ubuntu/evalcodorniz-work/index.html` y `/home/ubuntu/evalcodorniz-work/css/styles.css` — entrada y formato visual conservado.
5. `/home/ubuntu/projects/coornices-8f1eef12/EvalCodorniz_Requerimientos (2).docx` — redacción contractual RF29–RF32.
6. `/home/ubuntu/projects/coornices-8f1eef12/Metodologia-EBA-Codornices_30JL.pdf` — ICA 2024, Tabla 1, Tabla 2, Tabla 3, proceso y fichas de indicadores.
7. `/home/ubuntu/projects/coornices-8f1eef12/EvalCodorniz_Matriz (2).xlsx` — hoja `Matriz de Indicadores`, filas 7–48.
8. Antecedentes: `AUDITORIA_NORMATIVA_ICA_COMPLETA.md` y `VALIDACION_NORMATIVA_ICA_Y_QA.md`.

La redacción exacta de requisitos extraída del DOCX es:

- **RF29:** consultar todas las evaluaciones de una finca con fecha, evaluador y calificación final; ordenar de más reciente a más antigua; cerradas consultables pero no modificables.
- **RF30:** comparar dos o más evaluaciones de la misma finca por criterio e indicador; mostrar diferencia por MBA, MBR y MBG; impedir comparación entre fincas distintas.
- **RF31:** agregar fincas evaluadas, promedio, distribución por nivel e indicadores con más incumplimientos; actualizar al cerrar; consultor externo solo lectura.
- **RF32:** mostrar por finca puntaje por criterio, indicadores críticos y estado del plan; resaltar críticos frente a cumplidos; mostrar mensaje si no hay evaluaciones cerradas.

## 3. Comprobación de metodología ICA y matriz de indicadores

### 3.1 Catálogo y matriz

La matriz Excel contiene 35 indicadores calificados: MBR 14, MBA 11 y MBG 10. El catálogo `IND` de `js/data.js` también contiene 35 entradas, con el mismo desglose. La comprobación estática dio:

- `IND entries = 35`.
- `MBA = 11`, `MBR = 14`, `MBG = 10`.
- Los códigos `MBR1–MBR14`, `MBA1–MBA11` y `MBG1–MBG10` están representados en `IND`/`IX`.
- La interfaz de Parametrización muestra el catálogo por grupo, método, tipo de campo, escala y aplicabilidad en `app.js:310–318`.

Esto es consistente con la metodología PDF, sección 6 y Tabla 4, y con la hoja Excel `Matriz de Indicadores`, filas 7–20 (MBR), 24–34 (MBA) y 38–47 (MBG).

### 3.2 Ponderación y niveles

`app.js:9–10` implementa la selección de pesos y muestra ICA: para `t >= 200`, MBA 60/MBR 25/MBG 15; para `t < 200`, MBA 70/MBR 30/MBG 0. `app.js:20–24` promedia indicadores respondidos dentro de cada grupo y suma el promedio multiplicado por el peso. `data.js:41–43` define los grupos y niveles Excelente ≥90, Alto ≥75, Medio ≥50 y Bajo <50. La misma información está visible en `app.js:319–325`.

Esto coincide con la Tabla 1 y Tabla 2 de la metodología PDF y con la fila `Resumen` de la matriz Excel. La implementación de `puntajes()` es adecuada para evaluaciones cerradas porque `validar()` exige respuestas para todos los indicadores aplicables antes del cierre. La excepción que debe corregirse para dashboards/comparaciones es de presentación: cuando un grupo no aplica, `compareOutput()` lo trata con sustitución `0` en la diferencia (`(y??0)-(x??0)`), lo que puede presentar “0” como diferencia en vez de “No aplica”.

### 3.3 Muestreo ICA

`app.js:10`, `app.js:27–31` y `server/index.js:162–165` implementan las cantidades de la Tabla 3: menos de 200 aves → 1 corral, 5 puntos, 50 aves; 200 o más → 2 corrales, 9 puntos, 90 aves; además exigen semilla, bioseguridad y neutralidad. `app.js:365` genera la muestra y registra semilla, corrales, puntos y aves de 4 semanas o más.

La metodología PDF exige selección aleatoria de galpón/corral, priorización de aves de mayor edad (desde 4 semanas) y recorrido objetivo de puntos. La función `randomizeInspection()` genera identificadores secuenciales y una semilla pseudoaleatoria, pero no selecciona realmente galpones/puntos/aves desde un inventario detallado ni guarda una prueba reproducible del sorteo. Esta brecha pertenece principalmente a RF08/RF14/RF15, pero afecta la confiabilidad de cualquier historial, comparación o dashboard que presente esos resultados.

### 3.4 Escalas y cálculo de muestra

`app.js:19–24` calcula el promedio de muestras válidas 0/55/100 y el promedio por grupo; `data.js` conserva escalas 100/55/0, 100/0 y MBG con 100/55 o 100/0 según indicador. La matriz Excel contiene las mismas escalas. No se encontró una desviación de metodología que altere directamente RF29–RF32. La brecha normativa remanente es documental/operativa, no del bloque visual: la autenticidad y contenido de soportes siguen requiriendo revisión humana o fuente institucional.

## 4. Requisitos auditados

### RF29 — Historial de evaluaciones

**Estado: Parcial.**

**Evidencia concreta:**

- `app.js:190–192`, `evalsView()`: etiqueta RF29 y presenta `S.evals.slice().sort((a,b)=>b.fecha.localeCompare(a.fecha))`.
- `app.js:143–146`, `evalTable(list)`: muestra fecha, finca, evaluador, estado, calificación final y nivel; para cerradas el botón es “Ver diagnóstico”, no “Editar”.
- `app.js:491`, `farmOutput()`: el dashboard por finca vuelve a filtrar `closed` por `e.finca===f.id` y ordena descendentemente.
- `app.js:437–464`: la fuente local se guarda/restaura en `localStorage` bajo `evalcodorniz_local_v2`.
- `server/index.js:176–179`: existe `GET /api/evaluaciones`, ordenado por `created_at`, que devuelve evaluaciones persistidas, pero no hay en `app.js` una carga que lo use para poblar `S.evals`.

**Qué sí cumple:** orden descendente por fecha; consulta de evaluación cerrada; fecha, evaluador y calificación final visibles; mensaje “No hay evaluaciones cerradas” en el dashboard de finca sin registros (`app.js:491`). El formato visual se conserva mediante `evalTable()` y las clases existentes de `styles.css:47–61, 101–109, 144–151`.

**Brecha:** el historial principal es global, no una consulta de finca con filtro/selector propio; el historial por finca está embebido en el botón Dashboard por finca. Más importante, la interfaz no sincroniza el historial con el backend: `server/index.js` persiste y expone datos, pero `app.js` solo llama `persistServerEval()` al guardar/cerrar (`app.js:451–454`) y no recupera ni fusiona los datos. La inmutabilidad es solo de interfaz/localStorage, no una garantía servidor para registros cerrados.

**Corrección exacta necesaria:**

1. Añadir una carga autenticada `GET /api/evaluaciones` al inicializar/cambiar de usuario y mapear sus filas a un modelo de vista normalizado (`finca`, `fecha`, `evaluador`, `estado`, `res`, `inds`, `ans`), conservando `serverId`.
2. Deduplicar por `serverId`/ID remoto y mantener el respaldo local solo como fallback explícito cuando el servicio no responda.
3. Añadir en `Evaluaciones` un selector/filtro de finca, sin eliminar la tabla actual, y reutilizar `evalTable()` para mantener el formato visual.
4. En servidor, bloquear `PUT/PATCH/DELETE` de evaluaciones con `estado='cerrada'`; si la regla es requerida para ajustes ICA, crear un flujo de ajuste/versionado, no editar el registro histórico.

**Prueba requerida:** crear dos evaluaciones cerradas de una misma finca con fechas no consecutivas y otra de finca distinta; recargar con localStorage vacío y sesión autenticada; verificar que el historial se reconstruye desde `GET /api/evaluaciones`, queda ordenado descendentemente, muestra fecha/evaluador/resultado, filtra la finca elegida y que una tentativa de modificación de cerrada devuelve 403/409 o endpoint inexistente sin alterar el registro.

### RF30 — Comparación entre evaluaciones

**Estado: Implementado local.**

**Evidencia concreta:**

- `app.js:473–488`, `reportesView()`: ofrece selectores de evaluación A y B y botón “Comparar evaluaciones”.
- `app.js:490`, `compareOutput()`: valida que ambas existan y que `a.finca===b.finca`; si no, muestra “Solo se pueden comparar evaluaciones de la misma finca”.
- La misma función genera tabla por `GROUPS` (`MBA`, `MBR`, `MBG`) con valores A, B y diferencia, y una segunda tabla por código/indicador con valores, diferencia y resultado “Mejoró”, “Empeoró”, “Sin cambio” o “No comparable”.
- `app.js:19–24` usa `indicadorValor()` y `puntajes()` para el valor comparable y puntaje de criterio.

**Qué sí cumple:** comparación de dos evaluaciones, criterio e indicador; diferencia explícita por MBA/MBR/MBG; restricción a la misma finca; identificación textual de mejoría/empeoramiento. Dos evaluaciones satisfacen el mínimo “dos o más” del requisito; no se exige que el usuario seleccione una cantidad mayor en una sola tabla.

**Brecha:** la comparación solo se alimenta de `S.evals`, no del historial servidor, por lo que dos clientes/usuarios no necesariamente comparan el mismo conjunto. Además, para grupos no aplicables, especialmente MBG en predios menores de 200 aves, la diferencia de criterio usa `(y??0)-(x??0)` y puede mostrar `0` cuando debería ser “No aplica”; la tabla por indicador sí muestra “No comparable” si falta un valor. No hay gráfico, pero el requisito solo exige mostrar diferencias, por lo que no es una brecha contractual.

**Corrección exacta necesaria:**

1. Usar el mismo repositorio sincronizado de RF29 o cargar las dos evaluaciones remotas antes de comparar.
2. Cambiar el cálculo de diferencia de criterio para que, si `x==null || y==null`, presente `No aplica/No comparable` y no convierta ausencia a cero; solo restar cuando ambos grupos sean aplicables y tengan valor.
3. Mostrar la etiqueta de aplicabilidad/peso de cada evaluación para evitar comparar MBG omitido con cero.
4. Mantener el guardado visual actual y sus clases de tablas; no reemplazar la estructura de `report-output`.

**Prueba requerida:** con dos evaluaciones de la misma finca de 300 aves, alterar un indicador de 0 a 100 y otro de 100 a 55; comprobar diferencias por criterio e indicador y etiquetas de mejoró/empeoró. Con dos evaluaciones de una finca de 120 aves, comprobar que MBG no se muestra como diferencia 0. Intentar seleccionar evaluaciones de fincas distintas y verificar el aviso de bloqueo. Repetir tras limpiar localStorage y cargar datos remotos.

### RF31 — Dashboard general

**Estado: Parcial.**

**Evidencia concreta:**

- `app.js:117–141`, `dashView()`: filtra fincas por departamento/municipio y evaluaciones por finca, evaluador, fechas y nivel.
- `app.js:120–121`: calcula promedio final y distribución por `NIVELES`.
- `app.js:122–123`: cuenta indicadores con `v===0` y limita a los seis primeros.
- `app.js:127–141`: muestra KPIs, barras de distribución, indicadores con más incumplimientos y tabla de evaluaciones recientes.
- `app.js:397–400`: aplica filtros y vuelve a renderizar al cambiar controles.
- `app.js:125–136`: documenta explícitamente los umbrales ICA de Tabla 2.
- `data.js:43` y `app.js:319–325`: definen niveles ICA; `styles.css:101–109` conserva las barras/KPIs visuales.

**Qué sí cumple:** promedio de evaluaciones cerradas, distribución por nivel, incumplimientos por indicador, actualización inmediata tras cierre/render y estado vacío “No hay evaluaciones cerradas con este filtro”. Los filtros locales de departamento, municipio, evaluador, nivel y fechas se aplican a los KPIs, distribución, incumplimientos y tabla reciente. El rol `consultor` tiene `dashboard:'r'` y, por la extensión `app.js:470`, `reportes:'r'`, sin permisos de escritura en la matriz `PERM` de `data.js:55–59`.

**Brecha:** el primer KPI se etiqueta **“Fincas activas”** y cuenta `fs.filter(f=>f.activa).length`, aunque RF31 pide **fincas evaluadas**. Así puede incluir fincas sin una evaluación cerrada y excluir la semántica de conjunto evaluado. Además, el dashboard calcula exclusivamente desde `S.evals`/`S.fincas`; no se observa una llamada frontend a `GET /api/evaluaciones` ni a un endpoint agregado. En un entorno multiusuario, cerrar una evaluación en servidor no garantiza que otro navegador vea el agregado. El panel no implementa un endpoint o consulta consolidada server-side, por lo que escala y consistencia dependen del estado local.

**Corrección exacta necesaria:**

1. Sustituir el KPI por `fincas evaluadas = count(distinct fincaId entre evaluaciones cerradas filtradas)`; si se desea conservar “Fincas activas”, mostrarlo como KPI separado y no como sustituto.
2. Cargar/actualizar desde backend las evaluaciones cerradas y aplicar los mismos filtros sobre el conjunto sincronizado; idealmente añadir `GET /api/dashboard` con agregados y filtros autorizados, o paginar `GET /api/evaluaciones`.
3. Tras `confirmClose`, invalidar/refrescar el dataset del dashboard y mostrar un estado de carga/error sin romper el mensaje vacío.
4. Conservar `dashView()` y las clases visuales actuales; cambiar solo fuente/semántica del dato.

**Prueba requerida:** con tres fincas, una activa sin evaluaciones, una con dos cerradas y una con una en progreso, verificar que el KPI de fincas evaluadas sea 1 o 2 según el criterio de conteo distinto y nunca 3 por mera activación. Aplicar cada filtro y confirmar que cambian promedio, distribución, top de incumplimientos y tabla; usar un filtro sin coincidencias y confirmar mensaje sin excepción. Cerrar una evaluación en un cliente y recargar otro cliente para comprobar actualización desde servidor.

### RF32 — Dashboard por finca

**Estado: Parcial.**

**Evidencia concreta:**

- `app.js:487`: botón “Dashboard por finca” y selector de finca.
- `app.js:476`: selecciona finca y evaluaciones cerradas de esa finca.
- `app.js:491`, `farmOutput()`: muestra nombre, municipio, departamento, sistema, aves, número de evaluaciones cerradas, última calificación, nivel, número total de acciones y el historial ordenado.
- `app.js:491`: si no hay cerradas muestra `Esta finca no tiene evaluaciones cerradas.`
- `app.js:256–278`, `reportView()`, sí muestra el diagnóstico de una evaluación individual y una tabla de plan de mejora, pero eso es el reporte/diagnóstico de la evaluación abierta, no el dashboard agregado por finca.

**Qué sí cumple:** selección por finca; mensaje requerido para finca sin evaluaciones cerradas; historial y KPIs de última evaluación; conteo total de acciones; la apariencia usa el mismo sistema de paneles/KPIs/tablas del proyecto (`styles.css:47–61, 101–109, 144–151`).

**Brecha principal:** `farmOutput()` no renderiza ningún puntaje por criterio (`MBA`, `MBR`, `MBG`), no enumera indicadores críticos (por ejemplo, puntaje 0) ni los resalta frente a cumplidos, y no muestra estado del plan (`pendiente`, `en curso`, `cumplida`, vencida, porcentaje o fecha). Solo muestra “Acciones” como conteo. Por tanto, no satisface las tres piezas centrales de RF32.

**Corrección exacta necesaria:** ampliar `farmOutput()` sin alterar el formato visual:

1. Seleccionar la evaluación cerrada más reciente de la finca y llamar `puntajes(latest)`; añadir tres tarjetas/filas con `MBA`, `MBR`, `MBG` y su porcentaje, respetando MBG no aplicable en predios `<200`.
2. Derivar `critical = latest.inds.filter(c => indicadorValor(latest,c)===0)` y `compliant = ...`; renderizar una tabla o barras por código/nombre/puntaje, con `.fill.bad`/`.pill.bad` para críticos y `.fill.ok`/`.pill.ok` para 100, dejando 55 como advertencia. La reutilización debe seguir las clases de `styles.css` existentes.
3. Agregar resumen de plan por estados y porcentaje: pendientes, en curso, cumplidas, vencidas; reutilizar `atrasada()` y `accionesTable()` o una tabla compacta en el mismo panel.
4. Mantener el mensaje vacío existente antes de intentar acceder a `latest`.
5. Si el dashboard debe reflejar datos de todos los usuarios, consumir el historial sincronizado del RF29.

**Prueba requerida:** crear una finca con una evaluación cerrada que contenga MBA1=0, MBA2=55, MBA3=100 y acciones pendiente/en curso/cumplida/vencida; abrir Dashboard por finca y verificar puntajes de los tres criterios, indicador MBA1 resaltado como crítico, MBA3 como cumplido, MBA2 como advertencia y conteo/estado de plan correctos. Abrir una finca sin cerradas y verificar el mensaje requerido sin error de `latest` nulo. Probar una finca `<200` y confirmar que MBG se marca no aplicable.

## 5. Riesgos transversales y relación con servicios

- `server/index.js:176–179` sí ofrece lectura de evaluaciones, pero el frontend no la consume para estas vistas. El resultado actual es correcto como prototipo local, no como historial consolidado multiusuario.
- `server/index.js:160–174` exige muestra ICA completa al crear una evaluación y `server/index.js:181–197` persiste evidencias con SHA-256, pero la validación de firma, matrícula, entidad emisora y contenido queda explícitamente pendiente de verificación oficial/humana. Esto no convierte RF29–RF32 en un requisito externo, aunque limita la interpretación de los puntajes.
- `index.html:15–16` carga `data.js` y `app.js`; `styles.css` define el sistema visual. Las correcciones propuestas deben ser de datos/funciones y reutilizar paneles, tablas, KPIs, pills y barras existentes; no se requiere rediseño.
- `AUDITORIA_NORMATIVA_ICA_COMPLETA.md` calificaba previamente RF29 como implementado local, RF30 como implementado ampliado, RF31 como implementado local y RF32 como parcial. Esta auditoría refina el dictamen: conserva la funcionalidad local de RF29–RF31, pero marca como Parcial RF29/RF31 por la falta de sincronización y la semántica del KPI, y deja RF30 como Implementado local con la brecha no aplicable/persistencia documentada.

## 6. Conclusión y orden de corrección

1. **Primero RF32:** añadir criterio, críticos y estado del plan; es la ausencia funcional más visible y afecta directamente la explicación al productor.
2. **Segundo RF31/RF29:** conectar lectura servidor y corregir “fincas evaluadas” para que los agregados sean confiables multiusuario.
3. **Tercero RF30:** corregir presentación de grupos no aplicables y reutilizar el repositorio sincronizado.
4. **En paralelo ICA:** reemplazar la selección secuencial simulada por sorteo auditable sobre inventario/galpones/puntos reales y conservar la semilla/reproducibilidad.

Con esas correcciones, el bloque cumpliría el contenido contractual de RF29–RF32 sin cambiar el formato visual de EvalCodorniz.
