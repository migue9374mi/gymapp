import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import api, { mensajeDeError } from '../api/axios'
import { CATEGORIAS, MUSCULOS, COLOR_CATEGORIA } from './Rutinas'

// Mismos valores que usa el backend para calcular el descanso automaticamente
const DESCANSO_SUGERIDO = {
  piernas: 180, gluteos: 180, pantorrillas: 90,
  pecho: 120, espalda: 120, hombro: 90, clavicular: 90,
  biceps: 60, triceps: 60, antebrazo: 60, core: 60,
  cardio: 45, otro: 90,
}

// Devuelve el descanso en segundos que se aplicara al guardar
function descansoEstimado(musculo, series) {
  const base = DESCANSO_SUGERIDO[String(musculo || 'otro').toLowerCase()] ?? 90
  const n = parseInt(series) || 3
  if (n >= 5) return base + 30
  if (n <= 2) return Math.max(30, base - 30)
  return base
}

function formatearDescanso(segundos) {
  if (segundos < 60) return `${segundos}s`
  const min = segundos / 60
  return `${Number.isInteger(min) ? min : min.toFixed(1)} min`
}

export default function RutinaDetalle() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [rutina, setRutina] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [exito, setExito] = useState('')

  // Formulario de rutina (editar)
  const [editando, setEditando] = useState(false)
  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [categoria, setCategoria] = useState('general')

  // Formulario de ejercicio (añadir)
  const [ejercicio, setEjercicio] = useState({
    nombre: '', series: 3, reps: 10, peso: 0, descanso: 60, musculo: 'pecho'
  })

  const cargarRutina = async () => {
    try {
      const res = await api.get(`/rutinas/${id}`)
      setRutina(res.data.rutina)
      setNombre(res.data.rutina.nombre)
      setDescripcion(res.data.rutina.descripcion || '')
      setCategoria(res.data.rutina.categoria)
    } catch (err) {
      setError(mensajeDeError(err, 'Error al cargar la rutina'))
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    cargarRutina()
  }, [id])

  const handleActualizarRutina = async (e) => {
    e.preventDefault()
    try {
      await api.put(`/rutinas/${id}`, { nombre, descripcion, categoria })
      setExito('Rutina actualizada')
      setTimeout(() => setExito(''), 3000)
      setEditando(false)
      cargarRutina()
    } catch (err) {
      setError(mensajeDeError(err, 'Error al actualizar'))
    }
  }

  const handleAddEjercicio = async (e) => {
    e.preventDefault()
    setError('')
    try {
      const res = await api.post(`/rutinas/${id}/ejercicios`, ejercicio)
      setExito(`"${res.data.ejercicio.nombre}" añadido`)
      setTimeout(() => setExito(''), 3000)
      setEjercicio({ nombre: '', series: 3, reps: 10, peso: 0, descanso: 60, musculo: 'pecho' })
      cargarRutina()
    } catch (err) {
      setError(mensajeDeError(err, 'Error al añadir ejercicio'))
    }
  }

  const handleEliminarEjercicio = async (ej) => {
    if (!window.confirm(`¿Eliminar "${ej.nombre}"?`)) return
    try {
      await api.delete(`/rutinas/${id}/ejercicios/${ej.id}`)
      cargarRutina()
    } catch (err) {
      setError(mensajeDeError(err, 'Error al eliminar'))
    }
  }

  const handleActualizarEjercicio = async (ej) => {
    const series = prompt("Número de series:", ej.series)
    if (series === null) return
    const nombre = prompt("Nombre del ejercicio:", ej.nombre)
    if (nombre === null) return

    try {
      await api.put(`/rutinas/${id}/ejercicios/${ej.id}`, {
        nombre: nombre.trim(),
        series: parseInt(series),
        reps: ej.reps,
        peso: ej.peso,
        descanso: ej.descanso,
        musculo: ej.musculo
      })
      cargarRutina()
    } catch (err) {
      setError(mensajeDeError(err, 'Error al actualizar'))
    }
  }

  if (cargando) {
    return (
      <div className="container py-5 text-center">
        <div className="spinner-border text-danger" role="status"></div>
      </div>
    )
  }

  if (error && !rutina) {
    return (
      <div className="container py-5 text-center">
        <p className="fs-1">😕</p>
        <h5>{error}</h5>
        <Link to="/rutinas" className="btn btn-primary mt-3">Volver a rutinas</Link>
      </div>
    )
  }

  const totalSeries = rutina.ejercicios.reduce((sum, e) => sum + e.series, 0)
  const volumenEstimado = rutina.ejercicios.reduce((sum, e) => sum + (e.series * (e.reps || 0) * (e.peso || 0)), 0)

  return (
    <div className="container py-4">
      <button className="btn btn-link text-decoration-none px-0 mb-3" onClick={() => navigate('/rutinas')}>
        <i className="bi bi-arrow-left me-2"></i>Volver a mis rutinas
      </button>

      {error && <div className="alert alert-danger">{error}</div>}
      {exito && <div className="alert alert-success"><i className="bi bi-check-circle me-2"></i>{exito}</div>}

      {editando ? (
        <div className="dashboard-card mb-4">
          <h5 className="fw-bold mb-3">Editar Rutina</h5>
          <form onSubmit={handleActualizarRutina}>
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label">Nombre</label>
                <input className="form-control" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
              </div>
              <div className="col-md-6">
                <label className="form-label">Categoría</label>
                <select className="form-select" value={categoria} onChange={(e) => setCategoria(e.target.value)}>
                  {CATEGORIAS.map((c) => <option key={c.valor} value={c.valor}>{c.label}</option>)}
                </select>
              </div>
              <div className="col-12">
                <label className="form-label">Descripción</label>
                <textarea className="form-control" rows="2" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
              </div>
              <div className="col-12 d-flex gap-2">
                <button type="submit" className="btn btn-primary">
                  <i className="bi bi-check-lg me-2"></i>Guardar cambios
                </button>
                <button type="button" className="btn btn-outline-secondary" onClick={() => setEditando(false)}>
                  Cancelar
                </button>
              </div>
            </div>
          </form>
        </div>
      ) : (
        <div className="dashboard-card mb-4">
          <div className="d-flex justify-content-between align-items-start flex-wrap gap-2">
            <div>
              <span className={`badge bg-${COLOR_CATEGORIA[rutina.categoria] || 'secondary'} mb-2`}>
                {CATEGORIAS.find((c) => c.valor === rutina.categoria)?.label || rutina.categoria}
              </span>
              <h2 className="fw-bold mb-1" style={{ color: '#1a1a2e' }}>{rutina.nombre}</h2>
              <p className="text-muted mb-0">{rutina.descripcion || 'Sin descripción'}</p>
            </div>
            <button className="btn btn-outline-primary" onClick={() => setEditando(true)}>
              <i className="bi bi-pencil me-2"></i>Editar rutina
            </button>
          </div>

          {rutina.ejercicios.length > 0 && (
            <div className="row g-3 mt-2 pt-3 border-top">
              <div className="col-4 text-center">
                <div className="fw-bold fs-4" style={{ color: '#e94560' }}>{rutina.ejercicios.length}</div>
                <div className="small text-muted">Ejercicios</div>
              </div>
              <div className="col-4 text-center">
                <div className="fw-bold fs-4" style={{ color: '#00b894' }}>{totalSeries}</div>
                <div className="small text-muted">Series totales</div>
              </div>
              <div className="col-4 text-center">
                <div className="fw-bold fs-4" style={{ color: '#0984e3' }}>{volumenEstimado.toLocaleString()}</div>
                <div className="small text-muted">Volumen (kg)</div>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="dashboard-card mb-4">
        <h5 className="fw-bold mb-3"><i className="bi bi-plus-circle me-2"></i>Añadir Ejercicio</h5>
        <form onSubmit={handleAddEjercicio}>
          <div className="row g-3 align-items-end">
            <div className="col-md-5">
              <label className="form-label">Ejercicio</label>
              <input
                className="form-control"
                value={ejercicio.nombre}
                onChange={(e) => setEjercicio({ ...ejercicio, nombre: e.target.value })}
                placeholder="Ej: Press de banca"
                required
              />
            </div>
            <div className="col-md-3">
              <label className="form-label">Músculo</label>
              <select
                className="form-select"
                value={ejercicio.musculo}
                onChange={(e) => setEjercicio({ ...ejercicio, musculo: e.target.value })}
              >
                {MUSCULOS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label">Series</label>
              <input type="number" min="1" className="form-control" value={ejercicio.series}
                onChange={(e) => setEjercicio({ ...ejercicio, series: e.target.value })} />
            </div>
            <div className="col-12">
              <button type="submit" className="btn btn-primary">
                <i className="bi bi-plus-lg me-2"></i>Añadir a la rutina
              </button>
              <small className="text-muted ms-3">
                <i className="bi bi-magic me-1"></i>
                Descanso automático: <strong>{formatearDescanso(descansoEstimado(ejercicio.musculo, ejercicio.series))}</strong>
              </small>
            </div>
          </div>
        </form>
      </div>

      <div className="dashboard-card">
        <h5 className="fw-bold mb-3">Ejercicios de la rutina</h5>

        {rutina.ejercicios.length === 0 ? (
          <div className="text-center py-5 text-muted">
            <p className="fs-2 mb-2">📋</p>
            <p>Aún no hay ejercicios. Añade el primero con el formulario de arriba.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table align-middle mb-0">
              <thead>
                <tr className="text-muted">
                  <th>#</th>
                  <th>Ejercicio</th>
                  <th>Músculo</th>
                  <th className="text-center">Series</th>
                  <th className="text-center">Descanso</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rutina.ejercicios.map((ej, index) => (
                  <tr key={ej.id}>
                    <td className="text-muted">{index + 1}</td>
                    <td className="fw-semibold">{ej.nombre}</td>
                    <td><span className="badge bg-light text-dark">{ej.musculo}</span></td>
                    <td className="text-center">{ej.series}</td>
                    <td className="text-center">{ej.descanso}s</td>
                    <td className="text-end">
                      <button className="btn btn-sm btn-outline-secondary me-1" title="Editar"
                        onClick={() => handleActualizarEjercicio(ej)}>
                        <i className="bi bi-pencil"></i>
                      </button>
                      <button className="btn btn-sm btn-outline-danger" title="Eliminar"
                        onClick={() => handleEliminarEjercicio(ej)}>
                        <i className="bi bi-trash"></i>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}