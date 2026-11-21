# Auditoría exacta del bloque RF37–RF40 — EvalCodorniz unificado

**Fecha de auditoría:** 2026-11-06  
**Alcance:** catálogos, niveles de calificación, bitácora y notificaciones.  
**Restricción aplicada:** no se modificaron archivos del proyecto. Se revisaron directamente `js/app.js`, `js/data.js`, `server/index.js`, `index.html`, `css/styles.css`, la auditoría previa, la validación QA previa, la metodología ICA PDF, el documento de requisitos y la matriz XLSX.

## Dictamen ejecutivo

El bloque RF37–RF40 está **parcialmente implementado como prototipo local**. La interfaz conserva el formato visual de EvalCodorniz: `index.html` sigue cargando `css/styles.css`, y las vistas usan el mismo shell, paneles, tablas, pestañas, `pill`, avisos y variables visuales existentes (`index.html:10-16`, `css/styles.css:1-155`). No se observan cambios visuales requeridos para el bloque.

- **RF37 Gestión de catálogos:** **Parcial**. Hay edición local de cuatro catálogos/configuraciones, pero no hay municipios, estados del plan ni inactivación protegida; además, los valores editados no se conectan de forma general a los formularios y no se persisten en el servidor.
- **RF38 Gestión de niveles:** **Parcial**. Hay edición local y validación básica de orden, pero no se garantiza cobertura completa 0–100, no hay versionado persistente de rangos ni snapshot de niveles por evaluación.
- **RF39 Bitácora:** **Parcial**. Hay bitácora visual de solo lectura y auditoría append-only en SQLite para operaciones backend, pero el flujo principal usa memoria/`localStorage`, el usuario puede alterar el registro local y no existe consulta frontend de la auditoría server-side.
- **RF40 Notificaciones:** **Parcial**. Existen avisos dentro de la interfaz para evaluaciones en progreso y acciones vencidas; no existe aviso anticipado configurable, centro persistente de notificaciones ni envío por correo/push. El envío externo requiere servicio adicional.

La evidencia normativa queda consistente en lo esencial: la metodología ICA establece 35 indicadores agrupados en MBA/MBR/MBG, cuatro niveles finales y reglas de ponderación/muestra; la matriz contiene 35 indicadores (11 MBA, 14 MBR, 10 MBG) y el código conserva esos grupos y escalas. Las brechas RF37–RF40 no invalidan por sí mismas el cálculo ICA ya implementado, pero sí impiden afirmar administración parametrizable, trazabilidad y notificación operativas de producción.

## Fuentes normativas y de diseño comprobadas

1. **Metodología ICA:** `/home/ubuntu/projects/coornices-8f1eef12/Metodologia-EBA-Codornices_30JL.pdf`, versión 1.0 (2024). En las páginas 8–10 se describen las medidas MBA/MBR/MBG, la escala 100/55/0 cuando aplica, los métodos documental/visual y la evaluación integral. Las páginas 29–35 incluyen las tablas documentales 30–39, incluido el caso de agua con 100/55 y BPUMV con 100/50/0.
2. **Requisitos:** `/home/ubuntu/projects/coornices-8f1eef12/EvalCodorniz_Requerimientos (2).docx`, páginas 9–10 para RF37–RF40. Exige valores de catálogo inactivos en vez de eliminados si están en uso; niveles sin solapamientos ni huecos, precargados con Tabla 2; bitácora con usuario, fecha, hora, acción y sin edición/borrado; y alertas anticipadas para acciones próximas a vencer.
3. **Matriz:** `/home/ubuntu/projects/coornices-8f1eef12/EvalCodorniz_Matriz (2).xlsx`, hoja `Matriz de Indicadores`, 48 filas × 7 columnas. Confirma 35 indicadores: MBR 14, MBA 11 y MBG 10; ponderaciones 70/30/0 para menos de 200 aves y 60/25/15 para 200 o más; niveles Excelente/Alto/Medio/Bajo; y escalas específicas 100/55/0, 100/0, 100/55 y 100/50/0.
4. **Requisitos de visualidad:** `index.html:10-16` carga `css/styles.css`; `css/styles.css:1-155` define el sistema visual conservado. Las nuevas brechas indicadas aquí se resuelven en lógica/persistencia y no requieren rediseño visual.

