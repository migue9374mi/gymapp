/**
 * El aviso de que se ha acabado el descanso.
 *
 * Hay tres formas de avisar y se usan todas las que se puedan:
 *
 *   1. Un pitido, hecho con el propio navegador. No hay archivo de sonido,
 *      asi que funciona sin internet y no anade peso al APK.
 *   2. Vibracion, si el telefono la tiene.
 *   3. Un aviso local de Android, programado al empezar el descanso. Ese es
 *      el importante: suena aunque estes en otra app o con la pantalla
 *      apagada, y no depende de que la pagina siga abierta.
 *
 * En la web (Vercel) solo funcionan el pitido y la vibracion. Un navegador
 * no puede despertarse solo si cierras la pestana.
 */
import { Capacitor } from '@capacitor/core'
import { pedirPermisoAvisos } from './avisos'

// Un identificador propio para no mezclarlo con los avisos de entrenamiento,
// que usan del 1 al 7 (uno por dia de la semana).
const ID_AVISO = 7201
const CANAL = 'descanso'

let contextoAudio = null
let sonidoPreparado = false

/**
 * Crea o reactiva el audio.
 *
 * Los navegadores no dejan sonar nada hasta que el usuario toca la pantalla.
 * Por eso se llama al primer toque y tambien al empezar un descanso.
 */
export function desbloquearAudio() {
  if (typeof window === 'undefined') return
  try {
    const Constructor = window.AudioContext || window.webkitAudioContext
    if (!Constructor) return

    if (!contextoAudio) contextoAudio = new Constructor()
    if (contextoAudio.state === 'suspended') contextoAudio.resume()
  } catch (e) {
    // Si el navegador no deja, el aviso visual y el de Android siguen ahi.
  }
}

/**
 * Deja el sonido listo en cuanto el usuario toque cualquier cosa.
 * Asi, si recarga la pagina a mitad de un descanso, el pitido del final
 * tambien funciona sin tener que volver a empezar el temporizador.
 */
export function prepararSonido() {
  if (sonidoPreparado || typeof window === 'undefined') return
  sonidoPreparado = true

  const desbloquear = () => {
    desbloquearAudio()
    window.removeEventListener('pointerdown', desbloquear)
    window.removeEventListener('keydown', desbloquear)
  }

  window.addEventListener('pointerdown', desbloquear)
  window.addEventListener('keydown', desbloquear)
}

/** Tres pitidos cortos: dos iguales y uno mas agudo para cerrar. */
export function sonarAvisoDescanso() {
  desbloquearAudio()
  if (!contextoAudio || contextoAudio.state !== 'running') return false

  try {
    const inicio = contextoAudio.currentTime
    const notas = [
      { frecuencia: 880, retraso: 0, duracion: 0.16 },
      { frecuencia: 880, retraso: 0.24, duracion: 0.16 },
      { frecuencia: 1175, retraso: 0.48, duracion: 0.35 },
    ]

    notas.forEach((nota) => {
      const oscilador = contextoAudio.createOscillator()
      const volumen = contextoAudio.createGain()
      const t = inicio + nota.retraso

      oscilador.type = 'sine'
      oscilador.frequency.setValueAtTime(nota.frecuencia, t)

      // Empieza y acaba suave, para que no chasquee
      volumen.gain.setValueAtTime(0.0001, t)
      volumen.gain.exponentialRampToValueAtTime(0.22, t + 0.015)
      volumen.gain.exponentialRampToValueAtTime(0.0001, t + nota.duracion)

      oscilador.connect(volumen)
      volumen.connect(contextoAudio.destination)
      oscilador.start(t)
      oscilador.stop(t + nota.duracion + 0.02)
    })

    return true
  } catch (e) {
    return false
  }
}

/** Patron de vibracion: dos cortas y una larga. */
export function vibrarAvisoDescanso() {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate([250, 100, 250, 100, 500])
    }
  } catch (e) {
    // Sin vibracion no pasa nada: queda el sonido y la barra verde.
  }
}

/**
 * Programa el aviso de Android para la hora exacta en la que acaba el
 * descanso. Devuelve true solo si de verdad ha quedado programado; si no,
 * el temporizador hara el pitido por su cuenta.
 */
export async function programarAvisoDescanso(finMs) {
  if (!Capacitor.isNativePlatform()) return false
  if (!Number.isFinite(finMs) || finMs <= Date.now()) return false

  try {
    const permiso = await pedirPermisoAvisos()
    if (!permiso) return false

    const { LocalNotifications } = await import('@capacitor/local-notifications')

    // Canal propio: el usuario puede silenciar el descanso sin silenciar
    // los avisos de "te toca entrenar".
    await LocalNotifications.createChannel({
      id: CANAL,
      name: 'Descanso entre series',
      description: 'Aviso cuando termina el descanso de una serie',
      importance: 4, // alta: suena y sale en la pantalla
      visibility: 1,
      vibration: true,
    })

    // Por si habia otro descanso programado: uno cada vez
    await LocalNotifications.cancel({ notifications: [{ id: ID_AVISO }] })

    await LocalNotifications.schedule({
      notifications: [
        {
          id: ID_AVISO,
          title: 'Descanso terminado',
          body: 'Ya puedes empezar la siguiente serie.',
          schedule: { at: new Date(finMs), allowWhileIdle: true },
          smallIcon: 'ic_stat_icon',
          channelId: CANAL,
          autoCancel: true,
        },
      ],
    })

    return true
  } catch (e) {
    console.warn('No se pudo programar el aviso de descanso:', e.message)
    return false
  }
}

/** Quita el aviso programado, por ejemplo si se salta el descanso. */
export async function cancelarAvisoDescanso() {
  if (!Capacitor.isNativePlatform()) return

  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications')
    await LocalNotifications.cancel({ notifications: [{ id: ID_AVISO }] })
  } catch (e) {
    // Si no habia nada programado, no es un problema.
  }
}
