# Consolidado de auditoría RF01–RF40

**Fecha del consolidado:** 2026-11-06  
**Alcance:** resultados de auditoría de RF01 a RF40 suministrados para EvalCodorniz.  
**Estado del documento:** consolidado de hallazgos y plan de corrección.

> **Alcance y limitación:** este documento organiza resultados de auditoría y propone acciones de remediación. **No constituye certificación oficial, aprobación regulatoria, concepto de conformidad ICA ni validación de terceros.** Las afirmaciones que dependan de autenticidad documental, matrícula profesional, laboratorios, correo institucional, proveedor de IA, calendario oficial u otros servicios externos requieren verificación y evidencia independiente.

## 1. Resumen ejecutivo

La aplicación presenta una base funcional parcial: catálogo de 35 indicadores, cálculo de puntajes, niveles, vistas de evaluación, recomendaciones locales, persistencia local y algunos endpoints de autenticación, evaluaciones, evidencias y auditoría. Sin embargo, los riesgos más importantes están en seguridad de acceso, autorización server-side, persistencia multiusuario, integridad de evaluaciones cerradas, muestreo auditable, cálculo de MBR13, evidencias documentales, exportaciones y parametrización institucional.

La prioridad propuesta es:

1. **P0 — Bloqueantes de seguridad, integridad y cálculo:** RF01–RF04, RF08, RF13–RF16, RF18–RF20, RF21–RF22, RF29, RF34, RF38–RF39.
2. **P1 — Cumplimiento funcional y trazabilidad operativa:** RF05–RF07, RF09–RF12, RF17, RF24–RF28, RF31–RF33, RF35–RF37, RF40.
3. **P2 — Mejoras de consistencia, usabilidad y cobertura:** RF23, RF25, RF30 y endurecimientos derivados de los demás requisitos.

La prioridad no cambia el estado reportado. “Implementado” significa que la evidencia revisada muestra una implementación funcional parcial o local del requisito; no implica suficiencia integral, seguridad de producción ni certificación.

## 2. Matriz priorizada de correcciones

