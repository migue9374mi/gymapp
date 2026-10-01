import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'

export default function Dashboard() {
  const { user } = useAuth()
  const [rutinas, setRutinas] = useState([])
  const [stats, setStats] = useState(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    const cargar = async () => {
      try {
        const [r, e] = await Promise.all([
          api.get('/rutinas'),
          api.get('/estadisticas'),
        ])
        setRutinas(r.data.rutinas)
        setStats(e.data)
      } catch (err) {
        console.error(err)
      } finally {
        setCargando(false)
      }
    }
    cargar()
  }, [])

  const totalEjercicios = rutinas.reduce((sum, r) => sum + r.num_ejercicios, 0)
  const publicadas = rutinas.filter((r) => r.es_publica === 1).length
  const ultimaRutina = rutinas[0]

  return (
    <div className="container py-5">
      <div className="mb-4">
        <h1 className="fw-bold" style={{ color: '#1a1a2e' }}>¡Hola, {user?.nombre}! 👋</h1>
        <p className="text-muted">Este es tu resumen de entrenamiento</p>
      </div>

      <div className="row g-4 mb-4">
        <div className="col-md-3 col-6">
          <div className="stat-card primary">
            <h3>{cargando ? '...' : rutinas.length}</h3>
            <p>Rutinas creadas</p>
          </div>
        </div>
        <div className="col-md-3 col-6">
          <div className="stat-card success">
            <h3>{cargando || !stats ? '...' : stats.totalEntrenamientos}</h3>
            <p>Rutinas terminadas</p>
          </div>
        </div>
        <div className="col-md-3 col-6">
          <div className="stat-card info">
            <h3>{cargando || !stats ? '...' : `${Math.floor(stats.tiempoTotal / 60)}h`}</h3>
            <p>Tiempo entrenado</p>
          </div>
        </div>
        <div className="col-md-3 col-6">
          <div className="stat-card warning">
            <h3>{cargando || !stats ? '...' : stats.rachas.rachaDiaria}</h3>
            <p>Dias seguidos</p>
          </div>
        </div>
      </div>

      <div className="row g-4">
        <div className="col-lg-8">
          <div className="dashboard-card h-100">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h4 className="fw-bold mb-0">Tus rutinas</h4>
              <Link to="/rutinas" className="btn btn-sm btn-outline-primary">Ver todas</Link>
            </div>

            {cargando ? (
              <div className="text-center py-5">
                <div className="spinner-border text-danger" role="status"></div>
              </div>
            ) : rutinas.length === 0 ? (
              <div className="text-center py-5">
                <p className="fs-1 mb-2">🏋️</p>
                <h5 className="fw-bold">No tienes rutinas todavía</h5>
                <p className="text-muted mb-4">Crea tu primera rutina para empezar a entrenar</p>
                <Link to="/rutinas" className="btn btn-primary">
                  <i className="bi bi-plus-lg me-2"></i>Crear rutina
                </Link>
              </div>
            ) : (
              <div className="list-group list-group-flush">
                {rutinas.slice(0, 5).map((rutina) => (
                  <Link
                    key={rutina.id}
                    to={`/rutinas/${rutina.id}`}
                    className="list-group-item list-group-item-action border-0 px-0 d-flex justify-content-between align-items-center"
                  >
                    <div>
                      <div className="fw-semibold">{rutina.nombre}</div>
                      <small className="text-muted">
                        {rutina.num_ejercicios} ejercicios
                        {rutina.descripcion && ` · ${rutina.descripcion}`}
                      </small>
                    </div>
                    <i className="bi bi-chevron-right text-muted"></i>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="col-lg-4">
          <div className="dashboard-card h-100">
            <h4 className="fw-bold mb-4">Acciones rápidas</h4>
            <div className="d-grid gap-2">
              <Link to="/rutinas" className="btn btn-primary text-start">
                <i className="bi bi-plus-lg me-2"></i>Nueva Rutina
              </Link>
              <Link to="/entrenar" className="btn btn-outline-primary text-start">
                <i className="bi bi-play-fill me-2"></i>Ir a entrenar
              </Link>
              <Link to="/rutinas" className="btn btn-outline-primary text-start">
                <i className="bi bi-list-check me-2"></i>Gestionar rutinas
              </Link>
              <Link to="/progreso" className="btn btn-outline-primary text-start">
                <i className="bi bi-graph-up me-2"></i>Ver progreso
              </Link>
              <Link to="/perfil" className="btn btn-outline-primary text-start">
                <i className="bi bi-person-circle me-2"></i>Mi perfil
              </Link>
            </div>

            {ultimaRutina && (
              <div className="mt-4 pt-3 border-top">
                <small className="text-muted d-block mb-2">Última rutina creada</small>
                <div className="fw-semibold">{ultimaRutina.nombre}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}