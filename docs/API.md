# Referencia de la API

Base: `/api` · Formato: JSON · Autenticación: `Authorization: Bearer <token>`

---

## Convenciones

**Errores.** Todas las respuestas de error tienen la misma forma:

```json
{ "error": "VALIDACION", "mensaje": "Texto legible para el usuario.", "detalles": {} }
```

| Código | Estado | Cuándo |
|---|---|---|
| `VALIDACION` | 400 | Los datos enviados no cumplen las reglas. |
| `NO_AUTENTICADO` | 401 | Falta el token, venció o la sesión fue revocada. |
| `SIN_PERMISO` | 403 | El rol no alcanza para esta acción. |
| `NO_ENCONTRADO` | 404 | El recurso no existe. |
| `CONFLICTO` | 409 | Choca con el estado actual (p. ej. evaluación ya cerrada). |
| `ARCHIVO_GRANDE` | 413 | El archivo supera el máximo. |
| `LIMITE_EXCEDIDO` | 429 | Demasiadas solicitudes. Incluye cabecera `Retry-After`. |
| `SERVICIO_EXTERNO` | 502 | Un servicio externo no respondió. |
| `ERROR_INTERNO` | 500 | Fallo no previsto. |

**Permisos.** Cada ruta indica el módulo y el nivel que exige: `r` lectura, `w` escritura.
La matriz completa está en `shared/ica/roles.js` y se consulta en `GET /catalogo/permisos`.

---

## Salud

### `GET /health`
Sin autenticación. Para monitoreo.

```json
{
  "ok": true, "servicio": "EvalCodorniz API", "entorno": "development",
  "catalogo": "ICA-CODORNIZ-2026.11", "baseDatos": "sqlite-wal",
  "correo": "smtp", "ia": false, "hora": "2026-11-07T02:00:00.000Z"
}
```

---

## Autenticación · `/auth`

### `POST /auth/login`
Público. Limitado a 20 intentos por IP cada 15 minutos.

```json
{ "identificador": "administrador", "password": "..." }
```

`identificador` acepta usuario **o** correo.

```json
{
  "token": "eyJ...", "expiraEn": "2026-11-07T09:50:01.522Z", "vigenciaSegundos": 28800,
  "usuario": { "id": 1, "nombre": "Administrador", "username": "administrador",
               "email": "administrador@evalcodorniz.edu.co", "rol": "admin",
               "debeCambiarPassword": false }
}
```

El mensaje de error es idéntico para usuario inexistente y contraseña incorrecta.
Tras varios fallos la cuenta se bloquea temporalmente.

### `GET /auth/me`
Devuelve el usuario de la sesión actual.

### `POST /auth/logout`
Revoca el token actual.

### `POST /auth/cambiar-password`
Exige la contraseña actual. Cierra todas las sesiones y envía un aviso por correo.

```json
{ "passwordActual": "...", "passwordNueva": "..." }
```

### `POST /auth/recuperar`
Público. Solicita el enlace de restablecimiento.

```json
{ "correo": "persona@evalcodorniz.edu.co" }
```

La respuesta es la misma exista o no la cuenta. En desarrollo sin SMTP incluye
`enlaceDesarrollo` para poder probar el flujo.

### `GET /auth/restablecer/:token`
Público. Comprueba el enlace antes de mostrar el formulario.

```json
{ "valido": true, "nombre": "...", "correo": "...", "expiraEn": "..." }
```

### `POST /auth/restablecer`
Público. Define la contraseña nueva. El token es de un solo uso.

```json
{ "token": "...", "passwordNueva": "..." }
```

---

## Usuarios · `/usuarios` · módulo `usuarios`

### `GET /usuarios` · `r`
```json
{ "usuarios": [...], "roles": [{ "valor": "admin", "nombre": "Administrador" }, ...] }
```

### `POST /usuarios` · `w`
Crea la cuenta y envía la invitación. **No se define contraseña aquí.**

```json
{ "nombre": "Ana Pérez", "username": "aperez", "email": "ana@...", "rol": "evaluador" }
```

```json
{ "usuario": { ... }, "correoEnviado": true }
```

