# Comparación integral: Bienestar animal vs. EvalCodorniz

**Fecha:** 6 de noviembre de 2026  
**Supuesto de trabajo:** se conservará la estructura visual y el flujo tipo asistente de **Bienestar animal**, incorporando dentro de ella las reglas ICA y los módulos faltantes de **EvalCodorniz**. No se eliminará la estructura de pasos; se fortalecerá.

## 1. Elementos comparados

### Bienestar animal

Proyecto Angular 20 con Angular Material, componente principal `GolondrinasComponent`, asistente de tres pasos, servicios HTTP, backend Express, MySQL y un controlador de recomendaciones con OpenAI. Incluye `node_modules` y una compilación Angular dentro del RAR.

### EvalCodorniz

Prototipo HTML/CSS/JavaScript con 35 indicadores ICA, flujo de fincas, evaluaciones, parametrización, usuarios locales, permisos, dashboard, historial, comparación, planes, reportes y almacenamiento en `localStorage`.

## 2. Resumen ejecutivo

**Bienestar animal es más fuerte en estructura de captura y persistencia:** tiene un wizard claro de información del predio → muestreo → evaluación, campos de comentarios, imágenes, guardado remoto, predios, evaluación en borrador/completada y conexión a IA.

**EvalCodorniz es más fuerte en cobertura funcional ICA y administración:** contiene los 35 indicadores, grupos MBA/MBR/MBG, reglas por sistema y tamaño del predio, pesos de la Tabla 1, niveles de la Tabla 2, muestreo de la Tabla 3, cierre, recomendaciones, plan, usuarios, permisos, bitácora, filtros, dashboards y comparación.

La consolidación correcta no es reemplazar un proyecto por el otro. Es conservar el **wizard, la captura de comentarios/imágenes y la persistencia preparada de Bienestar animal**, mientras se integra el **catálogo y motor normativo completo de EvalCodorniz**.

## 3. Comparación por área

| Área | Bienestar animal | EvalCodorniz | Decisión de consolidación |
|---|---|---|---|
| Arquitectura | Angular 20 + Material + Express + MySQL | HTML/CSS/JS + estado local | Conservar estructura Angular/wizard; trasladar reglas ICA de EvalCodorniz como servicios tipados. |
| Inicio y navegación | Inicio, login y componente de evaluación | Panel con módulos, usuario local y permisos | Mantener wizard como flujo de evaluación y añadir módulos administrativos de EvalCodorniz alrededor. |
| Predio | Nombre, código ICA, municipio, departamento, dirección y responsable | Finca con inventario, sistema, ubicación y dueño | Unificar en una ficha única; conservar código ICA y añadir inventario por edad. |
| Muestreo | Calcula 1/2 galpones, 5/9 puntos y 10 aves por punto | Calcula Tabla 3 y ahora genera selección auditable | Conservar resumen visual de Bienestar y agregar selección, semilla, corrales, puntos y aves. |
| Sistema | Piso/jaula | Piso/jaula y aplicabilidad de indicadores | Mantener selector Material y aplicar catálogo EvalCodorniz. |
| Indicadores | 35 criterios, pero IDs 1.1–3.10 y nombres simplificados | 35 códigos oficiales MBA/MBR/MBG con preguntas, métodos y escalas | Usar el catálogo oficial de EvalCodorniz; mantener la presentación por grupos del wizard. |
| Escalas | 100/55/0, 100/0 y 100/50/0 declaradas | Escalas por indicador y reglas específicas | Usar escalas y fórmulas de EvalCodorniz, no una escala única por grupo. |
| MBR7/MBR10 | Se muestran como criterios genéricos | Campos de animales, unidades, límite y competencia | Integrar campos específicos de EvalCodorniz en las tarjetas Angular. |
| MBR13/MBR14 | Criterios genéricos | Fórmula CJ, IG, D y aves/m² | Integrar las variables y fórmula normativa completas. |
| MBA10 | Criterio genérico de mortalidad | Mortalidad de cinco ciclos y documentación | Mantener el criterio visible de Bienestar y agregar los cinco ciclos. |
| MBG | Criterios documentales genéricos | Evidencia, metadatos y reglas de >1.000 aves | Usar formulario documental ampliado por indicador. |
| Comentarios | Cada criterio tiene comentario | Observación opcional por indicador | Conservar el comentario de Bienestar como observación ICA oficial. |
| Imágenes | Cada criterio tiene arreglo de imágenes | Referencia local de archivo | Conservar carga de imágenes y añadir metadatos, validación y asociación al indicador. |
| Guardado | Borrador/completada en API | `localStorage`, estado en progreso/cerrada | Mantener el estado de Bienestar; mientras no haya BD, adaptar el servicio a almacenamiento local. |
| Base de datos | MySQL preparado | Deliberadamente no conectado a BD | No conectar todavía; crear interfaces/repositorios para que el cambio posterior no rompa la UI. |
| Autenticación | Frontend preparado para JWT, pero el backend entregado no muestra ruta auth equivalente | Acceso directo con usuarios locales | Mantener acceso directo por instrucción del proyecto; conservar interfaces para activarlo después. |
| IA | Controlador real con OpenAI y respuesta JSON | Plantillas simuladas | Mantener interfaz de IA de Bienestar, pero dejar adaptador desactivado hasta configurar servicio. |
| Recomendaciones | Resultado IA básico | Recomendaciones editables, aprobables y plan de mejora | Unir IA con flujo de aprobación, descarte y plan de EvalCodorniz. |
| Reportes | No se observó un módulo completo en el componente revisado | Forma oficial, CSV, consolidado y comparación | Integrar reportes de EvalCodorniz al shell Angular. |
| Usuarios/permisos | Tipos de usuario en servicio auth | Cuatro perfiles y matriz detallada | Conservar roles de EvalCodorniz y conectar guardas Angular cuando se active login. |
| Historial/dashboard | Listado remoto preparado | Dashboard, filtros, comparación por indicador | Integrar módulos administrativos de EvalCodorniz. |

