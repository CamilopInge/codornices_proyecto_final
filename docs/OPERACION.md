# Operación

Guía práctica: configurar, desplegar, respaldar y resolver problemas.

---

## Variables de entorno

Todas se leen en `backend/config/env.js`. Las obligatorias se validan al arrancar: si
falta alguna, el servidor no inicia y explica cuál.

### Obligatorias

| Variable | Descripción |
|---|---|
| `JWT_SECRET` | Firma de los tokens. **Mínimo 32 caracteres aleatorios.** Si cambia, todas las sesiones se invalidan. |
| `SEED_ADMIN_PASSWORD` | Contraseña del administrador inicial. **Mínimo 12 caracteres.** Obligatoria en producción. |

En desarrollo, sin `JWT_SECRET` se genera uno efímero y se avisa por consola; las sesiones
no sobreviven a un reinicio. En producción el arranque falla.

### Servidor

| Variable | Por defecto | Descripción |
|---|---|---|
| `NODE_ENV` | `development` | `production` endurece las validaciones. |
| `API_PORT` | `3000` | Puerto. |
| `API_HOST` | `0.0.0.0` | Interfaz de escucha. |
| `APP_URL` | `http://localhost:3000` | URL pública. **Se usa para los enlaces de los correos**, así que debe ser alcanzable por quien los recibe. |
| `FRONTEND_ORIGIN` | vacío | Orígenes CORS separados por coma. Vacío = sin CORS, correcto si la interfaz se sirve desde el mismo origen. |

### Seguridad

| Variable | Por defecto | Descripción |
|---|---|---|
| `JWT_TTL` | `8h` | Vigencia del token: `8h`, `45m`, `2d`. |
| `BCRYPT_ROUNDS` | `12` | Costo del hash. No bajar en producción. |
| `MIN_PASSWORD_LENGTH` | `12` | Longitud mínima. |
| `MAX_LOGIN_ATTEMPTS` | `8` | Intentos antes de bloquear la cuenta. |
| `LOGIN_WINDOW_MINUTES` | `15` | Duración del bloqueo. |
| `RESET_TOKEN_TTL_MINUTES` | `60` | Vigencia del enlace de restablecimiento. |

### Almacenamiento

| Variable | Por defecto | Descripción |
|---|---|---|
| `DATA_DIR` | `./data` | Base de datos, evidencias y correos registrados. |
| `BACKUP_DIR` | `~/bienestarica-backups` | Destino de los respaldos. **Debe estar fuera del proyecto.** |
| `MAX_FILE_BYTES` | `5242880` | Tamaño máximo por evidencia (5 MB). |

### Correo

| Variable | Por defecto | Descripción |
|---|---|---|
| `MAIL_FROM` | `administrador@evalcodorniz.edu.co` | Remitente de todos los correos. |
| `MAIL_FROM_NAME` | `EvalCodorniz ICA` | Nombre visible. |
| `SMTP_HOST` | vacío | Sin valor, los correos se registran en disco en vez de enviarse. |
| `SMTP_PORT` | `587` | |
| `SMTP_SECURE` | `false` | `true` para TLS implícito (puerto 465). |
| `SMTP_USER` / `SMTP_PASSWORD` | vacío | Credenciales SMTP. |

Después de cualquier cambio, compruebe la configuración:

```bash
npm run probar-correo
```

---

## Configurar el envío con Gmail

### 1. Crear una contraseña de aplicación

Gmail **no acepta la contraseña normal** de la cuenta para SMTP. Hace falta una
contraseña de aplicación, y para generarla la cuenta debe tener la verificación en dos
pasos activada.

1. Entre a <https://myaccount.google.com/security> y active **Verificación en dos pasos**
   si aún no lo está.
2. Vaya a <https://myaccount.google.com/apppasswords>.
3. Escriba un nombre (por ejemplo `EvalCodorniz`) y pulse **Crear**.
4. Google muestra 16 caracteres en cuatro bloques. Cópielos.

