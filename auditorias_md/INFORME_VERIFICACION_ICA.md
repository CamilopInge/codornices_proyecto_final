# Informe de verificación ICA · EvalCodorniz

**Fuente revisada:** `EvalCodorniz_Requerimientos (2).docx`, `EvalCodorniz_Matriz (2).xlsx` y el prototipo corregido `evalcodorniz-ica-sin-login.zip`.

**Conclusión ejecutiva:** el prototipo contiene la lógica principal de evaluación ICA y los 35 indicadores de la matriz, pero **no cumple todavía todos los requisitos RF01–RF40**. Es una demostración navegable en memoria; no es aún una aplicación persistente completa ni una entrega final conforme a todos los criterios.

## Verificaciones objetivas

- Catálogo ICA: **35 indicadores**, sin códigos repetidos: 14 MBR, 11 MBA y 10 MBG.
- Ponderación implementada: `<200` aves = 70/30/0; `>=200` aves = 60/25/15.
- Tabla 3 implementada: `<200` = 1 corral, 5 puntos; `>=200` = 2 corrales, 9 puntos; 10 aves por punto.
- Condiciones implementadas: MBG desde 200 aves, MBA10 solo con más de 200, MBR3/MBR14 en piso y MBR4 en jaula.
- Umbral de espacio implementado: 55 aves/m².
- Estados de nivel implementados: Excelente ≥90, Alto ≥75, Medio ≥50 y Bajo <50.
- El acceso actual es directo, sin solicitar cuenta de Manus, conforme a la última instrucción del usuario; por eso RF01, tal como está redactado en el documento original, queda deliberadamente sustituido por el modo demostración local.

## Matriz RF01–RF40

