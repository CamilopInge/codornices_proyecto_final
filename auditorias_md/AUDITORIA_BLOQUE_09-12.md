# Auditoría exacta del bloque RF09–RF12 — EvalCodorniz unificado

**Fecha de auditoría:** 2026-11-06  
**Alcance:** parametrización de especie, criterios de evaluación, ponderaciones y tipos de respuesta.  
**Restricción aplicada:** no se modificaron archivos del proyecto; solo se creó este informe.

## 1. Fuentes inspeccionadas

Se leyeron directamente:

- `/home/ubuntu/evalcodorniz-work/js/data.js`
- `/home/ubuntu/evalcodorniz-work/js/app.js`
- `/home/ubuntu/evalcodorniz-work/server/index.js`
- `/home/ubuntu/evalcodorniz-work/index.html`
- `/home/ubuntu/evalcodorniz-work/css/styles.css`
- `/home/ubuntu/evalcodorniz-work/AUDITORIA_NORMATIVA_ICA_COMPLETA.md`
- `/home/ubuntu/evalcodorniz-work/VALIDACION_NORMATIVA_ICA_Y_QA.md`
- `/home/ubuntu/projects/coornices-8f1eef12/Metodologia-EBA-Codornices_30JL.pdf`
- `/home/ubuntu/projects/coornices-8f1eef12/EvalCodorniz_Requerimientos (2).docx`
- `/home/ubuntu/projects/coornices-8f1eef12/EvalCodorniz_Matriz (2).xlsx`

### Referencia normativa aplicada

La metodología ICA 2024 exige, en las páginas 10–13 y Tablas 1–4, que:

- Las fichas tengan descripción/pregunta/método/escala y que los indicadores se agrupen en MBA, MBR y MBG.
- La calificación de indicadores con muestreo use 100/55/0 por ave o recurso y se promedie; los indicadores visuales sin muestreo o documentales se lleven directamente a 100/0, salvo escalas expresamente definidas en sus fichas.
- La Tabla 1 use MBA/MBR/MBG = 60/25/15 para población ≥200 y 70/30/0 para población <200.
- La Tabla 2 use Excelente ≥90; Alto ≥75 y <90; Medio ≥50 y <75; Bajo <50.
- La Tabla 3 use, para <200, 1 corral/galpón, 5 puntos y 10 aves por punto; para 201 o más, 2 corrales/galpones, 9 puntos y 10 aves por punto. El requisito del proyecto agrega explícitamente que 200 exactas se tratan como ≥200.
- La inspección documental se aplica a predios de más de 1.000 aves y exige documentos legibles, sin correcciones/agregados y firmados; cuando corresponda, la firma debe ser de MV/MVZ/Z con matrícula COMVEZCOL vigente.
- Las Tablas 30–39 definen las escalas documentales: MBG1 100/55; MBG2–MBG9 100/0; MBG10 100/50/0.

## 2. Comprobación de la matriz de indicadores

El XLSX original contiene 35 filas de indicadores calificables. La extracción y comparación contra `IND` en `data.js` dio:

- **35/35** indicadores presentes.
- **MBA 11/11**, **MBR 14/14**, **MBG 10/10**.
- Escalas en JS: **23 indicadores 100/55/0**, **10 indicadores 100/0**, **1 indicador 100/55** y **1 indicador 100/50/0**.
- La coincidencia por nombre, grupo, pregunta y método es consistente en el catálogo; la única alerta automática por nombre fue una ambigüedad no material: “Calidad del agua de bebida” existe una vez en MBR8 y otra en MBG1, por lo que una comparación por nombre sin código puede asociar la fila equivocada. El código sí las distingue por `MBR8` y `MBG1`.
- La matriz XLSX y `data.js` no son un sistema de configuración versionado: el XLSX es fuente estática y `IND` es un arreglo literal cargado en tiempo de ejecución.

## 3. Resultado por requisito

### RF09 — Parametrización de especie

**Estado: Parcial.**

**Evidencia concreta:**