## Auditoría por requisito

### RF37 — Gestión de catálogos

**Estado:** **Parcial**

**Requisito normativo/funcional comprobado:** El administrador debe crear y editar departamentos, municipios, grupos etarios, estados del plan de mejora, formatos y tamaño máximo de evidencia. Un valor en uso no se elimina: se inactiva. Los valores inactivos no deben aparecer en registros nuevos.

**Evidencia concreta:**

- `js/app.js:309` define `ICA_CONFIG.catalogos` con `departamentos`, `grupos`, `formatos` y `maxEvidenceMB`; no define municipios ni estados del plan.
- `js/app.js:329` muestra edición de esos cuatro valores y botón `saveConfig`.
- `js/app.js:375` actualiza `ICA_CONFIG`, valida únicamente el rango numérico por HTML/valor leído y guarda el objeto en `localStorage` bajo `evalcodorniz_config`.
- `js/app.js:437-440` persiste el estado general en `localStorage`, pero no persiste `ICA_CONFIG` dentro de la copia general ni lo sincroniza con el backend.
- `js/data.js:45` mantiene un catálogo separado `DEPTOS`, utilizado por el dashboard (`app.js:126`), mientras que el formulario de finca usa opciones propias; por tanto, editar `ICA_CONFIG.catalogos.departamentos` no garantiza que los formularios nuevos utilicen el catálogo editado.
- `js/app.js:300` hardcodea los estados del plan como `pendiente`, `en curso`, `cumplida`; no provienen de catálogo editable.
- `js/server/index.js:26-79` crea tablas de usuarios, predios, evaluaciones, evidencias y auditoría, pero no una tabla de catálogos ni estados/versiones de catálogo.
- `js/server/index.js:150-158` acepta municipio como texto, sin catálogo/inactivación server-side.

**Brecha:**

1. Faltan dos catálogos requeridos: municipios y estados del plan de mejora.
2. La edición no modela estado activo/inactivo, fecha, identificador ni uso por registros existentes; cualquier valor se reemplaza en bloque por texto local.
3. No existe protección contra eliminar/alterar un valor en uso.
4. El catálogo editado no es la fuente única de opciones de registros nuevos: hay constantes paralelas (`DEPTOS`) y estados hardcodeados.
5. La afirmación visual “se guardan en el servidor” de `app.js:329` no corresponde a la implementación actual; solo se usa `localStorage` para esta configuración.
6. No hay persistencia multiusuario, control de concurrencia ni versionado de catálogos.

**Corrección exacta necesaria:**

- Crear en backend tablas `catalogos` y `catalogo_valores` o una estructura equivalente con: `catalogo`, `codigo`, `etiqueta`, `activo`, `created_at`, `updated_at`, `version` y usuario modificador.
- Incluir catálogos `departamentos`, `municipios`, `grupos_etarios`, `estados_plan`, `formatos_evidencia` y `limite_evidencia`.
- Implementar endpoints autenticados de lectura de valores activos para nuevos registros y endpoints administrativos de alta, edición e inactivación. Rechazar eliminación física o inactivación de un valor si rompe integridad referencial sin conservar su etiqueta histórica.
- Reemplazar en los formularios y filtros las constantes paralelas (`DEPTOS`, estados hardcodeados y listas equivalentes) por una fuente `catalogosActivos` cargada del backend, con fallback local únicamente cuando el backend esté fuera de servicio.
- Guardar en cada evaluación el snapshot de catálogos que afecten su interpretación, o al menos códigos/etiquetas/versiones junto con la evaluación. No cambiar el shell visual: reutilizar las tablas, formularios y paneles existentes.

**Prueba de aceptación:**

