import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api, { mensajeDeError } from '../api/axios'
import AjustesAvisos from '../nativa/AjustesAvisos'
import Icon from '../components/Icon'
import { PageHead, Avisos } from '../components/ui'

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

const TONO = {
  push: 'push',
  pull: 'pull',
  pierna: 'legs',
  full_body: 'full',
  core: 'core',
  cardio: 'cardio',
  general: 'general',
}

function Etiqueta({ categoria }) {
  const clase = categoria === 'push' || categoria === 'cardio'
    ? 'tag-red'
    : categoria === 'pull'
      ? 'tag-lime'
      : categoria === 'pierna'
        ? 'tag-blue'
        : categoria === 'full_body' || categoria === 'core'
          ? 'tag-yellow'
          : 'tag'
  return <span className={`tag ${clase}`}>{categoria}</span>
}

export default function Plan() {
  const hoy = (new Date().getDay() + 6) % 7
  const [plan, setPlan] = useState([])
  const [rutinas, setRutinas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [exito, setExito] = useState('')

  const [diaSeleccionado, setDiaSeleccionado] = useState(hoy)
  const [diaDestino, setDiaDestino] = useState(null)
  const [rutinaSeleccionada, setRutinaSeleccionada] = useState('')

  useEffect(() => {
    cargarTodo()
  }, [])

  const cargarTodo = async () => {
    try {
      const [p, r] = await Promise.all([api.get('/plan'), api.get('/rutinas')])
      setPlan(p.data.plan || [])
      setRutinas(r.data.rutinas || [])
    } catch (err) {
      setError(mensajeDeError(err, 'Error al cargar el plan'))
    } finally {
      setCargando(false)
    }
  }

  const confirmar = (mensaje) => {
    setExito(mensaje)
    setTimeout(() => setExito(''), 3500)
  }

  const handleAsignar = async (dia) => {
    if (!rutinaSeleccionada) return
    try {
      const res = await api.post('/plan', {
        dia_semana: dia,
        rutina_id: parseInt(rutinaSeleccionada),
      })
      confirmar(res.data.message || 'Rutina asignada')
      setDiaDestino(null)
      setRutinaSeleccionada('')
      cargarTodo()
    } catch (err) {
      setError(mensajeDeError(err, 'Error al asignar rutina'))
      setTimeout(() => setError(''), 3500)
    }
  }

  const handleQuitar = async (planId, nombre) => {
    if (!window.confirm(`¿Quitar "${nombre}" de este día?`)) return
    try {
      await api.delete(`/plan/${planId}`)
      cargarTodo()
    } catch (err) {
      setError(mensajeDeError(err, 'Error al quitar'))
    }
  }

  const prepararMovimiento = (rutinaId) => {
    setRutinaSeleccionada(String(rutinaId))
    setDiaDestino(diaSeleccionado)
  }

  if (cargando) {
    return (
      <>
        <PageHead eyebrow="Tu semana" titulo={<>Tu plan<br />semanal</>} />
        <div className="loading-panel" role="status"><span className="loading-dot" /><span>Leyendo tu plan…</span></div>
      </>
    )
  }

  const dia = plan[diaSeleccionado] || { nombre: DIAS[diaSeleccionado], rutinas: [] }
  const diasConRutina = plan.filter((d) => d.rutinas.length > 0).length
  const totalRutinas = plan.reduce((s, d) => s + d.rutinas.length, 0)
  const fecha = new Date()
  fecha.setDate(fecha.getDate() + (diaSeleccionado - hoy))

  return (
    <>
      <PageHead
        eyebrow={`Semana actual · ${fecha.getDate()} ${MESES[fecha.getMonth()]}`}
        titulo={<>Tu plan<br />semanal</>}
        sub="Asigna tus rutinas a los días de la semana. Completa la semana para sumar a tu racha."
      >
        <Link className="btn btn-ghost" to="/rutinas">
          <Icon nombre="edit" /> Mis rutinas
        </Link>
        <button className="btn btn-ink" type="button" onClick={() => setDiaDestino(hoy)}>
          <Icon nombre="target" /> Hoy
        </button>
      </PageHead>

      <Avisos error={error} exito={exito} />

      <div className="week-grid">
        {plan.map((d) => {
          const primera = d.rutinas[0]
          const tono = TONO[primera?.categoria] || 'rest'
          const esHoy = d.dia === hoy
          return (
            <button
              key={d.dia}
              type="button"
              className={`day-card tone-${tono} ${d.dia === diaSeleccionado ? 'is-selected' : ''} ${d.rutinas.length === 0 ? 'is-rest' : ''}`}
              onClick={() => setDiaSeleccionado(d.dia)}
              aria-pressed={d.dia === diaSeleccionado}
            >
              <span className="day-name">{d.nombre}{esHoy ? ' · hoy' : ''}</span>
              <span className="day-num">{new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate() + (d.dia - diaSeleccionado)).getDate()}</span>
              <span className="day-routine">{d.rutinas.length ? d.rutinas.map((r) => r.nombre).join(' + ') : 'Descanso'}</span>
              <span className="day-tag">{primera?.categoria || 'REST'}</span>
            </button>
          )
        })}
      </div>

      <div className="plan-layout">
        <section className="panel">
          <div className="plan-detail">
            <div className="plan-detail-head">
              <div>
                <span className="eyebrow">
                  {DIAS[diaSeleccionado]} · {fecha.getDate()} {MESES[fecha.getMonth()]}
                  {diaSeleccionado === hoy ? ' · Hoy' : ''}
                </span>
                <h2>{dia.rutinas.length === 1 ? dia.rutinas[0].nombre : dia.rutinas.length ? 'Sesión doble' : <>Día de<br />descanso</>}</h2>
                {dia.rutinas.length > 0 ? (
                  <span className="tag tag-ink">{dia.rutinas.length} {dia.rutinas.length === 1 ? 'rutina' : 'rutinas'}</span>
                ) : (
                  <span className="tag tag-ink">REST</span>
                )}
                <p className="sub">
                  {dia.rutinas.length
                    ? 'Elige una rutina para ver sus ejercicios o empieza directamente la sesión.'
                    : 'Recuperar también entrena. Camina, estira y duerme bien.'}
                </p>
              </div>
              <Icon nombre={dia.rutinas.length ? 'dumbbell' : 'heart'} />
            </div>

            {dia.rutinas.length > 0 ? (
              <div className="plan-routine-list">
                {dia.rutinas.map((r) => (
                  <div className="plan-routine" key={r.plan_id}>
                    <div className="plan-routine-copy">
                      <strong>{r.nombre}</strong>
                      <span>{r.descripcion || 'Sin descripción'}</span>
                      <Etiqueta categoria={r.categoria} />
                    </div>
                    <div className="plan-routine-actions">
                      <Link className="btn btn-sm btn-ghost" to={`/rutinas/${r.rutina_id}`} title="Ver rutina">
                        <Icon nombre="search" /> Ver
                      </Link>
                      <button
                        className="icon-btn icon-btn--danger"
                        type="button"
                        onClick={() => handleQuitar(r.plan_id, r.nombre)}
                        title="Quitar del día"
                        aria-label={`Quitar ${r.nombre} del ${dia.nombre}`}
                      >
                        <Icon nombre="trash" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rest-note">
                <Icon nombre="heart" />
                <p>Un día libre no es un día perdido. El músculo crece cuando descansa.</p>
              </div>
            )}

            <div className="plan-actions">
              <Link className={`btn btn-primary ${dia.rutinas.length === 0 ? 'is-disabled' : ''}`} to="/entrenar">
                {dia.rutinas.length ? 'Ir a entrenar' : 'Entrenar igualmente'} <Icon nombre="arrow-right" />
              </Link>
              <button className="btn btn-ghost" type="button" onClick={() => setDiaDestino(diaSeleccionado)}>
                <Icon nombre="plus" /> Asignar rutina
              </button>
            </div>
          </div>
        </section>

        <div className="plan-side">
          <section className="panel">
            <div className="panel-head">
              <h3>Asignar rutina</h3>
              <span className="tag tag-ink">Plan</span>
            </div>
            {rutinas.length === 0 ? (
              <div className="plan-form">
                <p className="helper-copy">Primero necesitas crear una rutina.</p>
                <Link className="btn btn-primary btn-block" to="/rutinas">Ir a mis rutinas</Link>
              </div>
            ) : (
              <form
                className="plan-form"
                onSubmit={(e) => {
                  e.preventDefault()
                  if (diaDestino != null) handleAsignar(diaDestino)
                }}
              >
                <div className="field">
                  <label htmlFor="plan-rutina">Rutina</label>
                  <select
                    id="plan-rutina"
                    className="form-select"
                    value={rutinaSeleccionada}
                    onChange={(e) => setRutinaSeleccionada(e.target.value)}
                  >
                    <option value="">Selecciona una rutina…</option>
                    {rutinas.map((r) => (
                      <option key={r.id} value={r.id}>{r.nombre}</option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <span className="field-label">Día</span>
                  <div className="day-picker">
                    {DIAS.map((nombre, i) => (
                      <button
                        key={nombre}
                        type="button"
                        className={`day-pill ${diaDestino === i ? 'is-active' : ''}`}
                        onClick={() => setDiaDestino(i)}
                        disabled={!rutinaSeleccionada}
                      >
                        {nombre.slice(0, 3)}
                      </button>
                    ))}
                  </div>
                </div>

                <button className="btn btn-primary btn-block" type="submit" disabled={!rutinaSeleccionada || diaDestino == null}>
                  <Icon nombre="plus" /> Asignar{rutinaSeleccionada ? ` al ${DIAS[diaDestino ?? 0]}` : ''}
                </button>

                {rutinaSeleccionada && (
                  <p className="helper-copy">
                    Para mover una rutina: asígnala al día nuevo y quita la del día viejo.
                  </p>
                )}
              </form>
            )}
          </section>

          <section className="panel">
            <div className="panel-head"><h3>Resumen</h3></div>
            <div className="settings-list">
              <div className="setting-row">
                <span className="setting-icon"><Icon nombre="calendar" /></span>
                <div className="setting-copy"><strong>{diasConRutina} días con rutina</strong><small>De 7 días</small></div>
              </div>
              <div className="setting-row">
                <span className="setting-icon"><Icon nombre="dumbbell" /></span>
                <div className="setting-copy"><strong>{totalRutinas} rutinas</strong><small>Esta semana</small></div>
              </div>
              <div className="setting-row">
                <span className="setting-icon"><Icon nombre="clock" /></span>
                <div className="setting-copy"><strong>{7 - diasConRutina} días de descanso</strong><small>Recuperación planificada</small></div>
              </div>
            </div>
          </section>

          <AjustesAvisos plan={plan} />
        </div>
      </div>
    </>
  )
}
