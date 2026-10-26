/**
 * El temporizador de descanso entre series.
 *
 * Guarda la hora exacta en la que termina, no un contador que va bajando.
 * Por eso sigue cuadrando si cierras la app, cambias de apartado o se apaga
 * la pantalla: al volver se calcula lo que queda con la hora real.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  CLAVE_DESCANSO,
  CLAVE_PREFS_DESCANSO,
  DESCANSO_POR_DEFECTO,
  estadoDesdeGuardado,
  leerPreferencias,
  normalizarSegundos,
} from '../nativa/descansoLogica'
import {
  cancelarAvisoDescanso,
  desbloquearAudio,
  prepararSonido,
  programarAvisoDescanso,
  sonarAvisoDescanso,
  vibrarAvisoDescanso,
} from '../nativa/descanso'

// La barra verde de "terminado" se queda un minuto y luego se va sola.
const MS_BARRA_TERMINADA = 60 * 1000

function leerJSON(clave) {
  try {
    const guardado = localStorage.getItem(clave)
    return guardado ? JSON.parse(guardado) : null
  } catch (e) {
    return null
  }
}

function escribirJSON(clave, valor) {
  try {
    localStorage.setItem(clave, JSON.stringify(valor))
  } catch (e) {
    // Si el navegador no deja guardar, el temporizador funciona igual
    // mientras la pagina siga abierta.
  }
}

function borrarClave(clave) {
  try {
    localStorage.removeItem(clave)
  } catch (e) {
    // Nada que hacer
  }
}

export default function useDescanso(sesionId) {
  // Lo que habia guardado de antes (si la sesion es la misma)
  const [inicial] = useState(() =>
    estadoDesdeGuardado(leerJSON(CLAVE_DESCANSO), Date.now(), sesionId)
  )

  const [preferencias] = useState(() =>
    leerPreferencias(leerJSON(CLAVE_PREFS_DESCANSO))
  )

  const [duracionSeg, setDuracionSeg] = useState(
    inicial?.duracionSeg ?? preferencias.segundos
  )
  const [auto, setAuto] = useState(preferencias.auto)
  const [estado, setEstado] = useState(inicial?.estado ?? 'inactivo')
  const [restanteMs, setRestanteMs] = useState(inicial?.restanteMs ?? 0)
  const [totalMs, setTotalMs] = useState(inicial?.totalMs ?? 0)

  const finMsRef = useRef(inicial?.finMs ?? null)
  const terminadoEnRef = useRef(inicial?.terminadoEnMs ?? null)
  // Si al volver ya habia terminado, no se pita otra vez: solo se ve verde.
  const avisadoRef = useRef(inicial?.estado === 'terminado')
  // Si Android tiene programado su aviso, el sonido lo pone el sistema.
  const avisoNativoRef = useRef(false)

  const persistir = useCallback(
    (datos) => {
      escribirJSON(CLAVE_DESCANSO, { v: 1, sesionId, ...datos })
    },
    [sesionId]
  )

  const detener = useCallback(() => {
    finMsRef.current = null
    terminadoEnRef.current = null
    avisadoRef.current = true
    avisoNativoRef.current = false
    setEstado('inactivo')
    setRestanteMs(0)
    setTotalMs(0)
    borrarClave(CLAVE_DESCANSO)
    cancelarAvisoDescanso()
  }, [])

  const iniciar = useCallback(
    (segundosElegidos) => {
      const segundos =
        normalizarSegundos(segundosElegidos ?? duracionSeg) ?? DESCANSO_POR_DEFECTO
      const total = segundos * 1000
      const fin = Date.now() + total

      finMsRef.current = fin
      terminadoEnRef.current = null
      avisadoRef.current = false
      avisoNativoRef.current = false

      setDuracionSeg(segundos)
      setRestanteMs(total)
      setTotalMs(total)
      setEstado('corriendo')

      persistir({
        estado: 'corriendo',
        duracionSeg: segundos,
        totalMs: total,
        finMs: fin,
      })
      desbloquearAudio()

      programarAvisoDescanso(fin).then((programado) => {
        // Solo vale si sigue siendo el mismo descanso: puede que el usuario
        // lo haya pausado o reiniciado mientras Android preguntaba.
        if (programado && finMsRef.current === fin) {
          avisoNativoRef.current = true
        }
      })
    },
    [duracionSeg, persistir]
  )

  const pausar = useCallback(() => {
    if (estado !== 'corriendo') return
    const fin = finMsRef.current
    if (!fin) return

    // Si se pausa en el ultimo instante, se deja al menos un segundo
    const restante = Math.max(1000, fin - Date.now())
    finMsRef.current = null
    avisoNativoRef.current = false

    setRestanteMs(restante)
    setEstado('pausado')
    persistir({ estado: 'pausado', duracionSeg, totalMs, restanteMs: restante })
    cancelarAvisoDescanso()
  }, [estado, duracionSeg, totalMs, persistir])

  const reanudar = useCallback(() => {
    if (estado !== 'pausado') return

    const restante = Math.max(1000, restanteMs)
    const fin = Date.now() + restante

    finMsRef.current = fin
    avisadoRef.current = false
    avisoNativoRef.current = false
    setEstado('corriendo')

    persistir({ estado: 'corriendo', duracionSeg, totalMs, finMs: fin })
    desbloquearAudio()

    programarAvisoDescanso(fin).then((programado) => {
      if (programado && finMsRef.current === fin) {
        avisoNativoRef.current = true
      }
    })
  }, [estado, restanteMs, duracionSeg, totalMs, persistir])

  const sumar = useCallback(
    (segundos = 30) => {
      const extra = Math.max(1, Math.round(segundos)) * 1000

      if (estado === 'corriendo' && finMsRef.current) {
        const fin = finMsRef.current + extra
        const nuevoTotal = totalMs + extra

        finMsRef.current = fin
        avisoNativoRef.current = false
        setRestanteMs(Math.max(0, fin - Date.now()))
        setTotalMs(nuevoTotal)

        persistir({
          estado: 'corriendo',
          duracionSeg,
          totalMs: nuevoTotal,
          finMs: fin,
        })

        programarAvisoDescanso(fin).then((programado) => {
          if (programado && finMsRef.current === fin) {
            avisoNativoRef.current = true
          }
        })
        return
      }

      if (estado === 'pausado') {
        const nuevoRestante = restanteMs + extra
        const nuevoTotal = totalMs + extra

        setRestanteMs(nuevoRestante)
        setTotalMs(nuevoTotal)
        persistir({
          estado: 'pausado',
          duracionSeg,
          totalMs: nuevoTotal,
          restanteMs: nuevoRestante,
        })
      }
    },
    [estado, restanteMs, duracionSeg, totalMs, persistir]
  )

  const cambiarDuracion = useCallback(
    (valor) => {
      const segundos = normalizarSegundos(valor)
      if (!segundos) return false

      setDuracionSeg(segundos)
      escribirJSON(CLAVE_PREFS_DESCANSO, { segundos, auto })
      return true
    },
    [auto]
  )

  const cambiarAuto = useCallback(
    (valor) => {
      const activo = Boolean(valor)
      setAuto(activo)
      escribirJSON(CLAVE_PREFS_DESCANSO, { segundos: duracionSeg, auto: activo })
    },
    [duracionSeg]
  )

  const iniciarAutomatico = useCallback(() => {
    if (auto) iniciar()
  }, [auto, iniciar])

  // El reloj del descanso. Cada medio segundo se mira la hora de verdad.
  useEffect(() => {
    if (estado !== 'corriendo') return

    const mirar = () => {
      const fin = finMsRef.current
      if (!fin) return

      const ahora = Date.now()
      const restante = fin - ahora

      if (restante > 0) {
        setRestanteMs(restante)
        return
      }

      // Se acabo el descanso
      finMsRef.current = null
      terminadoEnRef.current = ahora
      avisadoRef.current = true
      setRestanteMs(0)
      setEstado('terminado')
      persistir({
        estado: 'terminado',
        duracionSeg,
        totalMs,
        terminadoEnMs: ahora,
      })

      // Si Android ya tiene programado su aviso, el sonido y la vibracion
      // los pone el sistema. Si no (web o permiso denegado), se avisa aqui.
      if (!avisoNativoRef.current) {
        sonarAvisoDescanso()
        vibrarAvisoDescanso()
      }
    }

    mirar()
    const intervalo = setInterval(mirar, 500)
    return () => clearInterval(intervalo)
  }, [estado, duracionSeg, totalMs, persistir])

  // La barra verde no se queda para siempre tapando la pantalla.
  useEffect(() => {
    if (estado !== 'terminado') return

    const temporizador = setTimeout(detener, MS_BARRA_TERMINADA)
    return () => clearTimeout(temporizador)
  }, [estado, detener])

  // Deja el sonido desbloqueado en cuanto el usuario toque la pantalla,
  // para que el pitido funcione aunque haya recargado a mitad de descanso.
  useEffect(() => {
    prepararSonido()
  }, [])

  return {
    estado,
    restanteMs,
    totalMs,
    duracionSeg,
    auto,
    iniciar,
    iniciarAutomatico,
    pausar,
    reanudar,
    sumar,
    detener,
    cambiarDuracion,
    cambiarAuto,
  }
}
