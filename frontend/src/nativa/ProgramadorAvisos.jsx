/**
 * Programa los avisos de entrenamiento a partir del plan semanal.
 *
 * Se monta una sola vez, al entrar en la app. Cada vez que se abre, vuelve a
 * leer el plan y reprograma los avisos, asi que si el usuario cambia su plan
 * en otro dispositivo, aqui se entera y lo corrige solo.
 *
 * No pinta nada: es invisible para el usuario.
 */
import { useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'
import { programarAvisos, avisosActivados, esAppNativa } from './avisos'

export default function ProgramadorAvisos() {
  const { user } = useAuth()
  const idUsuario = user?.id
  const nativa = esAppNativa()

  useEffect(() => {
    // En la web no hay avisos que programar: ni se monta ni se pregunta nada
    if (!idUsuario || !nativa) return

    // Si el usuario los ha desactivado no gastamos ni una peticion
    if (!avisosActivados()) return

    let cancelado = false

    const programar = async () => {
      try {
        const res = await api.get('/plan')
        if (cancelado) return
        await programarAvisos(res.data.plan)
      } catch (err) {
        // Sin internet, o el servidor dormido: no es grave. Los avisos
        // que ya estaban programados siguen en pie.
        console.warn('No se pudieron actualizar los avisos:', err?.message)
      }
    }

    programar()

    return () => { cancelado = true }
  }, [idUsuario, nativa])

  return null
}