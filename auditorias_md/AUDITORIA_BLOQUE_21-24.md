# Auditoría exacta del bloque RF21–RF24 — EvalCodorniz unificado

**Fecha de auditoría:** 2026-11-06  
**Alcance:** cierre, diagnóstico, indicadores críticos y recomendaciones IA.  
**Restricción aplicada:** auditoría de solo lectura; no se modificaron archivos del proyecto ni su formato visual.

## 1. Dictamen ejecutivo

| RF | Estado | Dictamen |
|---|---|---|
| RF21 | **Parcial** | Existe validación previa al cierre y bloqueo para faltantes/respuestas documentales en 100, pero la evidencia es principalmente local, la validación del contenido documental no es real y el requisito no queda respaldado de forma consistente por una transacción persistente del servidor. |
| RF22 | **Parcial** | El cierre local calcula y congela un diagnóstico/formulario provisional con nivel, fecha y datos por indicador. No se implementan de forma efectiva la ventana real de un día hábil, la recepción/recalificación documental ni la emisión definitiva automática; la persistencia servidor carece de actualización/cierre idempotente. |
| RF23 | **Implementado** | El diagnóstico lista los indicadores con puntaje 0, los agrupa por MBA/MBR/MBG y muestra explícitamente cuando no hay críticos, conforme a la historia de usuario RF23. |
| RF24 | **Requiere servicio externo** | Hay endpoint backend para OpenAI, pero el flujo UI que se ejecuta actualmente no lo invoca: `genrecs` usa un `setTimeout` y plantillas locales. La generación IA real depende de `OPENAI_API_KEY`, modelo y disponibilidad del proveedor. |

**Conclusión:** EvalCodorniz conserva su presentación visual y tiene una implementación funcional de prototipo para RF21–RF23, pero no debe declararse todavía como flujo ICA productivo completo ni como IA conectada en la interfaz. RF24 requiere servicio externo configurado y una integración frontend real antes de poder considerarse implementado.

## 2. Fuentes y criterio de contraste

Se revisaron directamente:

- `/home/ubuntu/evalcodorniz-work/js/app.js` — lógica de validación, cierre, diagnóstico, críticos, recomendaciones, persistencia y vista.
- `/home/ubuntu/evalcodorniz-work/js/data.js` — catálogo, escalas, grupos, niveles y permisos.
- `/home/ubuntu/evalcodorniz-work/server/index.js` — persistencia SQLite, evidencias y endpoint IA.
- `/home/ubuntu/evalcodorniz-work/index.html` y `/home/ubuntu/evalcodorniz-work/css/styles.css` — integración y formato visual.
- `/home/ubuntu/evalcodorniz-work/AUDITORIA_NORMATIVA_ICA_COMPLETA.md` y `/home/ubuntu/evalcodorniz-work/VALIDACION_NORMATIVA_ICA_Y_QA.md` — antecedentes y pruebas previas.
- `/home/ubuntu/projects/coornices-8f1eef12/EvalCodorniz_Requerimientos (2).docx` — RF21, RF22, RF23 y RF24.
- `/home/ubuntu/projects/coornices-8f1eef12/EvalCodorniz_Matriz (2).xlsx`, hoja `Matriz de Indicadores` — 35 indicadores, distribución 14 MBR + 11 MBA + 10 MBG y reglas de escala/cálculo.
- `/home/ubuntu/projects/coornices-8f1eef12/Metodologia-EBA-Codornices_30JL.pdf` — metodología ICA 2024, especialmente aspectos generales, proceso de evaluación, Tabla 1, Tabla 2, Tabla 3 y Tablas 30–39.

## 3. Verificación de metodología ICA y matriz de indicadores

### 3.1 Correspondencia del catálogo

La matriz XLSX declara 35 indicadores: filas 7–20 contienen MBR1–MBR14; filas 24–34 contienen MBA1–MBA11; filas 38–47 contienen MBG1–MBG10. El código reproduce esa estructura en `data.js:3-39` (`IND`), con `GROUPS=['MBA','MBR','MBG']` en `data.js:41`.

La distribución efectiva es:

- MBA: 11 indicadores.
- MBR: 14 indicadores.
- MBG: 10 indicadores.

