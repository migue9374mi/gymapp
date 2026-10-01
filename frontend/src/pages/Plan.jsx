import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/axios'

const DIAS = [
  { num: 0, nombre: 'Lunes', icono: 'bi-1-circle' },
  { num: 1, nombre: 'Martes', icono: 'bi-2-circle' },
  { num: 2, nombre: 'Miercoles', icono: 'bi-3-circle' },
  { num: 3, nombre: 'Jueves', icono: 'bi-4-circle' },
  { num: 4, nombre: 'Viernes', icono: 'bi-5-circle' },
  { num: 5, nombre: 'Sabado', icono: 'bi-6-circle' },
  { num: 6, nombre: 'Domingo', icono: 'bi-7-circle' },
]

const COLOR_CATEGORIA = {
  push: 'danger',
  pull: 'primary',
  pierna: 'success',
  full_body: 'warning',
  core: 'info',
  cardio: 'dark',
  general: 'secondary',
}

export default function Plan() {
  const [plan, setPlan] = useState([])
  const [rutinas, setRutinas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [exito, setExito] = useState('')

  // Para asignar: dia seleccionado + rutina seleccionada
  const [diaSeleccionado, setDiaSeleccionado] = useState(null)
  const [rutinaSeleccionada, setRutinaSeleccionada] = useState('')

  useEffect(() => {
    cargarTodo()
  }, [])

  const cargarTodo = async () => {
    try {
      const [p, r] = await Promise.all([
        api.get('/plan'),
        api.get('/rutinas'),
      ])
      setPlan(p.data.plan)
      setRutinas(r.data.rutinas)
    } catch (err) {
      setError(err.response?.data?.error || 'Error al cargar el plan')
    } finally {
      setCargando(false)
    }
  }

  const handleAsignar = async (dia) => {
    if (!rutinaSeleccionada) return
    try {
      const res = await api.post('/plan', {
        dia_semana: dia,
        rutina_id: parseInt(rutinaSeleccionada),
      })
      setExito(res.data.message)
      setTimeout(() => setExito(''), 3000)
      setDiaSeleccionado(null)
      setRutinaSeleccionada('')
      cargarTodo()
    } catch (err) {
      setError(err.response?.data?.error || 'Error al asignar rutina')
      setTimeout(() => setError(''), 3000)
    }
  }

  const handleQuitar = async (planId, nombre) => {
    if (!window.confirm(`¿Quitar "${nombre}" de este dia?`)) return
    try {
      await api.delete(`/plan/${planId}`)
      cargarTodo()
    } catch (err) {
      setError(err.response?.data?.error || 'Error al quitar')
    }
  }

  if (cargando) {
    return (
      <div className="container py-5 text-center">
        <div className="spinner-border text-danger" role="status"></div>
      </div>
    )
  }

  const diasConRutina = plan.filter((d) => d.rutinas.length > 0).length

  return (
    <div className="container py-4">
      <div className="mb-4">
        <h1 className="fw-bold" style={{ color: '#1a1a2e' }}>Mi Plan Semanal</h1>
        <p className="text-muted">
          Asigna tus rutinas a los dias de la semana. Completa toda la semana para sumar a tu racha.
        </p>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {exito && <div className="alert alert-success"><i className="bi bi-check-circle me-2"></i>{exito}</div>}

      {rutinas.length === 0 ? (
        <div className="dashboard-card text-center py-5">
          <p className="fs-1 mb-2">📋</p>
          <h5 className="fw-bold">Primero crea tus rutinas</h5>
          <p className="text-muted mb-4">Necesitas al menos una rutina para armar tu plan semanal</p>
          <Link to="/rutinas" className="btn btn-primary">Ir a mis rutinas</Link>
        </div>
      ) : (
        <>
          <div className="dashboard-card mb-4">
            <div className="row align-items-end g-3">
              <div className="col-md-4">
                <label className="form-label fw-semibold">1. Elige la rutina</label>
                <select
                  className="form-select"
                  value={rutinaSeleccionada}
                  onChange={(e) => setRutinaSeleccionada(e.target.value)}
                >
                  <option value="">Selecciona una rutina...</option>
                  {rutinas.map((r) => (
                    <option key={r.id} value={r.id}>{r.nombre}</option>
                  ))}
                </select>
              </div>
              <div className="col-md-6">
                <label className="form-label fw-semibold">2. Elige el dia</label>
                <div className="d-flex gap-2 flex-wrap">
                  {DIAS.map((d) => (
                    <button
                      key={d.num}
                      className={`btn btn-sm ${diaSeleccionado === d.num ? 'btn-danger' : 'btn-outline-secondary'}`}
                      onClick={() => setDiaSeleccionado(d.num)}
                      disabled={!rutinaSeleccionada}
                    >
                      {d.nombre.slice(0, 3)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="col-md-2">
                {diaSeleccionado !== null && rutinaSeleccionada ? (
                  <button className="btn btn-success w-100" onClick={() => handleAsignar(diaSeleccionado)}>
                    <i className="bi bi-plus-lg me-1"></i>Asignar
                  </button>
                ) : (
                  <div className="text-muted small text-center py-2">
                    {diaSeleccionado !== null ? 'Confirma con Asignar' : 'Empieza eligiendo dia'}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="row g-3 mb-4">
            <div className="col-md-4">
              <div className="stat-card primary">
                <h3>{diasConRutina}</h3>
                <p>Dias con rutina / 7</p>
              </div>
            </div>
            <div className="col-md-4">
              <div className="stat-card info">
                <h3>{7 - diasConRutina}</h3>
                <p>Dias de descanso</p>
              </div>
            </div>
            <div className="col-md-4">
              <div className="stat-card success">
                <h3>{plan.reduce((s, d) => s + d.rutinas.length, 0)}</h3>
                <p>Rutinas por semana</p>
              </div>
            </div>
          </div>

          <div className="row g-3">
            {plan.map((dia) => (
              <div className="col-lg-4 col-md-6" key={dia.dia}>
                <div className={`card h-100 ${dia.rutinas.length === 0 ? 'bg-light' : ''}`}>
                  <div className="card-body">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <h5 className="fw-bold mb-0">
                        <i className={`bi ${DIAS[dia.dia].icono} me-2 text-danger`}></i>
                        {dia.nombre}
                      </h5>
                      {dia.rutinas.length === 0 && (
                        <span className="badge bg-secondary">Descanso</span>
                      )}
                    </div>

                    {dia.rutinas.length === 0 ? (
                      <div className="text-center py-3">
                        <p className="fs-3 mb-1">😴</p>
                        <small className="text-muted">Dia de descanso</small>
                      </div>
                    ) : (
                      <div className="d-flex flex-column gap-2">
                        {dia.rutinas.map((r) => (
                          <div
                            key={r.plan_id}
                            className="d-flex justify-content-between align-items-center p-2 rounded"
                            style={{ background: '#f8f9fa' }}
                          >
                            <div className="flex-grow-1">
                              <div className="fw-semibold small">{r.nombre}</div>
                              <span className={`badge bg-${COLOR_CATEGORIA[r.categoria] || 'secondary'} mt-1`}>
                                {r.categoria}
                              </span>
                            </div>
                            <div className="d-flex gap-1">
                              <Link
                                to={`/rutinas/${r.rutina_id}`}
                                className="btn btn-sm btn-outline-primary"
                                title="Ver rutina"
                              >
                                <i className="bi bi-eye"></i>
                              </Link>
                              <button
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => handleQuitar(r.plan_id, r.nombre)}
                                title="Quitar del dia"
                              >
                                <i className="bi bi-x-lg"></i>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}