## 4. Lo que debe pasar de Bienestar animal a EvalCodorniz

Debe conservarse el wizard de tres pasos porque ordena la visita y evita comenzar una evaluación incompleta. También deben pasar la ficha del predio, el código ICA, el responsable, la fecha de visita, el sistema piso/jaula, el resumen automático del muestreo, la visualización de pesos y aplicabilidad, los comentarios por criterio, la carga de imágenes y el estado de guardado borrador/completada.

La estructura Material y los componentes de tarjeta, tabla y pestañas son adecuados para una aplicación de campo. Deben conservarse como presentación, pero alimentados por el catálogo normativo real de EvalCodorniz y no por descripciones simplificadas.

## 5. Lo que debe pasar de EvalCodorniz a Bienestar animal

Debe pasar el catálogo completo de 35 indicadores con código oficial, pregunta, método, escala, aplicabilidad, tipo de respuesta y grupo. También deben pasar las reglas de ponderación 60/25/15 y 70/30, niveles 90/75/50, aplicabilidad por piso/jaula, MBG desde 200 aves y MBA10 según el umbral normativo establecido.

Deben incorporarse el motor de cálculo por muestra, MBR7, MBR10, MBR13, MBR14, MBA10, documentos con metadatos, validación previa al cierre, forma provisional/definitiva, recomendaciones aprobadas, plan de mejora, seguimiento, comparación por indicador, dashboard, filtros, catálogos, niveles y bitácora.

## 6. Incompatibilidades que no deben mezclarse directamente

### 6.1 Identificadores de indicadores

Bienestar animal utiliza códigos `1.1` a `3.10`; EvalCodorniz utiliza códigos `MBR1` a `MBR14`, `MBA1` a `MBA11` y `MBG1` a `MBG10`. No se deben mezclar como si fueran equivalentes sin una tabla de correspondencia. La relación preliminar por orden es útil para migración, pero el código oficial debe ser el de EvalCodorniz.

### 6.2 Escala de calificación del backend

El controlador del backend de Bienestar animal usa `8`, `6` y `4` para mapear niveles, mientras la metodología ICA usa calificación sobre 100 y rangos 90/75/50. Ese cálculo no debe conservarse. La consolidación debe utilizar un único motor ICA sobre 100.

### 6.3 Peso y promedio

Bienestar animal calcula promedios de criterios genéricos y redondea globalmente. EvalCodorniz distingue grupos, indicadores aplicables, muestras y pesos. Debe conservarse un solo motor: el de EvalCodorniz, con pruebas automatizadas.