1. Como administrador, crear un municipio y un estado de plan; verificar que aparecen en un registro nuevo sin recargar manualmente constantes.
2. Usar un municipio en una finca y comprobar que la API rechaza eliminación física/inactivación destructiva y conserva el valor en históricos.
3. Inactivar el valor y comprobar que desaparece de formularios nuevos, pero permanece visible en la finca/evaluación histórica.
4. Abrir dos sesiones/usuarios y comprobar que el cambio se ve en ambas después de leer la API.
5. Desconectar servidor: comprobar que se mantiene el formato visual y aparece un aviso claro de modo local, sin presentar la configuración local como guardada en servidor.

### RF38 — Gestión de niveles de calificación

**Estado:** **Parcial**

**Requisito normativo/funcional comprobado:** Configurar rangos finales sin solapamientos ni puntajes sin nivel; precargar Tabla 2 ICA — Excelente ≥90, Alto ≥75 y <90, Medio ≥50 y <75, Bajo <50—; y asegurar que cambiar rangos no afecte evaluaciones cerradas.

**Evidencia concreta:**

- `js/data.js:43` precarga `NIVELES` como Excelente 90, Alto 75, Medio 50, Bajo 0.
- `js/app.js:309` duplica esos rangos en `ICA_CONFIG.niveles`.
- `js/app.js:322-325` presenta Tabla 2, además de Tabla 1 y Tabla 3 ICA; los valores visibles son correctos.
- `js/app.js:7` clasifica mediante `nivelDe(x) => NIVELES.find(l => x >= l.min)`.
- `js/app.js:375` rechaza valores fuera de 0–100 y exige que cada mínimo posterior sea menor que el anterior; esto evita solapamientos en el orden esperado.
- La misma función no exige que el último mínimo sea 0, ni comprueba formalmente continuidad/cobertura completa de 0 a 100.
- `js/app.js:56` guarda en `snapshot` indicadores, pesos y muestreo, pero no guarda los rangos de `NIVELES`/`ICA_CONFIG.niveles`.
- `js/app.js:59` calcula y almacena `ev.nivel` al cerrar, por lo que la etiqueta de una evaluación ya cerrada permanece en memoria/localStorage; no hay historial de qué versión de rango la produjo.
- `js/server/index.js:44-56` no contiene columnas/tablas para niveles, versiones o snapshot de niveles.

**Brecha:**

1. La validación es de orden, no de cobertura: permite, por ejemplo, modificar el mínimo de Bajo a 10 y dejar 0–9 sin nivel.
2. Los rangos son local-only y globales; no hay registro de quién/cuándo/version de configuración.
3. El snapshot por evaluación no incluye niveles, aunque el requisito exige que cambios de RF38 no afecten cerradas.
4. La estabilidad de cerradas depende de que `ev.nivel` ya esté guardado, no de una política de versionado verificable; recalcular con `nivelDe` puede usar rangos actuales en otros flujos.

**Corrección exacta necesaria:**

- Validar que los rangos formen una partición completa: mínimos ordenados descendientemente, primer mínimo dentro de 0–100, último mínimo exactamente 0, sin duplicados, y que toda puntuación decimal de 0 a 100 pertenezca a un intervalo.
- Persistir `niveles_calificacion` y `nivel_version` en backend, con auditoría del cambio y control administrativo.
- Al crear una evaluación, guardar en `snapshot` los cuatro rangos completos y `nivel_version`; al cerrar, guardar también el rango/nivel aplicado en el resultado.
- Clasificar evaluaciones cerradas desde el snapshot/resultados persistidos, nunca desde la configuración vigente.
- Mantener la UI actual de Tabla 2 y el mismo estilo; solo agregar mensajes de validación y versión.

**Prueba de aceptación:**

1. Intentar guardar mínimos `90,75,50,10`: debe rechazarse por dejar 0–9 sin nivel.
2. Guardar los valores ICA `90,75,50,0`: debe aceptarse.
3. Crear una evaluación y verificar que el snapshot contiene rangos y versión.
4. Cambiar luego Excelente a 95 y comprobar que una evaluación cerrada creada con 90 conserva su nivel original, mientras una nueva usa 95.
5. Consultar desde otro usuario/dispositivo y verificar que la configuración no depende de `localStorage` del navegador.

