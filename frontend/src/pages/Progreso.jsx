import { useState, useEffect } from 'react'
import api, { mensajeDeError } from '../api/axios'

export default function Progreso() {
  const [stats, setStats] = useState(null)
  const [historial, setHistorial] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    cargarDatos()
  }, [])

  const cargarDatos = async () => {
    try {
      const [s, h] = await Promise.all([
        api.get('/estadisticas'),
        api.get('/estadisticas/historial'),
      ])
      setStats(s.data)
      setHistorial(h.data.historial)
    } catch (err) {
      setError(mensajeDeError(err, 'Error al cargar estadisticas'))
    } finally {
      setCargando(false)
    }
  }

  if (cargando) {
    return (
      <div className="container py-5 text-center">
        <div className="spinner-border text-danger" role="status"></div>
      </div>
    )
  }

  const maxDia = Math.max(...stats.diasSemana, 1)
  const maxVolumen = Math.max(...stats.volumenPorMusculo.map((v) => v.volumen), 1)

  return (
    <div className="container py-4">
      <div className="mb-4">
        <h1 className="fw-bold" style={{ color: '#1a1a2e' }}>Mi Progreso</h1>
        <p className="text-muted">Rachas, distribucion de entrenamiento y volumen por musculo</p>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {stats.totalEntrenamientos === 0 ? (
        <div className="dashboard-card text-center py-5">
          <p className="fs-1 mb-2">📊</p>
          <h5 className="fw-bold">Todavia no hay datos</h5>
          <p className="text-muted">Registra tus entrenamientos desde la pagina de plan para ver tu progreso</p>
        </div>
      ) : (
        <>
          <div className="row g-4 mb-4">
            <div className="col-md-3 col-6">
              <div className="stat-card primary">
                <h3>{stats.rachas.rachaActual}</h3>
                <p>Semanas seguidas</p>
              </div>
            </div>
            <div className="col-md-3 col-6">
              <div className="stat-card success">
                <h3>{stats.rachas.rachaDiaria}</h3>
                <p>Dias seguidos</p>
              </div>
            </div>
            <div className="col-md-3 col-6">
              <div className="stat-card info">
                <h3>{stats.rachas.mejorRacha}</h3>
                <p>Mejor racha semanal</p>
              </div>
            </div>
            <div className="col-md-3 col-6">
              <div className="stat-card warning">
                <h3>{stats.totalEntrenamientos}</h3>
                <p>Entrenamientos totales</p>
              </div>
            </div>
          </div>

          <div className="row g-4">
            <div className="col-lg-6">
              <div className="dashboard-card h-100">
                <h5 className="fw-bold mb-4">Entrenamientos por dia</h5>
                {stats.diasSemana.map((count, i) => (
                  <div key={i} className="mb-3">
                    <div className="d-flex justify-content-between mb-1">
                      <span className="text-muted">{stats.nombresDias[i]}</span>
                      <span className="fw-semibold">{count}</span>
                    </div>
                    <div className="progress" style={{ height: '8px' }}>
                      <div
                        className="progress-bar bg-danger"
                        style={{ width: `${(count / maxDia) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="col-lg-6">
              <div className="dashboard-card h-100">
                <h5 className="fw-bold mb-4">Volumen por musculo (kg)</h5>
                {stats.volumenPorMusculo.length === 0 ? (
                  <p className="text-muted">Sin datos de volumen aun</p>
                ) : (
                  stats.volumenPorMusculo.map((m) => (
                    <div key={m.musculo} className="mb-3">
                      <div className="d-flex justify-content-between mb-1">
                        <span className="text-muted text-capitalize">{m.musculo}</span>
                        <span className="fw-semibold">{Math.round(m.volumen).toLocaleString()} kg</span>
                      </div>
                      <div className="progress" style={{ height: '8px' }}>
                        <div
                          className="progress-bar bg-info"
                          style={{ width: `${(m.volumen / maxVolumen) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="col-lg-6">
              <div className="dashboard-card h-100">
                <h5 className="fw-bold mb-4">Ultimas 8 semanas</h5>
                {historial.map((s) => (
                  <div key={s.semana} className="d-flex justify-content-between align-items-center mb-2 py-1 border-bottom">
                    <span className="fw-semibold">{s.semana}</span>
                    <span className="text-muted small">{s.fechaInicio} a {s.fechaFin}</span>
                    <span className="badge bg-secondary">{s.entrenamientos} dias</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="col-lg-6">
              <div className="dashboard-card h-100">
                <h5 className="fw-bold mb-4">Resumen general</h5>
                <div className="row g-3">
                  <div className="col-6">
                    <div className="text-center p-3 rounded" style={{ background: '#f8f9fa' }}>
                      <div className="fs-3 fw-bold text-primary">
                        {Math.floor(stats.tiempoTotal / 60)}h {stats.tiempoTotal % 60}m
                      </div>
                      <small className="text-muted">Tiempo total</small>
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="text-center p-3 rounded" style={{ background: '#f8f9fa' }}>
                      <div className="fs-3 fw-bold text-success">
                        {stats.descansos.promedio}d
                      </div>
                      <small className="text-muted">Descanso promedio</small>
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="text-center p-3 rounded" style={{ background: '#f8f9fa' }}>
                      <div className="fs-3 fw-bold text-info">
                        {stats.rachas.semanasCompletadas}
                      </div>
                      <small className="text-muted">Semanas completas</small>
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="text-center p-3 rounded" style={{ background: '#f8f9fa' }}>
                      <div className="fs-3 fw-bold text-warning">
                        {stats.descansos.maximo}d
                      </div>
                      <small className="text-muted">Mayor descanso</small>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}