| Prioridad | RF | Estado reportado | Corrección principal | Tipo dominante | Dependencia externa/institucional |
|---|---|---|---|---|---|
| P0 | RF01 | Parcial | Login obligatorio; eliminar bypass y credenciales demo; bloqueo temporal tras cinco fallos; respuestas genéricas; logout; JWT_SECRET seguro; auditoría. | Código + pruebas | Política de seguridad y gestión de secretos |
| P0 | RF02 | Parcial | Unificar roles frontend/backend/BD/JWT; autorización server-side por operación; impedir escritura a lectura/consultor; cambio de rol con invalidación de sesión. | Código + pruebas | Política institucional de roles |
| P0 | RF03 | Parcial | CRUD de usuarios protegido por admin; bcrypt; activación/inactivación; revocación de sesiones; retirar contraseñas del frontend/localStorage; auditar cambios. | Código + pruebas | Administración institucional de identidades |
| P0 | RF04 | Pendiente | Flujo de recuperación con token hash, un solo uso, expiración de 30 minutos, cambio de contraseña y auditoría; canal real de correo o enlace controlado solo en desarrollo. | Código + dependencia | SMTP/correo institucional |
| P0 | RF08 | Parcial alto | Muestreo real sobre población; PRNG determinista; semilla, algoritmo y timestamp; priorizar aves de ≥4 semanas en producción; validar unidades y regla ≥200. | Código + pruebas | Datos reales de galpones, puntos, aves y cohortes |
| P0 | RF13 | Parcial | Creación transaccional; una evaluación abierta por finca; snapshot normativo completo; identificador canónico; errores de persistencia bloqueantes. | Código + pruebas | Modelo canónico de predios/evaluaciones |
| P0 | RF14 | Parcial | Resolver umbral 200/201 en constante versionada; validar pertenencia, unicidad, cardinalidad y repetibilidad de la muestra. | Código + pruebas | Decisión normativa sobre Tabla 3 |
| P0 | RF15 | Parcial | Observaciones individuales por punto/ave; exactamente 50/90 según aplique; MBA10 con cinco ciclos; exclusiones y soportes justificables. | Código + pruebas | Criterios ICA y formatos de captura |
| P0 | RF16 | Parcial | Corregir MBR13 a aves/m² con conversión explícita e inversión de unidades; validar MBR7/10/8 y muestras estructuradas. | Código + pruebas | Confirmación técnica de unidades y reglas |
| P0 | RF18 | Parcial | PUT/PATCH idempotente; GET de borradores; reconciliación; persistencia completa; distinguir local/servidor/fallo; bloquear cambios a cerradas. | Código + pruebas | Política de ciclo de vida documental |
| P0 | RF19 | Parcial | Subida binaria desde UI; asociar evidenceId; límite efectivo 5 MB; MIME real; reemplazo/eliminación solo en borrador. | Código + pruebas | Almacenamiento y política de archivos |
| P0 | RF20 | Parcial | Recalcular autoritativamente en backend desde snapshot; rechazar muestras incompletas; normalizar MBR13/14 y soportes. | Código + pruebas | Fuente normativa ICA versionada |
| P0 | RF21 | Parcial | Persistir binarios; validar estados documentales, vigencia y revisión humana; unificar límite; muestreo auditable. | Código + pruebas | Entidades certificadoras y revisión humana |
| P0 | RF22 | Parcial | `closed_at`, `provisional_until`, `definitive_at`, ventana hábil, cierre idempotente, documentos posteriores, recalificación y trazabilidad de entrega/socialización. | Código + pruebas | Calendario hábil, procedimiento institucional y PDF |
| P0 | RF29 | Parcial | Cargar historial desde API; deduplicar por serverId; bloquear edición/eliminación server-side de cerradas; filtro por finca. | Código + pruebas | Repositorio multiusuario |
| P0 | RF34 | Parcial | PDF binario descargable; recalcular y comparar resultado antes de emitir; preservar plantilla; diferenciar descargar de imprimir. | Código + pruebas | Motor PDF y requisitos de archivo oficial |
| P0 | RF38 | Parcial | Rangos con cobertura exacta 0–100; versionado server-side; snapshot por evaluación; nivel de cerradas inmutable frente a cambios futuros. | Código + pruebas | Aprobación institucional de niveles |
| P0 | RF39 | Parcial | GET de auditoría protegido, filtros/paginación, fuente server-side, cobertura centralizada, UTC, entidad, usuario, detalle e integridad opcional. | Código + pruebas | Retención y gobierno de auditoría |
| P1 | RF05 | Parcial | CRUD persistente de predios, baja lógica, IDs estables, validación por rol, auditoría y protección contra eliminación con evaluaciones. | Código + pruebas | Catálogo institucional de predios |
| P1 | RF06 | Parcial | Persistir vereda, latitud y longitud; validar sin obligar; incluir ubicación completa en reportes y filtros. | Código + pruebas | Normalización geográfica |
| P1 | RF07 | Parcial | Catálogo/FK de especies; persistir `Coturnix coturnix`; exigir especie al crear evaluación; snapshot y reporte. | Código + pruebas | Catálogo oficial de especies |
| P1 | RF09 | Parcial | Catálogo versionado de indicadores/especies; CRUD protegido; publicación, vigencia, bitácora y snapshot; mantener codorniz activa. | Código + dependencia | Administrador normativo |
| P1 | RF10 | Parcial | Editor con código inmutable; workflow borrador/aprobación/publicación; validaciones; comparar por código, incluyendo MBR8 y MBG1. | Código + pruebas | Aprobación de matriz normativa |
| P1 | RF11 | Parcial | Configurar umbral y pesos versionados; validar suma 100; guardar `peso_version_id` y pesos concretos; no mutar evaluaciones existentes. | Código + pruebas | Aprobación de ponderaciones |
| P1 | RF12 | Parcial alto | Catálogo versionado de tipos/escalas; exigir 50/90 valores; validar tokens; enlazar binarios; separar requisitos >1000; registrar revisión oficial. | Código + dependencia | Laboratorios, matrícula, firma y servicio oficial |
| P1 | RF17 | Parcial | Validación documental por indicador; metadatos, vigencia, entidad, matrícula y bandeja de vencidos; reglas MBG por umbral. | Código + dependencia | ICA/COMVEZCOL/laboratorios |
| P1 | RF24 | Requiere servicio externo | Conectar UI al endpoint IA; esquema JSON estricto; persistir recomendaciones; estados 503/502, reintento y fallback explícito; versionar prompt/modelo/hash. | Código + dependencia | `OPENAI_API_KEY`, proveedor y política de uso de IA |
| P1 | RF26 | Parcial | Persistir texto original/editado, indicador, prioridad, estado, usuario y auditoría; aprobar/descartar server-side; integrar IA real. | Código + pruebas | Servicio de IA, si se habilita |
| P1 | RF27 | Parcial | Tabla/endpoints de acciones; validar recomendación aprobada, descripción, responsable y fecha ISO; auditoría y sincronización. | Código + pruebas | Responsables y calendario institucional |
| P1 | RF28 | Parcial | Validar avance 0–100; PATCH con auditoría y control de versión; cálculo único de vencimiento; resumen server-side. | Código + pruebas | Zona horaria y política de planes |
| P1 | RF31 | Parcial | KPI de fincas evaluadas = fincas distintas con cerradas; separar de fincas activas; sincronizar agregados y refrescar tras cierre. | Código + pruebas | Definición institucional del KPI |
| P1 | RF32 | Parcial | Dashboard por finca con puntajes MBA/MBR/MBG, criterios críticos/cumplidos/advertencias y estado detallado del plan. | Código + pruebas | Diseño funcional aprobado |
| P1 | RF33 | Parcial | Función transversal `evaluacionesFiltradas()` para dashboard, historial, reportes, CSV, XLSX y consolidado; normalizar municipios. | Código + pruebas | Catálogo geográfico |
| P1 | RF35 | Parcial | Exportación global/multievaluación y XLSX real sobre filtros; columnas completas; UTF-8; control de rol y estado vacío. | Código + pruebas | Requisitos de intercambio institucional |
| P1 | RF36 | Parcial | Consolidado por período/zona; contar fincas distintas; definir selección de múltiples evaluaciones; representar MBG no aplica; exportar CSV/XLSX. | Código + pruebas | Definición de métricas y zonas |
| P1 | RF37 | Parcial | Catálogos server-side con códigos/versiones/activo; municipios y estados de plan; impedir eliminación destructiva; snapshot histórico. | Código + dependencia | Gobernanza de catálogos |
| P1 | RF40 | Parcial | Aviso configurable anticipado; alertas persistentes, destinatario, leído/no leído, deduplicación y retiro al cumplir; proveedor externo opcional. | Código + dependencia | Correo/push y responsables |
| P2 | RF23 | Implementado | Extraer `criticalIndicators()` como función pura; ordenar por grupo/código; reutilizar UI, exportación y API; pruebas 0/50/55/100. | Código + pruebas | No identificada |
| P2 | RF25 | Implementado | Extraer regla de prioridad versionada; desempate estable; persistir orden, peso, puntaje y prioridad; revalidar al leer. | Código + pruebas | Política aprobada de priorización |
| P2 | RF30 | Implementado | Mantener comparación sobre repositorio sincronizado; tratar nulos como “No aplica/No comparable”, nunca como cero; mostrar aplicabilidad y peso. | Código + pruebas | No identificada |

