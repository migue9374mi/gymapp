import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'
import Icon from '../components/Icon'
import { PageHead, StatCard, numero, fechaCorta } from '../components/ui'

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
const CLAVE_SESION = 'gymapp_sesion_activa'
const OBJETIVO_POR_DEFECTO = 4

const TONO = {
  push: 'push',
  pull: 'pull',
  pierna: 'legs',
  full_body: 'full',
  core: 'core',
  cardio: 'cardio',
  general: 'general',
}

function leerSesion() {
  try {
    const raw = localStorage.getItem(CLAVE_SESION)
    return raw ? JSON.parse(raw) : null
  } catch (e) {
    return null
  }
}

function saludo() {
  const h = new Date().getHours()
  if (h < 13) return 'Buenos días'
  if (h < 20) return 'Buenas tardes'
  return 'Buenas noches'
}

function tituloHero(nombre) {
  const palabras = String(nombre || '').trim().split(/\s+/)
  if (palabras.length <= 1) return <em>{nombre}</em>
  const ultima = palabras.pop()
  return <>{palabras.join(' ')}<br /><em>{ultima}</em></>
}

function fechaLocal(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function lunesDeLaSemana() {
  const hoy = new Date()
  const lunes = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())
  lunes.setDate(lunes.getDate() - ((hoy.getDay() + 6) % 7))
  return lunes
}

function formatearTiempo(minutos) {
  const total = Number(minutos || 0)
  const h = Math.floor(total / 60)
  const m = total % 60
  if (h === 0) return `${m} min`
  return m === 0 ? `${h} h` : `${h} h ${m} min`
}

