# Integración final: EvalCodorniz + Bienestar Animal ICA

## Decisión de producto

La aplicación final conservará EvalCodorniz como interfaz principal. No se reemplazarán su encabezado, navegación, panel, tarjetas, tablas, filtros, vistas de evaluación, reportes ni estilo visual. Bienestar Animal ICA se integrará como capa normativa y de infraestructura.

## Qué se conserva de EvalCodorniz

Se mantiene el shell con marca EvalCodorniz, navegación de módulos, dashboard, filtros por finca y evaluación, tabla de indicadores, diagnóstico, planes, reportes, parametrización, usuarios y bitácora. También se conserva la navegación directa sin dependencia de Manus.

## Qué se incorpora de Bienestar Animal ICA

Se incorporan los 35 indicadores de la matriz ICA, los grupos MBR/MBA/MBG, aplicabilidad por piso/jaula y por umbral de aves, ponderaciones 70/30 y 60/25/15, niveles de bienestar, reglas de MBR7, MBR10, MBR13, MBR14 y MBA10, selección de muestra auditable, inventario por día/levante/producción, fases de visita, bioseguridad, neutralidad, documentos y metadatos, recomendaciones, plan de mejora, comparación por indicador y snapshot normativo.

## Qué se incorpora de infraestructura

Se integra el backend persistente con JWT, roles admin/evaluador/lectura, SQLite de desarrollo, auditoría, almacenamiento de evidencias con SHA-256 y endpoint de IA. La conexión debe ser invisible para el usuario: EvalCodorniz seguirá viéndose igual y solo cambiará el origen de persistencia.

## Regla de integración

No se debe insertar la pantalla Angular de Bienestar Animal dentro de EvalCodorniz ni rediseñar el dashboard. La integración correcta consiste en ampliar el estado `S`, las reglas de `data.js`, las vistas existentes de `app.js` y los eventos actuales, utilizando el backend como servicio.

## Orden de implementación

1. Mantener el shell visual y el flujo de navegación de EvalCodorniz.
2. Sustituir únicamente los datos simulados por el catálogo ICA consolidado.
3. Conectar usuarios, roles y permisos existentes con JWT sin mostrar una pantalla de Manus.
4. Conectar guardar/cargar evaluaciones al backend y conservar fallback local.
5. Conectar evidencias, auditoría e IA en las vistas ya existentes.
6. Ejecutar una prueba visual comparativa para asegurar que el formato no cambió.
7. Entregar un único ZIP basado en EvalCodorniz, no en la pantalla Angular de Bienestar Animal.

## Criterio de aceptación

La entrega se acepta solo si un usuario reconoce la aplicación como EvalCodorniz por su formato visual, pero puede usar todas las reglas, permisos, evidencias, auditoría, persistencia e IA que aporta Bienestar Animal ICA.
