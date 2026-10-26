/**
 * Cuentas del descanso entre series.
 *
 * Este archivo no toca el movil, ni el navegador, ni localStorage: solo
 * numeros y fechas. Asi se puede probar con "node --test" sin arrancar
 * la app ni la base de datos.
 */

/** Descanso que se pone la primera vez, si el usuario no ha elegido otro. */
export const DESCANSO_POR_DEFECTO = 90

/** Por debajo de 5 segundos el aviso llega antes de que te de tiempo a nada. */
export const DESCANSO_MINIMO = 5

/** Una hora es mas que suficiente para descansar entre series. */
export const DESCANSO_MAXIMO = 3600

/** Los botones rapidos que salen debajo de los ejercicios. */
export const PRESETS = [30, 60, 90, 120, 180]

/**
 * Cuanto tiempo se queda la barra verde de "terminado" antes de irse sola.
 * Diez minutos despues de terminar, si vuelves a la app, ya no tiene sentido
 * ensenarte un descanso de hace rato: se olvida sin avisar.
 */
export const OLVIDAR_TERMINADO_MS = 10 * 60 * 1000

/** Claves de localStorage. Se exportan para que todo el mundo use las mismas. */
export const CLAVE_DESCANSO = 'gymapp_descanso'
export const CLAVE_PREFS_DESCANSO = 'gymapp_descanso_prefs'

/**
 * Deja un numero de segundos dentro de lo razonable.
 * Devuelve null si lo que llega no es un numero.
 */
export function normalizarSegundos(valor) {
  if (valor === null || valor === undefined || valor === '') return null
  const numero = Number(valor)
  if (!Number.isFinite(numero)) return null

  const entero = Math.round(numero)
  if (entero < DESCANSO_MINIMO) return DESCANSO_MINIMO
  if (entero > DESCANSO_MAXIMO) return DESCANSO_MAXIMO
  return entero
}

/**
 * Entiende lo que escribe el usuario:
 *
 *   "90"     -> 90 segundos
 *   "90 s"   -> 90 segundos
 *   "1:30"   -> 90 segundos
 *   "1:90"   -> 150 segundos (se suman, no se corrige)
 *
 * Devuelve null si no se entiende.
 */
export function parsearDescanso(texto) {
  if (typeof texto !== 'string') return null

  const limpio = texto.trim().toLowerCase().replace(/\s+/g, '')
  if (!limpio) return null

  // Formato minutos:segundos
  if (limpio.includes(':')) {
    const partes = limpio.split(':')
    if (partes.length !== 2) return null

    const minutos = Number(partes[0])
    const segundos = Number(partes[1])
    if (!Number.isFinite(minutos) || !Number.isFinite(segundos)) return null
    if (minutos < 0 || segundos < 0) return null
    if (partes[1].length > 2) return null

    const total = minutos * 60 + segundos
    return total > 0 ? normalizarSegundos(total) : null
  }

  // Formato solo segundos, con o sin la palabra "s"
  const coincidencia = limpio.match(/^(\d+)(s|seg|segs|segundos)?$/)
  if (!coincidencia) return null

  const total = Number(coincidencia[1])
  return total > 0 ? normalizarSegundos(total) : null
}

/**
 * Segundos a texto para la barra grande.
 *   90   -> "01:30"
 *   5    -> "00:05"
 *   3600 -> "1:00:00"
 */
export function formatearDescanso(segundos) {
  const total = Math.max(0, Math.round(Number(segundos) || 0))
  const horas = Math.floor(total / 3600)
  const minutos = Math.floor((total % 3600) / 60)
  const resto = total % 60
  const dosDigitos = (n) => String(n).padStart(2, '0')

  if (horas > 0) return `${horas}:${dosDigitos(minutos)}:${dosDigitos(resto)}`
  return `${dosDigitos(minutos)}:${dosDigitos(resto)}`
}

/** Texto corto para los botones rapidos: "30 s", "1 min", "1:30". */
export function etiquetaRapida(segundos) {
  if (segundos < 60) return `${segundos} s`
  if (segundos % 60 === 0) return `${segundos / 60} min`

  const minutos = Math.floor(segundos / 60)
  const resto = segundos % 60
  return `${minutos}:${String(resto).padStart(2, '0')}`
}

/**
 * Lee lo que habia guardado y dice en que estado esta el descanso ahora.
 *
 * Devuelve null cuando lo guardado no sirve: es de otra sesion, esta roto,
 * o es un descanso que termino hace tanto que ya no interesa.
 *
 * Lo importante: NO se guarda un contador que va bajando. Se guarda la hora
 * exacta en la que termina. Asi, si cierras la app y vuelves diez minutos
 * despues, la cuenta sigue cuadrando en vez de empezar de cero.
 */
export function estadoDesdeGuardado(guardado, ahora = Date.now(), sesionId = null) {
  if (!guardado || typeof guardado !== 'object') return null
  if (guardado.v !== 1) return null

  const mismaSesion =
    sesionId === null ||
    sesionId === undefined ||
    Number(guardado.sesionId) === Number(sesionId)
  if (!mismaSesion) return null

  const duracionSeg = normalizarSegundos(guardado.duracionSeg) ?? DESCANSO_POR_DEFECTO
  const totalMs = Math.max(1000, Number(guardado.totalMs) || duracionSeg * 1000)

  if (guardado.estado === 'corriendo') {
    const finMs = Number(guardado.finMs)
    if (!Number.isFinite(finMs) || finMs <= 0) return null

    const restanteMs = finMs - ahora
    if (restanteMs > 0) {
      return {
        estado: 'corriendo',
        restanteMs,
        totalMs: Math.max(totalMs, restanteMs),
        duracionSeg,
        finMs,
        terminadoEnMs: null,
      }
    }

    // Termino mientras la app estaba cerrada: se muestra como terminado,
    // pero sin pitar tarde.
    return {
      estado: 'terminado',
      restanteMs: 0,
      totalMs,
      duracionSeg,
      finMs: null,
      terminadoEnMs: finMs,
    }
  }

  if (guardado.estado === 'pausado') {
    const restanteMs = Number(guardado.restanteMs)
    if (!Number.isFinite(restanteMs) || restanteMs <= 0) return null

    return {
      estado: 'pausado',
      restanteMs,
      totalMs: Math.max(totalMs, restanteMs),
      duracionSeg,
      finMs: null,
      terminadoEnMs: null,
    }
  }

  if (guardado.estado === 'terminado') {
    const terminadoEnMs = Number(guardado.terminadoEnMs)
    if (!Number.isFinite(terminadoEnMs) || terminadoEnMs <= 0) return null
    if (ahora - terminadoEnMs > OLVIDAR_TERMINADO_MS) return null

    return {
      estado: 'terminado',
      restanteMs: 0,
      totalMs,
      duracionSeg,
      finMs: null,
      terminadoEnMs,
    }
  }

  return null
}

/** Cuanto queda, en porcentaje, para pintar la barra que se vacia. */
export function porcentajeRestante(restanteMs, totalMs) {
  const total = Number(totalMs)
  if (!Number.isFinite(total) || total <= 0) return 0

  const porcentaje = (Number(restanteMs) / total) * 100
  return Math.max(0, Math.min(100, porcentaje))
}

/**
 * Preferencias del usuario: cuanto descansa y si empieza solo.
 * Si no hay nada guardado, o esta roto, se usan los valores de siempre.
 */
export function leerPreferencias(guardado) {
  const segundos = normalizarSegundos(guardado?.segundos) ?? DESCANSO_POR_DEFECTO
  return {
    segundos,
    auto: guardado?.auto !== false,
  }
}