| RF | Estado | Verificación y brecha |
|---|---|---|
| RF01 Autenticación | **No cumple / cambio solicitado** | El documento exige usuario, contraseña, errores genéricos y bloqueo tras 5 intentos. El prototipo ahora entra directamente con un perfil local porque se solicitó no pedir ingreso con Manus. No existe autenticación real ni bloqueo. |
| RF02 Roles | **Parcial alto** | Existen cuatro usuarios locales de demostración, cuatro roles y una matriz de permisos; el selector de usuario aplica el rol inmediatamente y la navegación filtra módulos. La autorización es solo del cliente, no server-side, y no hay sesión real. |
| RF03 Usuarios | **Parcial** | La pantalla Usuarios muestra los cuatro perfiles, permite crear usuarios de prueba, cambiar rol e inactivar/activar. Los datos se conservan en `localStorage`, pero no existe autenticación ni bloqueo server-side de usuarios inactivos. |
| RF04 Recuperación | **No cumple** | No existe recuperación por correo, token de un solo uso ni caducidad de 30 minutos. |
| RF05 Fincas | **Parcial** | Hay alta, edición, activación/inactivación, sistema piso/jaula e inventario. Los datos se pierden al recargar y no hay persistencia ni reglas server-side. |
| RF06 Ubicación | **Cumple en UI / parcial en sistema** | Departamento y municipio son obligatorios; vereda, dirección y coordenadas son opcionales. El estado solo vive en memoria. |
| RF07 Especie | **Parcial** | La interfaz fija Codorniz (`Coturnix coturnix`) y no ofrece otras especies, pero no existe una asociación de especie persistida en la entidad finca. |
| RF08 Inventario | **Parcial alto** | Se calculan umbrales, ponderaciones y Tabla 3, incluido el caso exacto de 200 aves. No se implementan selección aleatoria de galpón/corral, priorización real por edad ≥4 semanas ni registro detallado de grupos muestreados. |
| RF09 Parametrización de especie | **Parcial** | El catálogo contiene los 35 indicadores correctos y solo Codorniz, pero la parametrización se muestra en consulta; no se puede administrar persistente. |
| RF10 Criterios | **Parcial** | Cada indicador tiene pregunta, método y escala en el catálogo. No se pueden modificar criterios ni mantener snapshots completos del catálogo. |
| RF11 Ponderaciones | **Cumple para cálculo / no configurable** | Los pesos ICA están implementados correctamente según el número de aves. No existe edición de ponderaciones por administrador. |
| RF12 Tipos de respuesta | **Parcial alto** | Existen selección de escala, porcentaje, fórmula de densidad y carga documental, con escalas del catálogo. Falta parametrización editable y la combinación visual + documental completa. |
| RF13 Creación de evaluación | **Parcial** | Se crea evaluación en progreso, con fecha, finca, evaluador, sistema, pesos e indicadores aplicables; se evita crear otra mientras hay una en progreso. El snapshot solo conserva códigos/pesos, no la configuración completa, y no hay persistencia. |
| RF14 Checklist | **Parcial alto** | Se aplican correctamente varias condiciones por aves y sistema y se muestra la Tabla 3. No se ejecuta muestreo real por corrales/puntos ni el flujo documental completo para predios de más de 1.000 aves. |
| RF15 Indicadores MBA | **Parcial** | Se soportan escalas, observaciones, porcentajes de jadeo/amontonamiento y advertencia de incoherencia MBA1/MBR11. No se captura ave por ave/punto por punto y mortalidad aparece como porcentaje, no como flujo documental de los cinco ciclos. |
| RF16 Indicadores MBR | **Parcial** | Hay escalas, observaciones y fórmula simplificada de aves/m². MBR7 y MBR10 no capturan todos los datos específicos de bebederos/comederos y competencia; MBR8 no combina completamente respuesta visual y protocolo documental. |
| RF17 Indicadores MBG | **Parcial** | MBG aparece desde 200 aves y la respuesta 100 sin evidencia bloquea el cierre. No se validan firma profesional, matrícula, legibilidad, correcciones ni vencimiento de documentos. |
| RF18 Guardado | **Parcial** | Existe botón de guardar y ahora el prototipo conserva el estado en `localStorage`, permitiendo retomar en el mismo navegador. No hay sincronización entre usuarios ni servidor. |
| RF19 Evidencias | **Parcial** | Se aceptan PDF/JPG/PNG hasta 5 MB y se asocian a la respuesta durante la sesión. No hay almacenamiento durable, eliminación/reemplazo formal ni validación configurable desde catálogos. |
| RF20 Puntajes | **Cumple en lógica de cálculo** | Se calculan promedios por grupo, pesos 70/30/0 y 60/25/15, exclusión de no aplicables y redondeo final a dos decimales. La evidencia es en memoria y no hay cálculo server-side. |
| RF21 Validación previa | **Cumple en demostración** | Lista faltantes, bloquea documental en 100 sin evidencia y permite cierre con advertencia para niveles bajos sin soporte. |
| RF22 Cierre y diagnóstico | **Parcial alto** | Se cierra, se bloquea la edición, se calcula nivel y se muestra forma provisional/definitiva con detalle. La forma se puede imprimir/guardar como PDF desde Reportes; no hay flujo real de subsanación server-side. |
| RF23 Críticos | **Cumple en demostración** | Los puntajes 0 se muestran agrupados por MBA, MBR y MBG; también se informa cuando no existen críticos. |
| RF24 Recomendaciones IA | **Parcial** | Se generan recomendaciones asociadas a indicadores bajos. Es una simulación por plantillas, no un servicio IA real, y no existe manejo real de error/reintento del servicio. |
| RF25 Priorización | **Cumple en demostración** | Ordena por prioridad y considera puntajes 0/intermedios y peso del grupo. |
| RF26 Edición/aprobación | **Cumple en demostración** | Permite editar, aprobar y descartar; conserva el texto original cuando se edita. |
| RF27 Plan de mejora | **Cumple en demostración** | Una recomendación aprobada puede convertirse en acción con descripción, responsable y fecha obligatorios. |
| RF28 Seguimiento | **Cumple en demostración** | Maneja pendiente, en curso, cumplida, avance, cierre cuando todas se cumplen y marca acciones atrasadas. |
| RF29 Historial | **Cumple en demostración** | Lista evaluaciones ordenadas de más reciente a más antigua y permite consultar las cerradas sin modificarlas. |
| RF30 Comparación | **Parcial** | Reportes permite comparar dos evaluaciones y muestra diferencias por MBA, MBR, MBG y final; valida que pertenezcan a la misma finca. |
| RF31 Dashboard general | **Parcial alto** | Muestra fincas, evaluaciones cerradas, promedio, distribución por nivel e indicadores con más incumplimientos. No se puede verificar el modo consultor real porque el acceso actual es local con perfil administrador. |
| RF32 Dashboard por finca | **Parcial** | Reportes permite consultar una finca, su historial, última calificación, nivel y acciones. Falta el detalle completo de críticos por criterio como vista independiente. |
| RF33 Filtros | **Parcial alto** | El dashboard filtra por departamento, municipio, rango de fechas, evaluador y nivel; todavía no todos los gráficos secundarios tienen filtros independientes. |
| RF34 PDF | **Parcial** | Reportes genera una forma imprimible con datos del predio, indicadores, puntajes, grupos, final y nivel; el usuario puede elegir “Guardar como PDF”. |
| RF35 Excel/CSV | **Parcial** | Reportes descarga CSV por evaluación cerrada con códigos e indicadores de la matriz. No genera XLSX ni aplica filtros avanzados al archivo. |
| RF36 Consolidado | **Parcial** | Reportes genera consolidado local por departamento con número de evaluaciones, promedio final y promedios MBA/MBR/MBG; faltan filtros por periodo/zona configurables. |
| RF37 Catálogos | **No cumple** | Los catálogos están codificados; no hay CRUD de departamentos, municipios, grupos etarios, estados, formatos ni tamaño máximo de evidencia. |
| RF38 Niveles | **Parcial** | Los rangos de Tabla 2 están implementados y visibles. No se pueden editar, validar ni versionar como catálogo. |
| RF39 Bitácora | **Parcial** | Existe bitácora de acciones en memoria y solo lectura. No es persistente, no registra inicios de sesión en el modo directo y no cubre trazabilidad server-side. |
| RF40 Notificaciones | **Parcial** | Reportes y Planes muestran alertas locales de evaluaciones en progreso y acciones vencidas; falta una alerta anticipada configurable antes del vencimiento. |

