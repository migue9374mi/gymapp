import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api, { mensajeDeError } from '../api/axios'
import { CATEGORIAS, MUSCULOS } from './Rutinas'
import Icon from '../components/Icon'
import { PageHead, Avisos } from '../components/ui'

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
      setError(mensajeDeError(err, 'Error al cargar la comunidad'))
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
      setError(mensajeDeError(err, 'Error al marcar'))
    }
  }

  const hayFiltros = Boolean(buscar) || categoria !== 'todas' || musculo !== 'todos'

  return (
    <>
      <PageHead
        eyebrow="Entrena con los tuyos"
        titulo="Comunidad"
        sub="Rutinas compartidas por la gente del club. Copia las que te sirvan y comparte las tuyas."
      >
        <Link to="/rutinas" className="btn btn-ghost">
          <Icon nombre="users" /> Compartir una rutina
        </Link>
      </PageHead>

      <Avisos error={error} />

      <section className="panel community-filters">
        <div className="community-filter-grid">
          <div className="field">
            <label htmlFor="comunidad-buscar">Buscar</label>
            <div className="input-group">
              <span className="input-group-text"><Icon nombre="search" /></span>
              <input
                id="comunidad-buscar"
                className="form-control"
                value={buscar}
                onChange={(e) => setBuscar(e.target.value)}
                placeholder="Rutina, ejercicio o usuario…"
              />
            </div>
          </div>

          <div className="field">
            <label htmlFor="comunidad-categoria">Categoría</label>
            <select
              id="comunidad-categoria"
              className="form-select"
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
            >
              <option value="todas">Todas</option>
              {CATEGORIAS.map((c) => <option key={c.valor} value={c.valor}>{c.label}</option>)}
            </select>
          </div>

          <div className="field">
            <label htmlFor="comunidad-musculo">Músculo</label>
            <select
              id="comunidad-musculo"
              className="form-select"
              value={musculo}
              onChange={(e) => setMusculo(e.target.value)}
            >
              <option value="todos">Todos</option>
              {MUSCULOS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          <div className="field">
            <label htmlFor="comunidad-orden">Ordenar</label>
            <select
              id="comunidad-orden"
              className="form-select"
              value={orden}
              onChange={(e) => setOrden(e.target.value)}
            >
              <option value="recientes">Más nuevas</option>
              <option value="likes">Más me gusta</option>
              <option value="comentarios">Más comentadas</option>
            </select>
          </div>
        </div>
      </section>

      {cargando ? (
        <div className="loading-panel" role="status">
          <span className="loading-dot" />
          <span>Buscando rutinas compartidas…</span>
        </div>
      ) : rutinas.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon"><Icon nombre="users" /></span>
          <h3>Todavía no hay rutinas compartidas</h3>
          <p>
            {hayFiltros
              ? 'Prueba con otros filtros de búsqueda.'
              : 'Comparte una de tus rutinas para que aparezca aquí.'}
          </p>
          <Link to="/rutinas" className="btn btn-primary">Ir a mis rutinas</Link>
        </div>
      ) : (
        <div className="community-routines">
          {rutinas.map((r) => (
            <article className="community-routine" key={r.id}>
              <div className="community-routine-head">
                <span className={`tag ${tono(r.categoria)}`}>{etiquetaCategoria(r.categoria)}</span>
                <span className="community-author">
                  <span className="community-author-avatar" aria-hidden="true">{inicial(r.autor)}</span>
                  <strong>{r.autor}</strong>
                </span>
              </div>

              <h2><Link to={`/comunidad/${r.id}`}>{r.nombre}</Link></h2>
              <p>{r.descripcion || 'Sin descripción todavía.'}</p>

              <div className="community-meta">
                <span><Icon nombre="list" />{r.num_ejercicios} ejercicios</span>
                <span><Icon nombre="message" />{r.num_comentarios}</span>
                <span><Icon nombre="heart" />{r.num_likes}</span>
              </div>

              <div className="community-actions-row">
                <button
                  type="button"
                  className={`btn btn-sm ${r.me_gusta ? 'btn-lime' : 'btn-ghost'}`}
                  onClick={(e) => toggleLike(r, e)}
                  aria-pressed={Boolean(r.me_gusta)}
                  title={r.me_gusta ? 'Quitar me gusta' : 'Me gusta'}
                >
                  <Icon nombre="heart" /> {r.num_likes}
                </button>
                <Link to={`/comunidad/${r.id}`} className="btn btn-primary btn-sm">
                  Ver y comentar <Icon nombre="arrow-right" />
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  )
}
