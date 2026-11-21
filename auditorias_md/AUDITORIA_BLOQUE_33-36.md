# Auditoría exacta del bloque RF33–RF36 — EvalCodorniz unificado

**Fecha de auditoría:** 2026-11-06  
**Alcance:** filtros de consulta, reporte de evaluación, exportación de datos y reporte consolidado.  
**Restricción aplicada:** no se modificaron archivos del proyecto; solo se creó este informe. Se conserva el formato visual existente.

## 1. Dictamen ejecutivo

| RF | Estado | Dictamen |
|---|---|---|
| RF33 | **Parcial** | Los filtros de departamento, municipio, fechas, evaluador y nivel funcionan en el dashboard general, pero no se propagan al historial/reportes, a las exportaciones ni al consolidado. |
| RF34 | **Parcial** | La forma oficial imprimible contiene la información mínima exigida y solo permite evaluaciones cerradas, pero no se genera un PDF binario descargable directamente: abre una ventana HTML y depende de `window.print()`/“Guardar como PDF”. |
| RF35 | **Parcial** | Existe CSV de una evaluación cerrada e incluye el código del indicador, pero no existe exportación XLSX ni exportación global filtrada; el CSV no respeta los filtros activos. |
| RF36 | **Parcial** | Existe consolidado por departamento con promedios por grupo y final, pero no recibe período/zona como criterios de consulta, cuenta evaluaciones y no fincas distintas, y no ofrece salida exportable. |

**Conclusión:** el bloque es funcional como prototipo local de navegador, no como módulo completo de reportes/exportación/consolidado conforme a los RF. No se requiere un servicio externo para filtros, consolidado o CSV/XLSX (pueden resolverse localmente o en backend); un PDF binario robusto sí requiere una biblioteca/servicio de generación PDF, salvo que se acepte explícitamente la impresión del navegador.

## 2. Fuentes normativas y de requisitos revisadas

1. `EvalCodorniz_Requerimientos (2).docx`, páginas 8–9: RF33 filtros, RF34 reporte PDF, RF35 exportación Excel/CSV y RF36 reporte consolidado.
2. `Metodologia-EBA-Codornices_30JL.pdf`, páginas 8–12 y 15–16: metodología sistemática, 35 indicadores, fases de apertura/inspección/cierre, Tabla 1 de ponderaciones, Tabla 2 de clasificación, Tabla 3 de muestra y Tabla 4 de indicadores.
3. `EvalCodorniz_Matriz (2).xlsx`: hoja “Matriz de Indicadores”, 35 indicadores y códigos/escala/método.
4. Código declarado: `js/app.js`, `js/data.js`, `server/index.js`, `index.html`, `css/styles.css`.
5. Antecedentes: `AUDITORIA_NORMATIVA_ICA_COMPLETA.md` y `VALIDACION_NORMATIVA_ICA_Y_QA.md`. Se priorizó el código actual cuando esos documentos difieren entre sí.

## 3. Verificación de metodología ICA y matriz de indicadores

### 3.1 Matriz

La extracción del `data.js` arroja **35 códigos únicos**: MBA 11, MBR 14 y MBG 10. Esto coincide con la metodología ICA (página 8: 35 indicadores) y con la matriz XLSX. El catálogo se carga en `IND`, se indexa con `IX` y conserva código, grupo, pregunta, método y niveles en `js/data.js:3–39`.

### 3.2 Aplicabilidad y ponderación

- `js/app.js:9–16` usa 70/30/0 para menos de 200 aves y 60/25/15 para 200 o más; esto coincide con la Tabla 1 ICA y con RF11.
- `js/app.js:10` calcula 1 corral/5 puntos o 2 corrales/9 puntos; `js/app.js:27–31` valida la cantidad esperada y 10 aves por punto. La condición `>=200` es consistente con el requisito explícito de tratar exactamente 200 como el grupo grande.
- `js/app.js:12–16` aplica MBG desde 200 aves, MBA10 solo con más de 200, y MBR3/MBR14 en piso y MBR4 en jaula. Esta lógica es coherente con los RF08/RF14 y las fichas ICA.
- `js/app.js:20–24` promedia indicadores por grupo y multiplica por los pesos; `data.js:43` define Excelente ≥90, Alto ≥75, Medio ≥50 y Bajo <50, consistente con Tabla 2.
- `js/app.js:19` permite promedio de muestras válidas 0/55/100. La metodología ICA exige registrar indicadores sujetos a muestreo y promediar los valores de la muestra; el código contiene la operación base.

**Observación de trazabilidad:** la matriz utiliza nombres ordinales (1–14, 1–11, 1–10), mientras el código utiliza códigos `MBR1…MBR14`, `MBA1…MBA11`, `MBG1…MBG10`. La correspondencia es verificable por orden y nombre, pero se recomienda mantener una columna/artefacto de trazabilidad explícito en futuras versiones.