- `js/data.js:3–39` define `IND` con 35 fichas; `IX=Object.fromEntries(IND.map(...))` en la línea 40 indexa por código.
- `js/data.js:41–42` define exactamente los grupos `MBA`, `MBR`, `MBG` y sus nombres.
- `app.js:152–153` fija la especie como `Codorniz (Coturnix coturnix)` y deshabilita el campo; no ofrece especies alternativas.
- `app.js:310–318` muestra “Indicadores (35)” y los filtros por grupo, pero `app.js:311` declara expresamente: “En este prototipo se muestra en modo consulta”.
- `app.js:54–58` construye el checklist desde `IND` y guarda un snapshot de indicadores, pesos y muestra.

**Lo implementado:** el catálogo activo coincide cuantitativamente con la matriz (35; 11/14/10), está restringido a codorniz y se usa para construir evaluaciones.

**Brecha:** RF09 pide que Docente/Administrador puedan parametrizar el checklist propio de codorniz. No existe alta, edición, inactivación ni reordenamiento de indicadores; no existe persistencia administrativa del catálogo ni versionado formal. `IND` está embebido en código. La pantalla es solo consulta. El snapshot (`app.js:56`) conserva una copia local por evaluación, pero no sustituye una versión administrable del catálogo. Tampoco hay endpoint de catálogo en `server/index.js`; los endpoints existentes persisten usuarios, predios, evaluaciones y evidencias, no `indicadores`/`criterios`.

**Corrección exacta necesaria:** crear una entidad de configuración versionada (por ejemplo `catalogo_versiones` e `indicadores` con código, especie, grupo, nombre, pregunta, método, niveles, tipo, aplicabilidad, activo, vigencia y usuario de cambio), endpoints protegidos para listar/crear/editar/inactivar solo para admin y docente autorizado, y reemplazar la dependencia exclusiva de `IND` por la versión activa. Al crear una evaluación debe copiarse la versión completa, incluido estado y aplicabilidad, y las evaluaciones cerradas deben seguir leyendo su snapshot. Mantener una sola especie activa (`codorniz`) y rechazar configuraciones de otras especies.

**Prueba requerida:**

1. Consultar la matriz: debe devolver 35 indicadores activos, 11/14/10 por grupo.
2. Crear una nueva versión cambiando solo la descripción de un indicador; verificar que una evaluación nueva toma la versión nueva y una evaluación cerrada conserva el texto anterior.
3. Intentar crear una segunda especie o inactivar un indicador utilizado por una evaluación; el servidor debe rechazarlo o conservarlo como histórico.
4. Verificar permisos: consultor/evaluador sin edición; docente/admin con edición; toda operación queda en bitácora.

### RF10 — Parametrización de criterios de evaluación

**Estado: Parcial.**

**Evidencia concreta:**

- Cada objeto de `IND` en `data.js:4–38` contiene `c`, `g`, `n`, `q`, `m` y `l`; esto cubre código, grupo, nombre, pregunta, método y niveles.
- `app.js:314–317` muestra código, indicador, método, tipo de campo, escala y aplicabilidad.
- `app.js:56` guarda `snapshot.indicadores` mediante copia profunda al crear la evaluación.
- `app.js:195` deriva las evaluaciones cerradas a reporte, y `app.js:59` calcula el resultado en el momento de cierre.

**Lo implementado:** el catálogo cargado reproduce la estructura MBA/MBR/MBG y la interfaz presenta las fichas. Los snapshots impiden que un cambio futuro del catálogo afecte directamente el arreglo local de una evaluación ya creada/cerrada.

**Brecha:** no hay editor de criterios, preguntas, métodos, niveles ni aplicabilidad. La vista se limita a consulta. No hay validación administrativa contra la metodología ICA ni workflow de borrador/aprobación/publicación. El servidor no expone almacenamiento de criterios/versiones. Por tanto, el criterio solo puede cambiarse editando código y no se puede demostrar control de cambios desde el sistema.

Además, la comparación por nombre debe tratarse con códigos: “Calidad del agua de bebida” aparece tanto en MBR8 como en MBG1, con métodos y escalas distintos; cualquier importador que use nombre como clave puede mezclar ambos criterios. El código actual sí los separa, pero no existe una validación automatizada de unicidad semántica/correspondencia por código contra la matriz.

