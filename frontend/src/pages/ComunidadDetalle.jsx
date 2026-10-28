import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import api, { mensajeDeError } from '../api/axios'
import { useAuth } from '../context/AuthContext'
import { CATEGORIAS } from './Rutinas'
import Icon from '../components/Icon'
import { Avisos, Cargando } from '../components/ui'

function etiquetaCategoria(valor) {
  return CATEGORIAS.find((c) => c.valor === valor)?.label || valor
}

function tono(categoria) {
  if (categoria === 'push' || categoria === 'cardio') return 'tag-red'
  if (categoria === 'pull') return 'tag-lime'
  if (categoria === 'pierna') return 'tag-blue'
  if (categoria === 'full_body' || categoria === 'core') return 'tag-yellow'
  return 'tag-ink'
}

function inicial(nombre) {
  return String(nombre || '?').trim().charAt(0).toUpperCase()
}

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
    return <Cargando texto="Abriendo la rutina…" />
  }

  if (error && !datos) {
    return (
      <>
        <button className="back-link" type="button" onClick={() => navigate('/comunidad')}>
          <Icon nombre="arrow-left" /> Volver a la comunidad
        </button>
        <div className="empty-state">
          <span className="empty-icon"><Icon nombre="warning" /></span>
          <h3>No encontramos esta rutina</h3>
          <p>{error}</p>
          <Link to="/comunidad" className="btn btn-primary">Volver a la comunidad</Link>
        </div>
      </>
    )
  }

  const { rutina, ejercicios, comentarios, esMia } = datos
  const totalSeries = ejercicios.reduce((s, e) => s + e.series, 0)
  const descansoTotal = Math.round(ejercicios.reduce((s, e) => s + e.series * e.descanso, 0) / 60)
  const musculos = [...new Set(ejercicios.map((e) => e.musculo))]

  return (
    <>
      <button className="back-link" type="button" onClick={() => navigate('/comunidad')}>
        <Icon nombre="arrow-left" /> Volver a la comunidad
      </button>

      <Avisos error={error} exito={exito} />

      <section className="community-hero">
        <div className="tag-row">
          <span className={`tag ${tono(rutina.categoria)}`}>{etiquetaCategoria(rutina.categoria)}</span>
          {esMia && <span className="tag tag-lime">Tu rutina</span>}
        </div>

        <h1>{rutina.nombre}</h1>
        <p>{rutina.descripcion || 'Sin descripción todavía.'}</p>

        <div className="community-author">
          <span className="community-author-avatar" aria-hidden="true">{inicial(rutina.autor)}</span>
          <span>Creada por <strong>{rutina.autor}</strong></span>
        </div>

        <div className="community-actions-row">
          <button
            type="button"
            className={`btn ${rutina.me_gusta ? 'btn-lime' : 'btn-ghost'}`}
            onClick={toggleLike}
            aria-pressed={Boolean(rutina.me_gusta)}
          >
            <Icon nombre="heart" /> {rutina.num_likes} me gusta
          </button>

          {!esMia && (
            <button type="button" className="btn btn-primary" onClick={copiar}>
              <Icon nombre="copy" /> Copiar a mi cuenta
            </button>
          )}

          {esMia && (
            <Link to={`/rutinas/${rutina.id}`} className="btn btn-primary">
              <Icon nombre="edit" /> Gestionar en mis rutinas
            </Link>
          )}
        </div>
      </section>

      <div className="community-detail">
        <div className="community-detail-main">
          <section className="panel">
            <div className="panel-head">
              <h3>Ejercicios</h3>
              <span className="tag tag-ink">{ejercicios.length}</span>
            </div>

            {ejercicios.length === 0 ? (
              <p className="panel-loading">Esta rutina todavía no tiene ejercicios.</p>
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Ejercicio</th>
                      <th>Músculo</th>
                      <th style={{ textAlign: 'center' }}>Series</th>
                      <th style={{ textAlign: 'center' }}>Descanso</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ejercicios.map((e, i) => (
                      <tr key={e.id}>
                        <td className="muted-cell">{String(i + 1).padStart(2, '0')}</td>
                        <td className="fw-semibold">{e.nombre}</td>
                        <td><span className="tag tag-ghost">{e.musculo}</span></td>
                        <td style={{ textAlign: 'center' }}>{e.series}</td>
                        <td style={{ textAlign: 'center' }}>{e.descanso}s</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="panel">
            <div className="panel-head">
              <h3>Comentarios</h3>
              <span className="tag tag-ink">{comentarios.length}</span>
            </div>

            <div className="panel-body">
              <form className="comment-form" onSubmit={enviarComentario}>
                <label className="field-label" htmlFor="comentario">Deja tu opinión</label>
                <textarea
                  id="comentario"
                  className="form-control"
                  rows="2"
                  placeholder="Escribe una opinión o una pregunta…"
                  value={comentario}
                  onChange={(e) => setComentario(e.target.value)}
                  required
                />
                <div className="form-actions" style={{ marginTop: 8 }}>
                  <button type="submit" className="btn btn-primary btn-sm" disabled={enviando}>
                    {enviando ? (
                      <><span className="mini-spinner" /> Enviando…</>
                    ) : (
                      <><Icon nombre="send" /> Comentar</>
                    )}
                  </button>
                </div>
              </form>

              {comentarios.length === 0 ? (
                <p className="panel-loading" style={{ padding: '18px 0 0' }}>
                  Aún no hay comentarios. Sé el primero.
                </p>
              ) : (
                <div className="comment-list">
                  {comentarios.map((c) => (
                    <article className="comment" key={c.id}>
                      <span className="comment-avatar" aria-hidden="true">{inicial(c.autor)}</span>
                      <div className="comment-body">
                        <div className="comment-head">
                          <strong>{c.autor}</strong>
                          <div className="comment-tools">
                            <time dateTime={c.fecha}>{new Date(c.fecha).toLocaleDateString('es-ES')}</time>
                            {c.autor === user?.nombre && (
                              <button
                                type="button"
                                className="icon-btn icon-btn--danger"
                                onClick={() => borrarComentario(c.id)}
                                title="Eliminar comentario"
                              >
                                <Icon nombre="trash" />
                              </button>
                            )}
                          </div>
                        </div>
                        <p>{c.texto}</p>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>

        <aside className="community-detail-side">
          <section className="panel">
            <div className="panel-head">
              <h3>Resumen</h3>
              <span className="tag tag-lime">Datos</span>
            </div>

            <div className="panel-body">
              <div className="summary-list">
                <div className="summary-row"><span>Ejercicios</span><strong>{ejercicios.length}</strong></div>
                <div className="summary-row"><span>Series totales</span><strong>{totalSeries}</strong></div>
                <div className="summary-row"><span>Descanso total</span><strong>{descansoTotal} min</strong></div>
                <div className="summary-row"><span>Me gusta</span><strong>{rutina.num_likes}</strong></div>
              </div>

              {musculos.length > 0 && (
                <div className="form-section">
                  <span className="field-label">Músculos que trabaja</span>
                  <div className="tag-row">
                    {musculos.map((m) => <span key={m} className="tag tag-ghost">{m}</span>)}
                  </div>
                </div>
              )}
            </div>
          </section>

          <div className="side-note">
            <h4>Entrena con cabeza</h4>
            <p>
              Copia la rutina a tu cuenta y ajústala a tu material. Lo que funciona
              es la constancia, no la prisa.
            </p>
          </div>
        </aside>
      </div>
    </>
  )
}