## 4. Hallazgos detallados por requisito

### RF33 — Filtros de consulta

**Estado: Parcial.**

**Requisito:** filtrar dashboards e historial por departamento, municipio, rango de fechas, evaluador y nivel de bienestar; todos los gráficos deben actualizarse y un resultado vacío debe mostrarse sin error.

**Evidencia concreta:**

- `js/app.js:117–123`, `dashView()`: filtra fincas por `S.fdep` y `S.fmun`, y evaluaciones por `S.feval`, `S.fdesde`, `S.fhasta` y `S.fnivel`; recalcula cerradas, promedio, distribución e incumplimientos.
- `js/app.js:126`: presenta los cinco controles funcionales: departamento, municipio, evaluador, nivel y fechas desde/hasta.
- `js/app.js:134–141`: los gráficos/KPI y la tabla de evaluaciones recientes consumen la lista ya filtrada.
- `js/app.js:397–400`: los cambios de filtros actualizan el estado y llaman `render()`.
- `js/app.js:143–146`: la tabla muestra “No hay evaluaciones.” cuando la lista filtrada queda vacía.
- `js/app.js:473–488`, `reportesView()`: construye reportes y exportaciones con `S.evals.filter(...)` sin aplicar `S.fdep`, `S.fmun`, `S.feval`, `S.fdesde`, `S.fhasta` ni `S.fnivel`.
- `js/app.js:491`: el historial del dashboard por finca se limita a la finca elegida; no incorpora filtros de período, departamento, municipio, evaluador o nivel.

**Brecha:** RF33 no se cumple de extremo a extremo. Los filtros funcionan solo para el dashboard general; no filtran el historial/reportes, el CSV ni el consolidado. Además, municipio se implementa como texto libre (`input`) y se compara por igualdad exacta (`f.mun===S.fmun`), sin normalización de mayúsculas/espacios.

**Corrección exacta necesaria:**

1. Crear una función única `evaluacionesFiltradas()` que aplique departamento, municipio normalizado, fechas inclusivas, evaluador y nivel a todas las evaluaciones cerradas.
2. Usar esa función en `dashView()`, `reportesView()`, `farmOutput()`, `consolidatedOutput()`, `csvFor()` y la futura exportación XLSX.
3. Mantener separados los filtros de finca y evaluación, pero resolver el municipio con `trim().toLocaleLowerCase('es-CO')` en ambos lados.
4. En `reportesView()` mostrar explícitamente el resumen de filtros activos y el estado vacío para exportación/consolidado.
5. No cambiar clases, colores, tipografía ni estructura visual global; solo reutilizar los controles y patrones existentes de `styles.css`.

**Prueba requerida:**

- Seleccionar Boyacá + rango 2026-05-01/2026-08-31 + nivel Alto y comprobar que KPI, barras, tabla, historial, CSV, XLSX y consolidado contienen exactamente el mismo subconjunto.
- Aplicar un municipio inexistente y verificar mensaje vacío, sin excepción de JavaScript.
- Cambiar evaluador/nivel y comprobar que cada gráfico se recalcula y que no aparecen registros fuera del filtro.

### RF34 — Generación de reporte de evaluación

**Estado: Parcial.**

**Requisito:** generar reporte en PDF para evaluaciones cerradas con datos de finca, calificación, diagnóstico, recomendaciones aprobadas, plan de mejora e indicadores aplicables con pregunta/respuesta/puntaje, porcentajes por grupo, calificación final y nivel.

**Evidencia concreta:**

- `js/app.js:495`, `printEval(ev)`: rechaza registros no cerrados (`ev.estado!=='cerrada'`), toma `approved=(ev.recs||[]).filter(r=>r.estado==='aprobada')` y el plan `ev.acciones||[]`.
- La plantilla incluye finca, fecha, sistema, evaluador, municipio/departamento, aves, diagnóstico final/nivel, MBA/MBR/MBG, tabla de código, indicador/pregunta, respuesta, puntaje y observación, recomendaciones aprobadas y plan de mejora.
- `js/app.js:486`: el botón se rotula “Imprimir / guardar PDF”.
- `js/app.js:495`: la implementación abre `window.open`, escribe HTML y ejecuta `window.print()`; no crea un archivo PDF binario ni usa una librería PDF.
- `js/app.js:256–291`: la vista de reporte muestra diagnóstico y gestión de recomendaciones/acciones, aunque no es la que genera el archivo descargable.

**Brecha:** el contenido mínimo exigido está cubierto en la plantilla imprimible, pero el entregable no es un PDF generado por el sistema. Depende de una ventana emergente, permisos del navegador y la intervención manual “Guardar como PDF”. Tampoco hay verificación automatizada de que la calificación impresa sea igual al valor almacenado antes de emitir el documento. El texto de la forma advierte que la forma definitiva depende de documentos pendientes, pero no existe una marca de integridad/hash o número de versión del reporte.