## 3. Correcciones agrupadas por naturaleza

### 3.1 Trabajo de código y arquitectura

1. **Seguridad y autorización:** eliminar `LOCAL_USER`, selector local y credenciales demo; imponer login; unificar roles; proteger cada endpoint; implementar bloqueo, revocación, cambio de contraseña y secretos obligatorios.
2. **Persistencia canónica:** mover predios, evaluaciones, indicadores, catálogos, recomendaciones, acciones, notificaciones y auditoría a tablas/endpoints versionados. `localStorage` debe quedar como fallback explícito, no como fuente autoritativa.
3. **Ciclo de vida de evaluación:** crear evaluaciones de forma transaccional e idempotente; impedir duplicados abiertos; sincronizar borradores; congelar snapshots; bloquear cambios directos a cerradas; soportar cierre provisional, definitiva, recalificación y versiones posteriores.
4. **Muestreo:** sustituir etiquetas secuenciales por selección reproducible de población real, con semilla, algoritmo, universo, selección, edad, cohorte, punto y ave; validar cardinalidad, unicidad, pertenencia y umbral.
5. **Cálculo normativo:** corregir MBR13 y normalizar unidades; recalcular en backend; centralizar límites, escalas, pesos y niveles versionados; representar “No aplica” sin convertirlo en cero.
6. **Evidencias:** usar `FormData`, persistir binario y `evidenceId`, validar MIME/tamaño real, metadatos, vigencia y estados de revisión; controlar reemplazo/eliminación solo en borrador.
7. **Catálogos y configuración:** implementar CRUD versionado y publicación para indicadores, especies, tipos, escalas, pesos, niveles, municipios, estados y parámetros de notificación; conservar snapshots históricos.
8. **Recomendaciones y planes:** integrar IA real solo si el servicio está disponible; validar esquema, persistir original/editado/estado; crear acciones y avances server-side con autorización, auditoría y concurrencia.
9. **Consulta y reportes:** sincronizar historial; centralizar filtros; ampliar dashboard por finca; implementar PDF binario, CSV global y XLSX; garantizar igualdad entre resultado almacenado y contenido exportado.
10. **Auditoría y alertas:** exponer auditoría server-side protegida; registrar UTC, actor, entidad, detalle y hash opcional; añadir avisos anticipados y persistencia de notificaciones.

### 3.2 Pruebas de aceptación y regresión

Las pruebas deben automatizarse en frontend, API y base de datos, con casos de autorización y concurrencia. Como mínimo:

