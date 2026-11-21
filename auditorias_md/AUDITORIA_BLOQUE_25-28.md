# Auditoría exacta del bloque RF25–RF28 — EvalCodorniz unificado

**Fecha de auditoría:** 2026-11-06  
**Alcance:** priorización de recomendaciones, edición/validación, creación y seguimiento del plan de mejora.  
**Regla aplicada:** se audita el requisito contra el código declarado, el backend declarado, la metodología ICA de 2024, el documento de requerimientos y la matriz XLSX original. No se modificaron archivos del proyecto; únicamente se creó este informe.

## Dictamen ejecutivo

El bloque RF25–RF28 está implementado en el flujo visual local y conserva el formato visual existente de EvalCodorniz. RF25 cumple funcionalmente la priorización indicada. RF26, RF27 y RF28 cumplen el flujo de usuario en memoria y mediante `localStorage`, pero son **Parciales** como capacidades operativas del proyecto unificado porque las recomendaciones y las acciones del plan no se incluyen en `serverPayload(ev)`, no existe endpoint servidor para guardarlas/consultarlas/actualizarlas y, por tanto, no hay persistencia granular multiusuario ni trazabilidad de servidor para estas entidades.

La metodología ICA sí está reflejada en los puntos relevantes para este bloque: 35 indicadores en tres grupos, ponderación por tamaño del predio, niveles de clasificación, muestra de 10 aves por punto y flujo de apertura–inspección–cierre. La matriz original fue procesada con Python y contiene 35 indicadores: MBR 14, MBA 11 y MBG 10. No obstante, ICA no prescribe el algoritmo de priorización ni un plan de mejora con estados; esas funciones son requisitos de producto RF25–RF28 y deben mantenerse como capa de gestión posterior al diagnóstico, sin alterar el cálculo normativo.

## Fuentes y método de verificación

- Requisitos: `/home/ubuntu/projects/coornices-8f1eef12/EvalCodorniz_Requerimientos (2).docx`, extraído directamente del XML del DOCX para leer RF24–RF29.
- Metodología normativa: `/home/ubuntu/projects/coornices-8f1eef12/Metodologia-EBA-Codornices_30JL.pdf`, especialmente págs. 8–16: 35 indicadores, grupos MBA/MBR/MBG, métodos, Tabla 1 de ponderación, Tabla 2 de clasificación, proceso por fases y Tabla 4 de grupos.
- Matriz: `/home/ubuntu/projects/coornices-8f1eef12/EvalCodorniz_Matriz (2).xlsx`, hoja `Matriz de Indicadores`, leída con `openpyxl`.
- Implementación: `/home/ubuntu/evalcodorniz-work/js/app.js`, `/home/ubuntu/evalcodorniz-work/js/data.js`, `/home/ubuntu/evalcodorniz-work/server/index.js`, `/home/ubuntu/evalcodorniz-work/index.html`, `/home/ubuntu/evalcodorniz-work/css/styles.css`.
- Antecedentes: `AUDITORIA_NORMATIVA_ICA_COMPLETA.md` y `VALIDACION_NORMATIVA_ICA_Y_QA.md`.
- Verificación estática: `node --check js/app.js`, `node --check js/data.js` y `node --check server/index.js` finalizaron correctamente.

## Matriz de estado RF25–RF28

| RF | Estado | Dictamen corto |
|---|---|---|
| RF25 | **Implementado** | Ordena por puntaje crítico, muestra prioridad y usa peso de criterio como desempate. |
| RF26 | **Parcial** | Edición, aprobación, descarte y preservación del original funcionan localmente; falta persistencia granular en servidor. |
| RF27 | **Parcial** | Convierte una recomendación aprobada en acción con descripción, responsable y fecha; falta persistencia servidor y validación de negocio independiente del HTML. |
| RF28 | **Parcial** | Permite estados, avance, cierre visual y marca vencidas; falta persistencia servidor, estado atrasada explícito y control multiusuario. |

---

## RF25 — Priorización de recomendaciones

**Estado: Implementado.**

### Requisito auditado

El documento de requerimientos exige ordenar las recomendaciones según criticidad del indicador y peso de su criterio; los indicadores con puntaje 0 deben aparecer antes que los de puntaje intermedio; cada recomendación debe mostrar prioridad alta, media o baja.

### Evidencia concreta

