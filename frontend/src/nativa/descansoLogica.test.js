/**
 * Comprueba las cuentas del descanso entre series.
 *
 *   node --test src/nativa/descansoLogica.test.js
 *
 * Es un archivo de pruebas, no forma parte de la app. No toca ni el
 * navegador ni el movil: solo prueba numeros y fechas.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
  DESCANSO_MINIMO,
  DESCANSO_MAXIMO,
  DESCANSO_POR_DEFECTO,
  estadoDesdeGuardado,
  etiquetaRapida,
  formatearDescanso,
  leerPreferencias,
  normalizarSegundos,
  parsearDescanso,
  porcentajeRestante,
} from './descansoLogica.js'

// Un momento fijo para que las pruebas no dependan del reloj real
const AHORA = new Date(2026, 9, 8, 10, 0, 0).getTime()
const SESION = 7

// ---------------------------------------------------------------- Normalizar

test('normalizarSegundos acepta numeros y textos', () => {
  assert.equal(normalizarSegundos(90), 90)
  assert.equal(normalizarSegundos('90'), 90)
  assert.equal(normalizarSegundos(90.4), 90)
  assert.equal(normalizarSegundos(90.6), 91)
})

test('normalizarSegundos no baja de 5 ni pasa de una hora', () => {
  assert.equal(normalizarSegundos(1), DESCANSO_MINIMO)
  assert.equal(normalizarSegundos(0), DESCANSO_MINIMO)
  assert.equal(normalizarSegundos(-30), DESCANSO_MINIMO)
  assert.equal(normalizarSegundos(999999), DESCANSO_MAXIMO)
})

test('normalizarSegundos devuelve null si no es un numero', () => {
  assert.equal(normalizarSegundos(null), null)
  assert.equal(normalizarSegundos(undefined), null)
  assert.equal(normalizarSegundos(''), null)
  assert.equal(normalizarSegundos('abc'), null)
  assert.equal(normalizarSegundos(NaN), null)
  assert.equal(normalizarSegundos(Infinity), null)
})

// ---------------------------------------------------------------- Escribir

test('parsearDescanso entiende los segundos', () => {
  assert.equal(parsearDescanso('90'), 90)
  assert.equal(parsearDescanso(' 90 '), 90)
  assert.equal(parsearDescanso('90s'), 90)
  assert.equal(parsearDescanso('90 seg'), 90)
  assert.equal(parsearDescanso('90 segundos'), 90)
})

test('parsearDescanso entiende minutos:segundos', () => {
  assert.equal(parsearDescanso('1:30'), 90)
  assert.equal(parsearDescanso('01:30'), 90)
  assert.equal(parsearDescanso(' 1 : 30 '), 90)
  assert.equal(parsearDescanso('2:00'), 120)
})

test('parsearDescanso suma los segundos de mas en vez de corregirlos', () => {
  // "1:90" son 1 minuto y 90 segundos, o sea 2:30
  assert.equal(parsearDescanso('1:90'), 150)
})

test('parsearDescanso rechaza lo que no se entiende', () => {
  assert.equal(parsearDescanso(''), null)
  assert.equal(parsearDescanso('   '), null)
  assert.equal(parsearDescanso('abc'), null)
  assert.equal(parsearDescanso('0'), null)
  assert.equal(parsearDescanso('-5'), null)
  assert.equal(parsearDescanso('1:2:3'), null)
  assert.equal(parsearDescanso('1:xx'), null)
  assert.equal(parsearDescanso('1:300'), null)
  assert.equal(parsearDescanso('2:00:00'), null)
  assert.equal(parsearDescanso(null), null)
})

test('parsearDescanso deja el tiempo dentro de los limites', () => {
  assert.equal(parsearDescanso('1'), DESCANSO_MINIMO)
  assert.equal(parsearDescanso('99999'), DESCANSO_MAXIMO)
})

// ---------------------------------------------------------------- Mostrar

test('formatearDescanso da minutos y segundos con dos cifras', () => {
  assert.equal(formatearDescanso(90), '01:30')
  assert.equal(formatearDescanso(5), '00:05')
  assert.equal(formatearDescanso(0), '00:00')
  assert.equal(formatearDescanso(59), '00:59')
})

test('formatearDescanso anade las horas cuando hacen falta', () => {
  assert.equal(formatearDescanso(3600), '1:00:00')
  assert.equal(formatearDescanso(3661), '1:01:01')
})

test('etiquetaRapida queda corta para los botones', () => {
  assert.equal(etiquetaRapida(30), '30 s')
  assert.equal(etiquetaRapida(60), '1 min')
  assert.equal(etiquetaRapida(90), '1:30')
  assert.equal(etiquetaRapida(120), '2 min')
  assert.equal(etiquetaRapida(180), '3 min')
})

// ---------------------------------------------------------------- Estado guardado

test('un descanso que aun corre sigue corriendo al volver', () => {
  const guardado = {
    v: 1,
    sesionId: SESION,
    estado: 'corriendo',
    duracionSeg: 90,
    totalMs: 90000,
    finMs: AHORA + 45000,
  }

  const estado = estadoDesdeGuardado(guardado, AHORA, SESION)
  assert.equal(estado.estado, 'corriendo')
  assert.equal(estado.restanteMs, 45000)
  assert.equal(estado.totalMs, 90000)
  assert.equal(estado.duracionSeg, 90)
  assert.equal(estado.finMs, AHORA + 45000)
})

test('un descanso que termino mientras estaba fuera sale como terminado', () => {
  const finMs = AHORA - 5000
  const guardado = {
    v: 1,
    sesionId: SESION,
    estado: 'corriendo',
    duracionSeg: 90,
    totalMs: 90000,
    finMs,
  }

  const estado = estadoDesdeGuardado(guardado, AHORA, SESION)
  assert.equal(estado.estado, 'terminado')
  assert.equal(estado.restanteMs, 0)
  assert.equal(estado.terminadoEnMs, finMs)
})

test('un descanso pausado sigue pausado, con lo que quedaba', () => {
  const guardado = {
    v: 1,
    sesionId: SESION,
    estado: 'pausado',
    duracionSeg: 90,
    totalMs: 90000,
    restanteMs: 32000,
  }

  const estado = estadoDesdeGuardado(guardado, AHORA, SESION)
  assert.equal(estado.estado, 'pausado')
  assert.equal(estado.restanteMs, 32000)
  assert.equal(estado.totalMs, 90000)
})

test('un descanso terminado hace poco se muestra; uno viejo se olvida', () => {
  const reciente = {
    v: 1,
    sesionId: SESION,
    estado: 'terminado',
    duracionSeg: 90,
    totalMs: 90000,
    terminadoEnMs: AHORA - 2 * 60 * 1000,
  }
  assert.equal(estadoDesdeGuardado(reciente, AHORA, SESION).estado, 'terminado')

  const viejo = { ...reciente, terminadoEnMs: AHORA - 60 * 60 * 1000 }
  assert.equal(estadoDesdeGuardado(viejo, AHORA, SESION), null)
})

test('el descanso de otra sesion no se mezcla', () => {
  const guardado = {
    v: 1,
    sesionId: 99,
    estado: 'corriendo',
    duracionSeg: 90,
    totalMs: 90000,
    finMs: AHORA + 45000,
  }

  assert.equal(estadoDesdeGuardado(guardado, AHORA, SESION), null)
})

test('el id de sesion vale como numero o como texto', () => {
  const guardado = {
    v: 1,
    sesionId: '7',
    estado: 'corriendo',
    duracionSeg: 90,
    totalMs: 90000,
    finMs: AHORA + 45000,
  }

  assert.equal(estadoDesdeGuardado(guardado, AHORA, SESION).estado, 'corriendo')
})

test('lo guardado roto no rompe la app: se ignora', () => {
  assert.equal(estadoDesdeGuardado(null, AHORA, SESION), null)
  assert.equal(estadoDesdeGuardado(undefined, AHORA, SESION), null)
  assert.equal(estadoDesdeGuardado({}, AHORA, SESION), null)
  assert.equal(estadoDesdeGuardado({ v: 2, estado: 'corriendo' }, AHORA, SESION), null)
  assert.equal(
    estadoDesdeGuardado({ v: 1, sesionId: SESION, estado: 'corriendo' }, AHORA, SESION),
    null
  )
  assert.equal(
    estadoDesdeGuardado({ v: 1, sesionId: SESION, estado: 'pausado' }, AHORA, SESION),
    null
  )
})

// ---------------------------------------------------------------- Barra

test('porcentajeRestante va de 0 a 100 y no se sale', () => {
  assert.equal(porcentajeRestante(90000, 90000), 100)
  assert.equal(porcentajeRestante(45000, 90000), 50)
  assert.equal(porcentajeRestante(0, 90000), 0)
  assert.equal(porcentajeRestante(-500, 90000), 0)
  assert.equal(porcentajeRestante(120000, 90000), 100)
  assert.equal(porcentajeRestante(1000, 0), 0)
})

// ---------------------------------------------------------------- Preferencias

test('sin preferencias guardadas se usan 90 segundos y el inicio automatico', () => {
  const prefs = leerPreferencias(null)
  assert.deepEqual(prefs, { segundos: DESCANSO_POR_DEFECTO, auto: true })
  assert.equal(prefs.segundos, 90)
})

test('las preferencias guardadas se respetan', () => {
  assert.deepEqual(leerPreferencias({ segundos: '120', auto: false }), {
    segundos: 120,
    auto: false,
  })
  assert.deepEqual(leerPreferencias({ segundos: 45 }), { segundos: 45, auto: true })
})

test('unas preferencias rotas vuelven a los valores de siempre', () => {
  assert.deepEqual(leerPreferencias({ segundos: 'mucho', auto: 'no' }), {
    segundos: DESCANSO_POR_DEFECTO,
    auto: true,
  })
})
