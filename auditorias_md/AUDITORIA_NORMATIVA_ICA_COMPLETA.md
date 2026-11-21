# Auditoría normativa ICA completa — EvalCodorniz

**Fecha:** 30 de octubre de 2026. **Fuentes:** metodología ICA de 36 páginas, Tablas 1–39, matriz Excel de 35 indicadores, documento de requisitos RF01–RF40 y código del prototipo.

## Dictamen actualizado

El prototipo ya incorpora los principales controles de medición que faltaban, pero debe seguir considerándose un prototipo local. La validez normativa mejoró con el registro de muestra, fórmulas y evidencia; sin embargo, la ausencia de base de datos, autenticación real, validación del contenido de archivos y servicio IA conectado impide declararlo todavía como sistema operativo ICA completo.

## Funciones implementadas en esta iteración

- Snapshot completo del catálogo aplicable, ponderaciones y Tabla 3 al crear una evaluación.
- Control de visita con fases de apertura, inspección y cierre; corrales/galpones, puntos, aves de cuatro semanas o más, bioseguridad y neutralidad.
- Captura de valores 100/55/0 por observación para indicadores sujetos a muestreo y promedio de la muestra.
- MBR7 con animales, bebederos, límite de casa genética/fabricante y exceso de 30 %.
- MBR10 con animales, comederos, límite y competencia por alimento.
- MBR13 con CJ, IG y D=(CJ+IG)/2 y umbral de 55 aves/m².
- MBR14 con aves por m².
- MBA10 con tasa de mortalidad de los últimos cinco ciclos y soporte documental.
- MBR8, MBR13 y MBR14 con soporte documental condicionado a predios de más de 1.000 aves.
- Metadatos de documentos: firma, legibilidad, ausencia de correcciones, vigencia y matrícula.
- Comparación por criterio y por código de indicador.
- Forma oficial imprimible con datos, preguntas, respuestas, puntajes, diagnóstico, recomendaciones aprobadas y plan de mejora.
- Catálogos y niveles editables localmente desde Parametrización.

## Estado de los 40 requisitos

| RF | Estado actualizado | Observación |
|---|---|---|
| RF01 | No implementado deliberadamente | Se mantiene acceso directo sin login por decisión del proyecto. |
| RF02 | Parcial | Roles y matriz local; falta seguridad real de servidor. |
| RF03 | Parcial | Alta/inactivación local; falta autenticación y edición completa persistente. |
| RF04 | Pendiente | Falta recuperación con token de 30 minutos. |
| RF05 | Parcial alto | Fincas, edición y baja lógica locales. |
| RF06 | Implementado local | Ubicación y coordenadas opcionales. |
| RF07 | Parcial | Solo codorniz; falta asociación persistente explícita. |
| RF08 | Parcial alto | Inventario y Tabla 3; falta selección aleatoria verificable y registro completo de edades. |
| RF09 | Parcial | Catálogo de 35 indicadores; falta versionado administrativo. |
| RF10 | Parcial | Pregunta, método y escala; falta editor completo de fichas. |
| RF11 | Implementado en cálculo | Falta editor de ponderaciones versionado. |
| RF12 | Parcial alto | Tipos de escala, porcentaje, número, fórmula y documento incorporados; falta editor de tipos. |
| RF13 | Parcial alto | Estado, snapshot y datos de visita incorporados; falta persistencia transaccional. |
| RF14 | Parcial alto | Aplicabilidad, puntos y muestra visibles; falta selección aleatoria automática. |
| RF15 | Parcial alto | Muestras y porcentajes incorporados; falta historia documental completa de mortalidad. |
| RF16 | Parcial alto | MBR7, MBR10, MBR13 y MBR14 incorporados; falta registro detallado por recurso/punto. |
| RF17 | Parcial | Documentos y metadatos; falta validar contenido real, entidad y matrícula contra fuente oficial. |
| RF18 | Implementado local | `localStorage`; falta almacenamiento multiusuario. |
| RF19 | Parcial | Formatos, tamaño y reemplazo local; falta guardar archivo real. |
| RF20 | Parcial alto | Ponderación y promedio de muestra incorporados; requiere pruebas exhaustivas con muestras incompletas. |
| RF21 | Parcial alto | Bloqueo por faltantes y evidencia/metadatos; falta validador de contenido documental. |
| RF22 | Parcial | Forma provisional/definitiva y reporte ampliados; falta ventana real de un día hábil y recalificación automática. |
| RF23 | Implementado | Críticos por cero y agrupación por criterio. |
| RF24 | Parcial | Plantillas locales; falta servicio IA, error y reintento real. |
| RF25 | Implementado | Orden por criticidad y peso. |
| RF26 | Implementado local | Edición, aprobación y descarte. |
| RF27 | Implementado local | Acción con responsable y fecha. |
| RF28 | Implementado local | Estado, avance, cierre y atrasadas. |
| RF29 | Implementado local | Historial ordenado. |
| RF30 | Implementado ampliado | Comparación por criterio e indicador. |
| RF31 | Implementado local | Dashboard y filtros en navegador. |
| RF32 | Parcial | Dashboard por finca; falta detalle visual completo del plan. |
| RF33 | Parcial alto | Filtros incorporados; falta aplicarlos a todas las exportaciones. |
| RF34 | Parcial alto | Forma oficial imprimible ampliada; falta generación PDF binaria directa. |
| RF35 | Parcial | CSV disponible; falta XLSX y exportación global filtrada. |
| RF36 | Parcial | Consolidado por zona; falta periodo y conteo de fincas distintas. |
| RF37 | Implementado local básico | Catálogos editables; falta inactivación de valores en uso. |
| RF38 | Implementado local básico | Rangos editables y validados; falta versionado por evaluación. |
| RF39 | Parcial | Bitácora local; falta garantía de inmutabilidad multiusuario. |
| RF40 | Parcial | Alertas vencidas; falta aviso anticipado configurable. |

## Brechas normativas que permanecen

La metodología exige que la muestra sea seleccionada aleatoriamente y que se prioricen aves de mayor edad en producción. El prototipo permite registrar estos datos y muestra la cantidad exigida por la Tabla 3, pero todavía no ejecuta un sorteo auditable ni valida la edad mediante inventario detallado.

La evidencia documental todavía se conserva como referencia local del archivo seleccionado y sus metadatos. No se inspecciona automáticamente que el documento sea legible, no tenga correcciones, esté firmado por MV/MVZ/Z con matrícula COMVEZCOL vigente, provenga de laboratorio autorizado, ni que contenga todas las frases exigidas por las Tablas 30–39.

RF01 continúa pendiente por decisión de alcance: el prototipo debe abrir sin solicitar una cuenta de Manus. Si posteriormente se exige seguridad formal, debe implementarse autenticación propia o institucional, no una dependencia de Manus.

La IA continúa simulada con plantillas. El reporte utiliza la impresión del navegador, aunque ahora contiene la información mínima ampliada de la forma oficial. La exportación actual sigue siendo CSV, no XLSX nativo.

## Próxima prioridad técnica

La siguiente etapa debe concentrarse en persistencia de archivos y registros, validación documental asistida, selección aleatoria auditable, recalificación por documentos recibidos dentro del día hábil, exportación XLSX, versionado de catálogos y conexión del servicio IA. Hasta completar esos puntos, la descripción correcta sigue siendo: **prototipo local de evaluación ICA para codornices, con cálculo y flujo normativo ampliados, aún no sistema operativo certificado**.