### 6.4 Rutas y autenticación

El frontend de Bienestar animal apunta a `localhost:3000/api` para autenticación y a `localhost:3005/api` para API general, mientras el backend mostrado escucha en el puerto 3000 y no expone en los archivos revisados una ruta de autenticación equivalente. Antes de activar login hay que unificar puerto, rutas y middleware JWT.

### 6.5 Base de datos

El RAR incluye MySQL, pero el alcance actual del proyecto indica que todavía no se debe crear ni conectar una base de datos. Por eso la primera consolidación debe usar interfaces de repositorio y almacenamiento local, no activar las consultas SQL.

## 7. Estructura final propuesta sin perder la de Bienestar animal

1. **Shell Angular y navegación:** conservar Angular Material, toolbar, sidenav, login preparado y componente de tres pasos.
2. **Paso 1 — Información del predio:** ampliar la ficha de Bienestar con dueño, inventario por día/levante/producción, especie, ubicación completa y estado de finca.
3. **Paso 2 — Plan de muestreo:** conservar el resumen visual y agregar selección auditable de galpones/corrales, puntos, aves de cuatro semanas o más y semilla de selección.
4. **Paso 3 — Evaluación ICA:** mantener pestañas MBR/MBA/MBG; reemplazar los criterios simplificados por las fichas del catálogo oficial.
5. **Motor ICA:** servicio único con tipos de respuesta, fórmulas, aplicabilidad, pesos, niveles, validación y snapshot.
6. **Evidencias:** conservar imágenes y comentarios; agregar PDF/JPG/PNG, tamaño, firma, legibilidad, vigencia, matrícula y asociación al indicador.
7. **Guardado local:** adaptar los servicios Angular a un repositorio local que reproduzca crear, obtener, actualizar y completar; no conectar MySQL aún.
8. **Módulos posteriores:** recomendaciones, plan, historial, dashboard, comparación, reportes, catálogos, usuarios y bitácora.

## 8. Orden de implementación

### Paso 1 — Modelo común

Crear interfaces TypeScript comunes para `Predio`, `Evaluacion`, `IndicadorICA`, `RespuestaIndicador`, `MuestraICA`, `Evidencia` y `PlanMejora`. Crear una tabla de correspondencia entre los códigos `1.1–3.10` y los códigos oficiales MBA/MBR/MBG.

### Paso 2 — Motor ICA

Migrar el catálogo oficial, pesos, niveles, aplicabilidad, muestreo y fórmulas a servicios puros. Probar los casos `<200`, `=200`, `>200`, piso, jaula, documentos válidos, documentos pendientes y evaluaciones con muestras incompletas.

### Paso 3 — Wizard y evaluación

Conservar el HTML/SCSS de Bienestar animal, pero enlazarlo al modelo común. Añadir capturas específicas para MBR7, MBR10, MBR13, MBR14 y MBA10.

### Paso 4 — Persistencia local

Implementar un repositorio `localStorage` con la misma interfaz que tendrá el futuro repositorio HTTP. Así la base de datos podrá conectarse después sin rehacer las pantallas.

### Paso 5 — Evidencias y cierre

Incorporar carga de imágenes/documentos, metadatos, validación, forma provisional, subsanación y forma definitiva.

### Paso 6 — Administración y reportes

Integrar usuarios, permisos, dashboard, historial, comparación por indicador, recomendaciones aprobadas, plan, CSV/PDF y catálogos.

### Paso 7 — Backend posterior

Solo cuando se autorice la base de datos, conectar el repositorio HTTP, unificar puertos, agregar JWT real, migraciones, almacenamiento de archivos y auditoría server-side.

## 9. Decisión recomendada

La base visual y de interacción debe ser **Bienestar animal**, porque su wizard y su captura de campo son más claros. La base normativa y funcional debe ser **EvalCodorniz**, porque contiene la mayor cobertura de requisitos ICA.

Resultado esperado: una aplicación Angular con la experiencia de Bienestar animal, pero con el catálogo, cálculo, validación, roles, reportes y trazabilidad de EvalCodorniz. La consolidación debe comenzar sin activar la base de datos.
