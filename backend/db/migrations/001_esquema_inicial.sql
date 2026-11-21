-- Esquema inicial normalizado de EvalCodorniz / Bienestar Animal ICA.
--
-- Reemplaza el esquema anterior, que guardaba toda la aplicacion como un unico
-- documento JSON en la tabla estado_aplicacion. Aqui cada entidad tiene su tabla,
-- sus llaves foraneas y sus indices, de modo que se puede consultar, paginar,
-- auditar y escalar sin reescribir el estado completo en cada guardado.

-- ---------------------------------------------------------------------------
-- Usuarios y acceso
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS usuarios (
  id                      INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre                  TEXT    NOT NULL,
  username                TEXT    NOT NULL UNIQUE,
  email                   TEXT    NOT NULL UNIQUE,
  password_hash           TEXT    NOT NULL,
  rol                     TEXT    NOT NULL DEFAULT 'evaluador'
                                  CHECK (rol IN ('admin','docente','evaluador','consultor')),
  activo                  INTEGER NOT NULL DEFAULT 1 CHECK (activo IN (0,1)),
  debe_cambiar_password   INTEGER NOT NULL DEFAULT 0 CHECK (debe_cambiar_password IN (0,1)),
  ultimo_acceso           TEXT,
  intentos_fallidos       INTEGER NOT NULL DEFAULT 0,
  bloqueado_hasta         TEXT,
  creado_por              INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  created_at              TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at              TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS ix_usuarios_rol    ON usuarios(rol);
CREATE INDEX IF NOT EXISTS ix_usuarios_activo ON usuarios(activo);

-- Tokens de restablecimiento de contrasena.
-- Se guarda solo el hash del token: si la base se filtra, los enlaces no sirven.
CREATE TABLE IF NOT EXISTS password_resets (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id      INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  token_hash      TEXT    NOT NULL UNIQUE,
  expira_en       TEXT    NOT NULL,
  usado_en        TEXT,
  invalidado_en   TEXT,
  ip_solicitud    TEXT,
  user_agent      TEXT,
  created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS ix_resets_usuario ON password_resets(usuario_id);
CREATE INDEX IF NOT EXISTS ix_resets_expira  ON password_resets(expira_en);

-- Sesiones emitidas, para poder revocar un token antes de su vencimiento.
CREATE TABLE IF NOT EXISTS sesiones (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id    INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  jti           TEXT    NOT NULL UNIQUE,
  expira_en     TEXT    NOT NULL,
  revocada_en   TEXT,
  ip            TEXT,
  user_agent    TEXT,
  created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS ix_sesiones_usuario ON sesiones(usuario_id);
CREATE INDEX IF NOT EXISTS ix_sesiones_expira  ON sesiones(expira_en);

-- ---------------------------------------------------------------------------
-- Predios
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS predios (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  codigo_ica          TEXT    UNIQUE,
  nombre              TEXT    NOT NULL,
  sistema             TEXT    NOT NULL CHECK (sistema IN ('piso','jaula')),
  especie             TEXT    NOT NULL DEFAULT 'Coturnix coturnix',
  departamento        TEXT    NOT NULL,
  municipio           TEXT    NOT NULL,
  vereda              TEXT,
  direccion           TEXT,
  latitud             REAL    CHECK (latitud  IS NULL OR (latitud  BETWEEN -5  AND 14)),
  longitud            REAL    CHECK (longitud IS NULL OR (longitud BETWEEN -82 AND -66)),

  aves_dia            INTEGER NOT NULL DEFAULT 0 CHECK (aves_dia        >= 0),
  aves_levante        INTEGER NOT NULL DEFAULT 0 CHECK (aves_levante    >= 0),
  aves_produccion     INTEGER NOT NULL DEFAULT 0 CHECK (aves_produccion >= 0),

  propietario_nombre    TEXT NOT NULL,
  propietario_cargo     TEXT NOT NULL DEFAULT 'Dueno' CHECK (propietario_cargo IN ('Dueno','Encargado')),
  propietario_documento TEXT NOT NULL,
  propietario_telefono  TEXT NOT NULL,
  propietario_correo    TEXT,

  activo      INTEGER NOT NULL DEFAULT 1 CHECK (activo IN (0,1)),
  creado_por  INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS ix_predios_activo       ON predios(activo);
CREATE INDEX IF NOT EXISTS ix_predios_departamento ON predios(departamento);
CREATE INDEX IF NOT EXISTS ix_predios_municipio    ON predios(municipio);

-- ---------------------------------------------------------------------------
-- Evaluaciones
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS evaluaciones (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  codigo            TEXT    NOT NULL UNIQUE,
  predio_id         INTEGER NOT NULL REFERENCES predios(id)  ON DELETE RESTRICT,
  usuario_id        INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,

  fecha_visita      TEXT    NOT NULL,
  sistema           TEXT    NOT NULL CHECK (sistema IN ('piso','jaula')),
  total_aves        INTEGER NOT NULL CHECK (total_aves > 0),

  -- Congelados al crear la evaluacion: una visita se califica con las reglas
  -- vigentes ese dia, aunque la parametrizacion cambie despues.
  version_catalogo  TEXT    NOT NULL,
  pesos_json        TEXT    NOT NULL,
  muestreo_json     TEXT    NOT NULL,
  indicadores_json  TEXT    NOT NULL,
  snapshot_json     TEXT,

  inspeccion_json   TEXT    NOT NULL DEFAULT '{}',

  estado            TEXT    NOT NULL DEFAULT 'en_progreso'
                            CHECK (estado IN ('en_progreso','cerrada','anulada')),
  forma             TEXT    CHECK (forma IS NULL OR forma IN ('provisional','definitiva')),

  calificacion      REAL    CHECK (calificacion IS NULL OR (calificacion BETWEEN 0 AND 100)),
  nivel             TEXT    CHECK (nivel IS NULL OR nivel IN ('Excelente','Alto','Medio','Bajo')),
  resultado_json    TEXT,

  cerrada_en        TEXT,
  provisional_hasta TEXT,
  anulada_en        TEXT,
  motivo_anulacion  TEXT,

  created_at        TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS ix_eval_predio  ON evaluaciones(predio_id);
CREATE INDEX IF NOT EXISTS ix_eval_usuario ON evaluaciones(usuario_id);
CREATE INDEX IF NOT EXISTS ix_eval_estado  ON evaluaciones(estado);
CREATE INDEX IF NOT EXISTS ix_eval_fecha   ON evaluaciones(fecha_visita);
CREATE INDEX IF NOT EXISTS ix_eval_nivel   ON evaluaciones(nivel);

-- Solo puede haber una evaluacion abierta por predio a la vez.
CREATE UNIQUE INDEX IF NOT EXISTS ux_eval_abierta_por_predio
  ON evaluaciones(predio_id) WHERE estado = 'en_progreso';

-- Una fila por indicador respondido: consultable y comparable sin abrir un blob.
CREATE TABLE IF NOT EXISTS evaluacion_respuestas (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  evaluacion_id     INTEGER NOT NULL REFERENCES evaluaciones(id) ON DELETE CASCADE,
  indicador_codigo  TEXT    NOT NULL,
  grupo             TEXT    NOT NULL CHECK (grupo IN ('MBA','MBR','MBG')),

  valor             INTEGER CHECK (valor IS NULL OR valor IN (0,50,55,100)),
  valor_crudo_json  TEXT,
  muestras_json     TEXT,
  observacion       TEXT,
  documento_json    TEXT,
  evidencia_id      INTEGER REFERENCES evidencias(id) ON DELETE SET NULL,

  created_at        TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT    NOT NULL DEFAULT (datetime('now')),

  UNIQUE (evaluacion_id, indicador_codigo)
);

CREATE INDEX IF NOT EXISTS ix_resp_evaluacion ON evaluacion_respuestas(evaluacion_id);
CREATE INDEX IF NOT EXISTS ix_resp_indicador  ON evaluacion_respuestas(indicador_codigo);
CREATE INDEX IF NOT EXISTS ix_resp_valor      ON evaluacion_respuestas(valor);

-- ---------------------------------------------------------------------------
-- Evidencias documentales
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS evidencias (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  evaluacion_id     INTEGER NOT NULL REFERENCES evaluaciones(id) ON DELETE CASCADE,
  indicador_codigo  TEXT    NOT NULL,
  usuario_id        INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,

  nombre_original   TEXT    NOT NULL,
  nombre_almacenado TEXT    NOT NULL UNIQUE,
  mime              TEXT    NOT NULL,
  tamano_bytes      INTEGER NOT NULL CHECK (tamano_bytes > 0),
  sha256            TEXT    NOT NULL,

  vigencia_hasta    TEXT,
  firmado           INTEGER NOT NULL DEFAULT 0 CHECK (firmado IN (0,1)),
  legible           INTEGER NOT NULL DEFAULT 0 CHECK (legible IN (0,1)),
  matricula         TEXT,
  validacion_json   TEXT    NOT NULL,

  eliminada_en      TEXT,
  created_at        TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS ix_evid_evaluacion ON evidencias(evaluacion_id);
CREATE INDEX IF NOT EXISTS ix_evid_sha        ON evidencias(sha256);

-- ---------------------------------------------------------------------------
-- Recomendaciones y plan de mejora
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS recomendaciones (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  evaluacion_id     INTEGER NOT NULL REFERENCES evaluaciones(id) ON DELETE CASCADE,
  indicador_codigo  TEXT    NOT NULL,
  prioridad         TEXT    NOT NULL CHECK (prioridad IN ('Alta','Media','Baja')),
  texto_original    TEXT    NOT NULL,
  texto             TEXT    NOT NULL,
  estado            TEXT    NOT NULL DEFAULT 'pendiente'
                            CHECK (estado IN ('pendiente','aprobada','descartada')),
  fuente            TEXT    NOT NULL DEFAULT 'plantilla',
  decidida_por      INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  decidida_en       TEXT,
  created_at        TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS ix_rec_evaluacion ON recomendaciones(evaluacion_id);
CREATE INDEX IF NOT EXISTS ix_rec_estado     ON recomendaciones(estado);

CREATE TABLE IF NOT EXISTS acciones_mejora (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  evaluacion_id     INTEGER NOT NULL REFERENCES evaluaciones(id) ON DELETE CASCADE,
  recomendacion_id  INTEGER REFERENCES recomendaciones(id) ON DELETE SET NULL,
  descripcion       TEXT    NOT NULL,
  responsable       TEXT    NOT NULL,
  fecha_limite      TEXT    NOT NULL,
  estado            TEXT    NOT NULL DEFAULT 'pendiente'
                            CHECK (estado IN ('pendiente','en_curso','cumplida')),
  avance            INTEGER NOT NULL DEFAULT 0 CHECK (avance BETWEEN 0 AND 100),
  cerrada_en        TEXT,
  created_at        TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS ix_accion_evaluacion ON acciones_mejora(evaluacion_id);
CREATE INDEX IF NOT EXISTS ix_accion_estado     ON acciones_mejora(estado);
CREATE INDEX IF NOT EXISTS ix_accion_fecha      ON acciones_mejora(fecha_limite);

-- ---------------------------------------------------------------------------
-- Auditoria
-- ---------------------------------------------------------------------------

-- Registro inmutable. Guarda el nombre del usuario ademas de su id para que la
-- traza siga siendo legible aunque la cuenta se elimine despues.
CREATE TABLE IF NOT EXISTS auditoria (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id     INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  usuario_nombre TEXT,
  usuario_rol    TEXT,
  accion         TEXT NOT NULL,
  entidad        TEXT NOT NULL,
  entidad_id     TEXT,
  resultado      TEXT NOT NULL DEFAULT 'exito' CHECK (resultado IN ('exito','fallo')),
  datos_antes    TEXT,
  datos_despues  TEXT,
  detalle_json   TEXT,
  ip             TEXT,
  user_agent     TEXT,
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS ix_audit_usuario ON auditoria(usuario_id);
CREATE INDEX IF NOT EXISTS ix_audit_entidad ON auditoria(entidad, entidad_id);
CREATE INDEX IF NOT EXISTS ix_audit_fecha   ON auditoria(created_at);
CREATE INDEX IF NOT EXISTS ix_audit_accion  ON auditoria(accion);

-- ---------------------------------------------------------------------------
-- Configuracion y catalogos editables
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS configuracion (
  clave       TEXT PRIMARY KEY,
  valor_json  TEXT NOT NULL,
  descripcion TEXT,
  updated_by  INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---------------------------------------------------------------------------
-- Correos enviados (trazabilidad del restablecimiento de contrasena)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS correos_enviados (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  destinatario TEXT NOT NULL,
  remitente    TEXT NOT NULL,
  asunto       TEXT NOT NULL,
  plantilla    TEXT NOT NULL,
  estado       TEXT NOT NULL CHECK (estado IN ('enviado','registrado','fallido')),
  error        TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS ix_correos_destinatario ON correos_enviados(destinatario);
CREATE INDEX IF NOT EXISTS ix_correos_fecha        ON correos_enviados(created_at);
