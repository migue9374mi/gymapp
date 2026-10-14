/**
 * Prueba el flujo de recuperacion de contrasena contra la base de datos.
 *
 *   node test-turso-mock.js      (en otra terminal)
 *   node test-recuperacion.js
 *
 * Los tokens los metemos a mano con el mismo hash que usa la app, para
 * poder hacer la peticion por HTTP como lo haria una persona. El correo no
 * llega a ningun sitio (no hay SMTP configurado), que es justo lo que
 * queremos comprobar: que la app no se rompe y responde igual.
 */
const crypto = require('crypto')
const assert = require('node:assert/strict')
const bcrypt = require('bcryptjs')

const db = require('./database')
const { hashToken } = require('./routes/recuperacion')

// Al cargar server.js se inicializa la base de datos y se levanta el puerto
process.env.PORT = process.env.PORT || '5001'
process.env.JWT_SECRET = process.env.JWT_SECRET || 'secreto-de-pruebas'
require('./server')

const API = 'http://127.0.0.1:5001/api'
const EMAIL = 'recuperacion@test.com'
const ANTIGUA = '123456'

let fallos = 0
let n = 0

function comprobar(titulo, condicion, detalle = '') {
  n++
  if (condicion) {
    console.log(`  OK    ${titulo}`)
  } else {
    fallos++
    console.log(`  FALLO ${titulo}${detalle ? '  -> ' + detalle : ''}`)
  }
}

function tokenNuevo() {
  return crypto.randomBytes(32).toString('hex')
}

async function pedirEnlace(email) {
  const r = await fetch(`${API}/recuperar/olvide-contrasena`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  })
  return { status: r.status, cuerpo: await r.json() }
}

async function comprobarToken(token) {
  const r = await fetch(`${API}/recuperar/recuperar/${token}`)
  return { status: r.status, cuerpo: await r.json() }
}