### 2. Completar `.env`

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=lacuenta@gmail.com
SMTP_PASSWORD=abcdefghijklmnop
```

`SMTP_PASSWORD` va **sin los espacios** que muestra Google. (El sistema los quita de
todos modos, pero conviene pegarlos ya limpios.)

### 3. Comprobar

```bash
npm run probar-correo
```

Verifica la conexión y las credenciales sin enviar nada. Para enviar un mensaje real:

```bash
npm run probar-correo -- sucorreo@ejemplo.com
```

### El remitente y por qué puede no respetarse

Gmail **reescribe el campo "De"** cuando no corresponde a la cuenta autenticada ni a un
alias verificado. Esto afecta directamente a `MAIL_FROM`:

| Situación | Qué pasa |
|---|---|
| `administrador@evalcodorniz.edu.co` es la propia cuenta de Google Workspace | Funciona tal cual. Es el caso ideal. |
| Es una cuenta distinta, pero dada de alta como alias verificado | Funciona: los correos salen de esa dirección. |
| Es una cuenta distinta y **no** está verificada | Gmail la sustituye por la cuenta real. El correo llega, pero de otro remitente. |

Para dar de alta un alias: en Gmail, **Configuración → Ver todos los ajustes → Cuentas e
importación → Enviar como → Añadir otra dirección**. Google envía un código de
confirmación a esa dirección, así que hay que poder leer su correo.

Si no controla ese dominio, lo honesto es poner en `MAIL_FROM` la dirección real desde la
que se envía y dejar `MAIL_FROM_NAME=EvalCodorniz ICA`, de modo que el nombre visible siga
siendo institucional aunque la dirección sea otra.

El arranque del servidor avisa cuando detecta esta discrepancia.

### Límites

Una cuenta de Gmail gratuita permite unos **500 destinatarios al día**; Google Workspace,
2.000. Para el volumen de un sistema de evaluaciones es de sobra. Si en algún momento no
alcanza, o los correos empiezan a caer en spam, conviene pasar a un servicio transaccional
(Brevo, Resend o Mailgun tienen capa gratuita y mejor entregabilidad para correo
automático).

---

## Configurar el envío con Outlook o Microsoft 365

```
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=lacuenta@suinstitucion.edu.co
SMTP_PASSWORD=<contraseña de aplicación si hay MFA>
```

Microsoft deshabilita la autenticación básica SMTP en muchos tenants. Si `npm run
probar-correo` devuelve un error de autenticación aunque las credenciales sean correctas,
pida al área de sistemas que habilite **SMTP AUTH** para esa cuenta.

### IA (opcional)

| Variable | Descripción |
|---|---|
| `OPENAI_API_KEY` | Sin clave, las recomendaciones usan plantillas locales. |
| `OPENAI_API_BASE` | Para un proveedor compatible distinto. |
| `AI_MODEL` | Modelo. Por defecto `gpt-4.1-mini`. |

---

## Puesta en producción

### 1. Preparar el entorno

```bash
cp .env.example .env
```

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

En `.env`:

```
NODE_ENV=production
APP_URL=https://evalcodorniz.suinstitucion.edu.co
JWT_SECRET=<el valor generado>
SEED_ADMIN_PASSWORD=<contraseña fuerte>
BACKUP_DIR=/var/backups/evalcodorniz
SMTP_HOST=smtp.suinstitucion.edu.co
SMTP_USER=...
SMTP_PASSWORD=...
```

### 2. Instalar y arrancar

```bash
npm ci --omit=dev
```

```bash
npm run migrar
```

```bash
npm start
```

### 3. Detrás de un proxy inverso

Con `NODE_ENV=production` la aplicación activa `trust proxy`, de modo que el limitador de
tasa y la auditoría registran la IP real del cliente y no la del proxy.

Ejemplo con nginx:

```nginx
location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host              $host;
    proxy_set_header X-Real-IP         $remote_addr;
    proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    client_max_body_size 10M;   # debe superar MAX_FILE_BYTES
}
```

### 4. Como servicio (systemd)

```ini
[Unit]
Description=EvalCodorniz ICA
After=network.target

[Service]
Type=simple
User=evalcodorniz
WorkingDirectory=/opt/evalcodorniz
ExecStart=/usr/bin/node api/server.js
Restart=on-failure
RestartSec=5
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

La aplicación atiende `SIGTERM` y `SIGINT`: cierra conexiones y la base antes de salir.

---

## Respaldos

```bash
npm run backup
```

Crea `<BACKUP_DIR>/bienestarica-<fecha>/` con la base, las evidencias y un manifiesto.
Se usa la API de respaldo de SQLite, que produce una copia consistente aunque el servidor
esté escribiendo; copiar el archivo a mano **no** lo garantiza.

### Respaldo diario (cron)

```cron
0 2 * * * cd /opt/evalcodorniz && /usr/bin/npm run backup >> /var/log/evalcodorniz-backup.log 2>&1
```

### Restaurar

```bash
# 1. Detener el servicio
sudo systemctl stop evalcodorniz

# 2. Reemplazar la base y las evidencias
cp /var/backups/evalcodorniz/bienestarica-<fecha>/bienestar-ica.sqlite data/
rm -rf data/evidencias && cp -r /var/backups/evalcodorniz/bienestarica-<fecha>/evidencias data/

# 3. Arrancar
sudo systemctl start evalcodorniz
```

---

## Vaciar la base

```bash
npm run truncate
```