## Requisitos no funcionales y de arquitectura

También quedan pendientes o incompletos varios requisitos transversales del documento:

- **Persistencia:** el prototipo conserva fincas, evaluaciones, usuarios, respuestas y bitácora en `localStorage` del navegador; no hay base de datos, sincronización ni control multiusuario.
- **Seguridad:** se retiró el login externo por solicitud del usuario; por tanto, los permisos no constituyen control de seguridad real.
- **Evidencias:** no existe almacenamiento durable ni validación documental profesional.
- **Reportes:** hay impresión a PDF, CSV y consolidado local; no hay XLSX ni reportes server-side.
- **IA:** las recomendaciones son simuladas con plantillas.
- **Configuración:** catálogos, pesos y niveles no son editables desde la aplicación.
- **Auditoría:** la bitácora no es persistente ni completa.

## Resultado final

El prototipo es válido como **prototipo navegable y demostración de la lógica ICA**, especialmente para:

1. Catálogo de 35 indicadores.
2. Reglas de aplicabilidad por aves y sistema.
3. Ponderaciones y cálculo de calificación.
4. Checklist, validación de cierre y diagnóstico.
5. Recomendaciones, planes de mejora e historial básico.

No debe declararse todavía como **“cumple todos los requisitos ICA”**. Para alcanzar esa declaración se deben completar, como mínimo, RF04, XLSX y filtros/reportes avanzados de RF33–RF36, catálogos editables RF37, la validación documental/operativa de RF14–RF17, alertas anticipadas RF40 y la seguridad server-side; además de decidir formalmente si RF01 se mantiene fuera del alcance por la instrucción de no solicitar login.