- `js/app.js:61–67`, función `generarRecs(ev)`: crea una recomendación por cada indicador con `a.v < 100`.
- `js/app.js:63`: asigna `Alta` a puntaje `0`; para puntajes intermedios asigna `Media` a MBA y `Baja` a MBR/MBG.
- `js/app.js:66–67`: ordena por `Alta`, `Media`, `Baja` y, dentro del mismo nivel, por `ev.pesos[IX[y.ind].g]` descendente. El comparador implementa el peso del criterio como desempate.
- `js/app.js:284–287`: `recCard` muestra la etiqueta visible `Prioridad alta/media/baja`, el código del indicador, el nombre y los puntos.
- `js/app.js:274–277`: el diagnóstico muestra las recomendaciones en el orden del arreglo generado.
- `js/data.js:41–43` y `app.js:9`, `app.js:22–24`: los grupos y las ponderaciones usadas por la evaluación están definidos como MBA/MBR/MBG y 70/30/0 para `<200`, 60/25/15 para `>=200`.

### Contraste ICA y matriz

La metodología ICA define 35 indicadores agrupados en MBA, MBR y MBG y utiliza la combinación ponderada de los grupos para la calificación final (Tabla 1, pág. 11); no define un orden de recomendaciones. La matriz XLSX original, procesada con Python, contiene 14 MBR, 11 MBA y 10 MBG, total 35. RF25 correctamente usa el peso de grupo ya calculado por la metodología, sin modificar la calificación normativa.

### Brecha

No hay brecha funcional frente al texto literal de RF25 para el prototipo local. Como riesgo menor de precisión, el código no calcula una criticidad independiente por indicador distinto del puntaje y grupo: asigna siempre `Media` a cualquier MBA intermedio y `Baja` a cualquier MBR/MBG intermedio. Esto cumple el requisito mínimo, pero deja la regla de negocio implícita y no configurable. Además, la ordenación no se materializa en un registro servidor porque el arreglo de recomendaciones tampoco se envía al backend.

### Corrección exacta necesaria

1. Extraer la regla a una función explícita y versionada, por ejemplo `prioridadRecomendacion(indicador, puntaje, pesos)`, con criterios documentados: primero puntaje 0, después puntaje intermedio; desempate por peso del grupo; desempate final estable por código.
2. Persistir en servidor, por cada recomendación, `id`, `evaluacion_id`, `indicador_codigo`, `puntaje_origen`, `grupo`, `peso_grupo`, `prioridad`, `texto_original`, `texto_actual`, `estado` y `orden`.
3. Mantener el orden calculado en backend o revalidarlo al leer para impedir que una edición local cambie la priorización sin trazabilidad.

### Prueba requerida

- Crear una evaluación con al menos: un MBA en 0, un MBR en 0, un MBA en 55, un MBR en 55 y un MBG en 55.
- Verificar que todos los 0 precedan a los intermedios.
- Verificar que cada tarjeta exponga prioridad.
- Verificar empate: con `>=200` aves, un MBA intermedio (peso 60) precede a MBR (25) y MBG (15).
- Verificar estabilidad por código cuando puntaje, prioridad y peso sean iguales.
- Recargar en otra sesión/usuario y comprobar que el orden y los campos persistidos sean idénticos.

---

## RF26 — Edición y validación de recomendaciones

**Estado: Parcial.**

### Requisito auditado

El evaluador debe poder editar, aprobar o descartar recomendaciones generadas por IA. Una recomendación editada debe conservar el texto original. Solo las aprobadas pasan al reporte final.

### Evidencia concreta

- `js/app.js:284–293`, función `recCard(ev, rc, wr)`: muestra editor `textarea` para recomendaciones pendientes; cuando el texto cambia, conserva `rc.orig` y muestra “Texto original de la IA”.
- `js/app.js:290`: ofrece botones `Aprobar` y `Descartar` para recomendaciones pendientes.
- `js/app.js:371–373`, acciones `genrecs` y `rec`: guarda el texto editado y asigna `rc.estado` a `aprobada` o `descartada`; registra la decisión en bitácora local.
- `js/app.js:495`: `printEval` filtra `(ev.recs || []).filter(r => r.estado === 'aprobada')`; las descartadas o pendientes no entran en la forma imprimible.
- `js/app.js:437–440`: `persistLocal()` serializa `S.evals`, por lo que el arreglo local de recomendaciones se conserva en `localStorage` mientras exista el mismo navegador/perfil.
- `server/index.js:199–215`: existe endpoint `/api/ai/recommendations`, condicionado a `OPENAI_API_KEY`, con advertencia de revisión humana; sin embargo, el flujo visible `ACT.genrecs` no invoca este endpoint: usa `generarRecs(ev)` local después de `setTimeout` (`app.js:371`).

