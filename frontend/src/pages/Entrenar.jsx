import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/axios'
import SesionActiva from '../components/SesionActiva'

const DIAS = ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado', 'Domingo']
const MUSCULOS = [
  'pecho', 'espalda', 'hombros', 'biceps', 'triceps', 'piernas',
  'gluteos', 'core', 'antebrazos', 'pantorrillas', 'otro'
]

function getDiaSemanaActual() {
  return (new Date().getDay() + 6) % 7
}

// "HH:MM" -> minutos desde medianoche
function horaAMinutos(hora) {
  if (!hora) return null
  const match = String(hora).trim().match(/^(\d{1,2}):(\d{2})$/)
  if (!match) return null
  const h = parseInt(match[1], 10)
  const m = parseInt(match[2], 10)
  if (h > 23 || m > 59) return null
  return h * 60 + m
}

// Duracion en minutos entre inicio y fin (asume cruce de medianoche si fin < inicio)
function calcularDuracion(inicio, fin) {
  const a = horaAMinutos(inicio)
  const b = horaAMinutos(fin)
  if (a === null || b === null) return null
  let diff = b - a
  if (diff <= 0) diff += 24 * 60
  return diff
}

function formatearDuracion(minutos) {
  if (minutos === null || minutos === undefined) return null
  if (minutos === 0) return '0 min'
  const h = Math.floor(minutos / 60)
  const m = minutos % 60
  if (h === 0) return `${m} min`
  if (m === 0) return `${h} h`
  return `${h} h ${m} min`
}

// --- Persistencia de la sesion activa ---
// Guardamos el id de la sesion y el momento exacto en que empezo, para que el
// cronometro siga corriendo aunque cierres la pagina o cambies de apartado.
const CLAVE_SESION = 'gymapp_sesion_activa'

function guardarSesionActiva(id, inicioMs) {
  localStorage.setItem(CLAVE_SESION, JSON.stringify({ id, inicioMs }))
}

function leerSesionActiva() {
  try {
    const raw = localStorage.getItem(CLAVE_SESION)
    return raw ? JSON.parse(raw) : null
  } catch (e) {
    return null
  }
}

function borrarSesionActiva() {
  localStorage.removeItem(CLAVE_SESION)
}

