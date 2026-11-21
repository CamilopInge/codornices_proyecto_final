# EvalCodorniz · Prototipo anterior

Documento de la versión inicial del prototipo navegable del sistema de evaluación de bienestar animal en codornices de postura, basado en la metodología del ICA. La aplicación actual integra autenticación y almacenamiento en servidor; consulta el [README principal](./README.md) para ejecutarla.

> Las instrucciones siguientes describen solo el prototipo anterior y no aplican a la versión actual.

## Cómo abrirlo

- Abre `index.html` con doble clic en cualquier navegador moderno, o
- súbelo a GitHub Pages (Settings → Pages → rama `main`, carpeta raíz), o
- sírvelo localmente: `npx serve .` o `python -m http.server`.

## Acceso (versión anterior)

Esta versión no incluía autenticación real; la versión actual requiere iniciar sesión con una cuenta creada en el servidor. No uses las instrucciones de acceso de este documento para configurar el sistema actual.

## Estructura

```
index.html        Punto de entrada
css/styles.css    Estilos y tokens de color (tema claro y oscuro)
js/data.js        Catálogo de los 35 indicadores (MBA, MBR, MBG) y parámetros ICA
js/app.js         Reglas de cálculo, estado en memoria, vistas y eventos
```

## Qué cubre

| Módulo | Requerimientos |
|---|---|
| Inicio de sesión, roles, bloqueo tras 5 intentos, recuperación simulada | RF01 – RF04 |
| Fincas: sistema piso/jaula, ubicación, inventario por grupo etario, baja lógica | RF05 – RF08 |
| Parametrización en modo consulta: indicadores, Tablas 1, 2 y 3, matriz de permisos | RF09 – RF12, RF38 |
| Evaluación: checklist según aves y sistema, muestreo, porcentajes, fórmula de espacio, evidencias, guardado | RF13 – RF19 |
| Cálculo, validación previa al cierre, forma oficial y críticos | RF20 – RF23 |
| Recomendaciones con IA simulada, aprobación, plan de mejora y seguimiento | RF24 – RF28 |
| Historial, panel general con filtros, dashboard por finca y análisis | RF29, RF30, RF31, RF32, RF33, RF40 |
| Reporte imprimible/PDF, CSV y consolidado local | RF34 – RF36 |
| Usuarios y bitácora | RF03, RF39 |

### Reglas implementadas

- **Ponderación (Tabla 1):** ≥ 200 aves → MBA 60 %, MBR 25 %, MBG 15 %; < 200 aves → MBA 70 %, MBR 30 %, sin MBG.
- **Niveles (Tabla 2):** Excelente ≥ 90 · Alto ≥ 75 · Medio ≥ 50 · Bajo < 50.
- **Muestreo (Tabla 3):** < 200 aves → 1 corral y 5 puntos; ≥ 200 → 2 corrales y 9 puntos; 10 aves por punto.
- **Indicadores condicionados:** MBG solo con ≥ 200 aves; Mortalidad (MBA10) solo con > 200; MBR4 solo jaula; MBR3 y MBR14 solo piso.
- **Calificación final:** Σ (promedio del grupo × peso), redondeada a 2 decimales.

## Limitaciones del prototipo

- Persistencia limitada al navegador: usa `localStorage`; no hay base de datos ni sincronización entre usuarios.
- Las recomendaciones de "IA" se generan con plantillas a partir del nivel 100 de cada ficha.
- La salida PDF usa la función de impresión del navegador; la exportación disponible es CSV, no XLSX nativo.
- El texto del nivel 50 de MBG10 (Tabla 39) está pendiente de transcribir de la norma.

## Actualización normativa ICA — 30 de octubre de 2026

Se incorporaron al prototipo local, sin base de datos, el snapshot completo de indicadores, pesos y muestra; el control de fases de visita, corrales, puntos, aves priorizadas, bioseguridad y neutralidad; la captura de muestras 100/55/0; los campos específicos de MBR7, MBR10, MBR13, MBR14 y MBA10; los metadatos de evidencia; la comparación por indicador; la forma oficial imprimible con recomendaciones y plan; y catálogos/niveles editables desde Parametrización.

El estado permanece en `localStorage`. Los archivos se identifican localmente por nombre para la demostración; todavía no existe almacenamiento transaccional, autenticación real ni servicio de IA conectado.