### RF39 — Bitácora de auditoría

**Estado:** **Parcial**

**Requisito normativo/funcional comprobado:** Registrar acciones relevantes con usuario, fecha, hora y acción; ningún rol puede editar o borrar bitácora.

**Evidencia concreta:**

- `js/app.js:49` define `log(accion, detalle)` y antepone objetos `{f,u,accion,detalle}` a `S.log`; `f` usa `toLocaleString('es-CO')`, por lo que contiene fecha y hora local.
- `js/app.js:346-350` muestra `S.log` en una tabla descrita como “solo lectura”; no hay botones de edición/borrado en la vista.
- Se registran eventos en `app.js:361-375`, `app.js:386-405`: creación/cambio de finca, usuarios, evaluación, selección de muestra, guardado, cierre, forma, recomendaciones, acciones, configuración y roles.
- `js/app.js:437-440` persiste la bitácora en `localStorage`; `app.js:456-464` la restaura desde allí. Un usuario con acceso al navegador puede modificarla o eliminarla.
- `js/server/index.js:70-78` crea tabla `auditoria` con `usuario_id`, `accion`, `entidad`, `entidad_id`, `detalle_json`, `created_at`; `server/index.js:123-124` inserta mediante `audit()`.
- `server/index.js:134` audita login; `143-144` alta de usuario; `154` alta de predio; `169` creación de evaluación; `189` carga de evidencia; `213` generación IA.
- No hay endpoint `GET /api/auditoria` ni función frontend que consulte la tabla server-side. Tampoco todos los cambios del frontend local se garantizan en la tabla backend.
- `server/index.js:123` no ofrece endpoint de UPDATE/DELETE de auditoría, lo cual favorece append-only server-side, pero no impide que un administrador de la base SQLite altere el archivo fuera de la aplicación.

**Brecha:**

1. La bitácora mostrada al administrador no es la auditoría server-side: es un arreglo local mutable.
2. No existe consulta paginada/filtrable de auditoría persistida en SQLite.
3. El registro local no tiene timestamp ISO, zona explícita ni identificador único/hash de integridad.
4. Las acciones de configuración, niveles y varios cambios de UI no quedan necesariamente en backend.
5. La cobertura de acciones relevantes no está centralizada; depende de que cada handler llame manualmente a `log()`.

**Corrección exacta necesaria:**

- Crear `GET /api/auditoria` protegido para `admin`, con filtros por usuario, acción, entidad y fechas, paginación y orden por `created_at DESC`.
- Hacer que la vista `bitacoraView()` consuma la API y use `S.log` solo como fallback offline claramente etiquetado.
- Enviar al backend los cambios de parametrización, niveles, catálogos, recomendaciones, acciones, creación/cierre de evaluaciones y autenticación mediante una función única `audit()` server-side.
- Registrar timestamp UTC ISO, zona/origen, entidad, entidad_id, usuario autenticado, detalle JSON y un identificador/hash encadenado opcional para detectar alteraciones.
- No exponer endpoints de edición/borrado; aplicar permisos de base de datos y retención. Mantener el `tablewrap`/tabla visual actual.

**Prueba de aceptación:**

1. Ejecutar login, creación/cierre de evaluación, cambio de nivel, alta/inactivación de catálogo y edición de recomendación; verificar un evento por acción en `GET /api/auditoria`.
2. Intentar `PUT`/`DELETE` sobre auditoría como cualquier rol: debe devolver 404/405/403 y no alterar filas.
3. Cambiar `localStorage` y comprobar que la bitácora online no cambia.
4. Verificar usuario, fecha/hora UTC, acción, entidad y detalle en cada evento.
5. Con servidor caído, mostrar fallback local como provisional y sincronizar eventos pendientes con deduplicación cuando vuelva la conexión.

### RF40 — Notificaciones

**Estado:** **Parcial**