**Corrección exacta necesaria:**

1. Mantener `printEval()` como modo de impresión compatible, pero añadir una ruta de generación PDF binaria, por ejemplo `POST /api/reportes/:id/pdf`, que reciba/recupere la evaluación cerrada y produzca `application/pdf` mediante una biblioteca PDF instalada y fijada en dependencias.
2. Validar servidor-side que el estado sea cerrado y recalcular/contrastar `resultado_json` antes de generar; rechazar discrepancias.
3. Incluir en el PDF la misma plantilla y todos los campos mínimos ya presentes; añadir fecha de generación, versión del catálogo/snapshot y estado provisional/definitivo.
4. Exponer un botón “Descargar PDF” separado de “Imprimir”, conservando el formato visual actual.
5. Registrar la generación en auditoría si se implementa en backend.

**Prueba requerida:**

- Intentar reportar una evaluación en progreso: debe devolver bloqueo y no crear archivo.
- Generar una evaluación cerrada y comprobar `Content-Type: application/pdf`, apertura con `pdfinfo`/lector PDF y presencia de finca, todos los códigos aplicables, porcentajes por grupo, final, nivel, recomendaciones aprobadas y acciones.
- Cambiar artificialmente el resultado persistido y comprobar que el servidor detecta la discrepancia y no emite un PDF inconsistente.
- Mantener una prueba visual comparando el PDF con el formato actual para garantizar que no se altere la identidad visual de EvalCodorniz.

### RF35 — Exportación de datos

**Estado: Parcial.**

**Requisito:** exportar resultados e indicadores a Excel o CSV; respetar filtros aplicados; incluir el código de cada indicador de la matriz.

**Evidencia concreta:**

- `js/app.js:486–487`: solo ofrece “Descargar CSV” para la evaluación seleccionada.
- `js/app.js:493`: `downloadText()` crea un `Blob` de texto y descarga en navegador.
- `js/app.js:494`: `csvFor(ev)` crea columnas `evaluacion`, `fecha`, `finca`, `codigo`, `indicador`, `grupo`, `respuesta`, `puntaje`, `observacion`, `evidencia`; sí incluye códigos como `MBA1`, `MBR1`, `MBG1` provenientes de la matriz.
- `js/app.js:496`: el evento exporta `evalById(document.getElementById('r-eval')?.value)`, no el subconjunto filtrado.
- No se observa implementación de XLSX (`.xlsx`, `SheetJS`, `ExcelJS` o endpoint de exportación) en `app.js`, `server/index.js`, `index.html` o `styles.css`.
- `server/index.js:160–179` solo persiste y consulta evaluaciones; no expone endpoint de exportación.

**Brecha:** falta XLSX, falta exportación de múltiples evaluaciones/indicadores filtrados y el CSV disponible ignora filtros activos. El CSV además toma el texto del nivel desde `i.l.find(x=>x[0]===a.v)`; para respuestas numéricas/fórmulas puede quedar solo el valor crudo o una descripción incompleta, aunque el puntaje sí se exporta.

**Corrección exacta necesaria:**

1. Implementar `exportRows(evaluaciones)` a partir del mismo subconjunto de RF33, incluyendo una fila por evaluación-indicador y columnas de finca, ubicación, fecha, evaluador, sistema, grupo, código, pregunta, método, respuesta, puntaje, porcentaje/grupo, final, nivel, observación y evidencia.
2. Hacer que `csvFor()` reciba una lista y no una única evaluación; escapar correctamente saltos de línea y codificación UTF-8 con BOM si se requiere compatibilidad con Excel.
3. Añadir exportación XLSX real usando una biblioteca aprobada en frontend/backend o un servicio interno; no usar un archivo con extensión `.xlsx` que contenga CSV.
4. Mostrar filtros activos y cantidad de filas exportadas; si el subconjunto está vacío, deshabilitar descarga o informar “Sin datos para exportar”.
5. Restringir exportación a los roles indicados por RF35 (Docente y Administrador) mediante `PERM` en frontend y autorización equivalente en backend cuando la exportación sea servidor-side.

**Prueba requerida:**

- Con dos evaluaciones, aplicar un filtro que deje una sola y verificar que CSV y XLSX contienen solo esa evaluación.
- Abrir el XLSX con Python `openpyxl` y comprobar que es un archivo XLSX válido, con encabezados y códigos de todos los indicadores.
- Verificar que una evaluación con respuesta 100/55/0, fórmula y documento exporta puntaje y datos auxiliares correctamente.
- Probar un conjunto vacío y confirmar mensaje/control seguro.