El catálogo también conserva las escalas especiales necesarias para este bloque: MBG1 con 100/55, MBG10 con 100/50/0, y las demás escalas definidas en la matriz. La función `tipo()` de `app.js:17` distingue escala, porcentaje, fórmula, razón, documento y combinaciones documentales.

### 3.2 Reglas de puntuación relevantes

- `puntajes(ev)` en `app.js:20-24` promedia los valores respondidos por grupo y aplica `ev.pesos[g]` sin redondeo intermedio; el resultado final se redondea a dos decimales.
- `crearEval()` en `app.js:52-58` captura `snapshot`, pesos y muestreo. `pesosPara()` y `muestreoPara()` en `app.js:9-10` aplican la frontera de 200 aves como `>=200`.
- `NIVELES` en `data.js:43` refleja Excelente ≥90, Alto ≥75, Medio ≥50 y Bajo ≥0; el orden descendente permite que `nivelDe()` en `app.js:7` clasifique el resultado.
- La matriz XLSX, fila 48, confirma la fórmula de promedio por grupo multiplicado por el peso y las ponderaciones 60/25/15 para ≥200 y 70/30/0 para <200.
- La metodología ICA PDF describe la escala de cuatro categorías y las Tablas 1–3 en las páginas/secciones iniciales de aspectos generales; la Tabla 3 exige 1/5/10 para <200 y 2/9/10 para ≥200 según el documento de requisitos y la implementación vigente.

### 3.3 Límite normativo que afecta RF21/RF22

La metodología ICA exige evaluar la evidencia documental conforme a las fichas de MBG y, cuando corresponde, firma, matrícula profesional, vigencia, legibilidad, ausencia de correcciones, entidad/laboratorio y contenido. El propio `server/index.js:181-190` registra esos campos como pendientes de verificación oficial y marca `contenido:'requiere_revision_humana'`. Por tanto, el sistema comprueba presencia/metadatos declarados, pero no autenticidad ni contenido normativo.

## 4. Detalle por requisito

## RF21 — Validación previa al cierre

**Estado: Parcial.**

### Evidencia concreta

1. `validar(ev)` en `js/app.js:26-36` construye `faltan`, `bloq`, `avisos` y `coher`.
2. En `app.js:28-31` bloquea si falta semilla, no coincide el tamaño ICA de corrales/puntos/aves, no se confirmó bioseguridad o no se confirmó neutralidad.
3. En `app.js:32-36` lista indicadores sin respuesta y, mediante `requiereDoc()`, bloquea un indicador documental en 100 cuando falta evidencia o los metadatos locales `legible`/`signed`; en nivel parcial/bajo genera advertencia.
4. La vista `valNotice()` en `app.js:214-219` muestra al evaluador faltantes, bloqueos, advertencias y la alerta de coherencia MBA1/MBR11.
5. `confirmClose` en `app.js:368-369` vuelve a ejecutar `validar` y no cierra si `v.ok` es falso.
6. El backend exige la muestra completa en `server/index.js:160-165`, incluyendo semilla, corrales, puntos, 10 aves por punto, bioseguridad y selección neutral.
7. La validación previa QA documenta el rechazo de una muestra incompleta y la aceptación de una muestra completa en `VALIDACION_NORMATIVA_ICA_Y_QA.md:28-41`.

### Brechas

- La evidencia seleccionada en frontend solo conserva el nombre del archivo (`app.js:417-418`) y metadatos ingresados por el usuario; no se sube automáticamente al backend durante el diligenciamiento/cierre ni se verifica su contenido.
- El backend guarda `firmaOficial`, `matriculaProfesional`, `entidadEmisora` como `pendiente_verificacion_oficial` y `contenido` como `requiere_revision_humana` (`server/index.js:185-188`). Por ello no satisface todavía la validación documental sustantiva exigida por RF17/RF21.
- La validación de tamaño de archivo diverge: frontend permite 5 MB (`app.js:417`) mientras el backend por defecto permite 10 MB (`server/index.js:107-114`). La configuración local de catálogos no gobierna el límite del servidor.
- La validación comprueba que existan listas con las cantidades esperadas, pero el generador `randomizeInspection` (`app.js:365`) produce nombres secuenciales `Galpón/Corral 1`, `Punto 1`, etc.; no ejecuta un sorteo verificable sobre un inventario real ni demuestra aleatoriedad de selección. La semilla es trazabilidad de generación, no prueba de un muestreo aleatorio ICA del universo disponible.
- No existe una validación de vencimiento documental al cierre: se captura `doc.vig`, pero `validar` no compara la fecha con `today()` ni lista documentos vencidos.

