# TODO · EvalCodorniz

> Estado inicial: el prototipo está en memoria. Los resultados se marcarán completos solo cuando exista evidencia en la aplicación persistente, no por tener una pantalla de demostración.

## 1. Base ejecutable, autenticación, roles y recuperación — Parcialmente implementado

**Entregado en el Incremento 1:** el servidor escucha en `0.0.0.0:3000`, `/healthz` responde con la base `ready`, `/manus-routes.json` responde JSON 200, las migraciones y seed de roles son idempotentes, el frontend se abre sin autenticación externa ni credenciales demo y carga un perfil local de demostración con acceso a los módulos ICA. Los diagnósticos del proyecto están registrados para JavaScript, HTML, CSS y JSON; `pnpm run check` y `node --check js/app.js` pasan.

**Pendiente:** implementar, si se requiere en una versión productiva posterior, autenticación y autorización persistentes; conectar las pantallas de usuarios, bitácora y módulos a API persistente en lugar de datos demo; y aplicar toda la matriz de permisos en endpoints server-side.

- La aplicación debe ejecutarse en Preview y servir `GET /manus-routes.json` con el conjunto real de rutas.
- El prototipo demostrativo debe permitir el acceso directo a los módulos ICA sin solicitar inicio de sesión con Manus ni credenciales externas.
- Tras 5 intentos fallidos se debe bloquear temporalmente el acceso.
- Deben existir los roles administrador, docente, estudiante evaluador y consultor externo con permisos diferenciados.
- Al asignar o modificar un rol, los permisos se actualizan de inmediato; un usuario sin rol no accede a módulos funcionales.
- La matriz módulo × acción debe ser consultable; el consultor externo debe tener solo lectura.
- El administrador debe poder crear, editar, activar e inactivar usuarios; un usuario nuevo válido puede iniciar sesión de inmediato y uno inactivado no puede ingresar.
- La recuperación debe usar token de un solo uso con caducidad de 30 minutos; los enlaces expirados se rechazan y se sugiere pedir uno nuevo. Si no existe correo configurado, el enlace se muestra en pantalla sin bloquear el proceso.
- Deben registrarse en bitácora los inicios de sesión y cambios relevantes, con usuario, fecha, hora y acción, sin permitir editar o borrar registros.

## 2. Fincas, ubicación, especie e inventario — Pendiente

- Evaluadores, docentes y administradores pueden registrar, consultar, editar e inactivar lógicamente una finca de codornices con sistema productivo obligatorio piso o jaula.
- Con datos obligatorios completos la finca queda disponible para evaluarse; editar no crea un duplicado.
- Una finca con evaluaciones registradas no puede eliminarse: solo se inactiva. Inactivarla no borra evaluaciones, historial ni reportes y no aparece en listados nuevos.
- Se deben guardar departamento y municipio obligatorios, y vereda, dirección y coordenadas opcionales; no registrar coordenadas no bloquea el alta.
- Solo debe aparecer la especie Codorniz (`Coturnix coturnix`). Al asociarla, la finca queda habilitada para crear evaluaciones.
- Se debe registrar inventario de codornices por un día, levante y producción y calcular el tamaño de muestra automáticamente: 10 aves por punto.
- Con menos de 200 aves no se habilita MBG; con 200 aves exactas se trata como `>=200`, habilitando MBG, ponderación 60/25/15 y Tabla 3 de 2 corrales/9 puntos.
- La Tabla 3 debe usar 1 corral y 5 puntos para menos de 200 aves, y 2 corrales y 9 puntos para `>=200`; cada punto corresponde a 10 aves.
- Solo se muestrean aves de 4 semanas o más en producción, priorizando las de mayor edad; el evaluador selecciona aleatoriamente el galpón o corral según la Tabla 3.

## 3. Parametrización ICA, catálogos, niveles y snapshots — Pendiente