async function ponerNueva(token, password, passwordRepetida) {
  const r = await fetch(`${API}/recuperar/recuperar/${token}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password, passwordRepetida }),
  })
  return { status: r.status, cuerpo: await r.json() }
}

async function login(clave) {
  const r = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: clave }),
  })
  return r.status
}

;(async () => {
  // El servidor puede tardar un instante en quedarse escuchando
  for (let i = 0; i < 40; i++) {
    try {
      await fetch(`${API}/auth/me`)
      break
    } catch { await new Promise((r) => setTimeout(r, 250)) }
  }

  // --------------------------------------------------------------- Preparacion
  console.log('')
  console.log('=== Preparacion ===')
  await db.run('DELETE FROM users')
  await db.run(
    'INSERT INTO users (nombre,email,password) VALUES (?,?,?)',
    ['Recuperacion', EMAIL, bcrypt.hashSync(ANTIGUA, 10)]
  )
  const user = await db.get('SELECT id FROM users WHERE email = ?', [EMAIL])
  console.log(`  usuario id=${user.id}`)

  // ------------------------------------------------------- No revela si existe
  console.log('')
  console.log('=== No revela que correos estan registrados ===')

  const conCuenta = await pedirEnlace(EMAIL)
  const sinCuenta = await pedirEnlace('nadie-esta-registrado-123@test.com')

  comprobar('mismo codigo con y sin cuenta',
    conCuenta.status === sinCuenta.status,
    `${conCuenta.status} vs ${sinCuenta.status}`)
  comprobar('mismo mensaje con y sin cuenta',
    conCuenta.cuerpo.message === sinCuenta.cuerpo.message,
    `"${conCuenta.cuerpo.message}" vs "${sinCuenta.cuerpo.message}"`)

  // El correo NO debe haberse enviado en ninguno de los dos casos
  const filas = await db.get(
    "SELECT COUNT(*) AS n FROM recuperaciones WHERE creado > datetime('now','-1 hour')"
  )
  comprobar('solo se guarda un token, el del correo que existe',
    filas.n === 1, `hay ${filas.n}`)

  // ---------------------------------------------------------- Freno deievable
  console.log('')
  console.log('=== Freno de peticiones repetidas ===')
  await db.run('DELETE FROM recuperaciones')
  for (let i = 0; i < 7; i++) await pedirEnlace(EMAIL)
  const tras = await db.get(
    "SELECT COUNT(*) AS n FROM recuperaciones WHERE creado > datetime('now','-1 hour')"
  )
  comprobar('no guarda mas de 5 peticiones por hora', tras.n === 5, `hay ${tras.n}`)

  // ------------------------------------------------------------ Token valido
  console.log('')
  console.log('=== Enlace valido ===')
  await db.run('DELETE FROM recuperaciones')

  const bueno = tokenNuevo()
  const futuro = new Date(Date.now() + 60 * 60 * 1000).toISOString()
  await db.run(
    'INSERT INTO recuperaciones (user_id,token_hash,expira) VALUES (?,?,?)',
    [user.id, hashToken(bueno), futuro]
  )

  const valido = await comprobarToken(bueno)
  comprobar('reconoce el enlace valido', valido.status === 200 && valido.cuerpo.valido === true,
    JSON.stringify(valido.cuerpo))
  comprobar('devuelve el nombre del usuario', valido.cuerpo.nombre === 'Recuperacion')

  const nuevo = 'claveNueva2026'
  const cambiado = await ponerNueva(bueno, nuevo, nuevo)
  comprobar('acepta la contrasena nueva', cambiado.status === 200, JSON.stringify(cambiado.cuerpo))
  comprobar('la antigua ya no sirve', (await login(ANTIGUA)) !== 200)
  comprobar('la nueva si sirve', (await login(nuevo)) === 200)

  // ------------------------------------------------------------- Un solo uso
  console.log('')
  console.log('=== El enlace es de un solo uso ===')
  const reutilizado = await ponerNueva(bueno, 'otraClave999', 'otraClave999')
  comprobar('rechaza un enlace ya usado', reutilizado.status === 400, JSON.stringify(reutilizado.cuerpo))
  comprobar('y no cambia la contrasena otra vez', (await login(nuevo)) === 200)

  // ------------------------------------------------------------- Caducado
  console.log('')
  console.log('=== Enlace caducado ===')
  const caducado = tokenNuevo()
  const pasado = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  await db.run(
    'INSERT INTO recuperaciones (user_id,token_hash,expira) VALUES (?,?,?)',
    [user.id, hashToken(caducado), pasado]
  )
  const rCaducado = await comprobarToken(caducado)
  comprobar('rechaza un enlace caducado', rCaducado.status === 400)

  // ------------------------------------------------------------- Basura
  console.log('')
  console.log('=== Enlaces raros ===')
  for (const raro of ['x', 'no-existe-este-token', 'a'.repeat(200), '11111111111111111111']) {
    const r = await comprobarToken(raro)
    comprobar(`rechaza "${raro.slice(0, 20)}"`, r.status === 400)
  }

  // ----------------------------------------------------- Validaciones del POST
  console.log('')
  console.log('=== Contraseñas invalidas ===')
  const valido2 = tokenNuevo()
  await db.run(
    'INSERT INTO recuperaciones (user_id,token_hash,expira) VALUES (?,?,?)',
    [user.id, hashToken(valido2), futuro]
  )
  comprobar('rechaza corta de 3 caracteres',
    (await ponerNueva(valido2, 'abc', 'abc')).status === 400)
  comprobar('rechaza las que no coinciden',
    (await ponerNueva(valido2, 'abcdefg', 'abcdefz')).status === 400)
  comprobar('rechaza vacia',
    (await ponerNueva(valido2, '', '')).status === 400)
  comprobar('el enlace sigue vivo tras los fallos',
    (await comprobarToken(valido2)).status === 200)
  comprobar('y ahora si acepta la buena',
    (await ponerNueva(valido2, 'finalDefinitiva1', 'finalDefinitiva1')).status === 200)

  // ----------------------------------------------------- El hash se borra
  console.log('')
  console.log('=== Nada utilizable queda en la base de datos ===')
  const restantes = await db.get('SELECT COUNT(*) AS n FROM recuperaciones')
  comprobar('se borran los tokens al usarlos', restantes.n === 0, `quedan ${restantes.n}`)

  const guardado = await db.get('SELECT password FROM users WHERE id = ?', [user.id])
  comprobar('lo que se guarda es un hash de bcrypt, no un token',
    /^\$2[aby]\$\d{2}\$/.test(guardado.password))

  console.log('')
  console.log(fallos === 0 ? `===== ${n} PRUEBAS OK =====` : `===== ${fallos} FALLO(S) de ${n} =====`)
  process.exit(fallos === 0 ? 0 : 1)
})()
