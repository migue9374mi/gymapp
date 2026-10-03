/**
 * Comprueba que los tipos de dato que viajan entre la app y Turso son correctos,
 * incluidos los decimales (peso 74.25, medidas 36.5 cm, IMC, volumen...).
 *
 * Primero:  node test-turso-mock.js
 * Luego:    node test-nube.js
 */
const fs = require('fs');
const path = require('path');

(async () => {
  const db = require('./database');
  const bcrypt = require('bcryptjs');

  await db.initDatabase();
  let fallos = 0;

  const ok = (cond, mensaje) => {
    console.log(`  ${cond ? 'OK   ' : 'FALLO'} ${mensaje}`);
    if (!cond) fallos++;
  };

  // --- Los tipos que usa el codigo deben existir en el protocolo ---
  console.log('=== Tipos usados por el codigo ===');
  const fuente = fs.readFileSync(path.join(__dirname, 'database.js'), 'utf8');

  // Solo los tipos de ARGUMENTO; {type:'execute'} y {type:'close'}
  // son del pipeline, no de los valores.
  const cuerpoArgDe = (texto) =>
    texto.slice(
      texto.indexOf('function argumentoParaTurso'),
      texto.indexOf('function desenpaquetar')
    );

  const usados = [...cuerpoArgDe(fuente).matchAll(/type:\s*'([a-z]+)'/g)].map((m) => m[1]);
  const permitidos = ['null', 'integer', 'float', 'text', 'blob'];
  const sorted = [...new Set(usados)].sort();
  console.log(`  tipos de argumento: ${sorted.join(', ')}`);
  ok(sorted.length > 0, 'argumentoParaTurso define tipos');
  ok(
    sorted.every((t) => permitidos.includes(t)),
    `solo usa tipos del protocolo (${permitidos.join(', ')})`
  );
  ok(!fuente.includes("'double'"), 'no usa "double" (no existe en Turso)');
  ok(!fuente.includes("'real'"), 'no usa "real" (no existe en Turso)');
  ok(
    fuente.includes("type: 'float'") && fuente.includes("valor.type === 'float'"),
    'lectura y escritura usan el mismo tipo para los decimales'
  );

  // Los decimales deben ir como numero JSON, no como texto.
  // Turso responde: invalid type: string "74.25", expected f64
  ok(
    fuente.includes("{ type: 'float', value: valor }"),
    'los decimales se envian como numero'
  );
  ok(
    !fuente.includes("{ type: 'float', value: String(valor) }"),
    'no se envian decimales como texto'
  );
  // El cuerpo de argumentoParaTurso debe contener el envio como numero
  ok(
    cuerpoArgDe(fuente).includes("{ type: 'float', value: valor }"),
    'argumentoParaTurso envia el decimal como numero, no como texto'
  );

  // --- Usuario primero: el resto de tablas lo necesitan por clave foranea ---
  await db.run('DELETE FROM users');
  const hash = await bcrypt.hash('123456', 10);
  await db.run('INSERT INTO users (nombre,email,password) VALUES (?,?,?)', ['Miguel', 'm@t.com', hash]);
  const user = await db.get('SELECT * FROM users WHERE email = ?', ['m@t.com']);
  const uid = user.id;
  console.log('');
  console.log('=== Usuario y contrasena ===');
  ok(typeof uid === 'number', `id numerico (${uid})`);
  ok(typeof user.password === 'string', `password como texto`);
  ok(await bcrypt.compare('123456', user.password), 'bcrypt.compare funciona');

  await db.run('INSERT INTO rutinas (user_id,nombre,categoria) VALUES (?,?,?)', [uid, 'Torso', 'push']);
  const rutina = await db.get('SELECT * FROM rutinas LIMIT 1');

  // --- Escrituras con distintos tipos numericos ---
  console.log('');
  console.log('=== Escrituras de peso y altura ===');
  const pesos = [
    ['entero', 75],
    ['decimal', 74.25],
    ['media libra', 72.5],
    ['peso alto', 81.5],
    ['muy decimal', 0.25],
  ];
  for (const [i, [nombre, valor]] of pesos.entries()) {
    try {
      const r = await db.run(
        'INSERT INTO medidas (user_id,fecha,peso,altura) VALUES (?,?,?,?)',
        [uid, `2026-10-${String(i + 1).padStart(2, '0')}`, valor, 175]
      );
      ok(typeof r.lastInsertRowid === 'number' && r.lastInsertRowid > 0, `${nombre} ${valor} -> id ${r.lastInsertRowid}`);
    } catch (e) {
      ok(false, `${nombre} ${valor} -> ${e.message.slice(0, 55)}`);
    }
  }

  // --- Medidas corporales decimales ---
  console.log('');
  console.log('=== Medidas corporales (cm) ===');
  const medidaReal = await db.get('SELECT id FROM medidas ORDER BY id DESC LIMIT 1');
  const cm = [['decimal', 36.5], ['entero', 101], ['media libra', 15.25], ['muy decimal', 0.75]];
  for (const [nombre, valor] of cm) {
    try {
      const r = await db.run(
        'INSERT INTO medidas_musculo (user_id,medida_id,musculo,valor) VALUES (?,?,?,?)',
        [uid, medidaReal.id, 'brazo', valor]
      );
      ok(true, `${nombre} ${valor} cm -> id ${r.lastInsertRowid}`);
    } catch (e) {
      ok(false, `${nombre} ${valor} cm -> ${e.message.slice(0, 55)}`);
    }
  }

  // --- Lectura: los decimales deben volver como numero, no como texto ---
  console.log('');
  console.log('=== Lectura de decimales ===');
  const leido = await db.get('SELECT peso, altura FROM medidas WHERE peso = ?', [74.25]);
  ok(typeof leido?.peso === 'number' && leido.peso === 74.25, `peso 74.25 vuelve como numero (${leido?.peso})`);

  const leidoCm = await db.get('SELECT valor FROM medidas_musculo WHERE valor = ?', [36.5]);
  ok(typeof leidoCm?.valor === 'number' && leidoCm.valor === 36.5, `medida 36.5 vuelve como numero (${leidoCm?.valor})`);

  // --- Agregaciones ---
  console.log('');
  console.log('=== Agregaciones ===');
  const tot = await db.get('SELECT SUM(peso) AS t, AVG(peso) AS m, MAX(peso) AS x FROM medidas');
  ok(typeof tot.t === 'number', `SUM -> ${typeof tot.t} ${Number(tot.t).toFixed(2)}`);
  ok(typeof tot.m === 'number', `AVG -> ${typeof tot.m} ${Number(tot.m).toFixed(3)}`);
  ok(typeof tot.x === 'number', `MAX -> ${typeof tot.x} ${tot.x}`);

  // --- affected_row_count ---
  console.log('');
  console.log('=== Conteo de filas afectadas ===');
  const upd = await db.run("UPDATE medidas SET peso = peso WHERE peso > ?", [0]);
  ok(upd.changes > 0, `changes informado como ${upd.changes}`);

  // --- Volumen real de entrenamiento con pesos decimales ---
  console.log('');
  console.log('=== Volumen del entrenamiento ===');
  try {
    await db.run('INSERT INTO ejercicios (rutina_id,nombre,series,musculo) VALUES (?,?,?,?)', [rutina.id, 'Press', 4, 'pecho']);
    const ej = await db.get('SELECT id FROM ejercicios LIMIT 1');
    await db.run(
      'INSERT INTO sesiones (user_id,rutina_id,fecha,duracion_minutos,hora_inicio,hora_fin,finalizada) VALUES (?,?,?,?,?,?,?)',
      [uid, rutina.id, '2026-10-02', 60, '10:00', '11:00', 1]
    );
    const ses = await db.get('SELECT id FROM sesiones LIMIT 1');
    await db.run(
      'INSERT INTO sesiones_ejercicios (sesion_id,nombre,musculo,series,reps,peso) VALUES (?,?,?,?,?,?)',
      [ses.id, 'Press', 'pecho', 4, 8, null]
    );
    const se = await db.get('SELECT id FROM sesiones_ejercicios LIMIT 1');
    for (const [n, peso] of [[1, 72.5], [2, 72.5], [3, 75], [4, 75]]) {
      await db.run(
        'INSERT INTO sesiones_series (sesion_id,sesion_ejercicio_id,numero_serie,peso,reps) VALUES (?,?,?,?,?)',
        [ses.id, se.id, n, peso, 8]
      );
    }
    const v = await db.get(
      'SELECT COALESCE(SUM(ss.peso * COALESCE(ss.reps, se.reps)), 0) AS total'
      + ' FROM sesiones_series ss JOIN sesiones s ON ss.sesion_id = s.id'
      + ' JOIN sesiones_ejercicios se ON ss.sesion_ejercicio_id = se.id'
      + ' WHERE s.user_id = ? AND s.finalizada = 1',
      [uid]
    );
    const esperado = (72.5 + 72.5 + 75 + 75) * 8;
    ok(v.total === esperado, `volumen ${v.total} kg (esperado ${esperado})`);

    // La consulta de /estadisticas debe dar el mismo volumen.
    // Antes usaba se.peso (NULL) y devolvia siempre 0.
    const porMusculo = await db.all(
      `SELECT se.musculo, COALESCE(SUM(ss.peso * COALESCE(ss.reps, se.reps)), 0) as volumen, COUNT(DISTINCT s.id) as veces, COUNT(ss.id) as series
       FROM sesiones_series ss
       JOIN sesiones s ON ss.sesion_id = s.id
       JOIN sesiones_ejercicios se ON ss.sesion_ejercicio_id = se.id
       WHERE s.user_id = ? AND s.finalizada = 1 AND se.musculo IS NOT NULL
       GROUP BY se.musculo ORDER BY volumen DESC`,
      [uid]
    );
    const suma = porMusculo.reduce((a, m) => a + m.volumen, 0);
    ok(suma === esperado, `estadisticas por musculo suma ${suma} kg (esperado ${esperado})`);
    ok(porMusculo.length > 0, `devuelve ${porMusculo.length} musculo(s): ${porMusculo.map((m) => `${m.musculo}=${m.volumen} (${m.series} series, ${m.veces} veces)`).join(', ')}`);
  } catch (e) {
    ok(false, `volumen -> ${e.message.slice(0, 60)}`);
  }

  console.log('');
  console.log(fallos === 0 ? '===== TIPOS DE DATOS CORRECTOS =====' : `===== ${fallos} FALLO(S) =====`);
  process.exit(0);
})();