**Corrección exacta necesaria:** implementar CRUD versionado de fichas por código inmutable, con validación de campos obligatorios y de escalas permitidas; conservar historial y fecha/usuario de publicación; impedir editar una versión ya usada; exigir aprobación/publicación antes de que sea la versión activa. Importar la matriz mediante código de indicador o asignar códigos estables, nunca por nombre duplicable. Validar que la versión publicada contenga exactamente 35 fichas y los grupos esperados.

**Prueba requerida:**

1. Publicar una versión con cambio de pregunta en `MBR8` y verificar que `MBG1` no cambia.
2. Crear evaluación antes y después de publicar: comparar los snapshots y demostrar inmutabilidad de la evaluación anterior.
3. Intentar publicar una ficha sin pregunta, método o niveles, con escala no permitida o con código duplicado: debe responder 400 y no publicar.
4. Comparar automáticamente el catálogo publicado contra el XLSX: 35 filas, 11/14/10 y coincidencia de pregunta/método/escala por código.

### RF11 — Parametrización de ponderaciones

**Estado: Parcial.**

**Evidencia concreta:**

- `app.js:9` implementa `pesosPara(t)` con `{MBA:60, MBR:25, MBG:15}` si `t>=200` y `{MBA:70, MBR:30, MBG:0}` en caso contrario.
- `app.js:23–24` calcula el aporte ponderado de cada grupo y suma `fin`.
- `app.js:56` guarda los pesos en `ev.pesos` y `snapshot.pesos`.
- `app.js:320–325` presenta Tabla 1 y la regla de corte exacta; `app.js:9` documenta que 200 exactas son ≥200.
- `data.js:43` y `app.js:322–323` implementan los niveles de Tabla 2.

**Lo implementado:** la fórmula base y los cortes normativos están correctamente codificados. El umbral es coherente con el requisito del proyecto: `t>=200`, de modo que 200 exactas reciben 60/25/15, MBG y la muestra grande. El snapshot evita recalcular una evaluación usando pesos futuros.

**Brecha:** RF11 exige asignar/configurar los pesos; en el sistema son constantes hardcoded. La pestaña “Ponderaciones y niveles” (`app.js:319–325`) solo muestra una tabla estática. `saveConfig` (`app.js:375`) únicamente permite editar niveles y catálogos locales, no pesos. No hay endpoint, tabla de parámetros, vigencia, validación de suma 100, aprobación ni versionado de pesos. Por tanto, el cálculo implementa la configuración vigente del código, pero el requisito administrativo de parametrización no está implementado.

**Corrección exacta necesaria:** mover las dos reglas de pesos a una tabla/objeto de configuración versionado, con filas de umbral (`<200`, `≥200`) y pesos por grupo; permitir edición restringida a admin, validar que cada fila sume 100, que no haya pesos negativos y que MBG sea 0 para `<200`; mostrar la configuración activa y guardar en el snapshot el `peso_version_id` y los tres pesos concretos. No permitir alterar la configuración de una evaluación existente.

**Prueba requerida:**

1. Evaluar con 199, 200 y 201 aves; comprobar respectivamente 70/30/0, 60/25/15 y 60/25/15, además de las muestras 1/5/50 y 2/9/90.
2. Intentar guardar pesos que no sumen 100, negativos o con MBG distinto de 0 para `<200`: rechazo 400 en API y mensaje visible en UI.
3. Publicar una nueva ponderación y verificar que solo las evaluaciones nuevas la usan; las existentes conservan `snapshot.pesos`.
4. Recalcular manualmente un caso con promedios de grupo conocidos y comprobar `final = MBA×peso + MBR×peso + MBG×peso` con precisión documentada.

### RF12 — Parametrización de tipos de respuesta

**Estado: Parcial alto.**

**Evidencia concreta:**

