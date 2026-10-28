import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api, { mensajeDeError } from '../api/axios'
import Icon from '../components/Icon'
import { PageHead, Avisos, Cargando } from '../components/ui'

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
      setError(mensajeDeError(err, 'Error al cargar rutinas'))
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
      setError(mensajeDeError(err, 'Error al crear rutina'))
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
      setError(mensajeDeError(err, 'Error al eliminar rutina'))
    }
  }

  const handlePublicar = async (rutina) => {
    try {
      const res = await api.patch(`/rutinas/${rutina.id}/publicar`)
      setExito(res.data.message)
      setTimeout(() => setExito(''), 3000)
      cargarRutinas()
    } catch (err) {
      setError(mensajeDeError(err, 'Error al cambiar visibilidad'))
    }
  }

  return (
    <>
      <PageHead
        eyebrow="Tu biblioteca"
        titulo="Mis rutinas"
        sub="Crea, ajusta y comparte las rutinas con las que entrenas."
      >
        <button
          type="button"
          className={`btn ${mostrarForm ? 'btn-ghost' : 'btn-primary'}`}
          onClick={() => setMostrarForm((v) => !v)}
        >
          <Icon nombre={mostrarForm ? 'x' : 'plus'} />
          {mostrarForm ? 'Cancelar' : 'Nueva rutina'}
        </button>
      </PageHead>

      <Avisos error={error} exito={exito} />

      {mostrarForm && (
        <section className="panel routine-form-panel">
          <div className="panel-head">
            <h3>Nueva rutina</h3>
            <span className="tag tag-lime">Borrador</span>
          </div>

          <div className="routine-form-body">
            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="field">
                  <label htmlFor="rutina-nombre">Nombre</label>
                  <input
                    id="rutina-nombre"
                    type="text"
                    className="form-control"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Ej: Push Day A"
                    required
                  />
                </div>

                <div className="field">
                  <label htmlFor="rutina-categoria">Categoría</label>
                  <select
                    id="rutina-categoria"
                    className="form-select"
                    value={categoria}
                    onChange={(e) => setCategoria(e.target.value)}
                  >
                    {CATEGORIAS.map((c) => (
                      <option key={c.valor} value={c.valor}>{c.label}</option>
                    ))}
                  </select>
                </div>

                <div className="field field--full">
                  <label htmlFor="rutina-descripcion">
                    Descripción <span className="optional">(opcional)</span>
                  </label>
                  <textarea
                    id="rutina-descripcion"
                    className="form-control"
                    rows="2"
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                    placeholder="Objetivo de la rutina, notas, material…"
                  />
                </div>
              </div>

              <div className="form-actions">
                <button type="submit" className="btn btn-primary" disabled={guardando}>
                  {guardando ? (
                    <><span className="mini-spinner" /> Guardando…</>
                  ) : (
                    <><Icon nombre="check" /> Crear rutina</>
                  )}
                </button>
                <span className="helper-copy">Después podrás añadirle ejercicios.</span>
              </div>
            </form>
          </div>
        </section>
      )}

      {cargando ? (
        <Cargando texto="Leyendo tus rutinas…" />
      ) : rutinas.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon"><Icon nombre="dumbbell" /></span>
          <h3>Todavía no tienes rutinas</h3>
          <p>Crea tu primera rutina para empezar a entrenar y a llenar tu historial.</p>
          <button className="btn btn-primary" type="button" onClick={() => setMostrarForm(true)}>
            <Icon nombre="plus" /> Crear mi primera rutina
          </button>
        </div>
      ) : (
        <div className="routine-grid">
          {rutinas.map((rutina) => (
            <article className="routine-card" key={rutina.id}>
              <div className="routine-card-head">
                <span className={`tag ${tono(rutina.categoria)}`}>
                  {etiquetaCategoria(rutina.categoria)}
                </span>
                {rutina.es_publica === 1 && (
                  <span className="tag tag-green"><Icon nombre="users" /> Pública</span>
                )}
              </div>

              <h2 className="routine-card-title">
                <Link to={`/rutinas/${rutina.id}`}>{rutina.nombre}</Link>
              </h2>
              <p>{rutina.descripcion || 'Sin descripción todavía.'}</p>

              <div className="routine-meta">
                <span><Icon nombre="list" />{rutina.num_ejercicios} ejercicios</span>
                <span><Icon nombre="calendar" />{rutina.veces_entrenada} veces</span>
              </div>

              <div className="routine-card-actions">
                <Link to={`/rutinas/${rutina.id}`} className="btn btn-primary btn-sm">
                  <Icon nombre="edit" /> Gestionar
                </Link>
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => handlePublicar(rutina)}
                  title={rutina.es_publica ? 'Hacer privada' : 'Compartir con la comunidad'}
                  aria-label={rutina.es_publica ? 'Hacer privada' : 'Compartir con la comunidad'}
                >
                  <Icon nombre={rutina.es_publica ? 'eye' : 'users'} />
                </button>
                <button
                  type="button"
                  className="icon-btn icon-btn--danger"
                  onClick={() => handleEliminar(rutina)}
                  title="Eliminar"
                  aria-label={`Eliminar ${rutina.nombre}`}
                >
                  <Icon nombre="trash" />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  )
}

export { CATEGORIAS, MUSCULOS, COLOR_CATEGORIA }
