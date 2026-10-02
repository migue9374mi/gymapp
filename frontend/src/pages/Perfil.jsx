import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api, { mensajeDeError } from '../api/axios'

function formatearTiempo(minutos) {
  if (!minutos) return '0h 0m'
  const h = Math.floor(minutos / 60)
  const m = minutos % 60
  return h === 0 ? `${m}m` : m === 0 ? `${h}h` : `${h}h ${m}m`
}

export default function Perfil() {
  const [datos, setDatos] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const cargar = async () => {
      try {
        const res = await api.get('/perfil')
        setDatos(res.data)
      } catch (err) {
        setError(mensajeDeError(err, 'Error al cargar el perfil'))
      } finally {
        setCargando(false)
      }
    }
    cargar()
  }, [])

  if (cargando) {
    return (
      <div className="container py-5 text-center">
        <div className="spinner-border text-danger" role="status"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container py-5 text-center">
        <p className="fs-1">😕</p>
        <h5>{error}</h5>
      </div>
    )
  }

  const { usuario, resumen, porMusculo, topEjercicios, records, ultimas, corporal } = datos
  const maxVolumen = Math.max(...porMusculo.map((m) => m.volumen), 1)

  return (
    <div className="container py-4">
      {/* Cabecera */}
      <div className="dashboard-card mb-4">
        <div className="d-flex align-items-center gap-3 flex-wrap">
          <div
            className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold"
            style={{ width: '70px', height: '70px', background: '#e94560', fontSize: '1.8rem' }}
          >
            {usuario.nombre.charAt(0).toUpperCase()}
          </div>
          <div className="flex-grow-1">
            <h3 className="fw-bold mb-1" style={{ color: '#1a1a2e' }}>{usuario.nombre}</h3>
            <div className="text-muted">{usuario.email}</div>
            <small className="text-muted">
              Entrenando desde el {new Date(usuario.fecha_registro).toLocaleDateString('es-ES')}
            </small>
          </div>
          <Link to="/medidas" className="btn btn-outline-primary">
            <i className="bi bi-rulers me-2"></i>Actualizar medidas
          </Link>
        </div>
      </div>

      {/* Totales */}
      <div className="row g-3 mb-4">
        <div className="col-md-3 col-6">
          <div className="stat-card primary">
            <h3>{resumen.entrenamientos}</h3>
            <p>Rutinas terminadas</p>
          </div>
        </div>
        <div className="col-md-3 col-6">
          <div className="stat-card success">
            <h3>{formatearTiempo(resumen.minutos)}</h3>
            <p>Tiempo entrenado</p>
          </div>
        </div>
        <div className="col-md-3 col-6">
          <div className="stat-card info">
            <h3>{resumen.volumen.toLocaleString()}</h3>
            <p>Volumen (kg)</p>
          </div>
        </div>
        <div className="col-md-3 col-6">
          <div className="stat-card warning">
            <h3>{resumen.rachaDiaria}</h3>
            <p>Dias seguidos</p>
          </div>
        </div>
      </div>

      {resumen.entrenamientos === 0 ? (
        <div className="dashboard-card text-center py-5">
          <p className="fs-1 mb-2">📊</p>
          <h5 className="fw-bold">Tu perfil se llenara con tus datos</h5>
          <p className="text-muted mb-4">
            Termina tu primera rutina y aqui veras volumen, records, distribucion por musculo y mas.
          </p>
          <Link to="/entrenar" className="btn btn-primary">
            <i className="bi bi-play-fill me-2"></i>Ir a entrenar
          </Link>
        </div>
      ) : (
        <div className="row g-4">
          {/* Distribucion por musculo */}
          <div className="col-lg-6">
            <div className="dashboard-card h-100">
              <h5 className="fw-bold mb-4"><i className="bi bi-bar-chart me-2"></i>Trabajo por músculo</h5>
              {porMusculo.length === 0 ? (
                <p className="text-muted">Sin datos de volumen todavía</p>
              ) : (
                porMusculo.map((m) => (
                  <div key={m.musculo} className="mb-3">
                    <div className="d-flex justify-content-between mb-1">
                      <span className="text-muted text-capitalize">{m.musculo}</span>
                      <span className="fw-semibold">
                        {Math.round(m.volumen).toLocaleString()} kg
                        <small className="text-muted ms-2">{m.series} series</small>
                      </span>
                    </div>
                    <div className="progress" style={{ height: '8px' }}>
                      <div className="progress-bar bg-danger"
                        style={{ width: `${(m.volumen / maxVolumen) * 100}%` }}></div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Records personales */}
          <div className="col-lg-6">
            <div className="dashboard-card h-100">
              <h5 className="fw-bold mb-4"><i className="bi bi-trophy me-2"></i>Tus records</h5>
              {records.length === 0 ? (
                <p className="text-muted">Aun no hay pesos registrados</p>
              ) : (
                records.map((r, i) => (
                  <div key={r.nombre} className="d-flex justify-content-between align-items-center p-2 mb-2 rounded"
                    style={{ background: i === 0 ? '#fff3e0' : '#f8f9fa' }}>
                    <div>
                      <span className="fw-semibold">{r.nombre}</span>
                      {i === 0 && <i className="bi bi-trophy-fill text-warning ms-2"></i>}
                      <small className="text-muted d-block text-capitalize">{r.musculo}</small>
                    </div>
                    <span className="fw-bold" style={{ color: '#e94560' }}>{r.max_peso} kg</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Top ejercicios */}
          <div className="col-lg-6">
            <div className="dashboard-card h-100">
              <h5 className="fw-bold mb-4"><i className="bi bi-fire me-2"></i>Ejercicios más trabajados</h5>
              {topEjercicios.length === 0 ? (
                <p className="text-muted">Sin datos todavía</p>
              ) : (
                topEjercicios.map((e, i) => (
                  <div key={e.nombre} className="d-flex justify-content-between align-items-center py-2 border-bottom">
                    <div className="d-flex align-items-center gap-2">
                      <span className="badge bg-secondary">{i + 1}</span>
                      <span className="fw-semibold">{e.nombre}</span>
                    </div>
                    <div className="text-end">
                      <div className="fw-semibold">{Math.round(e.volumen).toLocaleString()} kg</div>
                      <small className="text-muted">{e.series} series</small>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Ultimas rutinas */}
          <div className="col-lg-6">
            <div className="dashboard-card h-100">
              <h5 className="fw-bold mb-4"><i className="bi bi-clock-history me-2"></i>Últimas rutinas</h5>
              {ultimas.map((s) => (
                <div key={s.id} className="d-flex justify-content-between align-items-center py-2 border-bottom">
                  <div>
                    <div className="fw-semibold">{s.rutina_nombre || 'Entrenamiento libre'}</div>
                    <small className="text-muted">
                      {s.fecha}
                      {s.hora_inicio && s.hora_fin && ` · ${s.hora_inicio}-${s.hora_fin}`}
                    </small>
                  </div>
                  <span className="badge bg-success">{formatearTiempo(s.duracion_minutos)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Estado corporal */}
          {corporal.peso && (
            <div className="col-12">
              <div className="dashboard-card">
                <h5 className="fw-bold mb-4"><i className="bi bi-heart-pulse me-2"></i>Tu estado corporal</h5>
                <div className="row g-3">
                  <div className="col-md-3 col-6">
                    <div className="text-center p-3 rounded" style={{ background: '#f8f9fa' }}>
                      <div className="fs-3 fw-bold text-primary">{corporal.peso} kg</div>
                      <small className="text-muted">Peso</small>
                    </div>
                  </div>
                  <div className="col-md-3 col-6">
                    <div className="text-center p-3 rounded" style={{ background: '#f8f9fa' }}>
                      <div className="fs-3 fw-bold text-info">{corporal.altura} cm</div>
                      <small className="text-muted">Altura</small>
                    </div>
                  </div>
                  <div className="col-md-3 col-6">
                    <div className="text-center p-3 rounded" style={{ background: '#f8f9fa' }}>
                      <div className="fs-3 fw-bold" style={{ color: '#00b894' }}>{corporal.imc}</div>
                      <small className="text-muted">IMC · {corporal.categoria}</small>
                    </div>
                  </div>
                  <div className="col-md-3 col-6">
                    <div className="text-center p-3 rounded" style={{ background: '#f8f9fa' }}>
                      <div className="fs-3 fw-bold" style={{ color: corporal.cambioPeso > 0 ? '#e94560' : '#00b894' }}>
                        {corporal.cambioPeso > 0 ? '+' : ''}{corporal.cambioPeso} kg
                      </div>
                      <small className="text-muted">Cambio de peso</small>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}