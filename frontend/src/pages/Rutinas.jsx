import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/axios'

const CATEGORIAS = [
  { valor: 'general', label: 'General' },
  { valor: 'push', label: 'Push (empuje)' },
  { valor: 'pull', label: 'Pull (tirón)' },
  { valor: 'pierna', label: 'Pierna' },
  { valor: 'full_body', label: 'Full Body' },
  { valor: 'core', label: 'Core / Abdomen' },
  { valor: 'cardio', label: 'Cardio' },
]

const MUSCULOS = [
  'pecho', 'espalda', 'hombros', 'biceps', 'triceps', 'piernas',
  'gluteos', 'core', 'antebrazos', 'pantorrillas', 'otro'
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

export default function Rutinas() {
  const [rutinas, setRutinas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [exito, setExito] = useState('')
  const [mostrarForm, setMostrarForm] = useState(false)

  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [categoria, setCategoria] = useState('general')
  const [guardando, setGuardando] = useState(false)

  const cargarRutinas = async () => {
    try {
      const res = await api.get('/rutinas')
      setRutinas(res.data.rutinas)
    } catch (err) {
      setError(err.response?.data?.error || 'Error al cargar rutinas')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    cargarRutinas()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setGuardando(true)

    try {
      const res = await api.post('/rutinas', { nombre, descripcion, categoria })
      setExito(`Rutina "${res.data.rutina.nombre}" creada`)
      setNombre('')
      setDescripcion('')
      setCategoria('general')
      setTimeout(() => setExito(''), 3000)
      setMostrarForm(false)
      cargarRutinas()
    } catch (err) {
      setError(err.response?.data?.error || 'Error al crear rutina')
    } finally {
      setGuardando(false)
    }
  }

  const handleEliminar = async (rutina) => {
    if (!window.confirm(`¿Eliminar la rutina "${rutina.nombre}"? Se borrarán sus ejercicios.`)) {
      return
    }

    try {
      await api.delete(`/rutinas/${rutina.id}`)
      setRutinas(rutinas.filter((r) => r.id !== rutina.id))
    } catch (err) {
      setError(err.response?.data?.error || 'Error al eliminar rutina')
    }
  }

  const handlePublicar = async (rutina) => {
    try {
      const res = await api.patch(`/rutinas/${rutina.id}/publicar`)
      setExito(res.data.message)
      setTimeout(() => setExito(''), 3000)
      cargarRutinas()
    } catch (err) {
      setError(err.response?.data?.error || 'Error al cambiar visibilidad')
    }
  }

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <div>
          <h1 className="fw-bold mb-0" style={{ color: '#1a1a2e' }}>Mis Rutinas</h1>
          <p className="text-muted mb-0">Crea y gestiona tus rutinas de entrenamiento</p>
        </div>
        <button className="btn btn-primary" onClick={() => setMostrarForm(!mostrarForm)}>
          <i className={`bi ${mostrarForm ? 'bi-x-lg' : 'bi-plus-lg'} me-2`}></i>
          {mostrarForm ? 'Cancelar' : 'Nueva Rutina'}
        </button>
      </div>

      {error && <div className="alert alert-danger"><i className="bi bi-exclamation-triangle me-2"></i>{error}</div>}
      {exito && <div className="alert alert-success"><i className="bi bi-check-circle me-2"></i>{exito}</div>}

      {mostrarForm && (
        <div className="dashboard-card mb-4">
          <h5 className="fw-bold mb-3">Nueva Rutina</h5>
          <form onSubmit={handleSubmit}>
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label">Nombre</label>
                <input
                  type="text"
                  className="form-control"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej: Push Day A"
                  required
                />
              </div>
              <div className="col-md-6">
                <label className="form-label">Categoría</label>
                <select
                  className="form-select"
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value)}
                >
                  {CATEGORIAS.map((c) => (
                    <option key={c.valor} value={c.valor}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div className="col-12">
                <label className="form-label">Descripción</label>
                <textarea
                  className="form-control"
                  rows="2"
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder="Objetivo de la rutina, notes..."
                />
              </div>
              <div className="col-12">
                <button type="submit" className="btn btn-primary" disabled={guardando}>
                  {guardando ? (
                    <><span className="spinner-border spinner-border-sm me-2"></span>Guardando...</>
                  ) : (
                    <><i className="bi bi-check-lg me-2"></i>Crear Rutina</>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {cargando ? (
        <div className="text-center py-5">
          <div className="spinner-border text-danger" role="status"></div>
        </div>
      ) : rutinas.length === 0 ? (
        <div className="dashboard-card text-center py-5">
          <p className="fs-1 mb-2">🏋️</p>
          <h5 className="fw-bold">Todavía no tienes rutinas</h5>
          <p className="text-muted mb-4">Crea tu primera rutina para empezar a entrenar</p>
          <button className="btn btn-primary" onClick={() => setMostrarForm(true)}>
            <i className="bi bi-plus-lg me-2"></i>Crear mi primera rutina
          </button>
        </div>
      ) : (
        <div className="row g-4">
          {rutinas.map((rutina) => (
            <div className="col-md-6 col-lg-4" key={rutina.id}>
              <div className="card h-100">
                <div className="card-body d-flex flex-column">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <span className={`badge bg-${COLOR_CATEGORIA[rutina.categoria] || 'secondary'}`}>
                      {CATEGORIAS.find((c) => c.valor === rutina.categoria)?.label || rutina.categoria}
                    </span>
                    {rutina.es_publica === 1 && (
                      <span className="badge bg-success"><i className="bi bi-people-fill me-1"></i>Pública</span>
                    )}
                  </div>

                  <h5 className="fw-bold mb-2">{rutina.nombre}</h5>
                  <p className="text-muted small flex-grow-1">
                    {rutina.descripcion || 'Sin descripción'}
                  </p>

                  <div className="d-flex gap-3 text-muted small mb-3">
                    <span><i className="bi bi-list-check me-1"></i>{rutina.num_ejercicios} ejercicios</span>
                    <span><i className="bi bi-calendar-check me-1"></i>{rutina.veces_entrenada} veces</span>
                  </div>

                  <div className="d-flex gap-2">
                    <Link to={`/rutinas/${rutina.id}`} className="btn btn-primary btn-sm flex-grow-1">
                      <i className="bi bi-pencil me-1"></i>Gestionar
                    </Link>
                    <button
                      className="btn btn-outline-secondary btn-sm"
                      onClick={() => handlePublicar(rutina)}
                      title={rutina.es_publica ? 'Hacer privada' : 'Compartir con la comunidad'}
                    >
                      <i className={`bi ${rutina.es_publica ? 'bi-eye-slash' : 'bi-share'}`}></i>
                    </button>
                    <button
                      className="btn btn-outline-danger btn-sm"
                      onClick={() => handleEliminar(rutina)}
                      title="Eliminar"
                    >
                      <i className="bi bi-trash"></i>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export { CATEGORIAS, MUSCULOS, COLOR_CATEGORIA }