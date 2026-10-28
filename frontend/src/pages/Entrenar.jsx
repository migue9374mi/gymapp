import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import api, { mensajeDeError } from '../api/axios'
import SesionActiva from '../components/SesionActiva'
import { CLAVE_DESCANSO } from '../nativa/descansoLogica'
import { cancelarAvisoDescanso } from '../nativa/descanso'
import Icon from '../components/Icon'
import { PageHead, Avisos, fechaCorta } from '../components/ui'

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
const MUSCULOS = [
  'pecho', 'espalda', 'hombros', 'biceps', 'triceps', 'piernas',
  'gluteos', 'core', 'antebrazos', 'pantorrillas', 'otro',
]

const TONO = {
  push: 'push',
  pull: 'pull',
  pierna: 'legs',
  full_body: 'full',
  core: 'core',
  cardio: 'cardio',
  general: 'general',
}

function getDiaSemanaActual() {
  return (new Date().getDay() + 6) % 7
}

function horaActual() {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function fechaLocal() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatearDuracion(minutos) {
  const total = Number(minutos || 0)
  if (total < 60) return `${total} min`
  const h = Math.floor(total / 60)
  const m = total % 60
  return m === 0 ? `${h} h` : `${h} h ${m} min`
}

// --- Persistencia de la sesion activa ---
const CLAVE_SESION = 'gymapp_sesion_activa'

function guardarSesionActiva(id, inicioMs) {
  localStorage.setItem(CLAVE_SESION, JSON.stringify({ id, inicioMs }))
}

function leerSesionActiva() {
  try {
    const raw = localStorage.getItem(CLAVE_SESION)
    return raw ? JSON.parse(raw) : null
  } catch (e) {
    return null
  }
}

function borrarSesionActiva() {
  localStorage.removeItem(CLAVE_SESION)
  localStorage.removeItem(CLAVE_DESCANSO)
  cancelarAvisoDescanso()
}

function tituloRutina(nombre) {
  const palabras = String(nombre || '').trim().split(/\s+/)
  if (palabras.length <= 1) return <em>{nombre}</em>
  const ultima = palabras.pop()
  return <>{palabras.join(' ')}<br /><em>{ultima}</em></>
}

export default function Entrenar() {
  const [plan, setPlan] = useState([])
  const [sesiones, setSesiones] = useState([])
  const [sesionActiva, setSesionActiva] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [exito, setExito] = useState('')
  const timeoutExito = useRef(null)

  const mostrarExito = (mensaje, ms = 3000) => {
    clearTimeout(timeoutExito.current)
    setExito(mensaje)
    timeoutExito.current = setTimeout(() => setExito(''), ms)
  }

  useEffect(() => () => clearTimeout(timeoutExito.current), [])

  const [mostrarExtra, setMostrarExtra] = useState(false)
  const [extra, setExtra] = useState({ nombre: '', musculo: 'pecho', series: 3, reps: 10, peso: 0, justificacion: '' })

  const [quitarEjercicio, setQuitarEjercicio] = useState(null)
  const [justificacion, setJustificacion] = useState('')

  useEffect(() => {
    cargarDatos()
    const guardada = leerSesionActiva()
    if (guardada?.id) cargarSesion(guardada.id)
  }, [])

  const cargarDatos = async () => {
    try {
      const [p, s] = await Promise.all([
        api.get('/plan'),
        api.get('/entrenamientos/sesiones'),
      ])
      setPlan(p.data.plan || [])
      setSesiones(s.data.sesiones || [])
    } catch (err) {
      setError(mensajeDeError(err, 'Error al cargar datos'))
    } finally {
      setCargando(false)
    }
  }

  const cargarSesion = async (id) => {
    try {
      const res = await api.get(`/entrenamientos/sesiones/${id}`)
      setSesionActiva({ ...res.data.sesion, ejercicios: res.data.sesion.ejercicios || [] })
    } catch (err) {
      borrarSesionActiva()
      setError(mensajeDeError(err, 'Error al cargar la sesión'))
    }
  }

  const handleRegistrarSesion = async (rutina, indiceDia) => {
    try {
      const res = await api.post('/entrenamientos/sesiones', {
        rutina_id: rutina.rutina_id,
        fecha: fechaLocal(),
        hora_inicio: horaActual(),
        notas: `Dia del plan: ${DIAS[indiceDia]}`,
      })

      const sesionId = res.data.sesion.id
      await api.post(`/entrenamientos/sesiones/${sesionId}/copiar-rutina`, { rutina_id: rutina.rutina_id })
      guardarSesionActiva(sesionId, Date.now())

      mostrarExito(`Entrenamiento "${rutina.nombre}" iniciado`)
      await cargarSesion(sesionId)
      cargarDatos()
    } catch (err) {
      setError(mensajeDeError(err, 'Error al iniciar entrenamiento'))
      setTimeout(() => setError(''), 3500)
    }
  }

  const handleAnadirExtra = async (e) => {
    e.preventDefault()
    if (!sesionActiva) return
    try {
      const res = await api.post(`/entrenamientos/sesiones/${sesionActiva.id}/extra`, {
        ...extra,
        series: parseInt(extra.series),
        reps: parseInt(extra.reps),
        peso: parseFloat(extra.peso) || 0,
      })
      mostrarExito(res.data.message)
      setExtra({ nombre: '', musculo: 'pecho', series: 3, reps: 10, peso: 0, justificacion: '' })
      setMostrarExtra(false)
      cargarSesion(sesionActiva.id)
    } catch (err) {
      setError(mensajeDeError(err, 'Error al añadir ejercicio extra'))
    }
  }

  const handleQuitarEjercicio = async () => {
    if (!sesionActiva || !quitarEjercicio) return
    try {
      const params = justificacion ? `?justificacion=${encodeURIComponent(justificacion)}` : ''
      const res = await api.delete(`/entrenamientos/sesiones/${sesionActiva.id}/ejercicio/${quitarEjercicio.id}${params}`)
      mostrarExito(res.data.message)
      setQuitarEjercicio(null)
      setJustificacion('')
      cargarSesion(sesionActiva.id)
    } catch (err) {
      setError(mensajeDeError(err, 'Error al quitar ejercicio'))
    }
  }

  const handleEliminarSesion = async (id) => {
    if (!window.confirm('¿Eliminar este entrenamiento?')) return
    try {
      await api.delete(`/entrenamientos/sesiones/${id}`)
      if (sesionActiva?.id === id) {
        borrarSesionActiva()
        setSesionActiva(null)
      }
      cargarDatos()
    } catch (err) {
      setError(mensajeDeError(err, 'Error al eliminar'))
    }
  }

  const descartarSesion = () => {
    if (!window.confirm('¿Salir de la sesión sin finalizarla? El progreso de las series ya registradas se conserva.')) return
    borrarSesionActiva()
    setSesionActiva(null)
    mostrarExito('Sesión cerrada en este dispositivo')
  }

  if (cargando) {
    return (
      <>
        <PageHead eyebrow="Tu entrenamiento" titulo="Entrenar" />
        <div className="loading-panel" role="status"><span className="loading-dot" /><span>Preparando la sesión…</span></div>
      </>
    )
  }

  const diaHoy = getDiaSemanaActual()
  const planHoy = plan[diaHoy]
  const rutinasHoy = planHoy?.rutinas || []
  const rutinaPrincipal = rutinasHoy[0]
  const guardada = leerSesionActiva()
  const esSesionAbierta = Boolean(sesionActiva && guardada && Number(guardada.id) === Number(sesionActiva.id))
  const detalleLista = sesiones.find((s) => s.id === sesionActiva?.id)
  const nombreSesion = detalleLista?.rutina_nombre || 'Sesión libre'

  return (
    <>
      <PageHead
        eyebrow={
          sesionActiva
            ? esSesionAbierta ? 'Sesión en curso' : 'Vista de sesión'
            : `${DIAS[diaHoy]} · ${new Date().getDate()} ${['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'][new Date().getMonth()]}`
        }
        titulo={sesionActiva ? nombreSesion : 'Entrenar'}
        sub={
          sesionActiva
            ? `Empezada a las ${sesionActiva.hora_inicio || '—'} · ${sesionActiva.ejercicios.length} ejercicios`
            : rutinasHoy.length
              ? 'Todo listo. Cuando empieces, el cronómetro y los descansos se encargan del resto.'
              : 'Hoy no hay rutina asignada. Puedes descansar o cambiar tu plan.'
        }
      >
        {sesionActiva ? (
          <>
            {esSesionAbierta && (
              <button className="btn btn-ghost" type="button" onClick={descartarSesion}>
                <Icon nombre="x" /> Salir
              </button>
            )}
            <Link className="btn btn-ghost" to="/progreso">Ver progreso</Link>
          </>
        ) : (
          <>
            <Link className="btn btn-ghost" to="/plan"><Icon nombre="calendar" /> Cambiar rutina</Link>
            {rutinaPrincipal && (
              <button className="btn btn-primary" type="button" onClick={() => handleRegistrarSesion(rutinaPrincipal, diaHoy)}>
                <Icon nombre="play" /> Empezar
              </button>
            )}
          </>
        )}
      </PageHead>

      <Avisos error={error} exito={exito} />

      {sesionActiva ? (
        <>
          <SesionActiva
            key={sesionActiva.id}
            sesion={sesionActiva}
            onSesionCambiada={() => cargarSesion(sesionActiva.id)}
            onFinalizada={(data) => {
              borrarSesionActiva()
              const d = Number(data.duracion_minutos || 0)
              mostrarExito(`Rutina finalizada: ${data.hora_inicio || '—'} - ${data.hora_fin || '—'} · ${formatearDuracion(d)}`, 8000)
              setSesionActiva(null)
              cargarDatos()
            }}
          />

          <section className="panel session-tools">
            <div className="panel-head">
              <h3>Ajustes de la sesión</h3>
              <span className="tag tag-ink">Solo hoy</span>
            </div>
            <div className="session-tool-actions">
              <button className="btn btn-ghost" type="button" onClick={() => setMostrarExtra((v) => !v)}>
                <Icon nombre="plus" /> Añadir ejercicio extra
              </button>
            </div>

            {mostrarExtra && (
              <form className="inline-form" onSubmit={handleAnadirExtra}>
                <div className="field field--wide">
                  <label htmlFor="extra-nombre">Ejercicio</label>
                  <input
                    id="extra-nombre"
                    className="form-control"
                    placeholder="Nombre del ejercicio"
                    value={extra.nombre}
                    onChange={(e) => setExtra({ ...extra, nombre: e.target.value })}
                    required
                  />
                </div>
                <div className="field">
                  <label htmlFor="extra-musculo">Músculo</label>
                  <select
                    id="extra-musculo"
                    className="form-select"
                    value={extra.musculo}
                    onChange={(e) => setExtra({ ...extra, musculo: e.target.value })}
                  >
                    {MUSCULOS.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div className="field field--num">
                  <label htmlFor="extra-series">Series</label>
                  <input id="extra-series" type="number" min="1" className="form-control" value={extra.series}
                    onChange={(e) => setExtra({ ...extra, series: e.target.value })} />
                </div>
                <div className="field field--num">
                  <label htmlFor="extra-reps">Reps</label>
                  <input id="extra-reps" type="number" min="1" className="form-control" value={extra.reps}
                    onChange={(e) => setExtra({ ...extra, reps: e.target.value })} />
                </div>
                <div className="field field--num">
                  <label htmlFor="extra-peso">Peso</label>
                  <input id="extra-peso" type="number" min="0" step="0.5" className="form-control" value={extra.peso}
                    onChange={(e) => setExtra({ ...extra, peso: e.target.value })} />
                </div>
                <div className="field field--wide">
                  <label htmlFor="extra-just">¿Por qué lo añades? <span className="optional">(opcional)</span></label>
                  <input id="extra-just" className="form-control" placeholder="Ej: trabajo de agarre"
                    value={extra.justificacion}
                    onChange={(e) => setExtra({ ...extra, justificacion: e.target.value })} />
                </div>
                <button type="submit" className="btn btn-primary"><Icon nombre="plus" /> Añadir</button>
              </form>
            )}

            <div className="remove-list">
              <span className="helper-copy">Quitar un ejercicio de hoy</span>
              {sesionActiva.ejercicios.map((ej) => (
                <div className="remove-row" key={ej.id}>
                  <div>
                    <strong>
                      {ej.nombre}
                      {ej.es_extra === 1 && <span className="mini-tag">EXTRA</span>}
                    </strong>
                    <small>{ej.series} series · {ej.musculo}</small>
                  </div>
                  <button
                    className="icon-btn icon-btn--danger"
                    type="button"
                    onClick={() => { setQuitarEjercicio(ej); setJustificacion('') }}
                    title={`Quitar ${ej.nombre}`}
                  >
                    <Icon nombre="x" />
                  </button>
                </div>
              ))}
            </div>
          </section>
        </>
      ) : (
        <>
          <article className="hero" data-ghost={(rutinaPrincipal?.categoria || 'REST').toUpperCase().slice(0, 4)}>
            <div className="hero-top">
              <div>
                <span className="eyebrow"><span className="dot" />{rutinasHoy.length ? 'Sesión de hoy' : 'Día de descanso'}</span>
                <h2>
                  {rutinasHoy.length
                    ? tituloRutina(rutinasHoy.map((r) => r.nombre).join(' & '))
                    : <>Hoy toca<br /><em>recuperar</em></>}
                </h2>
                <div className="hero-meta">
                  {rutinasHoy.length ? (
                    <>
                      <span><Icon nombre="dumbbell" /> {rutinasHoy.length} {rutinasHoy.length === 1 ? 'rutina' : 'rutinas'}</span>
                      <span><Icon nombre="target" /> {rutinaPrincipal?.categoria || 'General'}</span>
                      <span><Icon nombre="calendar" /> {DIAS[diaHoy]}</span>
                    </>
                  ) : (
                    <>
                      <span><Icon nombre="heart" /> Descanso</span>
                      <span><Icon nombre="calendar" /> {DIAS[diaHoy]}</span>
                    </>
                  )}
                </div>
              </div>
              <span className="hero-badge">
                <span className="live-dot" />
                {rutinasHoy.length ? 'Listo para empezar' : 'Recuperación'}
              </span>
            </div>

            <div className="hero-bottom">
              <div className="hero-actions">
                {rutinasHoy.length ? (
                  <button className="btn btn-primary btn-lg" type="button" onClick={() => handleRegistrarSesion(rutinaPrincipal, diaHoy)}>
                    <Icon nombre="play" /> Empezar entrenamiento
                  </button>
                ) : (
                  <Link className="btn btn-primary btn-lg" to="/plan">Ver mi plan <Icon nombre="arrow-right" /></Link>
                )}
                <Link className="btn btn-ghost btn-lg" to="/rutinas">
                  {rutinasHoy.length ? 'Mis rutinas' : 'Crear una rutina'}
                </Link>
              </div>
              <span className="hero-index">SESIÓN {String(diaHoy + 1).padStart(2, '0')} / 07</span>
            </div>
          </article>

          <div className="plan-layout">
            <section className="panel">
              <div className="panel-head">
                <h3>{rutinasHoy.length ? 'Lo que vas a entrenar' : 'Plan de hoy'}</h3>
                <span className="tag tag-ink">{DIAS[diaHoy]}</span>
              </div>
              {rutinasHoy.length === 0 ? (
                <div className="plan-detail">
                  <div className="rest-note">
                    <Icon nombre="heart" />
                    <p>No hay rutina asignada para hoy. Descansa, camina o asigna una rutina desde tu plan semanal.</p>
                  </div>
                  <div className="plan-actions">
                    <Link className="btn btn-primary" to="/plan">Abrir plan semanal <Icon nombre="arrow-right" /></Link>
                  </div>
                </div>
              ) : (
                <div className="plan-detail">
                  <div className="plan-routine-list">
                    {rutinasHoy.map((r) => (
                      <div className="plan-routine" key={r.plan_id}>
                        <div className="plan-routine-copy">
                          <strong>{r.nombre}</strong>
                          <span>{r.descripcion || 'Sin descripción'}</span>
                          <span className={`tag ${r.categoria === 'push' ? 'tag-red' : r.categoria === 'pull' ? 'tag-lime' : r.categoria === 'pierna' ? 'tag-blue' : 'tag-yellow'}`}>
                            {r.categoria}
                          </span>
                        </div>
                        <div className="plan-routine-actions">
                          <Link className="btn btn-sm btn-ghost" to={`/rutinas/${r.rutina_id}`}><Icon nombre="search" /> Ver</Link>
                          <button className="btn btn-sm btn-primary" type="button" onClick={() => handleRegistrarSesion(r, diaHoy)}>
                            <Icon nombre="play" /> Empezar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>

            <div className="plan-side">
              <aside className="side-note">
                <h4>Antes de empezar</h4>
                <p>Dedica cinco minutos a moverte suave y haz dos series de aproximación en el primer ejercicio. Sin prisa, pero sin pausa.</p>
              </aside>

              <section className="panel">
                <div className="panel-head">
                  <h3>Últimas sesiones</h3>
                  <Link className="panel-link" to="/progreso">Ver todas <Icon nombre="arrow-right" /></Link>
                </div>
                <div className="mini-history">
                  {sesiones.length === 0 ? (
                    <p className="panel-loading">Aún no has registrado entrenamientos.</p>
                  ) : (
                    sesiones.slice(0, 4).map((s) => (
                      <button className="mini-history-row" key={s.id} type="button" onClick={() => cargarSesion(s.id)}>
                        <span>
                          <strong>{s.rutina_nombre || 'Entrenamiento libre'}</strong>
                          <small>{fechaCorta(s.fecha)} · {formatearDuracion(s.duracion_minutos)}</small>
                        </span>
                        <Icon nombre="chevron-right" />
                      </button>
                    ))
                  )}
                </div>
              </section>
            </div>
          </div>

          <section className="panel history-panel">
            <div className="panel-head">
              <h3>Historial de entrenamientos</h3>
              <span className="tag tag-ink">{sesiones.length} sesiones</span>
            </div>
            {sesiones.length === 0 ? (
              <p className="panel-loading">Aquí aparecerán tus sesiones cuando termines la primera.</p>
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr><th>Fecha</th><th>Rutina</th><th>Duración</th><th>Horario</th><th></th></tr>
                  </thead>
                  <tbody>
                    {sesiones.slice(0, 20).map((s) => (
                      <tr key={s.id}>
                        <td><strong>{fechaCorta(s.fecha)}</strong></td>
                        <td>{s.rutina_nombre || 'Entrenamiento libre'}</td>
                        <td>{formatearDuracion(s.duracion_minutos)}</td>
                        <td className="muted-cell">{s.hora_inicio && s.hora_fin ? `${s.hora_inicio} – ${s.hora_fin}` : '—'}</td>
                        <td>
                          <div className="row-actions">
                            <button className="icon-btn" type="button" onClick={() => cargarSesion(s.id)} title="Ver sesión">
                              <Icon nombre="search" />
                            </button>
                            <button className="icon-btn icon-btn--danger" type="button" onClick={() => handleEliminarSesion(s.id)} title="Eliminar">
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
      )}

      {quitarEjercicio && (
        <div className="modal" role="dialog" aria-modal="true" aria-label="Quitar ejercicio">
          <button className="modal-backdrop" type="button" aria-label="Cerrar" onClick={() => setQuitarEjercicio(null)} />
          <div className="modal-card">
            <div className="modal-head">
              <div>
                <h3>Quitar ejercicio</h3>
                <p>Vas a quitar <strong>{quitarEjercicio.nombre}</strong> de esta sesión.</p>
              </div>
              <button className="modal-close" type="button" onClick={() => setQuitarEjercicio(null)} aria-label="Cerrar">
                <Icon nombre="x" />
              </button>
            </div>
            <label className="field-label" htmlFor="justificacion">¿Por qué lo quitas?</label>
            <textarea
              id="justificacion"
              className="form-control"
              rows="3"
              placeholder="Ej: dolor en el hombro, sin tiempo, lesión…"
              value={justificacion}
              onChange={(e) => setJustificacion(e.target.value)}
            />
            <div className="modal-actions">
              <button className="btn btn-ghost" type="button" onClick={() => setQuitarEjercicio(null)}>Cancelar</button>
              <button className="btn btn-primary" type="button" onClick={handleQuitarEjercicio}>
                <Icon nombre="x" /> Quitar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
