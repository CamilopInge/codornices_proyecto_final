# Validación de integración final

## Resultado

La entrega final usa EvalCodorniz como shell visual. Se conservaron su encabezado, navegación, estilos, dashboard, tarjetas, tablas, filtros, vistas de evaluación, diagnóstico, planes, parametrización, usuarios y bitácora. No se incorporó la pantalla Angular de Bienestar Animal como reemplazo visual.

## Funcionalidad normativa incorporada

El catálogo de `js/data.js` contiene los 35 indicadores ICA MBR/MBA/MBG, escalas, preguntas, aplicabilidad por sistema y reglas de ponderación. `js/app.js` conserva la lógica ampliada de muestreo, snapshot, evidencias, diagnósticos, recomendaciones, planes, comparación, reportes y parametrización; la autenticación y los permisos de usuarios se verifican en el servidor.

## Infraestructura incorporada

El servidor unificado conserva los archivos estáticos de EvalCodorniz y expone la API en el mismo origen. Incluye SQLite WAL mediante `node:sqlite`, usuarios con JWT y bcrypt, roles admin/evaluador/lectura, predios, evaluaciones, evidencias, SHA-256, auditoría y endpoint de IA. No requiere una cuenta de Manus; sí requiere una cuenta de la aplicación.

## Pruebas ejecutadas

Se comprobó que `/` entrega el HTML de EvalCodorniz con su CSS y JavaScript originales. `/api/health` respondió correctamente con SQLite WAL. El login JWT del administrador funcionó. Se creó una evaluación persistida con predio, inventario de 1.500 aves, sistema jaula y muestra ICA. La integración unificada respondió correctamente en `http://localhost:3000`.

## Uso

```bash
Copy-Item server\.env.example .env
# En producción, definir JWT_SECRET y SEED_ADMIN_PASSWORD únicos y seguros.
npm install
npm start
```

Abrir `http://localhost:3000`. En desarrollo, si se deja `SEED_ADMIN_PASSWORD` vacío, el servidor genera una contraseña inicial temporal y la muestra en la consola.

## Límite oficial

La app registra evidencias y deja el estado `pendiente_verificacion_oficial` para firma profesional, matrícula COMVEZCOL, entidad emisora y vigencia hasta conectar una fuente autorizada o un flujo de revisión institucional. No se simula aprobación oficial.
