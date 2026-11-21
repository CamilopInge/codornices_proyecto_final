# EvalCodorniz · Bienestar animal ICA

Sistema de evaluación del bienestar animal en **codornices de postura** (*Coturnix coturnix*)
según la metodología del ICA. Cubre el ciclo completo de una visita: registro del predio,
diligenciamiento de los 35 indicadores, cálculo de la calificación, forma oficial,
recomendaciones y plan de mejora, con auditoría de todo lo que ocurre.

---

## Requisitos

- **Node.js 22.14 o superior** (o Node 24+). SQLite viene incluido en Node; no hace falta
  compilar nada ni instalar Visual Studio Build Tools.
- npm 10 o superior.

Verifique su versión:

```bash
node --version
```

---

## Puesta en marcha

### 1. Configurar el entorno

```bash
cp .env.example .env
```

Abra `.env` y complete, como mínimo:

| Variable | Qué poner |
|---|---|
| `JWT_SECRET` | Cadena aleatoria de **32 caracteres o más**. |
| `SEED_ADMIN_PASSWORD` | Contraseña del administrador inicial, **12 caracteres o más**. |

Para generar el secreto:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Preparar la base de datos

```bash
npm run migrar
```

```bash
npm run seed
```

### 4. Arrancar

```bash
npm start
```

Abra **http://localhost:3000** e inicie sesión con el usuario y la contraseña
definidos en `.env` (`SEED_ADMIN_USERNAME` / `SEED_ADMIN_PASSWORD`).

> `npm start` ya aplica migraciones y siembra el administrador si falta, así que los
> pasos 3 y 4 se pueden saltar en un arranque normal. Se listan aparte porque son
> útiles al preparar un entorno nuevo o al diagnosticar.

---

## Arquitectura

Tres capas, cada una en su carpeta, sin que ninguna salte por encima de la siguiente:

```
navegador  ──HTTP/JSON──►  api/  ──llamadas──►  backend/  ──SQL──►  SQLite
 frontend/                (capa HTTP)        (dominio y datos)
      └──────────────── shared/ica/ ────────────────┘
                   (reglas ICA compartidas)
```

```
bienestarICA/
├── shared/ica/        Catálogo de indicadores, tablas normativas, cálculo y roles.
│                      Única fuente de verdad: la usan el backend y el navegador.
├── backend/           Dominio y persistencia. No conoce HTTP.
│   ├── config/        Lectura y validación del entorno.
│   ├── db/            Conexión, migraciones y siembra.
│   ├── repositories/  Acceso a datos (solo SQL y mapeo).
│   ├── services/      Reglas de negocio y casos de uso.
│   ├── mail/          Envío de correo y plantillas.
│   └── errors.js      Errores tipados del dominio.
├── api/               Capa HTTP. No contiene reglas de negocio.
│   ├── middleware/    Autenticación, permisos, límite de tasa, errores.
│   ├── routes/        Rutas REST agrupadas por recurso.
│   ├── app.js         Construcción de Express.
│   └── server.js      Arranque.
├── frontend/          Interfaz. Módulos ES nativos, sin paso de compilación.
│   ├── index.html
│   └── assets/
│       ├── css/       Tokens de diseño, base, componentes, layout, vistas.
│       └── js/
│           ├── core/  Cliente API, estado, enrutador, utilidades de DOM.
│           ├── componentes/
│           └── vistas/
├── scripts/           Operación: migrar, sembrar, truncar, respaldar.
├── tests/             Pruebas del dominio y de integración de la API.
├── docs/              Documentación detallada.
└── data/              Base de datos y evidencias (no se versiona).
```

Las decisiones de diseño y los porqués están en [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md).

---

## Comandos

| Comando | Qué hace |
|---|---|
| `npm start` | Arranca el servidor en el puerto configurado. |
| `npm run dev` | Igual, reiniciando al detectar cambios. |
| `npm test` | Ejecuta las 49 pruebas del dominio y de la API. |
| `npm run check` | Verifica sintaxis e imports de todos los módulos. |
| `npm run migrar` | Aplica las migraciones pendientes. |
| `npm run migrar -- --estado` | Muestra migraciones aplicadas y filas por tabla. |
| `npm run seed` | Crea el administrador inicial si no existe. |
| `npm run seed -- --forzar` | Reestablece el administrador (nombre, rol y contraseña). |
| `npm run backup` | Copia la base y las evidencias fuera del proyecto. |
| `npm run truncate` | **Vacía todas las tablas** (pide confirmación y respalda antes). |
| `npm run probar-correo` | Verifica la configuración SMTP. |
| `npm run probar-asistente` | Verifica el asistente de IA y su filtro de alcance. |

---

## Exportar reportes