### Brecha

La edición/aprobación/descarte está operativa solo en el estado del navegador. `serverPayload(ev)` (`app.js:450`) envía predio, visita, muestra, respuestas y resultado, pero no incluye `recs` ni `acciones`. El backend tampoco tiene tablas ni endpoints para recomendaciones. Por ello, otro usuario, otro navegador o una recuperación desde SQLite no puede ver las decisiones de RF26. La etiqueta “Generar con IA” es equívoca en el flujo actual: la función ejecutada es una plantilla local, aunque existe un endpoint IA separado.

La “validación” implementada es validación de decisión editorial (aprobar/descartar), no validación normativa del contenido generado. El endpoint IA devuelve `recommendations` y exige revisión humana, pero no se integra al reporte ni persiste su respuesta.

### Corrección exacta necesaria

1. Crear tabla `recomendaciones` con relación a `evaluaciones`, indicador de origen, puntaje/grupo/peso, prioridad, texto original, texto editado, estado, usuario, fecha de generación y fecha de decisión.
2. Crear endpoints autenticados: `POST /api/evaluaciones/:id/recomendaciones`, `PATCH /api/recomendaciones/:id`, `GET /api/evaluaciones/:id/recomendaciones`; restringir aprobar/descartar a roles autorizados y registrar auditoría.
3. Cambiar `ACT.genrecs` para llamar a `/api/ai/recommendations` cuando haya servicio; si falla, mostrar el error y permitir reintentar sin borrar diagnóstico, usando la plantilla local únicamente como fallback explícito.
4. Definir esquema de respuesta IA y validar que cada recomendación tenga indicador existente, prioridad válida y texto no vacío; rechazar o marcar para revisión los elementos que no correspondan a un indicador de la evaluación.
5. Enviar/recuperar `recs` al sincronizar y hacer que `printEval` use la fuente persistida.

### Prueba requerida

- Generar recomendaciones con IA disponible; comprobar llamada HTTP, asociación uno-a-uno con indicadores y persistencia.
- Editar una recomendación y verificar que `texto_original` permanezca intacto y `texto_editado` sea el mostrado.
- Aprobar una y descartar otra; verificar que solo la aprobada aparezca en la forma imprimible.
- Simular `503`/timeout del servicio: conservar diagnóstico y recomendaciones existentes, mostrar error y permitir reintento.
- Iniciar sesión con otro usuario autorizado y comprobar que vea el mismo estado; comprobar que un usuario sin permiso no pueda decidir.

---

## RF27 — Creación de plan de mejora

**Estado: Parcial.**

### Requisito auditado

Una recomendación aprobada puede convertirse en una acción concreta con descripción, responsable y fecha límite. No se exige que todas las recomendaciones generen plan. No debe guardarse una acción sin responsable o fecha.

### Evidencia concreta

- `js/app.js:291–292`: una acción solo se ofrece para una recomendación `aprobada` y cuando no existe ya una acción asociada (`!acc`).
- `js/app.js:291`: el formulario solicita `Acción concreta`, `Responsable` y `Fecha límite`; los tres controles tienen `required`.
- `js/app.js:392–393`, handler `f-acc`: crea `{id, rec, desc, resp, fecha, estado:'pendiente', avance:0}` y la agrega a `ev.acciones`.
- `js/app.js:296–303`: la acción queda visible en la tabla del plan y conserva el vínculo a la finca/evaluación cuando se usa la vista global.
- `js/app.js:278`: el plan aparece en el reporte de diagnóstico.
- `js/app.js:495`: la forma imprimible incluye acción, responsable, fecha límite, estado y avance.

### Brecha

La obligatoriedad depende de la validación HTML del formulario; no existe una validación de negocio reutilizable que rechace cadenas vacías, fechas inválidas o fechas no normalizadas si la acción se crea por otro canal. Más importante, la acción solo se guarda en el objeto de evaluación/localStorage: no se incluye en `serverPayload` y no existe tabla/endpoint de plan en `server/index.js`. La creación no produce una operación persistida, auditable y compartida en el servidor.

### Corrección exacta necesaria

