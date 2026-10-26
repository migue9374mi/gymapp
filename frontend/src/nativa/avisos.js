/**
 * Avisos de entrenamiento en el movil.
 *
 * Son avisos LOCALES: se programan dentro del telefono y suenan a la hora
 * exacta sin internet y sin que el servidor tenga que hacer nada. Eso es
 * justo lo que diferencia a una app de una web: una web tendria que montar
 * un servidor de push entero, y Render en plan gratuito se apaga a los 15
 * minutos, asi que el aviso llegaria tarde o no llegaria.
 *
 * En el navegador (Vercel) no hay nada que programar y todas las funciones
 * de este modulo hacen lo nada. La web sigue funcionando igual.
 */
import { Capacitor } from '@capacitor/core'
import {
  proximaOcurrencia,
  diasConRutina,
  partesHora,
  DIAS,
} from './calculoDias'

const CLAVE_HORA = 'gymapp_hora_aviso'
const CLAVE_ACTIVOS = 'gymapp_avisos_activos'
const HORA_POR_DEFECTO = '18:00'

export { DIAS }

// Un identificador por dia: 1=lunes ... 7=domingo
const idDeDia = (dia) => dia + 1

/** Solo dentro de la app de Android hace falta. */
export const esAppNativa = () => Capacitor.isNativePlatform()

/** Hora a la que avisar, tipo "18:00". */
export function horaElegida() {
  return localStorage.getItem(CLAVE_HORA) || HORA_POR_DEFECTO
}

export function guardarHoraElegida(hora) {
  localStorage.setItem(CLAVE_HORA, hora)
}

/** Si el usuario ha pedido avisos. */
export function avisosActivados() {
  return localStorage.getItem(CLAVE_ACTIVOS) !== 'no'
}

export function guardarAvisosActivados(activo) {
  localStorage.setItem(CLAVE_ACTIVOS, activo ? 'si' : 'no')
}

/**
 * Proxima fecha en que cae un dia de la semana a una hora concreta.
 * Reexportada desde calculoDias, que es donde estan sus pruebas.
 */
export { proximaOcurrencia }

/** Pide permiso para mostrar avisos. Devuelve true si esta concedido. */
export async function pedirPermisoAvisos() {
  if (!esAppNativa()) return false
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications')
    const permiso = await LocalNotifications.checkPermissions()
    if (permiso.display === 'granted') return true

    const pedido = await LocalNotifications.requestPermissions()
    return pedido.display === 'granted'
  } catch (e) {
    console.warn('No se pudo pedir permiso de avisos:', e.message)
    return false
  }
}

/**
 * Borra los avisos de entrenamiento (los siete dias de la semana).
 *
 * No toca el aviso del descanso entre series, que tiene su propio id y debe
 * seguir vivo aunque se reprogramen los avisos del plan: el descanso forma
 * parte del entrenamiento que se esta haciendo ahora.
 */
export async function cancelarAvisos() {
  if (!esAppNativa()) return
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications')
    await LocalNotifications.cancel({
      notifications: DIAS.map((_, dia) => ({ id: idDeDia(dia) })),
    })
  } catch (e) {
    console.warn('No se pudieron cancelar los avisos:', e.message)
  }
}

/**
 * Programa un aviso para cada dia que tenga rutina en el plan.
 * Vuelve a programarlos desde cero, asi que se puede llamar cada vez que
 * el plan cambie o el usuario ajuste la hora.
 */
export async function programarAvisos(plan) {
  if (!esAppNativa()) return { programados: 0, motivo: 'no es la app nativa' }

  if (!avisosActivados()) {
    await cancelarAvisos()
    return { programados: 0, motivo: 'avisos desactivados' }
  }

  const permiso = await pedirPermisoAvisos()
  if (!permiso) {
    await cancelarAvisos()
    return { programados: 0, motivo: 'sin permiso para mostrar avisos' }
  }

  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications')

    // Canal propio: Android agrupa los avisos por canal y permite silenciarlos
    await LocalNotifications.createChannel({
      id: 'entrenamientos',
      name: 'Entrenamientos',
      description: 'Avisos de los dias que toca entrenar',
      importance: 4, // IMPORTANCE_HIGH
      visibility: 1,
      vibration: true,
    })

    // Empezamos limpio para no dejar avisos de dias que ya no entrenas
    await cancelarAvisos()

    const [hora, minuto] = partesHora(horaElegida())

    const notificaciones = diasConRutina(plan).map((d) => ({
      id: idDeDia(d.dia),
      title: 'Te toca entrenar',
      body: `${DIAS[d.dia]}: ${d.rutinas.map((r) => r.nombre).join(', ')}`,
      schedule: { at: proximaOcurrencia(d.dia, hora, minuto) },
      smallIcon: 'ic_stat_icon',
      channelId: 'entrenamientos',
    }))

    if (notificaciones.length === 0) {
      return { programados: 0, motivo: 'el plan no tiene dias con rutina' }
    }

    await LocalNotifications.schedule({ notifications: notificaciones })

    return { programados: notificaciones.length, hora: horaElegida() }
  } catch (e) {
    console.warn('No se pudieron programar los avisos:', e.message)
    return { programados: 0, motivo: e.message }
  }
}

/** Avisos ya programados, para mostrarlos en la pagina del plan. */
export async function avisosPendientes() {
  if (!esAppNativa()) return []
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications')
    const pendientes = await LocalNotifications.getPending()
    return pendientes.notifications
  } catch (e) {
    return []
  }
}