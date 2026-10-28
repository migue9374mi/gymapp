import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import api, { mensajeDeError } from '../api/axios'
import { CATEGORIAS, MUSCULOS } from './Rutinas'
import Icon from '../components/Icon'
import { Avisos, Cargando } from '../components/ui'

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
    const series = prompt('Número de series:', ej.series)
    if (series === null) return
    const nombre = prompt('Nombre del ejercicio:', ej.nombre)
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
    return <Cargando texto="Leyendo la rutina…" />
  }

  if (error && !rutina) {
    return (
      <>
        <button className="back-link" type="button" onClick={() => navigate('/rutinas')}>
          <Icon nombre="arrow-left" /> Volver a mis rutinas
        </button>
        <div className="empty-state">
          <span className="empty-icon"><Icon nombre="warning" /></span>
          <h3>No encontramos esta rutina</h3>
          <p>{error}</p>
          <Link to="/rutinas" className="btn btn-primary">Volver a mis rutinas</Link>
        </div>
      </>
    )
  }

  const totalSeries = rutina.ejercicios.reduce((sum, e) => sum + e.series, 0)
  const volumenEstimado = rutina.ejercicios.reduce((sum, e) => sum + (e.series * (e.reps || 0) * (e.peso || 0)), 0)

  return (
    <>
      <button className="back-link" type="button" onClick={() => navigate('/rutinas')}>
        <Icon nombre="arrow-left" /> Volver a mis rutinas
      </button>

      <Avisos error={error} exito={exito} />

      {editando ? (
        <section className="panel routine-form-panel">
          <div className="panel-head">
            <h3>Editar rutina</h3>
            <button className="panel-link" type="button" onClick={() => setEditando(false)}>
              Cancelar
            </button>
          </div>

          <div className="routine-form-body">
            <form onSubmit={handleActualizarRutina}>
              <div className="form-grid">
                <div className="field">
                  <label htmlFor="editar-nombre">Nombre</label>
                  <input
                    id="editar-nombre"
                    className="form-control"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    required
                  />
                </div>

                <div className="field">
                  <label htmlFor="editar-categoria">Categoría</label>
                  <select
                    id="editar-categoria"
                    className="form-select"
                    value={categoria}
                    onChange={(e) => setCategoria(e.target.value)}
                  >
                    {CATEGORIAS.map((c) => <option key={c.valor} value={c.valor}>{c.label}</option>)}
                  </select>
                </div>

                <div className="field field--full">
                  <label htmlFor="editar-descripcion">Descripción</label>
                  <textarea
                    id="editar-descripcion"
                    className="form-control"
                    rows="2"
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-actions">
                <button type="submit" className="btn btn-primary">
                  <Icon nombre="check" /> Guardar cambios
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => setEditando(false)}>
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </section>
      ) : (
        <section className="panel routine-hero">
          <div className="routine-card-head">
            <div className="tag-row">
              <span className={`tag ${tono(rutina.categoria)}`}>{etiquetaCategoria(rutina.categoria)}</span>
              <span className="tag tag-ghost">{rutina.ejercicios.length} ejercicios</span>
            </div>
            <button className="btn btn-ghost btn-sm" type="button" onClick={() => setEditando(true)}>
              <Icon nombre="edit" /> Editar
            </button>
          </div>

          <h1>{rutina.nombre}</h1>
          <p>{rutina.descripcion || 'Sin descripción todavía.'}</p>

          {rutina.ejercicios.length > 0 && (
            <div className="routine-stats">
              <div className="routine-stat">
                <strong>{rutina.ejercicios.length}</strong>
                <span>Ejercicios</span>
              </div>
              <div className="routine-stat">
                <strong>{totalSeries}</strong>
                <span>Series totales</span>
              </div>
              <div className="routine-stat">
                <strong>{volumenEstimado.toLocaleString('es-ES')}</strong>
                <span>Volumen estimado (kg)</span>
              </div>
            </div>
          )}
        </section>
      )}

      <section className="panel routine-form-panel" style={{ marginTop: 16 }}>
        <div className="panel-head">
          <h3>Añadir ejercicio</h3>
          <span className="tag tag-lime">Se guarda al momento</span>
        </div>

        <div className="routine-form-body">
          <form onSubmit={handleAddEjercicio}>
            <div className="form-grid">
              <div className="field field--full">
                <label htmlFor="ejercicio-nombre">Ejercicio</label>
                <input
                  id="ejercicio-nombre"
                  className="form-control"
                  value={ejercicio.nombre}
                  onChange={(e) => setEjercicio({ ...ejercicio, nombre: e.target.value })}
                  placeholder="Ej: Press de banca"
                  required
                />
              </div>

              <div className="field">
                <label htmlFor="ejercicio-musculo">Músculo</label>
                <select
                  id="ejercicio-musculo"
                  className="form-select"
                  value={ejercicio.musculo}
                  onChange={(e) => setEjercicio({ ...ejercicio, musculo: e.target.value })}
                >
                  {MUSCULOS.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>

              <div className="field">
                <label htmlFor="ejercicio-series">Series</label>
                <input
                  id="ejercicio-series"
                  type="number"
                  min="1"
                  className="form-control"
                  value={ejercicio.series}
                  onChange={(e) => setEjercicio({ ...ejercicio, series: e.target.value })}
                />
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-primary">
                <Icon nombre="plus" /> Añadir a la rutina
              </button>
              <span className="auto-rest">
                <Icon nombre="clock" />
                Descanso automático:
                <strong>{formatearDescanso(descansoEstimado(ejercicio.musculo, ejercicio.series))}</strong>
              </span>
            </div>
          </form>
        </div>
      </section>

      <section className="panel" style={{ marginTop: 16 }}>
        <div className="panel-head">
          <h3>Ejercicios de la rutina</h3>
          <span className="tag tag-ink">{rutina.ejercicios.length}</span>
        </div>

        {rutina.ejercicios.length === 0 ? (
          <div className="empty-state" style={{ margin: 19 }}>
            <span className="empty-icon"><Icon nombre="list" /></span>
            <h3>Aún no hay ejercicios</h3>
            <p>Añade el primero con el formulario de arriba y quedará guardado en la rutina.</p>
          </div>
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
                  <th aria-label="Acciones" />
                </tr>
              </thead>
              <tbody>
                {rutina.ejercicios.map((ej, index) => (
                  <tr key={ej.id}>
                    <td className="muted-cell">{String(index + 1).padStart(2, '0')}</td>
                    <td className="fw-semibold">{ej.nombre}</td>
                    <td><span className="tag tag-ghost">{ej.musculo}</span></td>
                    <td style={{ textAlign: 'center' }}>{ej.series}</td>
                    <td style={{ textAlign: 'center' }}>{formatearDescanso(ej.descanso)}</td>
                    <td>
                      <div className="row-actions">
                        <button
                          type="button"
                          className="icon-btn"
                          title="Editar nombre y series"
                          onClick={() => handleActualizarEjercicio(ej)}
                        >
                          <Icon nombre="edit" />
                        </button>
                        <button
                          type="button"
                          className="icon-btn icon-btn--danger"
                          title="Eliminar ejercicio"
                          onClick={() => handleEliminarEjercicio(ej)}
                        >
                          <Icon nombre="trash" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  )
}
