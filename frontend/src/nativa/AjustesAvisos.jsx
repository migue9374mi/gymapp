/**
 * Ajustes de los avisos de entrenamiento.
 *
 * Solo se muestra dentro de la app de Android: en la web no hay forma de
 * programar avisos sin montar un servidor de push entero.
 */
import { useEffect, useState } from 'react'
import Icon from '../components/Icon'
import {
  esAppNativa,
  horaElegida,
  guardarHoraElegida,
  avisosActivados,
  guardarAvisosActivados,
  programarAvisos,
  cancelarAvisos,
  DIAS,
} from './avisos'

export default function AjustesAvisos({ plan }) {
  const [hora, setHora] = useState('18:00')
  const [activo, setActivo] = useState(true)
  const [aviso, setAviso] = useState('')

  useEffect(() => {
    setHora(horaElegida())
    setActivo(avisosActivados())
  }, [])

  // Si el plan aun no ha llegado, no hay nada que programar
  if (!esAppNativa()) return null

  const reprogramar = async (estado = activo) => {
    if (!estado) {
      await cancelarAvisos()
      setAviso('Avisos desactivados')
      return
    }
    guardarHoraElegida(hora)
    const res = await programarAvisos(plan)

    if (res.programados > 0) {
      setAviso(`Listo: te avisare a las ${hora} los ${res.programados} dias con rutina`)
    } else {
      setAviso(
        res.motivo === 'sin permiso para mostrar avisos'
          ? 'Activa los avisos en los ajustes de Android'
          : res.motivo || 'No se pudieron programar'
      )
    }
  }

  const cambiarActivado = async () => {
    const nuevo = !activo
    setActivo(nuevo)
    guardarAvisosActivados(nuevo)
    await reprogramar(nuevo)
  }

  const diasConRutina = (plan || []).filter((d) => d.rutinas && d.rutinas.length > 0)

  return (
    <section className="panel settings-panel">
      <div className="panel-head">
        <div>
          <h3>Avisos de entrenamiento</h3>
          <p className="helper-copy">Solo dentro de la app de Android.</p>
        </div>
        <label className="switch" aria-label="Activar o desactivar los avisos">
          <input
            type="checkbox"
            checked={activo}
            onChange={cambiarActivado}
          />
          <span />
        </label>
      </div>

      <div className="panel-body">
        {activo ? (
          <>
            <div className="inline-form">
              <div className="field">
                <label htmlFor="hora-aviso">Avisarme a las</label>
                <input
                  id="hora-aviso"
                  type="time"
                  className="form-control"
                  value={hora}
                  onChange={(e) => setHora(e.target.value)}
                />
              </div>
              <button type="button" className="btn btn-primary" onClick={() => reprogramar(activo)}>
                <Icon nombre="check" /> Guardar
              </button>
            </div>

            <p className="helper-copy" style={{ marginTop: 12 }}>
              {diasConRutina.length > 0
                ? `Te avisare ${diasConRutina.map((d) => DIAS[d.dia]).join(', ')}. Los avisos suenan aunque no tengas cobertura, porque los guarda el propio telefono.`
                : 'Todavia no tienes rutinas asignadas a ningun dia, asi que no hay nada que avisar.'}
            </p>
          </>
        ) : (
          <p className="helper-copy">
            No te avisaremos. Activa el interruptor si quieres que te recordemos los dias de rutina.
          </p>
        )}

        {aviso && (
          <div className="alert alert-info" style={{ marginTop: 12 }}>
            <Icon nombre="info" />
            <span>{aviso}</span>
          </div>
        )}
      </div>
    </section>
  )
}