1. Implementar `validarAccionPlan({rec, desc, resp, fecha})` en frontend y backend: exigir recomendación aprobada perteneciente a la evaluación, descripción no vacía, responsable no vacío y fecha ISO válida.
2. Crear tabla `acciones_mejora` con `id`, `evaluacion_id`, `recomendacion_id`, descripción, responsable, fecha límite, estado, avance, usuario creador, timestamps y auditoría.
3. Crear `POST /api/recomendaciones/:id/acciones` y `GET/PATCH /api/evaluaciones/:id/acciones`; el backend debe rechazar acciones para recomendaciones no aprobadas o inexistentes.
4. Incluir acciones en el payload/lectura sincronizada y conservar la regla de “una acción por recomendación” solo si es decisión de producto; si se desea permitir varias acciones, reemplazar el bloqueo `!acc` por una colección explícita.

### Prueba requerida

- Intentar crear acción sin responsable, sin fecha, con fecha inválida y con recomendación pendiente/descartada: cada caso debe ser rechazado por interfaz y API.
- Crear acción válida sobre una recomendación aprobada y verificar asociación, estado inicial `pendiente` y avance `0`.
- Verificar que una recomendación aprobada sin acción siga siendo válida y que una descartada no exponga el botón de conversión.
- Recargar navegador y recuperar desde servidor/otro usuario; comprobar que la acción siga presente y auditada.

---

## RF28 — Seguimiento del plan de mejora

**Estado: Parcial.**

### Requisito auditado

Cada acción debe admitir `pendiente`, `en curso` o `cumplida`, porcentaje de avance, cierre del plan cuando todas estén cumplidas y marca de acciones vencidas sin cumplir.

### Evidencia concreta

- `js/app.js:294`: `atrasada(a)` retorna verdadero cuando `a.estado !== 'cumplida' && a.fecha < today()`.
- `js/app.js:295`: `planPill(ev)` muestra `Plan cerrado` cuando todas las acciones son `cumplida`; en caso contrario muestra `Plan abierto`.
- `js/app.js:299–300`: la tabla ofrece el selector de estados `pendiente`, `en curso`, `cumplida` y marca visual `Atrasada` cuando corresponde.
- `js/app.js:301`: muestra control de avance de la acción.
- `js/app.js:403–405`: cambios de estado y avance actualizan la acción; avance 100 fuerza `cumplida`, avance entre 1 y 99 fuerza `en curso`, y al marcar cumplida se fija avance en 100.
- `js/app.js:304–307` y `app.js:478–485`: la vista global y el dashboard cuentan acciones vencidas no cumplidas y muestran alerta local.
- `js/app.js:437–440`: los cambios se conservan en `localStorage`.

### Brecha

La aplicación no cambia el valor de `a.estado` a `atrasada`; solo deriva y pinta una insignia. Esto puede considerarse cumplimiento visual, pero no es un estado consultable ni persistible para reportes, filtros o API. No hay validación de que el avance sea un número entre 0 y 100 en el handler (`+el.value` acepta valores fuera de rango si se fuerza el evento), ni control de transición/concurrencia en servidor. Tampoco hay persistencia de acciones en SQLite: `serverPayload` omite `acciones` y `server/index.js` solo persiste la evaluación, evidencias y bitácora general.

### Corrección exacta necesaria

1. Validar y normalizar avance en frontend y backend a rango entero/decimal `0–100`; rechazar NaN y valores fuera de rango.
2. Derivar `atrasada` de forma única en backend con fecha ISO y zona horaria definida, o persistir `estado_operativo='atrasada'` como estado derivado, sin perder el estado de flujo (`pendiente/en curso/cumplida`).
3. Crear endpoint `PATCH /api/acciones-mejora/:id` con control de autorización, timestamps, usuario que actualiza y auditoría.
4. Exponer resumen de plan (`abierto/cerrado`, total, cumplidas, vencidas, avance) desde servidor; el cierre debe calcularse como “todas las acciones existentes cumplidas” y tratar un plan sin acciones como “sin plan”, no como cerrado.
5. Añadir control de concurrencia/versionado para evitar que dos usuarios sobrescriban avances.

### Prueba requerida

- Crear acciones con avance 0, 1, 99 y 100 y verificar estados esperados.
- Intentar avance `-1`, `101`, vacío y texto por UI/API: debe rechazarse.
- Con una acción no cumplida y fecha anterior al día actual, verificar marca/consulta `atrasada`; al pasar a cumplida, debe desaparecer la marca y quedar avance 100.
- Con varias acciones, comprobar que el plan permanece abierto hasta que todas estén cumplidas; luego muestra cerrado.
- Verificar que el estado y avance sobrevivan a recarga, otro navegador y lectura desde API.