### `PATCH /usuarios/:id` · `w`
Acepta `nombre`, `rol` y `activo`. Nadie puede quitarse su propio rol de administrador ni
desactivar su cuenta, y debe quedar al menos un administrador activo.

### `POST /usuarios/:id/reenviar-invitacion` · `w`
### `POST /usuarios/:id/restablecer` · `w`
Fuerza el restablecimiento: envía un enlace y revoca las sesiones de esa cuenta.

---

## Predios · `/predios` · módulo `predios`

### `GET /predios` · `r`
Filtros: `soloActivos=1`, `departamento`, `municipio`, `busqueda`.

Cada predio incluye metadatos derivados de la norma:

```json
{
  "id": 1, "nombre": "Granja La Esperanza", "sistema": "jaula",
  "totalAves": 1500, "inventario": { "dia": 0, "levante": 300, "produccion": 1200 },
  "propietario": { "nombre": "...", "cargo": "Dueno", ... },
  "evaluacionAbierta": null,
  "ica": {
    "ponderacion": { "MBA": 60, "MBR": 25, "MBG": 15 },
    "muestreo": { "corrales": 2, "puntos": 9, "avesPorPunto": 10, "totalAvesMuestra": 90 },
    "indicadoresAplicables": 33, "evaluaGestion": true
  }
}
```

### `POST /predios` · `w`
```json
{
  "nombre": "...", "sistema": "jaula|piso",
  "departamento": "...", "municipio": "...",
  "codigoIca": null, "vereda": null, "direccion": null,
  "latitud": null, "longitud": null,
  "inventario": { "dia": 0, "levante": 300, "produccion": 1200 },
  "propietario": {
    "nombre": "...", "cargo": "Dueno|Encargado",
    "documento": "...", "telefono": "...", "correo": null
  }
}
```

Requiere al menos un ave. El `codigoIca` debe ser único.

### `GET /predios/:id` · `r`
### `PUT /predios/:id` · `w`
No se puede cambiar el sistema productivo con una evaluación en curso.

### `POST /predios/:id/estado` · `w`
```json
{ "activo": false }
```
Baja lógica. No se puede inactivar un predio con una visita abierta.

---

## Evaluaciones · `/evaluaciones` · módulo `evaluaciones`

### `GET /evaluaciones` · `r`
Filtros: `estado`, `predioId`, `departamento`, `municipio`, `nivel`, `desde`, `hasta`,
`limite` (máx. 500), `pagina`.

El rol `evaluador` solo ve las suyas; `admin` y `docente` ven todas.

### `POST /evaluaciones` · `w`
```json
{ "predioId": 1, "fechaVisita": "2026-11-06" }
```

Congela el catálogo vigente. La fecha no puede ser futura y no puede haber otra visita
abierta para ese predio.

### `GET /evaluaciones/:id` · `r`
Detalle completo: respuestas, resumen calculado, validación de cierre, recomendaciones,
acciones y el catálogo de los indicadores aplicables.

### `PATCH /evaluaciones/:id/inspeccion` · `w`
```json
{ "fase": "inspeccion", "bioseguridadVerificada": true, "inspeccionNeutral": true }
```

### `POST /evaluaciones/:id/muestra` · `w`
Genera la selección reproducible según la Tabla 3. Con la misma semilla produce siempre
el mismo resultado.

### `PUT /evaluaciones/:id/respuestas` · `w`

**El cliente envía lo observado; el servidor deriva el puntaje.**

```json
{
  "respuestas": [
    { "indicador": "MBA1",  "valorCrudo": { "porcentaje": 35 } },
    { "indicador": "MBR13", "valorCrudo": { "at": 40, "ta": 1500, "aj": 60, "tg": 1500 } },
    { "indicador": "MBR7",  "valorCrudo": { "animales": 1500, "unidades": 100, "limite": 20 } },
    { "indicador": "MBR10", "valorCrudo": { "animales": 1500, "unidades": 100, "limite": 20, "competencia": false } },
    { "indicador": "MBR1",  "valor": 100, "observacion": "Sin novedad" },
    { "indicador": "MBG2",  "valor": 100, "documento": { "firmado": true, "legible": true } }
  ]
}
```