Cada reporte se puede llevar a tres formatos:

| Formato | Dónde | Cómo se genera |
|---|---|---|
| **PDF** | Botón *Imprimir / PDF* | Impresión del navegador sobre una vista preparada para papel. Elija «Guardar como PDF» en el diálogo. |
| **Markdown** | Botón *Descargar .md* | Lo arma el servidor con los datos autoritativos. |
| **CSV** | Botón *Descargar CSV* | Para abrir en Excel; incluye BOM para que respete los acentos. |

Disponibles en la forma oficial de una evaluación, en el consolidado por departamento,
en el historial de un predio y en la comparación entre dos visitas.

El Markdown se genera en el servidor y no en el navegador porque es el servidor quien
tiene los datos autoritativos: así el archivo dice exactamente lo mismo que la forma
oficial, sin depender de lo que el cliente tuviera en pantalla.

---

## Asistente de consulta

Chat disponible en toda la aplicación que responde preguntas **sobre los datos de este
sistema y nada más**, usando la API de Gemini.

> ¿Cuántos predios tienen evaluaciones cerradas en Boyacá?
> ¿Qué indicadores fallan más en los predios de jaula?
> ¿Hay acciones del plan de mejora vencidas?

Si le preguntan cuánto es 2×2 o que escriba un poema, responde que eso queda fuera de
su alcance. Es deliberado: hay cuatro capas que restringen de qué puede hablar, y el
contexto que recibe el modelo **respeta la matriz de permisos** — un evaluador solo ve
sus propias visitas, y nadie ve por ahí datos que no vería en la interfaz.

Para habilitarlo, obtenga una clave gratuita en <https://aistudio.google.com/apikey> y
póngala en `.env`:

```
GEMINI_API_KEY=su-clave-aqui
```

```bash
npm run probar-asistente
```

Sin clave el sistema no falla: el panel explica que no está configurado y todo lo demás
sigue funcionando. El detalle completo está en [docs/ASISTENTE-IA.md](docs/ASISTENTE-IA.md).

---

## Roles

| Rol | Puede |
|---|---|
| **Administrador** | Todo: usuarios, parametrización, auditoría y anulación de evaluaciones. |
| **Docente** | Gestiona predios y planes de mejora; consulta evaluaciones sin diligenciarlas. |
| **Evaluador** | Diligencia visitas, las cierra y gestiona planes de mejora. |
| **Consultor** | Solo lectura de evaluaciones y reportes. |

La matriz completa se consulta en la aplicación, en **Parametrización → Matriz de permisos**.
La misma matriz decide qué botones ve la interfaz y qué acepta la API, de modo que
ocultar una opción y bloquear la ruta no pueden quedar desalineados.

---

## Contraseñas y correo

**Nadie escribe la contraseña de otra persona.** Al crear una cuenta, el sistema envía
un enlace de un solo uso para que el titular defina la suya. El mismo mecanismo cubre
el "olvidé mi contraseña" de la pantalla de acceso.

Todos los correos salen de la dirección configurada en `MAIL_FROM`
(por defecto `administrador@evalcodorniz.edu.co`).

### Sin servidor de correo

Si `SMTP_HOST` está vacío, el sistema **no falla**: escribe cada mensaje en
`data/correos-salientes/` como archivo HTML, lo registra en la bitácora y, en desarrollo,
devuelve el enlace en la respuesta de la API y lo muestra en pantalla. Así se puede probar
el flujo completo sin montar un servidor de correo.

### Con servidor de correo