---

## Comprobación de metodología ICA y matriz de indicadores

### Resultado de la matriz original

La hoja `Matriz de Indicadores` del XLSX original fue leída con Python (`openpyxl`). Resultado: 48 filas × 7 columnas; 35 filas de indicadores clasificadas como MBR 14, MBA 11 y MBG 10. El catálogo de `js/data.js` también declara 35 indicadores y conserva esos tres grupos. Esto coincide con la metodología ICA, págs. 8 y 16.

### Reglas ICA comprobadas que soportan RF25–RF28

- **Ponderación:** `app.js:9` usa MBA 60, MBR 25 y MBG 15 para `>=200` aves; MBA 70, MBR 30 y MBG 0 para `<200`. Coincide con Tabla 1, pág. 11, y RF11.
- **Clasificación:** `data.js:43` usa Excelente 90, Alto 75, Medio 50 y Bajo 0; coincide con Tabla 2, pág. 11.
- **Muestra:** `app.js:10` usa 2 corrales/9 puntos para `>=200` y 1/5 para `<200`; `app.js:251–252` muestra 10 aves por punto. La validación `app.js:27–31` exige cantidad, semilla, bioseguridad y neutralidad; el backend `server/index.js:162–165` repite el bloqueo. Esto es coherente con Tabla 3 y el proceso ICA por fases, aunque RF25–RF28 no deben alterar la muestra.
- **Aplicabilidad:** `app.js:11–16` y `data.js` aplican MBA/MBR/MBG, sistema piso/jaula y umbrales de tamaño; la evaluación conserva snapshot (`app.js:55–58`).
- **Promedio:** `app.js:19–24` promedia muestras y pondera grupos; las recomendaciones se generan después del diagnóstico y no modifican `ev.res`.
- **Proceso ICA:** `app.js:205` expone apertura, inspección y cierre; `app.js:365` genera selección; `app.js:368–369` bloquea cierre hasta completar controles. La metodología describe estas fases en págs. 11–12.

### Observación normativa relevante

La metodología ICA define métodos de observación, entrevista y revisión documental, escalas 100/55/0 o binarias según ficha y la calificación final. No prescribe prioridades Alta/Media/Baja, edición de recomendaciones ni seguimiento de acciones. Por tanto, RF25–RF28 son funcionalidades de gestión del producto: deben usar el diagnóstico ICA como entrada, preservar el resultado y dejar trazabilidad de cualquier decisión humana. No debe presentarse la priorización como una regla oficial ICA.

## Conservación del formato visual

No se requirió ni realizó cambio visual. La evidencia existente conserva el sistema de diseño en `css/styles.css` (`.panel`, `.pill`, `.rec`, `.plan`, tablas y responsive) y las vistas de recomendaciones/plan usan esas clases (`app.js:274–307`). La corrección recomendada es de modelo de datos, API, validación y sincronización; debe implementarse sin sustituir esas clases ni alterar la navegación o la composición visual actual.

## Plan de mejora técnico priorizado

1. **Persistencia de dominio:** añadir tablas/endpoints de recomendaciones y acciones; sincronizar lectura/escritura con SQLite y auditoría.
2. **Integración IA real:** conectar `ACT.genrecs` al endpoint, manejar 503/timeout/reintento y conservar fallback local claramente rotulado.
3. **Validación de negocio:** validar origen aprobado, texto, responsable, fecha, estados y avance en backend, no solo mediante HTML.
4. **Trazabilidad y concurrencia:** guardar usuario, timestamps, versión y eventos de decisión/actualización.
5. **Pruebas automatizadas:** cubrir orden RF25, edición RF26, restricciones RF27, transiciones/vencimiento RF28 y recuperación multiusuario.
6. **Presentación:** mantener las clases visuales actuales y añadir solo campos/insignias nuevas si el producto decide exponer estado atrasado explícito.

## Conclusión

El bloque RF25–RF28 es demostrable en el prototipo local y no rompe el formato visual de EvalCodorniz. La clasificación correcta para una auditoría de producto unificado es: **RF25 Implementado; RF26 Parcial; RF27 Parcial; RF28 Parcial**. La principal corrección exacta es llevar recomendaciones y acciones desde `localStorage`/memoria a un modelo persistente de servidor, con validación, permisos, auditoría y pruebas de integración; la metodología ICA y la matriz de 35 indicadores deben permanecer como fuente del diagnóstico, no mezclarse con la lógica de priorización y seguimiento.
