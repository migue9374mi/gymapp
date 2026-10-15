/**
 * Comprueba la migracion de las columnas del fondo.
 *
 * Simula lo que pasa al desplegar: la tabla users YA existe y hay que
 * añadirle columnas nuevas sin perder los datos que tiene dentro.
 *
 *   node test-turso-mock.js
 *   node test-fondo.js
 */
const assert = require('node:assert/strict')
const db = require('./database')

const EMAIL = 'migracion@test.com'

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

async function columnasDeUsers() {
  const info = await db.all('PRAGMA table_info(users)')
  return info.map((c) => c.name)
}
void columnasDeUsers

;(async () => {
  await db.initDatabase()

  // ------------------------------------------------------ Estado inicial
  console.log('=== La tabla users acepta las columnas nuevas ===')
  // Se comprueba insertando con ellas: si la columna no existiera, el motor
  // daria error. Es mas fiable que PRAGMA, que no siempre devuelve filas
  // segun como se ejecute la consulta.
  let existen = true
  let detalle = ''
  try {
    await db.run('DELETE FROM users WHERE email = ?', [EMAIL])
    await db.run(
      'INSERT INTO users (nombre,email,password,fondo,fondo_opacidad) VALUES (?,?,?,?,?)',
      ['Sonda', 'sonda@test.com', 'hash', 'https://ejemplo/fondo.jpg', 0.5]
    )
    await db.run('DELETE FROM users WHERE email = ?', ['sonda@test.com'])
  } catch (e) {
    existen = false
    detalle = e.message.slice(0, 60)
  }
  comprobar('la tabla acepta fondo y fondo_opacidad', existen, detalle)

  // ------------------------------------------------------ Guardar y leer
  console.log('')
  console.log('=== Guardar y leer el fondo ===')

  await db.run('DELETE FROM users WHERE email = ?', [EMAIL])
  const r = await db.run(
    'INSERT INTO users (nombre,email,password) VALUES (?,?,?)',
    ['Migracion', EMAIL, 'hash']
  )
  const uid = r.lastInsertRowid
  comprobar('el usuario nuevo nace sin fondo', (await db.get('SELECT fondo FROM users WHERE id = ?', [uid])).fondo === null)

  // ---------------------------------------------------------------- Guardar
  await db.run('UPDATE users SET fondo = ?, fondo_opacidad = ? WHERE id = ?', [
    'https://res.cloudinary.com/x/image/upload/v1/gymapp/fondo.jpg',
    0.42,
    uid,
  ])
  const conFondo = await db.get('SELECT fondo, fondo_opacidad FROM users WHERE id = ?', [uid])
  comprobar('guarda la URL del fondo', conFondo.fondo && conFondo.fondo.includes('cloudinary'), conFondo.fondo)
  comprobar('guarda la opacidad como numero', typeof conFondo.fondo_opacidad === 'number', typeof conFondo.fondo_opacidad)
  comprobar('la opacidad es la correcta', conFondo.fondo_opacidad === 0.42, String(conFondo.fondo_opacidad))

  // ---------------------------------------------------------- Actualizar
  await db.run('UPDATE users SET fondo_opacidad = ? WHERE id = ?', [0.8, uid])
  const cambiado = await db.get('SELECT fondo_opacidad FROM users WHERE id = ?', [uid])
  comprobar('se puede cambiar solo la opacidad', cambiado.fondo_opacidad === 0.8)

  // ------------------------------------------------------------- Quitar
  await db.run('UPDATE users SET fondo = NULL, fondo_opacidad = 0.35 WHERE id = ?', [uid])
  const sinFondo = await db.get('SELECT fondo, fondo_opacidad FROM users WHERE id = ?', [uid])
  comprobar('se puede quitar el fondo', sinFondo.fondo === null)
  comprobar('al quitar vuelve la opacidad por defecto', sinFondo.fondo_opacidad === 0.35)

  // ------------------------------- La migracion no rompe datos existentes
  console.log('')
  console.log('=== La migracion respeta lo que ya habia ===')
  const antes = await db.get('SELECT nombre, email, password, avatar FROM users WHERE id = ?', [uid])
  const totalAntes = (await db.get('SELECT COUNT(*) AS n FROM users')).n
  await db.initDatabase() // se ejecuta otra vez, como en un reinicio
  const despues = await db.get('SELECT nombre, email, password, avatar FROM users WHERE id = ?', [uid])
  comprobar('nombre intacto', antes.nombre === despues.nombre)
  comprobar('correo intacto', antes.email === despues.email)
  comprobar('contrasena intacta', antes.password === despues.password)
  comprobar('avatar intacto', antes.avatar === despues.avatar)
  const totalDespues = (await db.get('SELECT COUNT(*) AS n FROM users')).n
  comprobar('el arranque repetido no pierde usuarios', totalAntes === totalDespues,
    `${totalAntes} antes, ${totalDespues} despues`)

  console.log('')
  console.log(fallos === 0 ? `===== ${n} PRUEBAS OK =====` : `===== ${fallos} FALLO(S) de ${n} =====`)
  process.exit(fallos === 0 ? 0 : 1)
})()