**Requisito normativo/funcional comprobado:** Alertas dentro del sistema para acciones próximas a vencer y evaluaciones pendientes por cerrar; la alerta debe anticiparse a la fecha límite y desaparecer al cumplir la acción.

**Evidencia concreta:**

- `js/app.js:294` define `atrasada(a)` como acción no cumplida cuya fecha es menor que `today()`.
- `js/app.js:299-301` marca una acción vencida con la etiqueta visual `Atrasada`.
- `js/app.js:304-307` muestra en Planes de mejora el conteo de acciones vencidas sin cumplir.
- `js/app.js:478-485` calcula `overdue` y `at` (evaluaciones en progreso), y muestra un aviso local en Reportes: “Alertas locales”.
- `js/app.js:485` indica que las alertas desaparecen al cerrar la evaluación o cumplir la acción; la segunda parte sí se deriva de `estado==='cumplida'`.
- No existe cálculo de “próxima a vencer” con umbral anticipado configurable; solo se notifica después del vencimiento.
- No hay entidad persistente `notificaciones`, estado leído/no leído, fecha de emisión, destinatario, preferencia o canal.
- `js/server/index.js:25-79` no crea tabla/cola de notificaciones; no hay endpoint de notificaciones, correo, push, tarea programada ni webhook.
- `server/index.js:199-215` es un endpoint de recomendaciones IA, no un servicio de notificaciones y no puede cubrir RF40.

**Brecha:**

1. La alerta llega tarde: `a.fecha < today()` solo detecta vencidas, no próximas a vencer.
2. No hay anticipación configurable ni valor por defecto documentado (por ejemplo, 7 días).
3. Las alertas no se guardan ni se asocian a evaluador/docente; desaparecen o se recalculan solo al renderizar.
4. No hay bandeja, lectura/descartar, deduplicación ni historial.
5. No hay correo/push. Esto último es una dependencia de servicio externo, pero el requisito mínimo de aviso in-system tampoco está completo.

**Corrección exacta necesaria:**

- Añadir configuración `diasAvisoVencimiento` (por ejemplo, 7) en backend y UI administrativa, con validación de entero no negativo.
- Crear una función determinista `notificacionesPendientes()` que genere alertas cuando `estado !== 'cumplida'` y `fecha` esté entre hoy y hoy + `diasAvisoVencimiento`, además de alertas separadas para evaluaciones `en progreso`.
- Persistir notificaciones o, como mínimo, una clave de deduplicación por acción/fecha/usuario; guardar `tipo`, `entidad_id`, `destinatario`, `emitida_en`, `leida_en` y `estado`.
- Retirar/archivar la alerta de acción al marcarla cumplida; conservar historial si la trazabilidad lo requiere.
- Añadir, si se requiere fuera de la interfaz, un servicio externo de correo/push o job scheduler. El estado de esa integración debe ser “Requiere servicio externo” hasta configurar credenciales, plantillas, reintentos y pruebas de entrega.
- Reutilizar el aviso `.notice.warn` y la tabla existente para conservar el formato visual de EvalCodorniz.

**Prueba de aceptación:**

1. Configurar anticipación de 7 días y crear una acción con fecha de hoy + 5: debe aparecer como “Próxima a vencer”.
2. Crear acción con fecha de hoy + 10: no debe aparecer todavía.
3. Pasar una acción a `cumplida`: la alerta activa debe desaparecer sin borrar el registro histórico.
4. Dejar una evaluación en progreso: debe aparecer aviso persistente para el evaluador/docente autorizado.
5. Recargar, cambiar de usuario y abrir otro navegador: las alertas deben conservar destinatario/estado y no depender de memoria local.
6. Si se habilita correo/push, simular fallo del proveedor y comprobar reintento, no duplicación y estado de entrega; sin proveedor, el sistema debe declarar explícitamente que solo ofrece alerta interna.

## Comprobación de metodología ICA y matriz de indicadores

### Consistencias verificadas