- **Acceso:** almacenamiento limpio muestra login; cinco fallos bloquean el sexto; token ausente/expirado devuelve 401; permisos insuficientes devuelven 403; inactivación revoca sesión.
- **Roles:** probar cada rol en lectura, escritura, administración, evidencias, recomendaciones, acciones, exportaciones y auditoría.
- **Fronteras de inventario:** 1, 199, 200 y 201 aves; aplicar una sola política versionada.
- **Muestreo:** misma semilla = misma selección; semilla distinta = selección distinta; sin duplicados; solo población válida; exactamente 10 aves por punto y muestras completas 50/90.
- **Cálculos:** MBR13 con 10 m²/100 aves y 1 m²/100 aves; frontera MBR14 55 y 55.1; pesos, redondeo y grupos no aplicables.
- **Documentos:** PDF/JPG/PNG; 5 MB exactos y +1 byte; MIME falso; hash; reemplazo/eliminación en borrador; bloqueo en cerrada; vencimiento y estado de revisión.
- **Persistencia:** guardar tres veces deja una fila; recargar/abrir otro navegador reconstruye el estado; datos cerrados son inmutables; fallos de servidor no se reportan como guardados.
- **Versionado:** cambiar catálogo, pesos o rangos solo afecta evaluaciones nuevas; cerradas conservan snapshot, nivel, versión y reglas originales.
- **Cierre:** ventana hábil, fin de semana/festivo, cierre repetido idempotente, documentos posteriores y recalificación auditada.
- **Recomendaciones/planes:** esquema IA inválido, 503/502/timeout, reintento, fallback etiquetado, aprobación/edición/descartado; acciones con campos obligatorios y avances -1/0/1/99/100/101.
- **Consultas y exportaciones:** filtros idénticos en dashboard, historial, reportes, CSV, XLSX y consolidado; dos evaluaciones de una finca cuentan como una finca cuando corresponda; PDF/XLSX abren correctamente y reflejan el resultado autoritativo.
- **Auditoría y alertas:** todos los eventos aparecen en API; no existen PUT/DELETE de bitácora; aviso a +5 días con anticipación de 7; +10 no alerta; al cumplir se retira la alerta activa y se conserva historial.

### 3.3 Dependencias institucionales o de servicio

Estas dependencias no deben presentarse como resueltas por código:

- **Seguridad institucional:** política de roles, administrador responsable, gestión de secretos, retención de auditoría y procedimiento de revocación.
- **Normativa y datos ICA:** versión oficial de Tabla 3, umbral 200/201, escalas, pesos, niveles, aplicabilidad, métodos, unidades y reglas de MBR13/MBR14.
- **Identidad y correo:** SMTP/correo institucional, recuperación de contraseña, destinatarios, matrícula COMVEZCOL y fuentes de validación.
- **Evidencia técnica:** laboratorios, firmas, vigencia, autenticidad, legibilidad, entidad emisora y revisión humana trazable.
- **Información de campo:** universo real de galpones, corrales, puntos, aves, edad, cohorte, producción y pertenencia.
- **Calendario y tiempos:** calendario de días hábiles/festivos, zona horaria, ventana de un día hábil, vencimientos y responsables.
- **Servicios externos:** proveedor de IA, clave y límites; almacenamiento de archivos; motor de PDF; correo o push para notificaciones.
- **Gobernanza funcional:** aprobación de catálogos, ponderaciones, niveles, acciones, responsables, exportaciones oficiales y tratamiento de evaluaciones múltiples por finca.

## 4. Secuencia recomendada de ejecución

### Fase 0 — Contención inmediata

Deshabilitar bypass de login, credenciales demo y escritura no autorizada; exigir secreto JWT de producción; bloquear cierres que no puedan persistirse; corregir MBR13; fijar límites de archivo coherentes; evitar que resultados enviados por el cliente sean autoritativos.

### Fase 1 — Núcleo confiable

Implementar autorización unificada, CRUD persistente de predios y usuarios, evaluaciones idempotentes, snapshots/versiones, muestreo real reproducible, observaciones estructuradas, evidencias binarias y auditoría server-side.

### Fase 2 — Cumplimiento y operación

Completar catálogos, ponderaciones, niveles, ventana de cierre, recalificación, recomendaciones/acciones, historial multiusuario, dashboard por finca, filtros transversales y exportaciones PDF/CSV/XLSX.

### Fase 3 — Servicios y mejora

Integrar correo institucional, revisión documental, proveedor de IA, notificaciones anticipadas, calendarios oficiales y controles de integridad avanzados; ejecutar regresión completa y revisión humana/institucional.

## 5. Criterio de cierre del plan

Un RF debe marcarse como cerrado únicamente cuando exista: (a) implementación server-side cuando corresponda; (b) prueba automatizada y evidencia reproducible; (c) persistencia y auditoría verificables; (d) aprobación de la dependencia institucional aplicable; y (e) validación de no regresión sobre evaluaciones cerradas. Hasta entonces, los estados deben conservarse como pendientes, parciales o sujetos a servicio/revisión externa, sin usar este consolidado como certificación oficial.