### Corrección exacta necesaria

1. Crear un modelo de evidencia de evaluación en frontend con estado `local`, `subiendo`, `persistida`, `rechazada`, y subir el binario al endpoint `/api/evaluaciones/:id/evidencias` al adjuntarlo; guardar el `id` de evidencia en la respuesta del indicador.
2. Unificar el límite en una única configuración ICA, enviando `maxEvidenceMB` al backend o leyendo una variable de entorno equivalente; rechazar con el mismo valor en cliente y servidor.
3. Implementar un validador documental por tipo de indicador: vigencia (incluida regla de 1 año para el análisis de agua), MIME/extensión, legibilidad, firma, matrícula, entidad/laboratorio y comprobación de contenido; cuando una comprobación no pueda automatizarse, dejar estado explícito `requiere_revision_humana` y exigir decisión trazable.
4. Añadir en `validar` la comparación de `doc.vig`/vigencia registrada contra la fecha de visita y reportar vencidos como bloqueo o advertencia según la ficha ICA.
5. Sustituir la generación secuencial de `randomizeInspection` por un muestreo aleatorio sin reemplazo sobre el universo de corrales, puntos y aves registradas, conservando semilla, universo, algoritmo y selección resultante para repetición auditable.
6. Añadir pruebas unitarias de frontera: 199/200 aves, 5/9 puntos, 49/50 y 89/90 aves, indicador documental 100 sin soporte, indicador 55/0 sin soporte, documento vencido y archivo de 5 MB exactos/5 MB + 1 byte.

### Prueba requerida

- Crear una evaluación de 199 aves y verificar bloqueo con 1 corral, 5 puntos y 50 aves; repetir con exactamente 200 y verificar 2, 9 y 90.
- Dejar un indicador aplicable sin respuesta: `Cerrar evaluación` debe mostrar su código y `Confirmar cierre` no debe cerrar.
- Marcar MBG4 en 100 sin evidencia: debe bloquear; marcarlo en 0 sin evidencia: debe permitir el cierre con advertencia.
- Adjuntar un archivo >5 MB, uno con MIME no permitido y uno válido; comprobar que el mismo límite y resultado se aplican en navegador, endpoint y base de datos.
- Registrar evidencia vencida y comprobar que RF21 la lista de manera determinista.
- Repetir una selección con la misma semilla y confirmar exactamente el mismo universo/resultado; cambiar la semilla y confirmar que el resultado puede cambiar.

## RF22 — Cierre de evaluación y diagnóstico automático

**Estado: Parcial.**

### Evidencia concreta

1. `cerrarEval(ev, fecha)` en `app.js:59` establece `estado='cerrada'`, calcula `ev.res=puntajes(ev)`, asigna `ev.nivel`, fecha de cierre y `ev.forma='provisional'`.
2. `evalView()` en `app.js:195-196` cambia de formulario a `reportView(ev)` cuando el estado es cerrado; así se bloquea la edición en la vista.
3. `reportView()` en `app.js:256-283` muestra datos generales, puntaje final, puntaje por grupo, nivel, críticos, recomendaciones, plan de mejora y detalle por indicador.
4. `confirmClose` en `app.js:368-369` registra el cierre en la bitácora local y llama a `persistServerEval`.
5. El reporte imprimible `printEval()` en `app.js:495` incluye datos de finca, fecha, sistema, evaluador, ubicación, aves, diagnóstico, porcentajes por grupo, indicadores, recomendaciones aprobadas y plan de mejora.
6. La forma provisional y el texto “1 día hábil” aparecen en `app.js:261-263`.
7. El servidor persiste resultado/estado en `server/index.js:160-173`, pero solo mediante `POST /api/evaluaciones`; no hay endpoint de actualización, cierre, recepción documental posterior ni recalificación.