- **Catálogo:** `data.js:3-39` contiene 35 elementos; `GROUPS` en `data.js:41` define MBA/MBR/MBG. La matriz XLSX confirma 14 MBR, 11 MBA y 10 MBG.
- **Ponderaciones:** `app.js:9-10` usa 70/30/0 para menos de 200 y 60/25/15 para 200 o más; `app.js:320-321` lo muestra. Esto coincide con Tabla 1 y RF11.
- **Niveles:** `data.js:43` y `app.js:322-323` contienen Excelente ≥90, Alto ≥75, Medio ≥50, Bajo desde 0; la presentación de intervalos coincide con Tabla 2.
- **Muestra:** `app.js:10`, `app.js:27-29` y `app.js:324-325` usan 1 corral/5 puntos/50 aves para <200 y 2 corrales/9 puntos/90 aves para ≥200, 10 aves por punto. `server/index.js:162-165` repite la validación.
- **Aplicabilidad:** `app.js:11-16` y la carga de indicadores excluyen MBG bajo 200, restringen MBA10 a >200, MBR4 a jaula, MBR14 a piso y MBR3 a piso; coincide con el documento de requisitos y la matriz aplicada al sistema.
- **Escalas:** `data.js:4-38` preserva las escalas específicas de la matriz, incluyendo MBG1 100/55 y MBG10 100/50/0.

### Observaciones de control normativo

1. La metodología ICA de páginas 8–10 indica que los predios con menos de 200 animales no evalúan MBG, y que la evaluación combina indicadores MBA, MBR y MBG; el código lo respeta.
2. La metodología describe la inspección documental como aplicable a predios de más de 1.000 aves; los requisitos y el código mantienen esa condición para campos documentales especiales. RF37–RF40 no deben modificar esa lógica.
3. El catálogo y la matriz son consistentes en conteo y grupos. La matriz describe MBR3 de forma amplia como “Piso y jaula” en la columna de grupo productivo, pero su método dice “solo en corral o galpón en piso”; el código aplica la restricción de piso, que es la interpretación operativa correcta para la ficha.
4. El valor final de una evaluación cerrada queda congelado en `ev.res`/`ev.nivel`, pero el requisito de RF38 exige una garantía de versión/snapshot; por eso RF38 permanece Parcial hasta guardar rangos y versión explícitamente.
5. La auditoría previa y la validación QA ya advertían que RF37–RF38 eran locales/parciales, RF39 local y RF40 limitada a vencimientos; la inspección directa confirma esas conclusiones y añade la brecha concreta de catálogos no conectados a formularios y ausencia de endpoint de auditoría.

## Orden recomendado de corrección

1. **Primero RF38 y RF39:** versionar niveles y hacer que la bitácora consultada sea server-side; afectan integridad del resultado y trazabilidad.
2. **Después RF37:** normalizar catálogos, inactivación e integridad histórica; eliminar fuentes paralelas/hardcodeadas.
3. **Después RF40 interna:** anticipación configurable, persistencia/deduplicación y estados leída/cumplida.
4. **Finalmente servicio externo opcional:** correo/push con proveedor institucional, credenciales, reintentos y pruebas de entrega. No debe sustituir la alerta interna.

## Resumen de estados

| RF | Estado | Conclusión breve |
|---|---|---|
| RF37 | Parcial | Edición local de algunos valores; faltan catálogos, inactivación, uso efectivo en formularios y servidor. |
| RF38 | Parcial | Rangos ICA y edición local presentes; falta cobertura total, versión y snapshot de rangos. |
| RF39 | Parcial | Bitácora visual local y auditoría backend parcial; falta consulta central, cobertura total e inmutabilidad verificable para el flujo principal. |
| RF40 | Parcial | Avisos locales de pendientes/vencidas; falta anticipación, persistencia y canales externos. |

**Conclusión final:** EvalCodorniz conserva su formato visual y la base de cálculo ICA/matriz comprobada, pero el bloque RF37–RF40 no debe declararse completamente implementado hasta separar claramente el fallback local del sistema persistente, agregar versionado/inactivación y garantizar alertas anticipadas y trazabilidad centralizada.