Complete en `.env` y verifique antes de depender de ello:

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=lacuenta@gmail.com
SMTP_PASSWORD=<contraseña de aplicación de 16 caracteres>
```

```bash
npm run probar-correo
```

Comprueba conexión y credenciales sin enviar nada. Para un mensaje real:

```bash
npm run probar-correo -- sucorreo@ejemplo.com
```

> **Gmail reescribe el remitente** si `MAIL_FROM` no es la cuenta autenticada ni un alias
> verificado en *Enviar como*. El arranque avisa si detecta esa discrepancia. El
> procedimiento completo está en [docs/OPERACION.md](docs/OPERACION.md).

Los envíos quedan registrados y se consultan en **Auditoría → Correos enviados**.

---

## La metodología ICA en el sistema

| Regla | Dónde está implementada |
|---|---|
| **Tabla 1 · Ponderación** | ≥ 200 aves → MBA 60 %, MBR 25 %, MBG 15 %. < 200 → MBA 70 %, MBR 30 %, sin MBG. |
| **Tabla 2 · Niveles** | Excelente ≥ 90 · Alto ≥ 75 · Medio ≥ 50 · Bajo < 50. |
| **Tabla 3 · Muestreo** | < 200 aves → 1 corral, 5 puntos. ≥ 200 → 2 corrales, 9 puntos. Siempre 10 aves por punto. |
| **Indicadores condicionados** | MBG solo con ≥ 200 aves · MBA10 solo con > 200 · MBR4 solo jaula · MBR3 y MBR14 solo piso. |
| **Calificación final** | Σ (promedio del grupo × peso), redondeada a 2 decimales. |
| **Densidad máxima** | 55 aves/m². En jaula: CJ = AT/TA, IG = AJ/TG, D = (CJ + IG) / 2. |
| **Soporte documental** | Obligatorio en MBG y mortalidad; en agua y espacio solo con más de 1.000 aves. |

Un indicador en nivel 100 **no se puede cerrar sin su soporte documental**; en niveles
bajos el sistema solo advierte y la forma queda provisional por un día hábil.

### Muestreo reproducible

La selección de corrales, puntos y aves se genera con un algoritmo determinista a partir
de una semilla derivada del código de la evaluación, su fecha y el inventario. La semilla
queda guardada con la evaluación, de modo que una auditoría posterior puede reproducir
exactamente qué se observó.

---

## Flujo de una visita

1. **Predios → Registrar predio.** El inventario decide la ponderación y el muestreo.
2. **Predios → Evaluar.** Se crea la visita con el catálogo vigente *congelado*: aunque la
   parametrización cambie después, esa visita se califica con las reglas del día.
3. **Control de la visita.** Generar la selección de muestra y confirmar bioseguridad y neutralidad.
4. **Diligenciar** los indicadores por grupo (MBA, MBR, MBG), adjuntando evidencias donde se exijan.
5. **Cerrar.** El servidor valida, calcula la calificación y propone recomendaciones.
   La forma nace *provisional*.
6. **Recomendaciones → aprobar → convertir en acción** del plan de mejora.
7. **Emitir forma definitiva** cuando los documentos pendientes estén subsanados.

Una evaluación cerrada es **inmutable**. Si hubo un error, un administrador la anula
dejando constancia del motivo; no se edita ni se borra.

---

## Seguridad

- Contraseñas con bcrypt (12 rondas por defecto) y mínimo de 12 caracteres.
- Sesiones con JWT y registro de emisión, para poder revocarlas antes de su vencimiento.
- Bloqueo de cuenta tras intentos fallidos, **además** del límite por dirección IP.
- Los permisos se verifican en la API, no solo en la interfaz.
- Las evidencias se guardan fuera de la raíz pública y su descarga comprueba de quién es
  la evaluación antes de entregar el archivo.
- Se verifica la firma binaria de cada archivo subido: un `.txt` renombrado a `.pdf` se rechaza.
- Los tokens de restablecimiento se guardan **solo como hash**: si la base se filtra, los
  enlaces no sirven.
- La auditoría es *append-only*: no hay forma de editarla ni borrarla desde la aplicación.

---

## Respaldos

```bash
npm run backup
```

La copia se escribe fuera del proyecto, en `BACKUP_DIR` o `~/bienestarica-backups`, e incluye
la base de datos, los archivos de evidencia y un manifiesto. Se usa la API de respaldo de
SQLite, que produce una copia consistente aunque el servidor esté escribiendo.

Guarde `.env`, los respaldos y las contraseñas en un lugar seguro y **no los suba al repositorio**.

---

## Documentación adicional

- [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md) — decisiones de diseño y por qué se tomaron.
- [docs/API.md](docs/API.md) — referencia de todos los endpoints.
- [docs/OPERACION.md](docs/OPERACION.md) — despliegue, respaldos y resolución de problemas.
- [docs/ASISTENTE-IA.md](docs/ASISTENTE-IA.md) — el asistente de consulta: alcance, configuración y ajustes.
- [auditorias_md/](auditorias_md/) — informes de auditoría normativa previos.

---

## Estado conocido

- El texto oficial del **nivel 50 de MBG10** (Tabla 39 de la norma) está pendiente de
  transcribir. El sistema lo marca visiblemente en Parametrización para que nadie lo
  confunda con texto normativo verificado.
- La verificación de **firma profesional, matrícula COMVEZCOL y entidad emisora** queda
  registrada como `pendiente_verificacion_oficial`: requiere conectar una fuente autorizada
  o un revisor institucional. El sistema no la da por válida.
- Las recomendaciones se generan con plantillas deterministas. Si se configura
  `OPENAI_API_KEY`, pueden enriquecerse con un servicio de IA, y cada recomendación queda
  marcada con su origen.

## Licencia

Sin licencia especificada. Todos los derechos reservados hasta que los propietarios
del proyecto indiquen lo contrario.
# codornices_proyecto_final