### Brechas

- La ventana de un día hábil es solo texto: no se guarda un `deadline` calculado, no se excluyen fines de semana/festivos, no hay tarea/monitor que la haga vencer y no hay bloqueo automático de la forma definitiva.
- El botón `definitiva` en `app.js:370` cambia `ev.forma` inmediatamente, sin comprobar que haya transcurrido el día hábil ni que las evidencias pendientes hayan sido verificadas.
- La llegada de un documento no dispara recalificación; no existe flujo para actualizar respuestas/documentos de una evaluación cerrada, recalcular `res`, `nivel`, críticos y forma, ni conservar historial de versiones.
- El “bloqueo” es de la interfaz/memoria/localStorage. El servidor no tiene endpoint de cierre idempotente ni una regla de base de datos que impida editar/reabrir una evaluación cerrada.
- `persistServerEval` (`app.js:451-454`) usa siempre `POST /api/evaluaciones`; guardar avance y cerrar puede crear registros nuevos en vez de actualizar una evaluación existente. Esto impide garantizar un diagnóstico único y consistente en servidor.
- No existe registro explícito de socialización con el productor ni de entrega de copia, aunque el requisito RF22 lo contempla como parte del proceso.
- La impresión HTML abre una ventana y usa `window.print()`; no produce un PDF binario descargable ni firma/identificador de versión de la forma.

### Corrección exacta necesaria

1. Añadir en el modelo de evaluación `closed_at`, `provisional_until`, `forma_version`, `closed_by`, `definitive_at` y estado de ciclo (`en progreso`, `provisional`, `definitiva`). Calcular `provisional_until` con calendario de día hábil ICA/institucional.
2. Implementar `PATCH /api/evaluaciones/:id` para actualizar borradores sin duplicar, y `POST /api/evaluaciones/:id/cierre` en una transacción que valide estado, respuestas y evidencias, calcule resultado en servidor, registre auditoría y sea idempotente.
3. Implementar endpoint para adjuntar/validar documentos posteriores dentro de la ventana; al aprobarlos, recalcular resultado y generar una nueva versión de forma; al vencer la ventana, impedir cambios ordinarios y marcar definitiva automáticamente.
4. Cambiar `definitiva` para que solo permita emisión si no quedan documentos pendientes o si `now >= provisional_until`, y exigir una razón/usuario para la decisión manual.
5. Añadir auditoría de cierre, revisión documental, recalificación, emisión provisional/definitiva y socialización/entrega, con usuario, fecha, versión y detalle inmutable.
6. Mantener la vista visual existente y conectar sus mismos botones a los endpoints anteriores; no es necesario cambiar el formato CSS para corregir la lógica.
7. Generar PDF real mediante un servicio/conversor controlado o una ruta de exportación binaria, conservando el contenido mínimo exigido por RF34.

### Prueba requerida

- Cerrar una evaluación completa: verificar `estado`, `closed_at`, `provisional_until`, resultado, nivel y snapshot en servidor; repetir la misma petición y comprobar que no duplica.
- Intentar modificar una evaluación cerrada con `PATCH`: debe responder 409/403 y no cambiar datos.
- Adjuntar dentro de la ventana un documento válido: debe crear nueva versión, recalcular y registrar auditoría; adjuntar después del vencimiento debe rechazarse.
- Intentar emitir definitiva antes del vencimiento con documentos pendientes: debe bloquear; emitir tras vencer: debe permitir y dejar auditoría.
- Verificar cálculo de día hábil con cierre viernes, fin de semana y festivo configurado.
- Imprimir/exportar una evaluación cerrada y verificar que la calificación coincide con `ev.res.final`, contiene pregunta/respuesta/puntaje, grupos, nivel, recomendaciones aprobadas y plan.

## RF23 — Identificación de indicadores críticos

**Estado: Implementado.**

### Evidencia concreta