- El catálogo activo debe coincidir con los 35 indicadores MBA, MBR y MBG de la matriz; no deben existir otras especies activas.
- Cada indicador debe guardar pregunta, método, criterio, sistema aplicable, condición de aves, tipo de campo, escala y textos de nivel.
- Deben soportarse selección de escala de 2 o 3 niveles, número con umbral, porcentaje con umbral, fórmula calculada, carga de archivo y combinación visual + documental.
- Las escalas deben permitir 100/55/0, 100/55, 100/0 y 100/50/0 según la ficha; MBR13 y MBR14 usan fórmula; MBR7 y MBR10 usan número con umbral del 30 %; MBA1, MBA2, MBA10 y MBA11 usan porcentaje con umbral.
- Deben parametrizarse Tabla 1, Tabla 2, Tabla 3, formatos, tamaño máximo de evidencia, departamentos, municipios, grupos etarios, estados de plan y matriz de permisos.
- Con menos de 200 aves se debe usar 70/30/0; con 200 o más, 60/25/15.
- Los niveles por defecto deben ser Excelente `>=90`, Alto `>=75` y `<90`, Medio `>=50` y `<75`, Bajo `<50`; los rangos no pueden solaparse ni dejar puntajes sin nivel.
- Cambiar criterios, ponderaciones o rangos no debe alterar evaluaciones ya cerradas.
- Al crear una evaluación se debe guardar snapshot de catálogo, escalas, tipos, ponderaciones y sistema; cambios posteriores no la afectan.

## 4. Creación, checklist, respuestas, evidencias y borradores — Pendiente

- Solo se puede crear una evaluación para una finca activa con especie codorniz e inventario registrado; queda en estado `en progreso`, con fecha de visita, evaluador responsable y sistema heredado.
- Una finca no puede tener dos evaluaciones en progreso simultáneamente.
- El checklist debe cargarse automáticamente según número de aves y sistema: menos de 200 incluye MBA sin MBA10 y MBR; `>=200` agrega los 10 MBG; MBA10 solo con más de 200; MBR4 solo jaula; MBR14 y MBR3 solo piso según su condición.
- Antes de diligenciar se muestran corrales, puntos, aves a muestrear y tamaño de muestra; para predios de más de 1.000 aves se activa soporte documental exigido para agua y espacio y para 1.000 o menos se diligencia con información del productor.
- Cada indicador debe mostrar pregunta, método y escala; no se aceptan valores fuera de la escala; se permite observación opcional.
- Los indicadores con muestreo se deben registrar punto por punto y ave por ave cuando corresponda, promediando el porcentaje de cumplimiento del grupo.
- Jadeo y amontonamiento deben capturar porcentaje: `<=40%` → 100, `>40% y <=60%` → 55, `>60%` → 0.
- Mortalidad se diligencia documentalmente con la tasa acumulada de los últimos 5 ciclos y solo aparece con más de 200 aves.
- El sistema debe advertir incoherencia entre jadeo MBA1 y confort térmico MBR11 cuando queden en niveles opuestos.
- MBR7 debe capturar aves, bebederos y límite de fabricante/casa genética y clasificar dentro del límite, hasta 30 % de exceso o más de 30 %.
- MBR10 debe capturar aves, comederos y competencia y clasificar dentro del 30 % sin competencia, por encima sin competencia o por encima con competencia.
- MBR13/MBR14 deben calcular las fórmulas de espacio de su ficha y clasificar contra 55 aves/m².
- MBR8 debe combinar respuesta visual y protocolo de tratamiento cuando el predio tenga más de 1.000 aves.
- MBG solo debe estar disponible con `>=200`; un indicador documental no puede marcarse cumplido sin evidencia. Sin documento se registra en el nivel más bajo de su escala y se advierte; se lista documentación vencida.
- Cuando la ficha exija firma, el documento debe validarse como firmado por MV, MVZ o Z con matrícula vigente, ser legible y no presentar correcciones, sin sustituir la revisión técnica humana.
- Se aceptan JPG, PNG y PDF hasta 5 MB por archivo, con valores configurables; cada evidencia queda asociada a su respuesta y puede eliminarse/reemplazarse mientras la evaluación esté en progreso.
- El evaluador puede guardar avance, reabrir una evaluación en progreso y continuar con respuestas previamente guardadas; una evaluación cerrada no permite cambios.

## 5. Cálculo, validación, cierre, diagnóstico y forma oficial — Pendiente

