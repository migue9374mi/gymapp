import { useState, useEffect } from 'react'
import api from '../api/axios'

// --- Persistencia de la sesion activa ---
const CLAVE_SESION = 'gymapp_sesion_activa'

function leerSesionActiva() {
  try {
    const raw = localStorage.getItem(CLAVE_SESION)
    return raw ? JSON.parse(raw) : null
  } catch (e) {
    return null
  }
}

const COLOR_ESTADO = {
  rojo: '#dc3545',
  amarillo: '#ffc107',
  verde: '#28a745',
}

const ETIQUETA_ESTADO = {
  rojo: 'Sin iniciar',
  amarillo: 'En progreso',
  verde: 'Terminado',
}

function formatearCronometro(segundos) {
  const h = Math.floor(segundos / 3600)
  const m = Math.floor((segundos % 3600) / 60)
  const s = segundos % 60
  const pad = (n) => String(n).padStart(2, '0')
  if (h > 0) return `${h}:${pad(m)}:${pad(s)}`
  return `${pad(m)}:${pad(s)}`
}

export default function SesionActiva({ sesion, onFinalizada, onSesionCambiada }) {
  const [ejercicioSel, setEjercicioSel] = useState(null)
  const [peso, setPeso] = useState('')
  const [reps, setReps] = useState('')
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)

  // Cronometro: se basa en la marca de tiempo real del inicio, guardada en
  // localStorage. Asi sigue corriendo aunque cierres la pagina o cambies de
  // apartado: al volver, elapsed = ahora - inicio (no se reinicia).
  const [segundos, setSegundos] = useState(() => {
    const g = leerSesionActiva()
    return g?.inicioMs ? Math.floor((Date.now() - g.inicioMs) / 1000) : 0
  })

  useEffect(() => {
    const t = setInterval(() => {
      const g = leerSesionActiva()
      if (g?.inicioMs) {
        setSegundos(Math.floor((Date.now() - g.inicioMs) / 1000))
      }
    }, 1000)
    return () => clearInterval(t)
  }, [])

  // Cuando cambia el ejercicio seleccionado, precargar el peso de la ultima serie
  useEffect(() => {
    if (!ejercicioSel) return
    const regs = ejercicioSel.series_registradas || []
    if (regs.length > 0) {
      const ultima = regs[regs.length - 1]
      setPeso(ultima.peso)
      setReps(ultima.reps ?? ejercicioSel.reps)
    } else {
      setPeso(ejercicioSel.peso || '')
      setReps(ejercicioSel.reps || '')
    }
  }, [ejercicioSel?.id])

  const registrarSerie = async (numeroSerie) => {
    if (!ejercicioSel) return
    if (peso === '' || peso === null) {
      setError('Escribe el peso de la serie')
      return
    }
    setGuardando(true)
    setError('')
    try {
      await api.post(`/entrenamientos/sesiones/${sesion.id}/series`, {
        ejercicio_id: ejercicioSel.id,
        numero_serie: numeroSerie,
        peso: parseFloat(peso),
        reps: reps ? parseInt(reps) : null,
      })
      onSesionCambiada()
    } catch (err) {
      setError(err.response?.data?.error || 'Error al registrar la serie')
    } finally {
      setGuardando(false)
    }
  }

  const borrarSerie = async (ejercicioId, numero) => {
    try {
      await api.delete(`/entrenamientos/sesiones/${sesion.id}/series/${ejercicioId}/${numero}`)
      onSesionCambiada()
    } catch (err) {
      setError(err.response?.data?.error || 'Error al borrar la serie')
    }
  }

  const finalizar = async () => {
    const fin = new Date()
    const horaFin = `${String(fin.getHours()).padStart(2, '0')}:${String(fin.getMinutes()).padStart(2, '0')}`
    try {
      const res = await api.post(`/entrenamientos/sesiones/${sesion.id}/finalizar`, { hora_fin: horaFin })
      onFinalizada(res.data)
    } catch (err) {
      setError(err.response?.data?.error || 'Error al finalizar')
    }
  }

  const incompletos = sesion.ejercicios.filter((e) => e.estado !== 'verde').length
  const terminados = sesion.ejercicios.length - incompletos

  return (
    <div>
      {/* Cronometro */}
      <div
        className="d-flex justify-content-between align-items-center p-3 rounded mb-3"
        style={{ background: '#1a1a2e', color: 'white' }}
      >
        <div>
          <div className="small" style={{ opacity: 0.7 }}>Tiempo transcurrido</div>
          <div className="fs-4 fw-bold" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {formatearCronometro(segundos)}
          </div>
        </div>
        <div className="text-end">
          <div className="small" style={{ opacity: 0.7 }}>Progreso</div>
          <div className="fs-5 fw-bold">
            {terminados}/{sesion.ejercicios.length}
          </div>
        </div>
      </div>

      <div className="progress mb-3" style={{ height: '8px' }}>
        <div
          className="progress-bar bg-success"
          style={{ width: `${sesion.ejercicios.length ? (terminados / sesion.ejercicios.length) * 100 : 0}%` }}
        ></div>
      </div>

      {error && <div className="alert alert-danger py-2">{error}</div>}

      {incompletos > 0 && (
        <div className="alert alert-warning py-2 small">
          <i className="bi bi-exclamation-triangle me-1"></i>
          Te faltan {incompletos} ejercicio(s) por completar
        </div>
      )}

      {/* Ejercicio seleccionado: input de peso */}
      {ejercicioSel && (
        <div className="p-3 rounded mb-3" style={{ background: '#fff3e0', border: '2px solid #e94560' }}>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <strong>{ejercicioSel.nombre}</strong>
            <button className="btn btn-sm btn-outline-secondary" onClick={() => setEjercicioSel(null)}>
              <i className="bi bi-x-lg"></i>
            </button>
          </div>

          <div className="row g-2 align-items-end mb-3">
            <div className="col-6">
              <label className="form-label small mb-1">Peso (kg)</label>
              <input
                type="number"
                step="0.5"
                min="0"
                className="form-control form-control-lg"
                value={peso}
                onChange={(e) => setPeso(e.target.value)}
                placeholder="0"
                autoFocus
              />
            </div>
            <div className="col-6">
              <label className="form-label small mb-1">Repeticiones</label>
              <input
                type="number"
                min="0"
                className="form-control form-control-lg"
                value={reps}
                onChange={(e) => setReps(e.target.value)}
                placeholder="10"
              />
            </div>
          </div>

          <div className="d-flex gap-2 flex-wrap">
            {Array.from({ length: ejercicioSel.series }, (_, i) => i + 1).map((n) => {
              const hecha = (ejercicioSel.series_registradas || []).find((s) => s.numero_serie === n)
              return (
                <button
                  key={n}
                  className={`btn ${hecha ? 'btn-success' : 'btn-outline-success'}`}
                  onClick={() => registrarSerie(n)}
                  disabled={guardando}
                >
                  Serie {n}
                  {hecha && ` · ${hecha.peso}kg`}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Lista de ejercicios con estado por color */}
      <div className="d-flex flex-column gap-2 mb-3">
        {sesion.ejercicios.map((ej) => {
          const regs = ej.series_registradas || []
          return (
            <div
              key={ej.id}
              className="d-flex justify-content-between align-items-center p-3 rounded border"
              style={{
                borderLeft: `5px solid ${COLOR_ESTADO[ej.estado]}`,
                background: ejercicioSel?.id === ej.id ? '#f8f9fa' : 'white',
                cursor: 'pointer',
              }}
              onClick={() => setEjercicioSel(ej)}
            >
              <div className="flex-grow-1">
                <div className="fw-semibold">
                  {ej.nombre}
                  {ej.es_extra === 1 && (
                    <span className="badge bg-warning text-dark ms-2" style={{ fontSize: '0.65rem' }}>EXTRA</span>
                  )}
                </div>
                <small className="text-muted">
                  {ej.series} series{ej.reps ? ` x ${ej.reps} reps` : ''} · {ej.musculo}
                </small>
                {regs.length > 0 && (
                  <div className="mt-1">
                    {regs.map((s) => (
                      <span
                        key={s.numero_serie}
                        className="badge bg-light text-dark border me-1"
                        style={{ fontSize: '0.7rem' }}
                        title="Click para borrar esta serie"
                        onClick={(e) => { e.stopPropagation(); borrarSerie(ej.id, s.numero_serie) }}
                      >
                        S{s.numero_serie}: {s.peso}kg{s.reps ? ` x${s.reps}` : ''} <i className="bi bi-x"></i>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="text-end ms-2">
                <span
                  className="badge"
                  style={{ background: COLOR_ESTADO[ej.estado], color: 'white' }}
                >
                  {ETIQUETA_ESTADO[ej.estado]}
                </span>
                <div className="small text-muted mt-1">
                  {regs.length}/{ej.series}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <button className="btn btn-primary w-100 btn-lg" onClick={finalizar}>
        <i className="bi bi-flag-fill me-2"></i>
        Finalizar rutina ({formatearCronometro(segundos)})
      </button>
    </div>
  )
}