| Tipo de captura | Campo que se envía |
|---|---|
| `escala`, `documental`, `documental_mixto` | `valor` (debe pertenecer a la escala del indicador) |
| `porcentaje`, `documental_porcentaje` | `valorCrudo.porcentaje` |
| `densidad_jaula` | `valorCrudo.{at,ta,aj,tg}` |
| `densidad_piso` | `valorCrudo.{aves,metrosCuadrados}` |
| `ratio_bebedero` | `valorCrudo.{animales,unidades,limite}` |
| `ratio_comedero` | `valorCrudo.{animales,unidades,limite,competencia}` |

Opcionales en cualquier indicador: `observacion`, `muestras` (array de 0/55/100) y
`documento`. Si hay observaciones punto a punto, el valor efectivo es su promedio.

### `GET /evaluaciones/:id/validacion` · `r`
```json
{
  "faltantes": [], "bloqueos": [], "avisos": ["MBG1"],
  "coherencia": [], "puedeCerrar": true
}
```

### `POST /evaluaciones/:id/cerrar` · `w`
Valida, calcula la calificación, la marca inmutable como forma **provisional** y genera
recomendaciones. Si no cumple, devuelve 409 con la validación en `detalles`.

### `POST /evaluaciones/:id/definitiva` · `w`
### `POST /evaluaciones/:id/anular` · solo `admin`
```json
{ "motivo": "Texto de al menos 10 caracteres" }
```

### `GET /evaluaciones/:id/forma-oficial` · `r`
### `GET /evaluaciones/:id/csv` · `r`
Devuelve `text/csv` con BOM para que Excel lea bien los acentos.

---

## Evidencias

### `POST /evaluaciones/:id/evidencias` · `w`
`multipart/form-data`:

| Campo | Descripción |
|---|---|
| `archivo` | PDF, JPG o PNG. Máximo 5 MB por defecto. |
| `indicador` | Código ICA al que se vincula. |
| `vigenciaHasta`, `firmado`, `legible`, `matricula` | Metadatos opcionales. |

Se verifica la firma binaria además del tipo declarado y se rechazan duplicados exactos
dentro de la misma evaluación.

### `GET /evaluaciones/:id/evidencias` · `r`
### `GET /evidencias/:id/archivo` · `r`
Descarga. Comprueba que la evaluación sea del solicitante o que su rol sea supervisor.

### `PATCH /evidencias/:id` · `w`
### `DELETE /evidencias/:id` · `w`
Baja lógica: el archivo se conserva para la trazabilidad.

---

## Planes de mejora · `/planes` · módulo `planes`

### `GET /planes/acciones` · `r`
Filtros: `estado`, `atrasadas=1`.

### `POST /planes/acciones` · `w`
```json
{
  "recomendacionId": 1, "descripcion": "...",
  "responsable": "...", "fechaLimite": "2026-12-06"
}
```
La recomendación debe estar aprobada y no tener ya una acción.

### `PATCH /planes/acciones/:id` · `w`
```json
{ "estado": "en_curso", "avance": 50 }
```
Un avance de 100 marca la acción como cumplida, y marcarla cumplida fija el avance en 100.

### `GET /planes/evaluaciones/:id/recomendaciones` · `r`
### `POST /planes/evaluaciones/:id/recomendaciones` · `w`
```json
{ "conIa": false }
```
Con `conIa: true` usa el servicio configurado; si falla, cae a las plantillas y lo registra.

### `PATCH /planes/recomendaciones/:id` · `w`
```json
{ "estado": "aprobada|descartada", "texto": "Texto editado (opcional)" }
```

---

## Reportes · `/reportes` · módulo `reportes`

### `GET /reportes/panel` · `r`
Filtros: `departamento`, `municipio`, `nivel`, `desde`, `hasta`, `soloMias=1`.

```json
{
  "prediosActivos": 1, "evaluacionesCerradas": 1, "evaluacionesEnProgreso": 0,
  "calificacionPromedio": 80.37, "accionesAtrasadas": 0,
  "distribucionNivel": [{ "nivel": "Alto", "total": 1 }],
  "topIncumplimientos": [{ "indicador": "MBG1", "total": 1 }]
}
```