Pide escribir `BORRAR` para continuar, **crea un respaldo antes**, vacía todas las tablas,
elimina los archivos de evidencia, reinicia los contadores de id y vuelve a sembrar el
administrador para no dejar el sistema sin acceso.

| Opción | Efecto |
|---|---|
| `--si` | Omite la confirmación (para scripts). |
| `--conservar-usuarios` | No toca la tabla de usuarios ni las evidencias. |
| `--sin-respaldo` | No crea la copia previa. |

```bash
npm run truncate -- --conservar-usuarios
```

---

## Mantenimiento de la base

### Ver el estado

```bash
npm run migrar -- --estado
```

Lista las migraciones aplicadas y cuántas filas tiene cada tabla.

### Añadir una migración

Cree `backend/db/migrations/002_descripcion.sql`. Se aplicará en orden alfabético la
próxima vez que arranque el servidor o se ejecute `npm run migrar`.

**Nunca edite una migración ya aplicada.** El ejecutor guarda el checksum de cada archivo
y avisa si cambió; el esquema de los entornos que ya la corrieron no se actualizaría.

### Inspeccionar la base

```bash
node -e "const {DatabaseSync}=require('node:sqlite');const db=new DatabaseSync('./data/bienestar-ica.sqlite',{readOnly:true});console.table(db.prepare('SELECT id,nombre,email,rol,activo FROM usuarios').all())"
```

O con una interfaz gráfica: [DB Browser for SQLite](https://sqlitebrowser.org/), abriendo
`data/bienestar-ica.sqlite` **en modo solo lectura** si el servidor está corriendo.

---

## Resolución de problemas

### El servidor no arranca: "Configuracion invalida"

Falta o es inválida alguna variable obligatoria. El mensaje dice cuál. Lo más común es
`JWT_SECRET` con menos de 32 caracteres.

### "No such built-in module: node:sqlite"

La versión de Node es anterior a la 22.14. Compruebe con `node --version` y actualice.

### El puerto está ocupado

```bash
netstat -ano | grep ":3000" | grep LISTENING
```

En Windows, termine el proceso por su PID:

```bash
taskkill //F //PID <pid>
```

> En Git Bash sobre Windows, `pkill -f "node api/server.js"` **no** coincide con el proceso.
> Hay un script que hace lo correcto:
>
> ```bash
> bash scripts/reiniciar-dev.sh
> ```

### Los correos no llegan

1. Compruebe `GET /api/health`: el campo `correo` dice `smtp` o `registro-en-disco`.
2. Sin SMTP, los mensajes están en `data/correos-salientes/` como archivos HTML.
3. Con SMTP, revise **Auditoría → Correos enviados**: los fallidos guardan el error.
4. Verifique que `APP_URL` sea alcanzable: los enlaces se construyen con ese valor.

### Alguien perdió el acceso

Desde la aplicación: **Usuarios → Restablecer**. Envía un enlace y cierra sus sesiones.

Si nadie puede entrar como administrador:

```bash
npm run seed -- --forzar
```

Reestablece el administrador de `.env` (rol, estado y contraseña) sin tocar el resto.

### "Ya existe una evaluacion en progreso para este predio"

Lo impone un índice único en la base. Cierre la visita abierta o, como administrador,
anúlela indicando el motivo.

### Una evaluación se cerró con datos equivocados

Las evaluaciones cerradas son inmutables a propósito: son documentos oficiales fechados.
Un administrador la anula con `POST /api/evaluaciones/:id/anular` dejando constancia del
motivo, y se abre una visita nueva. Nada se borra.

### La interfaz muestra código HTML como texto

Caché del navegador con una versión mezclada. Recargue con **Ctrl+F5**.

### Errores de CSS o JavaScript en navegadores antiguos

El frontend usa módulos ES, `fetch` y el selector CSS `:has()`. Requiere Chrome 105+,
Firefox 121+ o Safari 15.4+.

---

## Verificación tras un despliegue

```bash
npm run check
```

```bash
npm test
```

```bash
curl -s localhost:3000/api/health
```

Y en la interfaz: iniciar sesión, abrir el panel y comprobar que **Auditoría** registra
ese acceso.

---

## Qué vigilar

| Señal | Dónde | Qué significa |
|---|---|---|
| Intentos de acceso fallidos | Auditoría, `resultado = fallo` | Posible ataque de fuerza bruta. |
| Correos fallidos | Auditoría → Correos enviados | Problema de SMTP: nadie puede restablecer su contraseña. |
| Acciones atrasadas | Panel general | Planes de mejora vencidos sin cumplir. |
| Tamaño de `data/` | Sistema de archivos | Las evidencias crecen sin límite; no hay purga automática. |
| Evaluaciones en progreso antiguas | Evaluaciones, filtro "En progreso" | Visitas abandonadas que bloquean su predio. |
