import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/axios'
import { CATEGORIAS, MUSCULOS, COLOR_CATEGORIA } from './Rutinas'

export default function Comunidad() {
  const [rutinas, setRutinas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const [buscar, setBuscar] = useState('')
  const [categoria, setCategoria] = useState('todas')
  const [musculo, setMusculo] = useState('todos')
  const [orden, setOrden] = useState('recientes')

  const cargar = async () => {
    setCargando(true)
    try {
      const res = await api.get('/comunidad/rutinas', {
        params: {
          buscar: buscar || undefined,
          categoria,
          musculo,
          orden,
        },
      })
      setRutinas(res.data.rutinas)
    } catch (err) {
      setError(err.response?.data?.error || 'Error al cargar la comunidad')
    } finally {
      setCargando(false)
    }
  }

  // Recarga cuando cambia cualquier filtro
  useEffect(() => {
    const t = setTimeout(cargar, 300)
    return () => clearTimeout(t)
  }, [buscar, categoria, musculo, orden])

  const toggleLike = async (rutina, e) => {
    e.preventDefault()
    e.stopPropagation()
    try {
      const res = await api.post(`/comunidad/rutinas/${rutina.id}/like`)
      setRutinas((prev) =>
        prev.map((r) =>
          r.id === rutina.id
            ? { ...r, me_gusta: res.data.me_gusta, num_likes: res.data.num_likes }
            : r
        )
      )
    } catch (err) {
      setError(err.response?.data?.error || 'Error al marcar')
    }
  }

  return (
    <div className="container py-4">
      <div className="mb-4">
        <h1 className="fw-bold" style={{ color: '#1a1a2e' }}>Comunidad</h1>
        <p className="text-muted">
          Rutinas compartidas por otros usuarios. Copia las que te gusten a tu cuenta.
        </p>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {/* Filtros */}
      <div className="dashboard-card mb-4">
        <div className="row g-3">
          <div className="col-md-4">
            <label className="form-label fw-semibold">Buscar</label>
            <div className="input-group">
              <span className="input-group-text"><i className="bi bi-search"></i></span>
              <input
                className="form-control"
                value={buscar}
                onChange={(e) => setBuscar(e.target.value)}
                placeholder="Rutina, ejercicio o usuario..."
              />
            </div>
          </div>
          <div className="col-md-3">
            <label className="form-label fw-semibold">Categoría</label>
            <select className="form-select" value={categoria} onChange={(e) => setCategoria(e.target.value)}>
              <option value="todas">Todas</option>
              {CATEGORIAS.map((c) => <option key={c.valor} value={c.valor}>{c.label}</option>)}
            </select>
          </div>
          <div className="col-md-3">
            <label className="form-label fw-semibold">Músculo</label>
            <select className="form-select" value={musculo} onChange={(e) => setMusculo(e.target.value)}>
              <option value="todos">Todos</option>
              {MUSCULOS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div className="col-md-2">
            <label className="form-label fw-semibold">Ordenar</label>
            <select className="form-select" value={orden} onChange={(e) => setOrden(e.target.value)}>
              <option value="recientes">Más nuevas</option>
              <option value="likes">Más me gusta</option>
              <option value="comentarios">Más comentadas</option>
            </select>
          </div>
        </div>
      </div>

      {cargando ? (
        <div className="text-center py-5">
          <div className="spinner-border text-danger" role="status"></div>
        </div>
      ) : rutinas.length === 0 ? (
        <div className="dashboard-card text-center py-5">
          <p className="fs-1 mb-2">🌐</p>
          <h5 className="fw-bold">Todavia no hay rutinas compartidas</h5>
          <p className="text-muted mb-4">
            {buscar || categoria !== 'todas' || musculo !== 'todos'
              ? 'Prueba con otros filtros de busqueda'
              : 'Comparte una de tus rutinas para que aparezca aqui'}
          </p>
          <Link to="/rutinas" className="btn btn-primary">Ir a mis rutinas</Link>
        </div>
      ) : (
        <div className="row g-4">
          {rutinas.map((r) => (
            <div className="col-md-6 col-lg-4" key={r.id}>
              <div className="card h-100">
                <div className="card-body d-flex flex-column">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <span className={`badge bg-${COLOR_CATEGORIA[r.categoria] || 'secondary'}`}>
                      {CATEGORIAS.find((c) => c.valor === r.categoria)?.label || r.categoria}
                    </span>
                  </div>

                  <Link to={`/comunidad/${r.id}`} className="text-decoration-none text-reset">
                    <h5 className="fw-bold mb-1">{r.nombre}</h5>
                  </Link>
                  <small className="text-muted mb-2">
                    <i className="bi bi-person me-1"></i>{r.autor}
                  </small>
                  <p className="text-muted small flex-grow-1">{r.descripcion || 'Sin descripción'}</p>

                  <div className="d-flex gap-3 text-muted small mb-3">
                    <span><i className="bi bi-list-check me-1"></i>{r.num_ejercicios} ejercicios</span>
                    <span><i className="bi bi-chat-left-text me-1"></i>{r.num_comentarios}</span>
                  </div>

                  <button
                    className={`btn btn-sm w-100 ${r.me_gusta ? 'btn-danger' : 'btn-outline-danger'}`}
                    onClick={(e) => toggleLike(r, e)}
                  >
                    <i className={`bi ${r.me_gusta ? 'bi-heart-fill' : 'bi-heart'} me-1`}></i>
                    {r.num_likes} {r.num_likes === 1 ? 'me gusta' : 'me gusta'}
                  </button>

                  <Link to={`/comunidad/${r.id}`} className="btn btn-outline-primary btn-sm w-100 mt-2">
                    Ver y comentar
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}