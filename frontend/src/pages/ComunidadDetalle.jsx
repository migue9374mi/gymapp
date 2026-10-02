import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import api, { mensajeDeError } from '../api/axios'
import { useAuth } from '../context/AuthContext'
import { CATEGORIAS, MUSCULOS, COLOR_CATEGORIA } from './Rutinas'

export default function ComunidadDetalle() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [datos, setDatos] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [exito, setExito] = useState('')

  const [comentario, setComentario] = useState('')
  const [enviando, setEnviando] = useState(false)

  const cargar = async () => {
    try {
      const res = await api.get(`/comunidad/rutinas/${id}`)
      setDatos(res.data)
    } catch (err) {
      setError(mensajeDeError(err, 'Error al cargar la rutina'))
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    cargar()
  }, [id])

  const toggleLike = async () => {
    try {
      const res = await api.post(`/comunidad/rutinas/${id}/like`)
      setDatos((prev) => ({
        ...prev,
        rutina: { ...prev.rutina, me_gusta: res.data.me_gusta, num_likes: res.data.num_likes },
      }))
    } catch (err) {
      setError(mensajeDeError(err, 'Error al marcar'))
    }
  }

  const enviarComentario = async (e) => {
    e.preventDefault()
    if (!comentario.trim()) return
    setEnviando(true)
    try {
      const res = await api.post(`/comunidad/rutinas/${id}/comentarios`, { texto: comentario })
      setDatos((prev) => ({
        ...prev,
        comentarios: [res.data.comentario, ...prev.comentarios],
        rutina: { ...prev.rutina, num_comentarios: res.data.num_comentarios },
      }))
      setComentario('')
    } catch (err) {
      setError(mensajeDeError(err, 'Error al comentar'))
    } finally {
      setEnviando(false)
    }
  }

  const copiar = async () => {
    try {
      const res = await api.post(`/comunidad/rutinas/${id}/copiar`)
      setExito(res.data.message)
      setTimeout(() => setExito(''), 4000)
    } catch (err) {
      setError(mensajeDeError(err, 'Error al copiar'))
      setTimeout(() => setError(''), 3000)
    }
  }

  const borrarComentario = async (comentarioId) => {
    if (!window.confirm('¿Eliminar tu comentario?')) return
    try {
      await api.delete(`/comunidad/comentarios/${comentarioId}`)
      setDatos((prev) => ({
        ...prev,
        comentarios: prev.comentarios.filter((c) => c.id !== comentarioId),
        rutina: { ...prev.rutina, num_comentarios: prev.rutina.num_comentarios - 1 },
      }))
    } catch (err) {
      setError(mensajeDeError(err, 'Error al eliminar'))
    }
  }

  if (cargando) {
    return (
      <div className="container py-5 text-center">
        <div className="spinner-border text-danger" role="status"></div>
      </div>
    )
  }

  if (error && !datos) {
    return (
      <div className="container py-5 text-center">
        <p className="fs-1">😕</p>
        <h5>{error}</h5>
        <Link to="/comunidad" className="btn btn-primary mt-3">Volver a la comunidad</Link>
      </div>
    )
  }

  const { rutina, ejercicios, comentarios, esMia } = datos

  return (
    <div className="container py-4">
      <button className="btn btn-link text-decoration-none px-0 mb-3" onClick={() => navigate('/comunidad')}>
        <i className="bi bi-arrow-left me-2"></i>Volver a la comunidad
      </button>

      {error && <div className="alert alert-danger">{error}</div>}
      {exito && <div className="alert alert-success"><i className="bi bi-check-circle me-2"></i>{exito}</div>}

      <div className="row g-4">
        <div className="col-lg-8">
          {/* Info de la rutina */}
          <div className="dashboard-card mb-4">
            <span className={`badge bg-${COLOR_CATEGORIA[rutina.categoria] || 'secondary'} mb-2`}>
              {CATEGORIAS.find((c) => c.valor === rutina.categoria)?.label || rutina.categoria}
            </span>
            <h2 className="fw-bold mb-1" style={{ color: '#1a1a2e' }}>{rutina.nombre}</h2>
            <p className="text-muted mb-3">
              <i className="bi bi-person me-1"></i>Creada por <strong>{rutina.autor}</strong>
              {esMia && <span className="badge bg-info ms-2">Esta es tu rutina</span>}
            </p>
            <p>{rutina.descripcion || 'Sin descripción'}</p>

            <div className="d-flex gap-2 flex-wrap mt-3">
              <button
                className={`btn ${rutina.me_gusta ? 'btn-danger' : 'btn-outline-danger'}`}
                onClick={toggleLike}
              >
                <i className={`bi ${rutina.me_gusta ? 'bi-heart-fill' : 'bi-heart'} me-2`}></i>
                {rutina.num_likes} {rutina.num_likes === 1 ? 'me gusta' : 'me gusta'}
              </button>

              {!esMia && (
                <button className="btn btn-success" onClick={copiar}>
                  <i className="bi bi-copy me-2"></i>Copiar a mi cuenta
                </button>
              )}

              {esMia && (
                <Link to={`/rutinas/${rutina.id}`} className="btn btn-outline-primary">
                  <i className="bi bi-pencil me-2"></i>Gestionar en mis rutinas
                </Link>
              )}
            </div>
          </div>

          {/* Ejercicios */}
          <div className="dashboard-card mb-4">
            <h5 className="fw-bold mb-3">
              <i className="bi bi-list-check me-2"></i>Ejercicios ({ejercicios.length})
            </h5>

            {ejercicios.length === 0 ? (
              <p className="text-muted">Esta rutina todavia no tiene ejercicios</p>
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
                    </tr>
                  </thead>
                  <tbody>
                    {ejercicios.map((e, i) => (
                      <tr key={e.id}>
                        <td className="text-muted">{i + 1}</td>
                        <td className="fw-semibold">{e.nombre}</td>
                        <td><span className="badge bg-light text-dark text-capitalize">{e.musculo}</span></td>
                        <td className="text-center">{e.series}</td>
                        <td className="text-center">{e.descanso}s</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Comentarios */}
          <div className="dashboard-card">
            <h5 className="fw-bold mb-3">
              <i className="bi bi-chat-left-text me-2"></i>
              Comentarios ({comentarios.length})
            </h5>

            <form onSubmit={enviarComentario} className="mb-4">
              <textarea
                className="form-control mb-2"
                rows="2"
                placeholder="Escribe tu opinion o una pregunta..."
                value={comentario}
                onChange={(e) => setComentario(e.target.value)}
                required
              />
              <button type="submit" className="btn btn-primary btn-sm" disabled={enviando}>
                {enviando ? 'Enviando...' : <><i className="bi bi-send me-1"></i>Comentar</>}
              </button>
            </form>

            {comentarios.length === 0 ? (
              <div className="text-center py-4 text-muted">
                <p className="fs-3 mb-1">💬</p>
                <p className="mb-0">Aun no hay comentarios. Se el primero</p>
              </div>
            ) : (
              <div className="d-flex flex-column gap-3">
                {comentarios.map((c) => (
                  <div key={c.id} className="d-flex gap-2">
                    <div
                      className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold flex-shrink-0"
                      style={{ width: '36px', height: '36px', background: '#e94560' }}
                    >
                      {c.autor.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-grow-1">
                      <div className="d-flex justify-content-between align-items-center">
                        <strong className="small">{c.autor}</strong>
                        <div className="d-flex align-items-center gap-2">
                          <small className="text-muted">{new Date(c.fecha).toLocaleDateString('es-ES')}</small>
                          {c.autor === user?.nombre && (
                            <button
                              className="btn btn-sm btn-outline-danger py-0 px-1"
                              onClick={() => borrarComentario(c.id)}
                              title="Eliminar comentario"
                            >
                              <i className="bi bi-trash"></i>
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="mb-0 small">{c.texto}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Lateral */}
        <div className="col-lg-4">
          <div className="dashboard-card">
            <h5 className="fw-bold mb-3">Resumen</h5>
            <div className="d-flex justify-content-between py-2 border-bottom">
              <span className="text-muted">Ejercicios</span>
              <strong>{ejercicios.length}</strong>
            </div>
            <div className="d-flex justify-content-between py-2 border-bottom">
              <span className="text-muted">Series totales</span>
              <strong>{ejercicios.reduce((s, e) => s + e.series, 0)}</strong>
            </div>
            <div className="d-flex justify-content-between py-2 border-bottom">
              <span className="text-muted">Descanso total</span>
              <strong>
                {Math.round(ejercicios.reduce((s, e) => s + e.series * e.descanso, 0) / 60)} min
              </strong>
            </div>
            <div className="d-flex justify-content-between py-2">
              <span className="text-muted">Me gusta</span>
              <strong>{rutina.num_likes}</strong>
            </div>

            {ejercicios.length > 0 && (
              <div className="mt-4 pt-3 border-top">
                <h6 className="fw-bold mb-2">Musculos que trabaja</h6>
                <div className="d-flex gap-1 flex-wrap">
                  {[...new Set(ejercicios.map((e) => e.musculo))].map((m) => (
                    <span key={m} className="badge bg-light text-dark text-capitalize border">{m}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}