- `app.js:17` deriva el tipo de respuesta por reglas hardcoded: `docpct` para MBA10, `docmix` para MBR8, `ratio` para MBR7/MBR10, `dens` para MBR13/MBR14, `doc` para MBG, `pct` para `PCT`, y `scale` para el resto.
- `data.js:47–51` define umbrales para MBA1, MBA2, MBA10 y MBA11.
- `app.js:223–240` renderiza porcentaje, densidad/fórmula, razón numérica, selección única, carga documental y campos combinados.
- `app.js:408–415` procesa radio, porcentaje, mortalidad, razones, fórmulas, muestras y metadatos documentales.
- `data.js:4–38` conserva las escalas reales del catálogo, incluyendo MBR13/14 100/0, MBG1 100/55 y MBG10 100/50/0.

**Lo implementado:** el prototipo soporta las familias funcionales exigidas: selección de escala 2/3 niveles, porcentaje con umbral, número con umbral, fórmula ICA, carga documental y combinaciones visual/documental. La matriz de escalas está reflejada correctamente en los radios. MBR7 aplica 100/55/0 con límite y exceso de 30%; MBR10 distingue límite/competencia; MBR13 usa `CJ=AT/TA`, `IG=AJ/TG`, `D=(CJ+IG)/2` y umbral 55; MBR14 usa `TG/AU`; MBA1/2 usan 40/60%; MBA10 usa 12/14%; MBA11 usa >90% y 70–89% según código.

**Brechas:**

1. El tipo no es parametrizable: `tipo()` está fijo en código y no existe editor ni persistencia de tipos por indicador. La UI de parametrización es solo consulta.
2. La escala visible proviene de `i.l`, pero no existe un validador común que impida publicar tipos incompatibles con la escala o métodos normativos.
3. En `samples` (`app.js:414`), los tokens inválidos se filtran silenciosamente; no se informa error ni se exige exactamente `ev.mu.puntos*10` observaciones. Esto puede producir una media con muestra incompleta, contrario a la exigencia de 10 aves por punto.
4. En `app.js:417–418`, el archivo seleccionado se guarda solo como `a.ev=file.name`; no se transmite automáticamente al endpoint de evidencias. El backend sí admite PDF/JPG/PNG, calcula SHA-256 y marca verificación oficial pendiente (`server/index.js:181–190`), pero el flujo visible no enlaza la selección del archivo con ese endpoint.
5. El tamaño máximo de UI está hardcoded a 5 MB (`app.js:235`, `app.js:417`), mientras `ICA_CONFIG` permite `maxEvidenceMB` editable y el servidor usa `MAX_FILE_BYTES`; el parámetro editable no gobierna realmente el control de carga.
6. `MBR8` se muestra con carga documental aunque el bloqueo documental se activa solo cuando `ev.total>1000` (`requiereDoc`, `app.js:25`); para ≤1.000 el flujo debería dejar claro que el dato puede diligenciarse por entrevista/información del productor, sin presentar la evidencia como obligatoria.
7. La validación de documento solo comprueba presencia de nombre, legibilidad y firma para bloquear ciertos 100 (`app.js:32–36`); no valida vigencia, ausencia de correcciones, matrícula COMVEZCOL, laboratorio autorizado ni contenido de Tablas 30–39. El servidor declara esos controles como `pendiente_verificacion_oficial` y `requiere_revision_humana` (`server/index.js:187`). Esto requiere revisión humana o servicio institucional externo, no puede darse por implementado solo con un selector de archivo.

**Corrección exacta necesaria:** crear una parametrización versionada de tipos y escalas con un catálogo cerrado de tipos (`scale`, `pct`, `ratio`, `dens`, `doc`, `docpct`, `docmix`) y reglas por indicador; validar que el tipo, método y niveles sean compatibles con la ficha ICA antes de publicar. Para muestras, rechazar valores fuera de `{0,55,100}`, informar cada token inválido y exigir exactamente 50 o 90 valores según `ev.mu.puntos` antes de permitir cierre. Para archivos, enviar el binario a `/api/evaluaciones/:id/evidencias`, asociarlo por código, almacenar respuesta/hash y usar la configuración real de tamaño/MIME; mantener la verificación de autenticidad como estado `Requiere servicio externo` o revisión humana trazable. Para predios ≤1.000, separar el registro de información del productor del soporte documental y no exigir archivo; para >1.000, activar el soporte según la metodología.

