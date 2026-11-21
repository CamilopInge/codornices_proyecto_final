# Validación normativa ICA y prueba simulada de extremo a extremo

**Aplicación validada:** EvalCodorniz unificado con funciones de Bienestar Animal ICA.

## 1. Fuentes comparadas

Se contrastó el aplicativo contra:

- Metodología ICA de evaluación de bienestar animal en codornices de postura, incluidas Tablas 1–39.
- Matriz de indicadores ICA con 35 indicadores.
- Documento de requisitos RF01–RF40.
- Código final de EvalCodorniz (`js/data.js`, `js/app.js`, `server/index.js`).

## 2. Validación de catálogo y cálculo

| Control | Resultado |
|---|---|
| Indicadores totales | 35 encontrados en el catálogo |
| Grupos | MBA 11, MBR 14, MBG 10 |
| Escalas | 100/55/0, 100/0 y 100/50/0 presentes según indicador |
| Sistema productivo | Piso y jaula |
| Ponderación < 200 aves | MBA 70 %, MBR 30 %, MBG no aplica |
| Ponderación ≥ 200 aves | MBA 60 %, MBR 25 %, MBG 15 % |
| Niveles | Excelente, Alto, Medio y Bajo |
| Aplicabilidad especial | MBA10, MBR3, MBR4, MBR14 y MBG implementadas |
| Fórmulas especiales | MBR7, MBR10, MBR13, MBR14 y MBA10 contempladas en el frontend |

## 3. Validación de muestra ICA

La validación ahora exige tanto en la interfaz como en el backend:

- Inventario positivo por día, levante o producción.
- Semilla de selección.
- Para menos de 200 aves: 1 corral, 5 puntos y 50 aves.
- Para 200 o más aves: 2 corrales, 9 puntos y 90 aves.
- 10 aves por punto.
- Confirmación de bioseguridad.
- Confirmación de selección neutral/sin sesgo.
- Registro de edad priorizada.

Una muestra sin bioseguridad fue enviada al endpoint y fue rechazada con HTTP 400. La muestra completa fue aceptada.

## 4. Registro simulado ejecutado

Se creó `QA_REGISTRO_SIMULADO_ICA.json` con:

- Predio simulado `QA-EVAL-ICA-001`.
- Sistema jaula.
- Inventario: 0 día, 300 levante y 1.200 producción; total 1.500 aves.
- 2 galpones.
- 9 puntos.
- 90 aves.
- Semilla `QA-ICA-2026-11-06-A7F3`.
- Bioseguridad confirmada.
- Selección neutral confirmada.
- 35 respuestas, una por cada indicador ICA.
- Respuestas de prueba 100, 55 y 0 para verificar las escalas.
- Evidencias y metadatos simulados para indicadores documentales.

## 5. Pruebas de extremo a extremo ejecutadas

1. `/api/health` respondió correctamente con SQLite WAL.
2. Se autenticó el administrador mediante JWT.
3. Se comprobó el bloqueo de una muestra incompleta.
4. Se persistió el registro simulado completo.
5. Se recuperó el registro con 35 respuestas y 90 aves.
6. Se cargó una evidencia PDF.
7. Se calculó y almacenó SHA-256.
8. La evidencia quedó marcada como `pendiente_verificacion_oficial` para firma, matrícula y entidad emisora.
9. Se probó el endpoint de recomendaciones IA.
10. Se comprobó el login de los cuatro perfiles demo.

## 6. Estado de requisitos RF01–RF40

| Grupo | Estado |
|---|---|
| RF01 autenticación | Implementado en backend con JWT; el selector visual de EvalCodorniz conserva el acceso directo del prototipo |
| RF02 roles/permisos | Implementado en frontend y backend; backend mapea admin, evaluador y lectura |
| RF03 usuarios | Alta e inactivación visual local; el alta administrativa aún requiere sincronización API dedicada |
| RF04 recuperación | Pendiente; requiere correo o canal institucional para token de recuperación de 30 minutos |
| RF05–RF08 fincas, ubicación, especie e inventario | Implementados en el flujo visual; persistencia API de evaluación/predio validada |
| RF09–RF12 parametrización | Catálogo, criterios, ponderaciones, tipos y niveles presentes; versionado administrativo completo pendiente |
| RF13–RF16 creación, checklist, MBA y MBR | Implementados y validados con los 35 indicadores y muestra ICA |
| RF17 MBG documental | Implementado como captura de evidencia y metadatos; verificación oficial externa pendiente |
| RF18 guardado | Local y servidor; evaluación simulada persistida en SQLite |
| RF19 evidencias | Persistencia de PDF/JPG/PNG, tamaño, MIME y SHA-256 implementada |
| RF20–RF23 cálculo, cierre, diagnóstico y críticos | Implementados; cierre exige muestra, bioseguridad, neutralidad, respuestas y documentos aplicables |
| RF24 IA | Endpoint conectado y probado; fallback de plantillas visual disponible |
| RF25–RF29 recomendaciones, plan e historial | Implementados en EvalCodorniz; persistencia granular de acciones requiere endpoint adicional |
| RF30–RF33 comparación, dashboard y filtros | Implementados en la interfaz principal |
| RF34–RF36 reportes, exportación y consolidado | Reporte imprimible y CSV; XLSX binario y PDF binario directo quedan pendientes |
| RF37–RF38 catálogos/niveles | Edición y validación local; versionado por evaluación parcial mediante snapshot |
| RF39 bitácora | Bitácora visual y auditoría backend probadas |
| RF40 notificaciones | Alertas de vencimiento en interfaz; correo/push y aviso anticipado configurable pendientes |

## 7. Dictamen

La aplicación cumple el flujo ICA implementable dentro del prototipo y ya cuenta con base de datos, autenticación, evidencias, auditoría e IA conectadas. La prueba simulada de extremo a extremo fue exitosa.

No se debe declarar todavía una certificación oficial ICA. Las validaciones de autenticidad de firmas, matrícula profesional, laboratorio, entidad emisora y contenido documental requieren una fuente institucional autorizada o revisión humana trazable. También quedan como trabajo de producción la recuperación por correo, exportación XLSX/PDF binaria, notificaciones externas y la sincronización administrativa granular de usuarios, catálogos y planes.