### RF36 — Reporte consolidado

**Estado: Parcial.**

**Requisito:** generar reporte de varias fincas por período o zona, con promedios por criterio; incluir número de fincas evaluadas y promedio por criterio; excluir fincas sin evaluaciones cerradas en el período.

**Evidencia concreta:**

- `js/app.js:487`: el botón “Consolidado” activa `S.ui.reportMode='consolidado'`.
- `js/app.js:482`: se llama `consolidatedOutput(cerr)` sobre todas las evaluaciones cerradas.
- `js/app.js:492`: agrupa por `f.depto` y acumula `n`, `sum` y MBA/MBR/MBG; muestra “Fincas/evaluaciones”, promedio final y promedios por grupo.
- `js/app.js:492`: `x.n++` por cada evaluación, no por finca distinta; una finca con tres evaluaciones cuenta tres veces.
- No hay filtro de período/zona aplicado al consolidado: recibe `cerr` completo y no `evaluacionesFiltradas()`.
- El resultado es HTML en pantalla; no existe botón de descarga del consolidado.

**Brecha:** el consolidado implementa una aproximación por departamento, pero no satisface la semántica de RF36: no acepta/respeta período, no ofrece zona como criterio independiente, no cuenta fincas distintas, puede ponderar varias veces la misma finca y no documenta qué ocurre si una finca tiene varias evaluaciones dentro del período. Aunque excluye estados distintos de cerrada, no excluye según un período porque no lo recibe.

**Corrección exacta necesaria:**

1. Definir explícitamente parámetros `desde`, `hasta` y `zona` (departamento; opcionalmente municipio) y obtener el subconjunto mediante RF33.
2. Contabilizar `new Set(subset.map(e=>e.finca)).size` como “número de fincas evaluadas”. Mantener aparte el número de evaluaciones si se desea transparencia.
3. Definir la unidad del promedio: recomendación para RF36 es una evaluación cerrada por finca dentro del período; si hay varias, seleccionar la más reciente por finca o presentar ambas métricas sin doble conteo. Documentar la regla en la interfaz y prueba.
4. Calcular promedios por criterio sobre el conjunto seleccionado, evitando sumar `undefined` como cero para grupos no aplicables; para predios <200, MBG debe mostrarse como “No aplica”, no como promedio 0.
5. Añadir salida CSV/XLSX del consolidado con zona/período, fincas distintas, evaluaciones consideradas, MBA, MBR, MBG, final y nivel.
6. Mantener el HTML/estilos actuales (`panel`, `tablewrap`, `table`) para conservar el formato visual.

**Prueba requerida:**

- Crear/usar dos evaluaciones cerradas de la misma finca y una de otra finca, aplicar un período que incluya las tres y verificar que “fincas evaluadas” sea 2, no 3.
- Filtrar por departamento y fechas; comprobar que ninguna finca/evaluación fuera del período aparezca.
- Incluir una finca de menos de 200 aves y verificar MBG “No aplica” en vez de 0 computado.
- Probar período sin datos y comprobar “Sin evaluaciones cerradas” sin error.
- Validar que el promedio por criterio coincide con los cálculos independientes de `puntajes()`.

## 5. Pruebas ya ejecutadas durante esta auditoría

- `node --check js/app.js`: correcto.
- `node --check server/index.js`: correcto.
- Conteo programático de `js/data.js`: 35 códigos únicos; MBA 11, MBR 14, MBG 10.
- Revisión directa de `reportesView()`, `consolidatedOutput()`, `csvFor()` y `printEval()`.
- Revisión directa de las páginas 8–9 del documento de requisitos y páginas 8–12 y 15–16 de la metodología ICA.

Estas pruebas son estáticas y de sintaxis; no sustituyen una prueba de navegador ni la validación de un PDF/XLSX binario, precisamente porque esas capacidades no existen actualmente en el código declarado.

## 6. Prioridad de corrección

1. **Alta:** centralizar filtros y aplicarlos a dashboard, historial, CSV, XLSX y consolidado; corregir conteo de fincas distintas.
2. **Alta:** implementar exportación XLSX y exportación global filtrada.
3. **Alta:** implementar PDF binario o declarar formalmente que RF34 solo ofrece impresión asistida; validar resultado contra el cálculo.
4. **Media:** definir regla de consolidación cuando existen varias evaluaciones de la misma finca y mostrar “No aplica” para MBG bajo 200 aves.
5. **Media:** añadir pruebas automatizadas de contenido y regresión visual.

**Dictamen final:** EvalCodorniz conserva una base ICA sólida y un formato visual coherente, pero RF33–RF36 deben permanecer como **Parciales** hasta que los filtros sean transversales, exista XLSX/CSV global filtrado, el PDF sea un artefacto descargable verificable y el consolidado cuente fincas distintas por período/zona.