export default function Dashboard() {
  const { user } = useAuth()
  const [plan, setPlan] = useState([])
  const [rutinas, setRutinas] = useState([])
  const [stats, setStats] = useState(null)
  const [historial, setHistorial] = useState([])
  const [sesiones, setSesiones] = useState([])
  const [perfil, setPerfil] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [sesionActiva, setSesionActiva] = useState(() => leerSesion())

  useEffect(() => {
    const cargar = async () => {
      const resultados = await Promise.allSettled([
        api.get('/plan'),
        api.get('/rutinas'),
        api.get('/estadisticas'),
        api.get('/estadisticas/historial'),
        api.get('/entrenamientos/sesiones'),
        api.get('/perfil'),
      ])

      if (resultados[0].status === 'fulfilled') setPlan(resultados[0].value.data.plan || [])
      if (resultados[1].status === 'fulfilled') setRutinas(resultados[1].value.data.rutinas || [])
      if (resultados[2].status === 'fulfilled') setStats(resultados[2].value.data)
      if (resultados[3].status === 'fulfilled') setHistorial(resultados[3].value.data.historial || [])
      if (resultados[4].status === 'fulfilled') setSesiones(resultados[4].value.data.sesiones || [])
      if (resultados[5].status === 'fulfilled') setPerfil(resultados[5].value.data)

      setCargando(false)
    }

    cargar()
    const refrescarSesion = () => setSesionActiva(leerSesion())
    const t = setInterval(refrescarSesion, 1500)
    return () => clearInterval(t)
  }, [])

  const hoy = new Date()
  const indiceHoy = (hoy.getDay() + 6) % 7
  const planHoy = plan[indiceHoy]
  const rutinasHoy = planHoy?.rutinas || []
  const rutinaPrincipal = rutinasHoy[0]
  const detallePrincipal = rutinas.find((r) => r.id === rutinaPrincipal?.rutina_id)
  const enSesion = Boolean(sesionActiva)

  const datosSemana = useMemo(() => {
    const lunes = lunesDeLaSemana()
    const dias = Array.from({ length: 7 }, (_, i) => {
      const fecha = new Date(lunes)
      fecha.setDate(lunes.getDate() + i)
      return fecha
    })

    const fechasHechas = new Set(
      sesiones
        .filter((s) => s.finalizada === 1 || s.finalizada === true || s.hora_fin)
        .map((s) => String(s.fecha).slice(0, 10))
    )

    const planPorDia = new Map()
    plan.forEach((p) => planPorDia.set(p.dia, p))

    return dias.map((fecha, i) => ({
      fecha,
      iso: fechaLocal(fecha),
      nombre: DIAS[i],
      num: fecha.getDate(),
      hecha: fechasHechas.has(fechaLocal(fecha)),
      hoy: i === indiceHoy,
      rutinas: planPorDia.get(i)?.rutinas || [],
    }))
  }, [plan, sesiones, indiceHoy])

  const sesionesSemana = datosSemana.filter((d) => d.hecha).length
  const planificadas = plan.filter((d) => d.rutinas.length > 0).length
  const objetivo = planificadas || OBJETIVO_POR_DEFECTO
  const porcentajeObjetivo = Math.min(100, Math.round((sesionesSemana / objetivo) * 100))
  const semanaActual = historial[historial.length - 1]
  const volumenTotal = perfil?.resumen?.volumen || 0
  const ultima = perfil?.ultimas?.[0]
  const racha = stats?.rachas?.rachaDiaria ?? perfil?.resumen?.rachaDiaria ?? 0

  const filasSemana = datosSemana.map((d) => {
    const rutina = d.rutinas[0]
    const detalle = rutinas.find((r) => r.id === rutina?.rutina_id)
    return (
      <Link
        className={`routine-row ${d.hoy ? 'is-today' : ''}`}
        key={d.iso}
        to="/plan"
        aria-label={`Ver ${rutina?.nombre || 'el descanso'} del ${d.nombre} en el plan`}
      >
        <span className={`routine-swatch ${TONO[rutina?.categoria] || 'rest'}`}>{d.nombre.slice(0, 2)}</span>
        <span className="routine-copy">
          <strong>{rutina?.nombre || 'Descanso'}</strong>
          <small>
            {d.hoy ? 'Hoy · ' : ''}
            {rutina
              ? `${detalle?.num_ejercicios ?? '—'} ejercicios · ${rutina.categoria}`
              : 'Recuperación'}
          </small>
        </span>
        {d.hecha ? <span className="tag tag-green">Hecho</span> : <Icon nombre="arrow-right" />}
      </Link>
    )
  })

  const nombreCorto = String(user?.nombre || '').trim().split(/\s+/)[0]

  return (
    <>
      <PageHead
        eyebrow={`${DIAS[indiceHoy]}, ${hoy.getDate()} de ${['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'][hoy.getMonth()]}`}
        titulo={<>{saludo()},<br />{nombreCorto}</>}
        sub={
          enSesion
            ? 'Tienes una sesión abierta. El cronómetro sigue corriendo: vuelve cuando quieras.'
            : racha > 0
              ? `Llevas ${racha} ${racha === 1 ? 'día' : 'días'} seguidos moviéndote. ${rutinasHoy.length ? `Hoy toca ${rutinasHoy.map((r) => r.nombre).join(' y ')}.` : 'Hoy toca recuperar.'}`
              : 'Todo listo para empezar. Tu plan y tus marcas están a un clic.'
        }
      >
        <Link className="btn btn-ghost" to="/plan">
          <Icon nombre="calendar" /> Ver plan
        </Link>
        <Link className="btn btn-primary" to="/entrenar">
          <Icon nombre={enSesion ? 'arrow-right' : 'play'} />
          {enSesion ? 'Continuar' : 'Empezar'}
        </Link>
      </PageHead>

      <div className="dash-top">
        <article className="hero" data-ghost={(rutinaPrincipal?.categoria || 'REST').toUpperCase().slice(0, 4)}>
          <div className="hero-top">
            <div>
              <span className="eyebrow">
                <span className="dot" />
                {enSesion ? 'Entrenando ahora' : rutinasHoy.length ? 'Sesión de hoy' : 'Día de descanso'}
              </span>
              <h2>
                {rutinasHoy.length
                  ? tituloHero(rutinasHoy.map((r) => r.nombre).join(' & '))
                  : <>Recuperar<br /><em>también entrena</em></>}
              </h2>
              <div className="hero-meta">
                {rutinasHoy.length ? (
                  <>
                    <span><Icon nombre="dumbbell" /> {detallePrincipal?.num_ejercicios ?? rutinasHoy.length} ejercicios</span>
                    <span><Icon nombre="target" /> {rutinaPrincipal?.categoria || 'General'}</span>
                    <span><Icon nombre="calendar" /> {planHoy?.nombre || DIAS[indiceHoy]}</span>
                  </>
                ) : (
                  <>
                    <span><Icon nombre="heart" /> Descanso planificado</span>
                    <span><Icon nombre="clock" /> Vuelve mañana</span>
                  </>
                )}
              </div>
            </div>
            <span className="hero-badge">
              <span className="live-dot" />
              {enSesion ? 'Sesión en curso' : rutinasHoy.length ? 'Listo para empezar' : 'Recuperación'}
            </span>
          </div>

          <div className="hero-bottom">
            <div className="hero-actions">
              <Link className="btn btn-primary btn-lg" to="/entrenar">
                {enSesion ? 'Volver a la sesión' : rutinasHoy.length ? 'Empezar entrenamiento' : 'Ver mi plan'}
                <Icon nombre="arrow-right" />
              </Link>
              <Link className="btn btn-ghost btn-lg" to={rutinasHoy.length ? '/plan' : '/rutinas'}>
                {rutinasHoy.length ? 'Ver ejercicios' : 'Mis rutinas'}
              </Link>
            </div>
            <span className="hero-index">
              {enSesion ? 'SESIÓN ABIERTA' : `SESIÓN ${String(sesionesSemana + 1).padStart(2, '0')} / ${String(objetivo).padStart(2, '0')}`}
            </span>
          </div>
        </article>

        <article className="goal-card">
          <div className="goal-top">
            <div>
              <span className="eyebrow">Objetivo semanal</span>
              <h3>{sesionesSemana} de {objetivo}<br />sesiones</h3>
            </div>
            <span className="tag tag-ink">{porcentajeObjetivo} %</span>
          </div>

          <div className="goal-ring-wrap">
            <div
              className="goal-ring"
              style={{ '--p': porcentajeObjetivo }}
              role="img"
              aria-label={`${porcentajeObjetivo} por ciento del objetivo semanal`}
            >
              <span>{porcentajeObjetivo}%</span>
            </div>
            <div className="goal-copy">
              <strong>
                {sesionesSemana >= objetivo ? 'Objetivo cumplido' : `Quedan ${objetivo - sesionesSemana}`}
              </strong>
              <span>
                {sesionesSemana >= objetivo
                  ? 'Semana cerrada. Lo que venga suma.'
                  : `Te ${objetivo - sesionesSemana === 1 ? 'queda una sesión' : `quedan ${objetivo - sesionesSemana} sesiones`} para cerrar la semana.`}
              </span>
            </div>
          </div>

          <div className="week-strip">
            {datosSemana.map((d) => (
              <div key={d.iso} className={`week-day ${d.hecha ? 'is-done' : ''} ${d.hoy ? 'is-today' : ''}`}>
                <span>{d.nombre.slice(0, 1)}</span>
                <span>{d.num}</span>
              </div>
            ))}
          </div>
        </article>
      </div>

      <div className="stat-grid">
        <StatCard icono="flame" valor={racha} etiqueta="Días de racha" />
        <StatCard icono="dumbbell" valor={`${sesionesSemana}/${objetivo}`} etiqueta="Sesiones esta semana" />
        <StatCard icono="chart" valor={volumenTotal ? `${numero(volumenTotal / 1000)} t` : '0 t'} etiqueta="Volumen levantado" />
        <StatCard icono="clock" valor={formatearTiempo(stats?.tiempoTotal)} etiqueta="Tiempo entrenado" />
      </div>

      <div className="dash-columns">
        <section className="panel">
          <div className="panel-head">
            <h3>Tu semana</h3>
            <Link className="panel-link" to="/plan">Ver plan <Icon nombre="arrow-right" /></Link>
          </div>
          <div className="panel-body">
            {cargando ? <p className="panel-loading">Leyendo tu plan…</p> : filasSemana}
          </div>
        </section>

        <div className="side-stack">
          <section className="panel">
            <div className="panel-head"><h3>Accesos rápidos</h3></div>
            <div className="quick-list">
              <Link className="quick-action" to="/medidas">
                <span className="quick-icon tone-orange"><Icon nombre="scale" /></span> Registrar peso
                <Icon nombre="arrow-up-right" className="icon-arrow" />
              </Link>
              <Link className="quick-action" to="/fotos">
                <span className="quick-icon tone-lime"><Icon nombre="camera" /></span> Añadir foto
                <Icon nombre="arrow-up-right" className="icon-arrow" />
              </Link>
              <Link className="quick-action" to="/progreso">
                <span className="quick-icon tone-blue"><Icon nombre="chart" /></span> Ver historial
                <Icon nombre="arrow-up-right" className="icon-arrow" />
              </Link>
              <Link className="quick-action" to="/perfil">
                <span className="quick-icon tone-yellow"><Icon nombre="settings" /></span> Ajustes
                <Icon nombre="arrow-up-right" className="icon-arrow" />
              </Link>
            </div>
          </section>

          <section className="panel last-session">
            <div className="last-session-top">
              <span>Última sesión</span>
              {ultima && <span className="tag tag-lime">Finalizada</span>}
            </div>
            {ultima ? (
              <>
                <h4>{ultima.rutina_nombre || 'Entrenamiento libre'}</h4>
                <div className="last-session-meta">
                  <span><strong>{formatearTiempo(ultima.duracion_minutos)}</strong> duración</span>
                  <span><strong>{fechaCorta(ultima.fecha)}</strong></span>
                </div>
              </>
            ) : (
              <>
                <h4>Tu primera marca</h4>
                <div className="last-session-meta">
                  <span>Aún no has terminado ninguna rutina. Empieza hoy y aquí verás tu resumen.</span>
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    </>
  )
}