**Prueba requerida:**

1. Enumerar los 35 indicadores y comprobar tipo/escala esperados: 23×100/55/0, 10×100/0, 1×100/55 y 1×100/50/0.
2. Probar radios: solo una opción por indicador; intentar alterar el DOM con un puntaje inexistente y verificar rechazo en servidor/validación.
3. Probar muestras con 50/90 valores exactos, un valor 55 y un token inválido, y una muestra incompleta: el inválido y la incompleta deben impedir cierre con mensaje explícito.
4. Probar MBR7/MBR10 en frontera 1.00, 1.30 y >1.30; probar MBR13/14 en exactamente 55 y 55.01 aves/m²; probar MBA1/2 en 40, 40.1, 60 y 60.1; probar MBA10 en 12, 12.1, 14 y 14.1; probar MBA11 en 90, 90.01, 70 y 69.99 según la redacción de la ficha.
5. Seleccionar un PDF/JPG/PNG y verificar que se crea la evidencia en SQLite con MIME, tamaño y SHA-256; intentar archivo no permitido y tamaño superior al parámetro activo.
6. Confirmar que firma, matrícula, laboratorio y contenido no se marcan como verificados automáticamente: deben permanecer pendientes de revisión humana/servicio oficial.

## 4. Verificación de metodología ICA y matriz

### Correcto

- Catálogo cuantitativo completo: 35 indicadores y grupos 11/14/10.
- Tabla 1 implementada correctamente en cálculo: `t>=200` usa 60/25/15; `t<200` usa 70/30/0.
- Tabla 2 implementada correctamente en `NIVELES` y `nivelDe`.
- Tabla 3 implementada en `muestreoPara`: <200 = 1/5/50; ≥200 = 2/9/90; el requisito de 200 exactas queda cubierto.
- Escalas especiales: MBG1 100/55, MBG10 100/50/0, MBG2–MBG9 100/0, y escalas visuales 100/55/0.
- Fórmulas y umbrales especiales están representados en la interfaz y en los manejadores de cambio.
- La apariencia visual no requiere cambio: `index.html` mantiene `css/styles.css`, y `styles.css` conserva el sistema visual de EvalCodorniz (Public Sans, paleta verde, paneles, tablas, pills y layout responsivo). La corrección propuesta debe ser funcional y no sustituir ese CSS.

### No conforme o no demostrable todavía

- Parametrización administrativa real y versionada de RF09–RF12.
- Validación de muestra exacta e invalidación explícita de tokens.
- Persistencia y asociación automática de archivos desde la UI al endpoint.
- Verificación oficial de contenido, firma, matrícula COMVEZCOL, laboratorio, vigencia y entidad emisora.
- La selección “aleatoria” actual (`app.js:365`) genera etiquetas secuenciales `Galpón/Corral 1..n`, `Punto 1..n`, `Ave-001..`; no selecciona elementos de un inventario real. Esto no es una brecha de RF09–RF12 estricta, pero afecta la trazabilidad de la matriz/metodología y debe conservarse como pendiente del flujo ICA.
- El backend valida la muestra y persiste evaluaciones, pero no persiste configuración/versiones de indicadores, criterios, ponderaciones o tipos.

## 5. Dictamen final

El bloque RF09–RF12 está **implementado en su capa de catálogo, presentación y cálculo normativo**, pero **no está implementado como parametrización administrativa real**. La clasificación global recomendada es:

- **RF09: Parcial** — catálogo completo y especie única, sin CRUD/versionado.
- **RF10: Parcial** — fichas completas y snapshot, sin editor/versionado/publicación.
- **RF11: Parcial** — pesos y cálculo correctos, sin configuración/versionado editable.
- **RF12: Parcial alto** — tipos, escalas y fórmulas representados, pero sin editor, con validación de muestras incompleta y flujo documental UI–backend no cerrado.

La aplicación puede conservar su formato visual actual. Las correcciones deben añadirse mediante módulos de configuración, validación y persistencia, sin reemplazar la estructura visual de `styles.css` ni alterar la identidad de EvalCodorniz.