1. `reportView(ev)` en `app.js:256` define `crit=ev.inds.filter(c=>ev.ans[c].v===0)`.
2. En `app.js:272` los críticos se agrupan recorriendo `GROUPS` y se filtran por `IX[c].g`, mostrando código, nombre y etiqueta `0`.
3. Cuando la lista está vacía, `app.js:272` muestra literalmente “No hay indicadores críticos en esta evaluación”.
4. `generarRecs(ev)` en `app.js:61-67` también toma valores `<100` para recomendaciones y asigna prioridad alta a los valores 0; esto es coherente con RF24/RF25, aunque no sustituye el listado crítico de RF23.
5. La matriz y el documento de requisitos establecen que los indicadores con puntaje 0 son críticos y deben agruparse por MBA, MBR y MBG; el código cumple exactamente ese criterio.

### Brechas residuales / límites

- El listado crítico solo se calcula para una evaluación ya cerrada y usa el valor guardado en `ev.ans`; eso es correcto para RF23, pero no existe una vista histórica/consolidada de críticos por finca.
- No se muestra la evidencia, observación o causa junto al crítico; el detalle completo sí aparece más abajo en la tabla de indicadores.
- No hay prueba automatizada visible en el repositorio para las tres variantes: críticos solo en MBA, solo en MBR/MBG y ausencia total de críticos.

### Corrección exacta necesaria

No se requiere corrección funcional para satisfacer RF23. Como mejora de robustez, extraer `criticalIndicators(ev)` como función pura, ordenar por grupo y código, y reutilizarla en UI, exportación y API; añadir pruebas automatizadas para 0, 55, 50 y 100.

### Prueba requerida

- Construir una evaluación cerrada con `MBA1=0`, `MBR2=0`, `MBG4=0`: verificar tres secciones, códigos correctos y ausencia de duplicados.
- Construir otra con todos los valores 55/50/100 y verificar el mensaje explícito de ausencia.
- Cambiar un indicador de 0 a 55 y comprobar que desaparece del listado crítico, pero permanece disponible en detalle/recomendaciones según corresponda.

## RF24 — Generación de recomendaciones con IA

**Estado: Requiere servicio externo.**

### Evidencia concreta

1. El requisito RF24 exige recomendaciones automáticas desde el diagnóstico, asociación con el indicador de origen y reintento informado si el servicio no responde.
2. El endpoint backend existe en `server/index.js:199-216` como `POST /api/ai/recommendations`; exige autenticación, devuelve 503 si falta `OPENAI_API_KEY` (`:200`), usa `OpenAI` (`:201`), el modelo configurable `AI_MODEL` (`:204`) y devuelve 502 si el proveedor falla (`:215`).
3. La auditoría previa lo describió como endpoint conectado, pero el flujo frontend actual no lo llama: `genrecs` en `app.js:371` solo activa una espera de 900 ms y ejecuta `generarRecs(ev)` local.
4. `generarRecs` en `app.js:61-67` crea una recomendación por indicador con `a.v<100`, asigna `ind` y prioridad, y genera texto determinista desde `VERB` y la primera descripción normativa `ind.l[0][1]`.
5. `reportView` en `app.js:274-277` muestra el botón “Generar con IA” y afirma que hay respaldo local, pero no existe llamada `fetch('/api/ai/recommendations')`, manejo de HTTP 503/502, botón de reintento ni conservación de respuesta/error del servicio.
6. El backend sí deja auditoría de generación en `server/index.js:213`, pero esa auditoría solo ocurre si se invoca el endpoint, cosa que el botón actual no hace.

### Brechas

- No es IA efectiva en la interfaz: se presenta como IA, pero se ejecutan plantillas locales.
- El endpoint requiere un servicio externo y una clave OpenAI válida; su disponibilidad no está garantizada en el despliegue.
- No hay contrato JSON estricto/validación de esquema para asegurar que cada recomendación traiga `title`, `detail`, `priority` y el código de indicador; el backend hace parseo heurístico entre la primera y última llave.
- No hay asociación server-side de cada recomendación con diagnóstico/evaluación, ni persistencia granular de recomendaciones generadas, editadas, aprobadas o descartadas.
- No hay manejo UI de error, reintento y estado “servicio no disponible”; el fallback local oculta la indisponibilidad y puede inducir a creer que se recibió respuesta IA.
- El prompt incluye la evaluación completa, pero no impone una lista cerrada de códigos aplicables ni un límite formal que evite recomendaciones para respuestas no críticas; tampoco registra versión del prompt.

### Corrección exacta necesaria

