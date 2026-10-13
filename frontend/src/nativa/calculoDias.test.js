/**
 * Comprueba el calculo de cuando debe saltar el aviso de entrenamiento.
 *
 *   node --test frontend/nativa/calculoDias.test.js
 *
 * Es un archivo de pruebas, no forma parte de la app.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
  proximaOcurrencia,
  diasConRutina,
  partesHora,
  DIAS,
} from './calculoDias.js'

// Una fecha de referencia: jueves 8 de octubre de 2026, a las 10:00
// getDay() = 4 (jueves) -> en nuestra numeracion es 3
const JUEVES_10H = new Date(2026, 9, 8, 10, 0, 0)

test('hoy mismo si todavia no ha llegado la hora', () => {
  // Hoy es jueves (3) y son las 10:00. El aviso es a las 18:00.
  const cuando = proximaOcurrencia(3, 18, 0, JUEVES_10H)
  assert.equal(cuando.getDay(), 4, 'debe caer en jueves')
  assert.equal(cuando.getDate(), 8, 'debe ser hoy mismo')
  assert.equal(cuando.getHours(), 18)
})

test('la semana que viene si la hora ya ha pasado', () => {
  // Son las 19:00 y el aviso era a las 18:00: hoy ya no vale
  const ahora = new Date(2026, 9, 8, 19, 0, 0)
  const cuando = proximaOcurrencia(3, 18, 0, ahora)
  assert.equal(cuando.getDate(), 15, 'debe saltar el jueves siguiente')
  assert.equal(cuando.getHours(), 18)
})

test('otro dia de la semana siguiente', () => {
  // Hoy jueves (3) y el aviso es los lunes (0): el lunes que viene es el 12
  const cuando = proximaOcurrencia(0, 18, 0, JUEVES_10H)
  assert.equal(cuando.getDay(), 1, 'debe caer en lunes')
  assert.equal(cuando.getDate(), 12)
})

test('el domingo es el dia 6 y no el 0', () => {
  // Este es el error clasico: getDay() devuelve 0 para el domingo
  const cuando = proximaOcurrencia(6, 18, 0, JUEVES_10H)
  assert.equal(cuando.getDay(), 0, 'debe caer en domingo')
  assert.equal(cuando.getDate(), 11, 'el domingo siguiente al jueves 8 es el 11')
})

test('los siete dias caen en el dia de la semana correcto', () => {
  for (let dia = 0; dia < 7; dia++) {
    const cuando = proximaOcurrencia(dia, 18, 0, JUEVES_10H)
    // getDay() de JavaScript: 0 domingo, 1 lunes ... 4 jueves
    const esperadoJs = (dia + 1) % 7
    assert.equal(
      cuando.getDay(),
      esperadoJs,
      `${DIAS[dia]} deberia caer en el dia correcto, caido en getDay()=${cuando.getDay()}`
    )
    assert.ok(cuando.getTime() > JUEVES_10H.getTime(), `${DIAS[dia]} debe ser en el futuro`)
  }
})

test('nunca devuelve una fecha en el pasado, ni a las 23:59 exactas', () => {
  // 23:59 es el caso limite: si la hora del aviso es 23:59 y son las 23:59:30
  const ahora = new Date(2026, 9, 8, 23, 59, 30)
  for (let dia = 0; dia < 7; dia++) {
    const cuando = proximaOcurrencia(dia, 23, 59, ahora)
    assert.ok(
      cuando.getTime() > ahora.getTime(),
      `${DIAS[dia]} devolvio una fecha ya pasada`
    )
  }
})

test('salta de ano correctamente', () => {
  // Un martes 29 de diciembre de 2026 a las 10:00
  const ahora = new Date(2026, 11, 29, 10, 0, 0)
  assert.equal(ahora.getDay(), 2, 'el 29/12/2026 es martes')
  const cuando = proximaOcurrencia(0, 18, 0, ahora) // lunes
  assert.equal(cuando.getDate(), 4, 'el lunes siguiente es el 4 de enero')
  assert.equal(cuando.getMonth(), 0, 'debe ser enero')
  assert.equal(cuando.getFullYear(), 2027)
})

test('diasConRutina se queda solo con los dias con rutina', () => {
  const plan = [
    { dia: 0, rutinas: [{ nombre: 'Torso' }] },
    { dia: 1, rutinas: [] },
    { dia: 2, rutinas: [] },
    { dia: 3, rutinas: [{ nombre: 'Pierna' }] },
  ]
  const resultado = diasConRutina(plan)
  assert.equal(resultado.length, 2)
  assert.deepEqual(resultado.map((d) => d.dia), [0, 3])
})

test('diasConRutina aguanta un plan vacio o nulo', () => {
  assert.deepEqual(diasConRutina([]), [])
  assert.deepEqual(diasConRutina(null), [])
  assert.deepEqual(diasConRutina(undefined), [])
  // Un dia sin la propiedad rutinas no debe romper nada
  assert.deepEqual(diasConRutina([{ dia: 0 }]), [])
})

test('partesHora separa hora y minutos', () => {
  assert.deepEqual(partesHora('18:00'), [18, 0])
  assert.deepEqual(partesHora('06:30'), [6, 30])
  // Valores raros no deben romper la app
  assert.deepEqual(partesHora('basura'), [18, 0])
  assert.deepEqual(partesHora(''), [18, 0])
  assert.deepEqual(partesHora(undefined), [18, 0])
})