// Hora actual en formato HH:MM
function horaActual() {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

// Fecha local YYYY-MM-DD (sin desfase de zona horaria)
function fechaLocal() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function Entrenar() {
  const [plan, setPlan] = useState([])
  const [sesiones, setSesiones] = useState([])
  const [sesionActiva, setSesionActiva] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [exito, setExito] = useState('')

  const [notas, setNotas] = useState('')

  // Ejercicio extra
  const [mostrarExtra, setMostrarExtra] = useState(false)
  const [extra, setExtra] = useState({ nombre: '', musculo: 'pecho', series: 3, reps: 10, peso: 0, justificacion: '' })

  // Quitar ejercicio con justificacion
  const [quitarEjercicio, setQuitarEjercicio] = useState(null)
  const [justificacion, setJustificacion] = useState('')

  useEffect(() => {
    cargarDatos()
  }, [])

  const cargarDatos = async () => {
    try {
      const [p, s] = await Promise.all([
        api.get('/plan'),
        api.get('/entrenamientos/sesiones'),
      ])
      setPlan(p.data.plan)
      setSesiones(s.data.sesiones)
    } catch (err) {
      setError(err.response?.data?.error || 'Error al cargar datos')
    } finally {
      setCargando(false)
    }
  }

  const cargarSesion = async (id) => {
    try {
      const res = await api.get(`/entrenamientos/sesiones/${id}`)
      setSesionActiva({ ...res.data.sesion, ejercicios: res.data.sesion.ejercicios || [] })
    } catch (err) {
      // Si la sesion guardada ya no existe, la olvidamos
      borrarSesionActiva()
      setError(err.response?.data?.error || 'Error al cargar la sesion')
    }
  }

// Al montar, recupera la sesion en curso para no perder el progreso
useEffect(() => {
  const guardada = leerSesionActiva()
  if (guardada?.id) {
    cargarSesion(guardada.id)
  }
}, [])

  const handleRegistrarSesion = async (rutina, dia) => {
    try {
      const res = await api.post('/entrenamientos/sesiones', {
        rutina_id: rutina.rutina_id,
        fecha: fechaLocal(),
        hora_inicio: horaActual(),
        notas: `Dia del plan: ${DIAS[dia]}`,
      })

      const sesionId = res.data.sesion.id

      // Copiar los ejercicios de la rutina a la sesion
      await api.post(`/entrenamientos/sesiones/${sesionId}/copiar-rutina`, { rutina_id: rutina.rutina_id })

      // Guardamos el momento exacto de inicio para que el cronometro no se pierda
      guardarSesionActiva(sesionId, Date.now())

      setExito(`Entrenamiento "${rutina.nombre}" iniciado`)
      setTimeout(() => setExito(''), 3000)
      await cargarSesion(sesionId)
      cargarDatos()
    } catch (err) {
      setError(err.response?.data?.error || 'Error al iniciar entrenamiento')
      setTimeout(() => setError(''), 3000)
    }
  }

  const handleAnadirExtra = async (e) => {
    e.preventDefault()
    if (!sesionActiva) return
    try {
      const res = await api.post(`/entrenamientos/sesiones/${sesionActiva.id}/extra`, {
        ...extra,
        series: parseInt(extra.series),
        reps: parseInt(extra.reps),
        peso: parseFloat(extra.peso) || 0,
      })
      setExito(res.data.message)
      setTimeout(() => setExito(''), 3000)
      setExtra({ nombre: '', musculo: 'pecho', series: 3, reps: 10, peso: 0, justificacion: '' })
      setMostrarExtra(false)
      cargarSesion(sesionActiva.id)
    } catch (err) {
      setError(err.response?.data?.error || 'Error al anadir ejercicio extra')
    }
  }

  const handleQuitarEjercicio = async () => {
    if (!sesionActiva || !quitarEjercicio) return
    try {
      const params = justificacion ? `?justificacion=${encodeURIComponent(justificacion)}` : ''
      const res = await api.delete(`/entrenamientos/sesiones/${sesionActiva.id}/ejercicio/${quitarEjercicio.id}${params}`)
      setExito(res.data.message)
      setTimeout(() => setExito(''), 3000)
      setQuitarEjercicio(null)
      setJustificacion('')
      cargarSesion(sesionActiva.id)
    } catch (err) {
      setError(err.response?.data?.error || 'Error al quitar ejercicio')
    }
  }

  const handleEliminarSesion = async (id) => {
    if (!window.confirm('¿Eliminar este entrenamiento?')) return
    try {
      await api.delete(`/entrenamientos/sesiones/${id}`)
      if (sesionActiva?.id === id) setSesionActiva(null)
      cargarDatos()
    } catch (err) {
      setError(err.response?.data?.error || 'Error al eliminar')
    }
  }

  if (cargando) {
    return (
      <div className="container py-5 text-center">
        <div className="spinner-border text-danger" role="status"></div>
      </div>
    )
  }

  const diaHoy = getDiaSemanaActual()
  const planHoy = plan[diaHoy]

  return (
    <div className="container py-4">
      <div className="mb-4">
        <h1 className="fw-bold" style={{ color: '#1a1a2e' }}>Entrenar</h1>
        <p className="text-muted">
          Hoy es <strong>{DIAS[diaHoy]}</strong>. Registra tu entrenamiento y ajusta lo que necesites.
        </p>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {exito && <div className="alert alert-success"><i className="bi bi-check-circle me-2"></i>{exito}</div>}

      <div className="row g-4">
        <div className="col-lg-6">
          <div className="dashboard-card mb-4">
            <h5 className="fw-bold mb-3">Plan de hoy ({DIAS[diaHoy]})</h5>
            {!planHoy || planHoy.rutinas.length === 0 ? (
              <div className="text-center py-4">
                <p className="fs-2 mb-2">😴</p>
                <p className="text-muted mb-3">Hoy es dia de descanso según tu plan</p>
                <Link to="/plan" className="btn btn-outline-primary btn-sm">Ver plan semanal</Link>
              </div>
            ) : (
              <div className="d-flex flex-column gap-2">
                {planHoy.rutinas.map((r) => (
                  <div key={r.plan_id} className="d-flex justify-content-between align-items-center p-3 rounded" style={{ background: '#f8f9fa' }}>
                    <div>
                      <div className="fw-semibold">{r.nombre}</div>
                      <small className="text-muted">{r.categoria}</small>
                    </div>
                    <button className="btn btn-primary btn-sm" onClick={() => handleRegistrarSesion(r, diaHoy)}>
                      <i className="bi bi-play-fill me-1"></i>Iniciar
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="dashboard-card">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="fw-bold mb-0">
                {sesionActiva ? 'Entrenamiento en curso' : 'Entrenamiento en curso'}
              </h5>
              {sesionActiva && (
                <button className="btn btn-outline-secondary btn-sm" onClick={() => { borrarSesionActiva(); setSesionActiva(null) }}>
                  <i className="bi bi-x-lg me-1"></i>Cerrar
                </button>
              )}
            </div>

            {!sesionActiva ? (
              <p className="text-muted mb-0">No hay ningun entrenamiento activo. Inicia uno desde tu plan.</p>
            ) : (
              <>
                <SesionActiva
                  sesion={sesionActiva}
                  onSesionCambiada={() => cargarSesion(sesionActiva.id)}
                  onFinalizada={(data) => {
                    borrarSesionActiva()
                    const d = data.duracion_minutos
                    const h = Math.floor(d / 60)
                    const m = d % 60
                    setExito(`Rutina finalizada: ${data.hora_inicio} - ${data.hora_fin} · ${formatearDuracion(d)} (${h}h ${m}min)`)
                    setTimeout(() => setExito(''), 8000)
                    setSesionActiva(null)
                    cargarDatos()
                  }}
                />

                <hr className="my-3" />

                <button
                  className="btn btn-sm btn-outline-success w-100"
                  onClick={() => setMostrarExtra(!mostrarExtra)}
                >
                  <i className="bi bi-plus-lg me-1"></i>Añadir ejercicio extra solo hoy
                </button>

                {mostrarExtra && (
                  <form onSubmit={handleAnadirExtra} className="p-3 rounded mt-3" style={{ background: '#fff3e0' }}>
                    <h6 className="fw-bold mb-2" style={{ fontSize: '0.85rem' }}>
                      <i className="bi bi-plus-circle me-1"></i>Añadir solo hoy
                    </h6>
                    <div className="row g-2">
                      <div className="col-8">
                        <input className="form-control form-control-sm" placeholder="Nombre del ejercicio"
                          value={extra.nombre} onChange={(e) => setExtra({ ...extra, nombre: e.target.value })} required />
                      </div>
                      <div className="col-4">
                        <select className="form-select form-control-sm" value={extra.musculo}
                          onChange={(e) => setExtra({ ...extra, musculo: e.target.value })}>
                          {MUSCULOS.map((m) => <option key={m} value={m}>{m}</option>)}
                        </select>
                      </div>
                      <div className="col-4">
                        <input type="number" min="1" className="form-control form-control-sm" placeholder="Series"
                          value={extra.series} onChange={(e) => setExtra({ ...extra, series: e.target.value })} />
                      </div>
                      <div className="col-4">
                        <button type="submit" className="btn btn-success btn-sm w-100">Añadir</button>
                      </div>
                      <div className="col-12">
                        <input className="form-control form-control-sm" placeholder="¿Por qué lo añades? (opcional)"
                          value={extra.justificacion} onChange={(e) => setExtra({ ...extra, justificacion: e.target.value })} />
                      </div>
                    </div>
                  </form>
                )}

                <div className="mt-3">
                  <small className="text-muted d-block mb-2">Quitar un ejercicio de hoy</small>
                  <div className="d-flex flex-column gap-1">
                    {sesionActiva.ejercicios.map((ej) => (
                      <div key={ej.id} className="d-flex justify-content-between align-items-center p-2 rounded border">
                        <div className="flex-grow-1">
                          <div className="fw-semibold small">
                            {ej.nombre}
                            {ej.es_extra === 1 && (
                              <span className="badge bg-warning text-dark ms-2" style={{ fontSize: '0.65rem' }}>EXTRA</span>
                            )}
                          </div>
                          <small className="text-muted">{ej.series} series · {ej.musculo}</small>
                        </div>
                        <button className="btn btn-sm btn-outline-danger"
                          onClick={() => { setQuitarEjercicio(ej); setJustificacion('') }}>
                          <i className="bi bi-x-lg"></i>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="col-lg-6">
          <div className="dashboard-card">
            <h5 className="fw-bold mb-3">Historial de entrenamientos</h5>
            {sesiones.length === 0 ? (
              <p className="text-muted">Aun no has registrado entrenamientos</p>
            ) : (
              <div className="d-flex flex-column gap-2">
                {sesiones.slice(0, 20).map((s) => (
                  <div key={s.id} className="d-flex justify-content-between align-items-center p-2 rounded border">
                    <div>
                      <div className="fw-semibold small">{s.rutina_nombre || 'Entrenamiento libre'}</div>
                      <small className="text-muted">
                        {s.fecha}
                        {s.hora_inicio && s.hora_fin && ` · ${s.hora_inicio} - ${s.hora_fin}`}
                        {` · ${formatearDuracion(s.duracion_minutos)}`}
                      </small>
                    </div>
                    <div className="d-flex gap-1">
                      <button className="btn btn-sm btn-outline-primary" onClick={() => cargarSesion(s.id)}>
                        <i className="bi bi-eye"></i>
                      </button>
                      <button className="btn btn-sm btn-outline-danger" onClick={() => handleEliminarSesion(s.id)}>
                        <i className="bi bi-trash"></i>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {quitarEjercicio && (
        <div className="modal-backdrop-custom" style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div className="card" style={{ maxWidth: '420px', width: '90%' }}>
            <div className="card-body">
              <h5 className="fw-bold mb-3">Quitar ejercicio</h5>
              <p className="text-muted small">
                Vas a quitar <strong>{quitarEjercicio.nombre}</strong> de esta sesion.
              </p>
              <label className="form-label">¿Por qué lo quitas?</label>
              <textarea
                className="form-control mb-3"
                rows="2"
                placeholder="Ej: Dolor en el hombro, sin tiempo, lesion..."
                value={justificacion}
                onChange={(e) => setJustificacion(e.target.value)}
              />
              <div className="d-flex gap-2">
                <button className="btn btn-danger flex-grow-1" onClick={handleQuitarEjercicio}>
                  <i className="bi bi-x-lg me-1"></i>Quitar
                </button>
                <button className="btn btn-outline-secondary" onClick={() => setQuitarEjercicio(null)}>
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}