1. Reemplazar `genrecs` por una llamada `fetch('/api/ai/recommendations', {method:'POST', headers:serverHeaders(), body:JSON.stringify({evaluacionId:ev.serverId||ev.id, evaluacion:diagnosticoNormalizado(ev)})})`.
2. Validar la respuesta contra un esquema estricto; cada recomendación debe contener `indicatorCode`, `title`, `detail`, `priority`, `originalText` y origen/versionado del modelo/prompt. Rechazar códigos que no estén en `ev.inds`.
3. Persistir las recomendaciones en servidor vinculadas a `evaluacion_id`, con texto original, texto editado, prioridad, estado y auditoría de aprobación/descarte.
4. Mostrar estados UI separados: “consultando IA”, “respuesta recibida”, “servicio no configurado”, “error temporal” y “respuesta requiere revisión humana”. Ante 503/502, conservar diagnóstico, no borrar recomendaciones previas y mostrar botón `Reintentar`.
5. Mantener `generarRecs` como fallback explícito y etiquetado “Plantillas locales — no generadas por IA”; no presentarlo como IA conectada.
6. Versionar prompt/modelo y registrar `evaluacionId`, usuario, fecha, modelo y hash de entrada; aplicar límites y sanitización de datos sensibles antes de enviar al proveedor.

### Prueba requerida

- Con `OPENAI_API_KEY` ausente: endpoint debe devolver 503; UI debe mostrar “servicio no configurado”, conservar el diagnóstico y permitir reintentar o usar fallback etiquetado.
- Con proveedor disponible y respuesta JSON válida: verificar llamada real, asociación de cada recomendación con un indicador aplicable, prioridad y auditoría.
- Con respuesta malformada: verificar rechazo controlado, mensaje de revisión humana y que no se creen recomendaciones incompletas.
- Con timeout/502: verificar botón de reintento sin perder diagnóstico ni respuestas.
- Editar, aprobar y descartar una recomendación: comprobar conservación del texto original IA, texto editado, estado, usuario y fecha en servidor.
- Verificar que solo recomendaciones aprobadas aparecen en forma/reporte imprimible.

## 5. Conservación del formato visual

No se modificaron `index.html` ni `css/styles.css`. La integración actual sigue cargando `css/styles.css` desde `index.html:10` y los scripts `data.js`/`app.js` desde `index.html:15-16`. Las correcciones propuestas son de lógica, persistencia y estados de servicio; deben conectarse a los controles y paneles ya existentes sin sustituir el sistema visual EvalCodorniz.

## 6. Pruebas mínimas de aceptación del bloque

1. **Cierre incompleto:** faltante de respuesta, muestra inválida, falta de bioseguridad, falta de neutralidad y documento en 100 sin evidencia; cada caso debe bloquear y listar la causa.
2. **Cierre completo:** muestra ICA completa, todas las respuestas y documentos exigibles; debe crear un único cierre provisional, diagnóstico y forma versionada.
3. **Recalificación:** documento pendiente recibido dentro de la ventana; debe recalcular resultado/nivel, generar versión definitiva y registrar auditoría.
4. **Críticos:** valores 0 agrupados por los tres grupos y mensaje explícito cuando no existan.
5. **IA:** proveedor activo, proveedor ausente, respuesta malformada y error temporal; todos deben dejar diagnóstico intacto y permitir reintento/fallback claramente rotulado.
6. **Persistencia:** guardar avance varias veces y cerrar no debe duplicar evaluaciones ni perder respuestas, evidencias, recomendaciones o versiones de forma.
7. **Regresión visual:** comprobar escritorio y móvil; mantener navegación, tarjetas, panel lateral, tablas, colores, tipografía y los controles actuales.

## 7. Dictamen final

El bloque está bien encaminado para un prototipo local y la matriz ICA está representada de manera consistente en el catálogo y cálculo. RF23 puede considerarse implementado. RF21 y RF22 requieren completar validación documental, calendario/versionado, recalificación y persistencia transaccional para ser conformes en operación. RF24 no debe etiquetarse como IA implementada mientras `genrecs` siga sin invocar el endpoint; su estado correcto es **Requiere servicio externo**, con fallback local explícitamente diferenciado.
