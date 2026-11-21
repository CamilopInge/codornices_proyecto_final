# EvalCodorniz + Bienestar Animal ICA

Esta entrega conserva la interfaz visual de EvalCodorniz y agrega la infraestructura de Bienestar Animal ICA por detrás.

## Ejecutar en el PC

```bash
Copy-Item server\.env.example .env
# Cambiar JWT_SECRET y SEED_ADMIN_PASSWORD por valores únicos antes de compartir el servidor.
npm install
npm start
```

Abrir `http://localhost:3000`. La API está en el mismo origen bajo `/api`. El inicio de sesión usa las cuentas almacenadas en el servidor; el administrador inicial se define mediante `SEED_ADMIN_EMAIL` y `SEED_ADMIN_PASSWORD`.

La aplicación sincroniza fincas, evaluaciones, bitácora y catálogos con SQLite incluido en Node.js (no requiere Build Tools de C++). Los permisos se verifican también en la API; el rol de lectura no puede modificar el estado. Las evidencias se guardan en disco fuera de la raíz pública y solo se descargan mediante una ruta autenticada.

## Capacidades integradas

El catálogo `js/data.js` contiene los 35 indicadores ICA y sus escalas. `js/app.js` conserva el panel, navegación, filtros, evaluación, diagnóstico, planes, parametrización, usuarios y bitácora de EvalCodorniz. El backend agrega persistencia de usuarios, predios, evaluaciones y evidencias; sus endpoints están documentados en el servidor.

La verificación de firma profesional, matrícula COMVEZCOL, entidad emisora y vigencia queda identificada como `pendiente_verificacion_oficial` hasta conectar una fuente autorizada o un revisor institucional.

## Validación simulada

El archivo `QA_REGISTRO_SIMULADO_ICA.json` contiene un registro completo de 1.500 aves, 2 galpones, 9 puntos, 90 aves y 35 indicadores para repetir la prueba ICA. El informe `VALIDACION_NORMATIVA_ICA_Y_QA.md` documenta la comparación paso a paso y las brechas que aún dependen de fuentes institucionales.
