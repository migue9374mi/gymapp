/**
 * Capa de base de datos con dos modos:
 *
 *  - LOCAL (por defecto): SQLite via sql.js, guardado en database.db
 *    Ideal para developing en tu PC.
 *
 *  - NUBE: Turso/libSQL sobre HTTP, si defines TURSO_DATABASE_URL y
 *    TURSO_AUTH_TOKEN. Necesario al desplegar, porque los servicios
 *    gratuitos de hosting borran el disco en cada reinicio.
 *
 * Toda la API es asincrona en ambos modos, para que el codigo de las rutas
 * sea el mismo en los dos casos.
 */
const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

const ES_NUBE = Boolean(process.env.TURSO_DATABASE_URL);

let dbLocal = null; // instancia de sql.js (solo en modo local)

// ==================== ESQUEMA ====================

const ESQUEMA = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  avatar TEXT,
  fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS rutinas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  categoria TEXT DEFAULT 'general',
  es_publica INTEGER DEFAULT 0,
  fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS ejercicios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  rutina_id INTEGER NOT NULL,
  nombre TEXT NOT NULL,
  series INTEGER DEFAULT 3,
  reps INTEGER,
  peso REAL,
  descanso INTEGER DEFAULT 60,
  musculo TEXT,
  orden INTEGER DEFAULT 0,
  FOREIGN KEY (rutina_id) REFERENCES rutinas(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS entrenamientos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  rutina_id INTEGER,
  fecha DATE NOT NULL,
  duracion_minutos INTEGER DEFAULT 0,
  notas TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (rutina_id) REFERENCES rutinas(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS comentarios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  rutina_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  texto TEXT NOT NULL,
  fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (rutina_id) REFERENCES rutinas(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS likes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  rutina_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(rutina_id, user_id),
  FOREIGN KEY (rutina_id) REFERENCES rutinas(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS progreso_peso (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  peso REAL NOT NULL,
  fecha DATE NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS plan_semanal (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  dia_semana INTEGER NOT NULL,
  rutina_id INTEGER NOT NULL,
  orden INTEGER DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (rutina_id) REFERENCES rutinas(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS sesiones (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  rutina_id INTEGER,
  fecha DATE NOT NULL,
  duracion_minutos INTEGER DEFAULT 0,
  notas TEXT,
  hora_inicio TEXT,
  hora_fin TEXT,
  finalizada INTEGER DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (rutina_id) REFERENCES rutinas(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS sesiones_ejercicios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sesion_id INTEGER NOT NULL,
  ejercicio_id INTEGER,
  nombre TEXT NOT NULL,
  musculo TEXT,
  series INTEGER DEFAULT 3,
  reps INTEGER,
  peso REAL,
  descanso INTEGER DEFAULT 60,
  es_extra INTEGER DEFAULT 0,
  justificacion TEXT,
  FOREIGN KEY (sesion_id) REFERENCES sesiones(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS sesiones_series (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sesion_id INTEGER NOT NULL,
  sesion_ejercicio_id INTEGER NOT NULL,
  numero_serie INTEGER NOT NULL,
  peso REAL DEFAULT 0,
  reps INTEGER,
  FOREIGN KEY (sesion_id) REFERENCES sesiones(id) ON DELETE CASCADE,
  FOREIGN KEY (sesion_ejercicio_id) REFERENCES sesiones_ejercicios(id) ON DELETE CASCADE,
  UNIQUE(sesion_ejercicio_id, numero_serie)
);

CREATE TABLE IF NOT EXISTS fotos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  nombre TEXT NOT NULL,
  archivo TEXT NOT NULL,
  fecha DATE NOT NULL,
  nota TEXT,
  musculo TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS medidas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  fecha DATE NOT NULL,
  peso REAL NOT NULL,
  altura REAL NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS medidas_musculo (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  medida_id INTEGER NOT NULL,
  musculo TEXT NOT NULL,
  valor REAL NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (medida_id) REFERENCES medidas(id) ON DELETE CASCADE
);
`;

// ==================== MODO NUBE (Turso) ====================

// Convierte un parametro de JS al formato que espera la API de Turso
function argumentoParaTurso(valor) {
  if (valor === null || valor === undefined) return { type: 'null' }
  if (typeof valor === 'number') {
    return Number.isInteger(valor)
      ? { type: 'integer', value: String(valor) }
      : { type: 'double', value: String(valor) }
  }
  if (typeof valor === 'boolean') {
    return { type: 'integer', value: valor ? '1' : '0' }
  }
  return { type: 'text', value: String(valor) }
}

/**
 * Turso puede devolver cada valor envuelto como {type, value} en lugar del
 * valor directo. Sin desempaquetarlo, un hash de contrasena llega a bcrypt
 * como objeto y los ids se convierten en "[object Object]".
 */
function desenpaquetar(valor) {
  if (
    valor !== null &&
    typeof valor === 'object' &&
    !Array.isArray(valor) &&
    'type' in valor &&
    'value' in valor
  ) {
    if (valor.type === 'null') return null
    if (valor.type === 'integer') return parseInt(valor.value, 10)
    if (valor.type === 'double') return parseFloat(valor.value)
    return valor.value
  }
  return valor
}

// Turso devuelve las filas como arrays; las convertimos a objetos
function filasAObjetos(resultado) {
  if (!resultado || !resultado.rows || !resultado.cols) return []
  const nombres = resultado.cols.map((c) => c.name)
  return resultado.rows.map((fila) => {
    const objeto = {}
    nombres.forEach((nombre, i) => {
      objeto[nombre] = desenpaquetar(fila[i])
    })
    return objeto
  })
}

/**
 * Turso muestra su URL como libsql://... pero la API HTTP de Node solo
 * entiende http:// y https://. Convertimos los esquemas que no valen.
 */
function normalizarUrlTurso(urlCruda) {
  let url = String(urlCruda || '').trim();

  // libsql://base.turso.io -> https://base.turso.io
  if (url.startsWith('libsql://')) {
    url = 'https://' + url.slice('libsql://'.length);
  }

  // sqlite:// y ws:// tambien se aceptan por si acaso
  if (url.startsWith('sqlite://')) {
    url = 'https://' + url.slice('sqlite://'.length);
  }

  return url.replace(/\/$/, '');
}

/** Envia una lista de sentencias a Turso en una sola peticion (pipeline). */
async function tursoEnviarPeticiones(lista) {
  const base = normalizarUrlTurso(process.env.TURSO_DATABASE_URL);

  if (!base.startsWith('http://') && !base.startsWith('https://')) {
    throw new Error(
      `TURSO_DATABASE_URL no es una URL valida: "${process.env.TURSO_DATABASE_URL}". `
      + 'Debe empezar por https:// (en Render no vale file: ni una ruta local).'
    );
  }

  const url = `${base}/v2/pipeline`;

  const requests = lista.map(({ sql, params }) => ({
    type: 'execute',
    stmt:
      params && params.length > 0
        ? { sql, args: params.map(argumentoParaTurso) }
        : { sql },
  }));
  requests.push({ type: 'close' });

  const cabeceras = { 'Content-Type': 'application/json' };
  if (process.env.TURSO_AUTH_TOKEN) {
    cabeceras.Authorization = `Bearer ${process.env.TURSO_AUTH_TOKEN}`;
  }

  const respuesta = await fetch(url, {
    method: 'POST',
    headers: cabeceras,
    body: JSON.stringify({ requests }),
  });

  if (!respuesta.ok) {
    const texto = await respuesta.text();
    throw new Error(`Error de Turso (${respuesta.status}): ${texto}`);
  }

  const datos = await respuesta.json();

  // El pipeline devuelve un resultado por sentencia; si alguno falla hay que saberlo
  for (const r of datos.results || []) {
    if (r.type === 'error') {
      throw new Error(`Error de SQL en Turso: ${r.error?.message || 'desconocido'}`);
    }
  }

  return datos;
}

/** Ejecuta una sentencia y devuelve su resultado. */
async function tursoEjecutar(sql, params = []) {
  const datos = await tursoEnviarPeticiones([{ sql, params }]);
  return datos.results?.[0]?.response?.result || {};
}

// ==================== MODO LOCAL (sql.js) ====================

function guardarEnDisco() {
  if (!dbLocal) return;
  const datos = dbLocal.export();
  fs.writeFileSync(path.join(__dirname, 'database.db'), Buffer.from(datos));
}

// sql.js no tiene db.all(); hay que usar db.exec() para leer resultados
function localAll(sql, params = []) {
  const stmt = dbLocal.prepare(sql);
  try {
    stmt.bind(params);
    const resultados = [];
    while (stmt.step()) {
      resultados.push(stmt.getAsObject());
    }
    return resultados;
  } finally {
    stmt.free();
  }
}

// ==================== API PUBLICA (asincrona) ====================

async function initDatabase() {
  if (ES_NUBE) {
    // Creamos el esquema en la nube (si ya existe, IF NOT EXISTS lo ignora)
    const sentencias = ESQUEMA.split(';')
      .map((s) => s.trim())
      .filter(Boolean);

    await tursoEnviarPeticiones(sentencias.map((sql) => ({ sql })));

    // Comprobamos que responde y que las tablas existen
    const prueba = await tursoEjecutar(
      "SELECT COUNT(*) AS total FROM sqlite_master WHERE type='table' AND name='users'"
    );
    const tablas = Number(prueba?.rows?.[0]?.[0] ?? 0);

    if (tablas === 0) {
      throw new Error('No se pudo crear la tabla users en Turso');
    }

    console.log(`Base de datos conectada a Turso (${tablas} tablas)`);
    return;
  }

  const SQL = await initSqlJs();
  const rutaDb = path.join(__dirname, 'database.db');

  if (fs.existsSync(rutaDb)) {
    dbLocal = new SQL.Database(fs.readFileSync(rutaDb));
  } else {
    dbLocal = new SQL.Database();
  }

  dbLocal.run('PRAGMA foreign_keys = ON');
  dbLocal.run(ESQUEMA);
  guardarEnDisco();
  console.log('Base de datos local inicializada (database.db)');
}

async function all(sql, params = []) {
  if (ES_NUBE) {
    return filasAObjetos(await tursoEjecutar(sql, params));
  }
  return localAll(sql, params);
}

async function get(sql, params = []) {
  const filas = await all(sql, params);
  return filas[0] || null;
}

async function run(sql, params = []) {
  if (ES_NUBE) {
    const resultado = await tursoEjecutar(sql, params);
    return {
      lastInsertRowid: Number(desenpaquetar(resultado.last_insert_rowid) || 0),
      changes: Number(desenpaquetar(resultado.rows_affected) || 0),
    };
  }

  dbLocal.run(sql, params);

  // sql.js requiere una consulta preparada para leer el ultimo id insertado
  const stmt = dbLocal.prepare('SELECT last_insert_rowid() AS id');
  try {
    stmt.step();
    const lastInsertRowid = stmt.get()[0];
    return { lastInsertRowid, changes: dbLocal.getRowsModified() };
  } finally {
    stmt.free();
    guardarEnDisco();
  }
}

async function saveDatabase() {
  if (ES_NUBE) return; // en la nube los datos ya estan guardados
  guardarEnDisco();
}

// Ejecuta varias consultas seguidas sin que nadie mas escriba en medio
async function transaccion(operaciones) {
  if (ES_NUBE) {
    // Turso soporta transacciones con BEGIN/COMMIT
    await tursoEjecutar('BEGIN');
    try {
      const r = await operaciones();
      await tursoEjecutar('COMMIT');
      return r;
    } catch (e) {
      await tursoEjecutar('ROLLBACK');
      throw e;
    }
  }

  dbLocal.run('BEGIN');
  try {
    const r = await operaciones();
    dbLocal.run('COMMIT');
    guardarEnDisco();
    return r;
  } catch (e) {
    dbLocal.run('ROLLBACK');
    throw e;
  }
}

module.exports = {
  initDatabase,
  all,
  get,
  run,
  saveDatabase,
  transaccion,
  modoNube: ES_NUBE,
};