/**
 * Ajustes de los avisos de entrenamiento.
 *
 * Solo se muestra dentro de la app de Android: en la web no hay forma de
 * programar avisos sin montar un servidor de push entero.
 */
import { useEffect, useState } from 'react'
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

  const reprogramar = async () => {
    if (!activo) {
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
    await reprogramar()
  }

  const diasConRutina = (plan || []).filter((d) => d.rutinas && d.rutinas.length > 0)

  return (
    <div className="dashboard-card mb-4">
      <div className="d-flex justify-content-between align-items-start mb-3">
        <h5 className="fw-bold mb-0">
          <i className="bi bi-bell me-2"></i>Avisos de entrenamiento
        </h5>
        <div className="form-check form-switch">
          <input
            className="form-check-input"
            type="checkbox"
            id="avisosActivos"
            checked={activo}
            onChange={cambiarActivado}
          />
        </div>
      </div>

      {activo ? (
        <>
          <div className="row align-items-end g-3">
            <div className="col-auto">
              <label className="form-label small text-muted">Avisarme a las</label>
              <input
                type="time"
                className="form-control"
                value={hora}
                onChange={(e) => setHora(e.target.value)}
              />
            </div>
            <div className="col-auto">
              <button className="btn btn-primary" onClick={reprogramar}>
                <i className="bi bi-check-lg me-1"></i>Guardar
              </button>
            </div>
          </div>

          {diasConRutina.length > 0 ? (
            <small className="text-muted d-block mt-3">
              Te avisare{' '}
              {diasConRutina.map((d) => DIAS[d.dia]).join(', ')}
              . Los avisos suenan aunque no tengas cobertura, porque los guarda el propio telefono.
            </small>
          ) : (
            <small className="text-muted d-block mt-3">
              Todavia no tienes rutinas asignadas a ningun dia, asi que no hay nada que avisar.
            </small>
          )}
        </>
      ) : (
        <small className="text-muted">
          No te avisaremos. Activa el interruptor si quieres que te recordemos los dias de rutina.
        </small>
      )}

      {aviso && (
        <div className="alert alert-info py-2 mt-3 mb-0">
          <i className="bi bi-info-circle me-2"></i>{aviso}
        </div>
      )}
    </div>
  )
}