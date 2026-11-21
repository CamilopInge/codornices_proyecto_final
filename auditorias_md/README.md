# bienestarICA

Aplicación web para evaluar el bienestar animal de codornices de postura con base en los indicadores y criterios de la metodología ICA. Incluye interfaz para gestionar fincas, evaluaciones, muestras, resultados, recomendaciones y reportes, además de un backend con persistencia local.

> **Estado del proyecto:** aplicación en evolución. Aunque la autenticación y el almacenamiento ya se realizan en el servidor, revisa y configura el entorno y las copias de seguridad antes de exponerlo públicamente o almacenar datos sensibles.

## Funcionalidades

- Registro y consulta de fincas e inventarios.
- Evaluaciones con indicadores de bienestar animal (MBA, MBR y MBG).
- Selección de muestras, captura de resultados y evidencias.
- Cálculo de puntajes, validación y generación de informes.
- Planes de mejora, reportes y exportación CSV.
- Backend Node.js/Express con API, usuarios, auditoría, evidencias y base SQLite.

## Requisitos

- Node.js 24 o Node.js 22.14+ y npm. SQLite se incluye en Node.js; no requiere Visual Studio Build Tools.

## Instalación y ejecución local

Desde la carpeta del proyecto:

```powershell
Copy-Item server\.env.example .env
# Cambia JWT_SECRET y SEED_ADMIN_PASSWORD por valores únicos antes de compartir el servidor.
npm install
npm start
```

Abre <http://localhost:3000>. En el primer inicio se crea el administrador definido en `.env`; si no se configura `SEED_ADMIN_PASSWORD`, el servidor genera una contraseña temporal y la muestra una sola vez en la consola. Crea las demás cuentas desde **Usuarios** después de iniciar sesión como administrador. No hay credenciales de demostración habilitadas por defecto.

Para validar la sintaxis y ejecutar las pruebas de autenticación y persistencia:

```powershell
npm run check
npm test
```

Las fincas, evaluaciones, bitácora y configuración se guardan en SQLite en el servidor. Los cambios concurrentes se controlan mediante revisiones; si otra sesión guardó primero, la sesión actual se cierra para evitar sobrescribir esos datos y tendrás que iniciar sesión de nuevo para cargar la versión actualizada. Los cambios pendientes que no llegaron a guardarse no se conservan.

Para crear un respaldo manual de la base de datos y los archivos de evidencia:

```powershell
npm run backup
```

El respaldo se guarda fuera del repositorio, en `~/bienestarica-backups` salvo que configures `BACKUP_DIR` en `.env`. Guarda `.env`, respaldos y contraseñas en un lugar seguro; no los subas a GitHub.

## Seguridad y cuentas

La autenticación usa contraseñas con hash en el servidor y tokens de sesión con vencimiento. Los permisos de escritura se vuelven a verificar en la API; el rol de consulta no puede guardar cambios. El administrador inicial se define mediante `SEED_ADMIN_EMAIL` y `SEED_ADMIN_PASSWORD`.

## Estructura

```text
index.html          Entrada de la aplicación
css/styles.css      Estilos de la interfaz
js/app.js           Vistas, interacción y lógica del frontend
js/data.js          Indicadores y parámetros ICA
server/index.js     API Express
server/database.js  Adaptador para SQLite incluido en Node.js
server/backup.js    Copia manual de la base y evidencias
server/.env.example Ejemplo de variables de entorno
test/               Pruebas de autenticación y persistencia
```

## Documentación adicional

- [Descripción del prototipo](./README-prototipo.md)
- [Infraestructura y validación](./README-INFRAESTRUCTURA-EVALCODORNIZ.md)
- [Validación normativa ICA y QA](./VALIDACION_NORMATIVA_ICA_Y_QA.md)

## Licencia

No se ha especificado una licencia. Todos los derechos quedan reservados hasta que los propietarios del proyecto indiquen lo contrario.