- El puntaje debe calcularse por indicador, criterio y evaluación, recalculándose al cambiar una respuesta en progreso.
- La calificación final debe usar 70/30/0 con menos de 200 y 60/25/15 con 200 o más; los indicadores no aplicables se excluyen del promedio sin alterar el peso; MBG con peso 0 no entra al cálculo.
- La fórmula debe ser promedio de indicadores aplicables por grupo multiplicado por el peso de Tabla 1, sumando los grupos; sin redondeo intermedio y resultado final redondeado a dos decimales.
- Antes de cerrar se listan indicadores sin respuesta y no se permite cerrar si falta alguno.
- Un documental en 100 sin evidencia bloquea el cierre; uno parcial o bajo sin evidencia permite cerrar mostrando advertencia.
- Cuando todo está completo se habilita el cierre; la evaluación queda `cerrada`, bloqueada contra edición y con diagnóstico guardado, fecha y evaluador de cierre.
- El nivel se asigna por rangos configurados; al cerrar se genera forma oficial con predio, indicadores, respuestas, puntajes, porcentajes por MBA/MBR/MBG, final y nivel.
- El diagnóstico debe agrupar indicadores con puntaje 0 como críticos por MBA, MBR y MBG e indicar explícitamente cuando no hay críticos.
- El resultado se socializa con el productor y se entrega copia como Fase III; documentos pendientes pueden subsanarse dentro de 1 día hábil, recalificando y emitiendo forma definitiva si llegan; si no, la calificación queda definitiva.

## 6. Recomendaciones IA y planes de mejora — Pendiente

- Al cerrar, evaluador o docente puede generar recomendaciones basadas en indicadores MBA, MBR y MBG con bajo puntaje; cada recomendación queda asociada a su indicador.
- Si el servicio IA falla, se muestra el error y se permite reintentar sin perder el diagnóstico.
- Las recomendaciones se ordenan con puntaje 0 antes que intermedio y muestran prioridad alta, media o baja considerando criticidad y peso del criterio.
- El evaluador puede editar, aprobar o descartar; una editada conserva el texto original IA y solo aprobadas pasan al reporte.
- Una recomendación aprobada puede convertirse en plan/acción con descripción, responsable y fecha límite; no se guarda sin responsable y fecha.
- Las acciones tienen estado pendiente, en curso o cumplida y porcentaje de avance; fechas vencidas sin cumplir quedan atrasadas y todas cumplidas cierran el plan.

## 7. Historial, comparación, dashboards y filtros — Pendiente

- El historial por finca se ordena de más reciente a más antigua y muestra fecha, evaluador y calificación; las cerradas se consultan sin modificar.
- Se pueden comparar dos o más evaluaciones de la misma finca y mostrar diferencia por criterio e indicador; no se comparan fincas distintas.
- El dashboard general muestra fincas evaluadas, promedio, distribución por nivel e indicadores con más incumplimientos y se actualiza al cerrar una evaluación.
- El dashboard por finca muestra puntaje por criterio, críticos y estado del plan; si no hay evaluaciones cerradas lo indica.
- Se puede filtrar dashboard e historial por departamento, municipio, rango de fechas, evaluador y nivel; todos los gráficos cambian y un resultado vacío muestra mensaje sin error.
- El consultor externo puede consultar información, pero no editarla.

## 8. Reportes, exportación, consolidado, auditoría y notificaciones — Pendiente

- El reporte PDF solo se genera para evaluaciones cerradas y debe incluir predio, indicadores aplicables con pregunta/respuesta/puntaje, porcentajes por grupo, final, nivel, recomendaciones aprobadas y plan de mejora; la calificación debe coincidir con el sistema.
- CSV/XLSX debe respetar filtros y conservar columnas con código de cada indicador de la matriz.
- El reporte consolidado debe agrupar varias fincas por periodo o zona, incluir número de fincas y promedio por criterio, y excluir fincas sin evaluaciones cerradas en el periodo.
- Los catálogos deben permitir crear/editar valores; un valor en uso no se elimina, solo se inactiva; inactivos no aparecen en registros nuevos.
- La bitácora debe registrar inicios de sesión, creación y cierre de evaluaciones, cambios de parametrización y edición de recomendaciones con usuario, fecha, hora y acción; ningún rol puede editar ni borrar registros.
- Deben existir alertas internas anticipadas para acciones próximas a vencer y evaluaciones pendientes por cerrar; al cumplir la acción, su alerta deja de mostrarse.

## 9. Calidad transversal y entrega — Pendiente

- Las autorizaciones deben verificarse server-side, los secretos nunca deben llegar al navegador y las sesiones deben funcionar en Preview HTTPS embebido con cookie compatible.
- Las migraciones y semillas deben ser repetibles, preservar datos existentes y liberar conexiones al terminar.
- Las evidencias deben usar almacenamiento durable y un índice de aplicación con estado lógico; no se deben guardar archivos de usuario en Git.
- Los cambios deben mantener el manifiesto de rutas, diagnósticos del lenguaje, comandos de desarrollo, readiness HTTP y configuración de publicación.
- Cada incremento debe dejar en este archivo los resultados completados y los requisitos todavía abiertos, junto con el checkpoint correspondiente cuando exista.