### `GET /reportes/predios/:id` · `r`
Historial, evolución y tendencia de un predio.

### `GET /reportes/comparar?a=1&b=2` · `r`
Comparación indicador por indicador. Ambas deben ser del mismo predio y estar cerradas.

### `GET /reportes/consolidado` · `r`
### `GET /reportes/consolidado.csv` · `r`

---

## Catálogo · `/catalogo`

### `GET /catalogo` · autenticado
Los 35 indicadores, las tablas 1, 2 y 3, y los umbrales de captura.

### `GET /catalogo/permisos` · autenticado
Módulos, roles y la matriz completa.

### `GET /catalogo/configuracion` · autenticado
### `PUT /catalogo/configuracion` · módulo `parametrizacion` `w`
```json
{
  "catalogos": {
    "departamentos": ["..."], "gruposEtarios": ["..."],
    "formatosEvidencia": ["PDF", "JPG", "PNG"], "tamanoMaximoMB": 5
  },
  "niveles": [
    { "nombre": "Excelente", "minimo": 90 }, { "nombre": "Alto", "minimo": 75 },
    { "nombre": "Medio", "minimo": 50 }, { "nombre": "Bajo", "minimo": 0 }
  ]
}
```
Los mínimos deben descender estrictamente y el último debe ser 0.

---

## Auditoría · `/auditoria` · módulo `auditoria`

### `GET /auditoria` · `r`
Filtros: `usuarioId`, `entidad`, `accion`, `desde`, `hasta`, `limite` (máx. 500), `pagina`.

```json
{
  "entradas": [{
    "id": 39, "usuario": "Administrador", "rol": "admin",
    "accion": "cerrar", "entidad": "evaluacion", "entidadId": "1",
    "resultado": "exito",
    "datosAntes": null, "datosDespues": { "calificacion": 80.37, "nivel": "Alto" },
    "ip": "::1", "fecha": "2026-11-07 02:19:21"
  }],
  "total": 39, "pagina": 1, "limite": 100,
  "accionesDisponibles": ["login", "crear", "cerrar", ...]
}
```

### `GET /auditoria/:entidad/:id` · `r`
Historial de un registro concreto.

### `GET /auditoria/correos/recientes` · `r`
Trazabilidad de los correos enviados.

---

## Ejemplo completo

```bash
# 1. Autenticarse
TOKEN=$(curl -s -X POST localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"identificador":"administrador","password":"..."}' | jq -r .token)

# 2. Crear un predio
PREDIO=$(curl -s -X POST localhost:3000/api/predios \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"nombre":"Granja","sistema":"jaula","departamento":"Boyaca","municipio":"Tunja",
       "inventario":{"dia":0,"levante":300,"produccion":1200},
       "propietario":{"nombre":"Carlos Pardo","cargo":"Dueno",
                      "documento":"74325118","telefono":"3105550142"}}' | jq .id)

# 3. Abrir la visita
EVAL=$(curl -s -X POST localhost:3000/api/evaluaciones \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d "{\"predioId\":$PREDIO,\"fechaVisita\":\"2026-11-06\"}" | jq .id)

# 4. Generar la muestra y confirmar condiciones
curl -s -X POST localhost:3000/api/evaluaciones/$EVAL/muestra -H "Authorization: Bearer $TOKEN"
curl -s -X PATCH localhost:3000/api/evaluaciones/$EVAL/inspeccion \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"bioseguridadVerificada":true,"inspeccionNeutral":true}'

# 5. Responder indicadores
curl -s -X PUT localhost:3000/api/evaluaciones/$EVAL/respuestas \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"respuestas":[{"indicador":"MBA1","valorCrudo":{"porcentaje":35}}]}'

# 6. Validar y cerrar
curl -s localhost:3000/api/evaluaciones/$EVAL/validacion -H "Authorization: Bearer $TOKEN"
curl -s -X POST localhost:3000/api/evaluaciones/$EVAL/cerrar -H "Authorization: Bearer $TOKEN"
```
