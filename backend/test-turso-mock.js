/**
 * Servidor de prueba que imita la API HTTP de Turso (/v2/pipeline).
 *
 * Implementa lo que dice la documentacion oficial
 * (https://docs.turso.tech/sdk/http/reference):
 *  - Los valores van ENVUELTOS como {type, value}.
 *  - Tipos de argumento admitidos: null, integer, float, text, blob.
 *    Cualquier otro tipo se rechaza, igual que hace Turso de verdad.
 *  - El resultado usa "affected_row_count" (no "rows_affected").
 *
 * Uso:  node test-turso-mock.js
 */
const http = require('http');
const initSqlJs = require('sql.js');

let db = null;

// Tipos que la documentacion admite para args y para los valores de salida
const TIPOS_VALIDOS = ['null', 'integer', 'float', 'text', 'blob'];

function envolver(valor) {
  if (valor === null || valor === undefined) return { type: 'null' };
  if (typeof valor === 'number') {
    // Los enteros van como texto, los decimales como numero (f64)
    return Number.isInteger(valor)
      ? { type: 'integer', value: String(valor) }
      : { type: 'float', value: valor };
  }
  return { type: 'text', value: String(valor) };
}

function error(sqliteError) {
  return { type: 'error', error: { message: sqliteError, code: 'SQLITE_ERROR' } };
}

const servidor = http.createServer((req, res) => {
  let cuerpo = '';
  req.on('data', (c) => (cuerpo += c));
  req.on('end', () => {
    if (!req.url.endsWith('/v2/pipeline')) {
      res.writeHead(404).end('no');
      return;
    }

    let peticion;
    try {
      peticion = JSON.parse(cuerpo);
    } catch {
      res.writeHead(400).end('json invalido');
      return;
    }

    const results = [];

    for (const r of peticion.requests) {
      if (r.type === 'close') {
        results.push({ type: 'ok', response: { type: 'close' } });
        continue;
      }

      const sql = r.stmt.sql;
      const argsCrudos = r.stmt.args || [];

      // Turso rechaza los tipos que no existen en el protocolo
      const tipoInvalido = argsCrudos.find((a) => a && !TIPOS_VALIDOS.includes(a.type));
      if (tipoInvalido) {
        results.push(
          error(
            `tipo de argumento no soportado: "${tipoInvalido.type}" ` +
            `(validos: ${TIPOS_VALIDOS.join(', ')})`
          )
        );
        continue;
      }

      // Los decimales deben llegar como numero JSON (f64), no como texto.
      // Asi responde el Turso real: invalid type: string, expected f64
      const floatComoTexto = argsCrudos.find(
        (a) => a && a.type === 'float' && typeof a.value !== 'number'
      );
      if (floatComoTexto) {
        results.push(
          error(
            `JSON parse error: invalid type: string "${floatComoTexto.value}", expected f64`
          )
        );
        continue;
      }

      const args = argsCrudos.map((a) => {
        if (!a || a.type === 'null') return null;
        if (a.type === 'integer') return parseInt(a.value, 10);
        if (a.type === 'float') return a.value;
        return a.value;
      });

      try {
        if (/^\s*SELECT/i.test(sql)) {
          const stmt = db.prepare(sql);
          if (args.length) stmt.bind(args);
          const nombres = stmt.getColumnNames();
          const filas = [];
          while (stmt.step()) {
            const obj = stmt.getAsObject();
            filas.push(nombres.map((c) => envolver(c in obj ? obj[c] : null)));
          }
          stmt.free();
          results.push({
            type: 'ok',
            response: {
              type: 'execute',
              result: {
                cols: nombres.map((name) => ({ name, decltype: null })),
                rows: filas,
                affected_row_count: envolver(0),
                last_insert_rowid: null,
              },
            },
          });
        } else {
          db.run(sql, args);
          const id = db.exec('SELECT last_insert_rowid() AS id')[0].values[0][0];
          const afectados = db.getRowsModified();
          const esInsert = sql.toUpperCase().trim().startsWith('INSERT');
          results.push({
            type: 'ok',
            response: {
              type: 'execute',
              result: {
                cols: [],
                rows: [],
                affected_row_count: envolver(afectados),
                last_insert_rowid: esInsert ? envolver(id) : null,
              },
            },
          });
        }
      } catch (e) {
        results.push(error(e.message));
      }
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ baton: null, base_url: null, results }));
  });
});

(async () => {
  const SQL = await initSqlJs();
  db = new SQL.Database();
  db.run('PRAGMA foreign_keys = ON');

  const puerto = Number(process.env.MOCK_PORT || 8099);
  servidor.listen(puerto, () => {
    console.log(`MOCK Turso (spec oficial) en http://127.0.0.1:${puerto}/v2/pipeline`);
  });
})();