import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api, { mensajeDeError } from '../api/axios'
import { useAuth } from '../context/AuthContext'
import CambiarContrasena from '../components/CambiarContrasena'
import FondoUsuario from '../components/FondoUsuario'
import Icon from '../components/Icon'
import { PageHead, StatCard, numero, fechaCorta } from '../components/ui'

function formatearTiempo(minutos) {
  const total = Number(minutos || 0)
  if (!total) return '0 min'
  const h = Math.floor(total / 60)
  const m = total % 60
  return h === 0 ? `${m} min` : m === 0 ? `${h} h` : `${h} h ${m} min`
}

function iniciales(nombre) {
  const p = String(nombre || '?').trim().split(/\s+/)
  return p.length === 1 ? p[0].slice(0, 2).toUpperCase() : `${p[0][0]}${p[p.length - 1][0]}`.toUpperCase()
}

export default function Perfil() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const [datos, setDatos] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const cargar = async () => {
      try {
        const res = await api.get('/perfil')
        setDatos(res.data)
      } catch (err) {
        setError(mensajeDeError(err, 'Error al cargar el perfil'))
      } finally {
        setCargando(false)
      }
    }
    cargar()
  }, [])

  const salir = () => {
    logout()
    navigate('/login')
  }

  const exportar = () => {
    if (!datos) return
    const blob = new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' })
    const enlace = document.createElement('a')
    enlace.href = URL.createObjectURL(blob)
    enlace.download = 'gymapp-perfil.json'
    document.body.appendChild(enlace)
    enlace.click()
    enlace.remove()
    setTimeout(() => URL.revokeObjectURL(enlace.href), 1000)
  }

  if (cargando) {
    return (
      <>
        <PageHead eyebrow="Tu cuenta" titulo="Perfil" />
        <div className="loading-panel" role="status"><span className="loading-dot" /><span>Leyendo tu perfil…</span></div>
      </>
    )
  }

  if (error) {
    return (
      <>
        <PageHead eyebrow="Tu cuenta" titulo="Perfil" />
        <div className="alert alert-danger">{error}</div>
      </>
    )
  }

  const { usuario, resumen, porMusculo, topEjercicios, records, ultimas, corporal } = datos
  const maxVolumen = Math.max(...porMusculo.map((m) => Number(m.volumen || 0)), 1)
  const volumenTotal = porMusculo.reduce((t, m) => t + Number(m.volumen || 0), 0)
  const miembroDesde = usuario.fecha_registro
    ? new Date(usuario.fecha_registro).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
    : '—'

  return (
    <>
      <PageHead
        eyebrow="Tu cuenta"
        titulo="Perfil"
        sub="Tus datos, tus preferencias y el control de la sesión."
      />

      <section className="profile-hero">
        <span className="avatar" aria-hidden="true">{iniciales(usuario.nombre)}</span>
        <div>
          <h1>{usuario.nombre}</h1>
          <p>{usuario.email}<br />Miembro desde {miembroDesde}</p>
          <div className="profile-tags">
            <span><Icon nombre="flame" /> {resumen.rachaDiaria} días de racha</span>
            <span><Icon nombre="trophy" /> {resumen.entrenamientos} sesiones</span>
            <span><Icon nombre="dumbbell" /> {resumen.rutinasCreadas} rutinas</span>
          </div>
        </div>
        <div className="profile-hero-actions">
          <Link className="btn btn-lime" to="/medidas"><Icon nombre="ruler" /> Actualizar medidas</Link>
          <button className="btn btn-ghost profile-logout" type="button" onClick={salir}>
            <Icon nombre="logout" /> Salir
          </button>
        </div>
      </section>

      <div className="progress-stats">
        <StatCard icono="dumbbell" valor={resumen.entrenamientos} etiqueta="Rutinas terminadas" />
        <StatCard icono="clock" valor={formatearTiempo(resumen.minutos)} etiqueta="Tiempo entrenado" />
        <StatCard icono="chart" valor={resumen.volumen ? `${numero(resumen.volumen / 1000)} t` : '0 t'} etiqueta="Volumen levantado" />
        <StatCard icono="flame" valor={resumen.rachaDiaria} etiqueta="Días de racha" />
      </div>

      {resumen.entrenamientos === 0 ? (
        <div className="empty-state">
          <span className="empty-icon"><Icon nombre="chart" /></span>
          <h3>Tu perfil se llenará con tus datos</h3>
          <p>Termina tu primera rutina y aquí verás volumen, récords y distribución por músculo.</p>
          <Link className="btn btn-primary" to="/entrenar"><Icon nombre="play" /> Ir a entrenar</Link>
        </div>
      ) : (
        <div className="profile-grid">
          <div className="side-stack">
            <section className="panel">
              <div className="panel-head">
                <h3>Trabajo por músculo</h3>
                <span className="tag tag-ink">{numero(volumenTotal / 1000)} t</span>
              </div>
              {porMusculo.length === 0 ? (
                <p className="panel-loading">Sin datos de volumen todavía.</p>
              ) : (
                <div className="muscle-bars" style={{ padding: 17 }}>
                  {porMusculo.map((m) => (
                    <div className="muscle-row" key={m.musculo} title={`${numero(m.volumen)} kg · ${m.series} series`}>
                      <span>{m.musculo}</span>
                      <span className="muscle-track"><span className="muscle-fill" style={{ width: `${(Number(m.volumen) / maxVolumen) * 100}%` }} /></span>
                      <span>{numero(m.volumen / 1000)}t</span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="panel">
              <div className="panel-head"><h3>Tus récords</h3><span className="tag tag-lime">Top 5</span></div>
              {records.length === 0 ? (
                <p className="panel-loading">Aún no hay pesos registrados.</p>
              ) : (
                <div className="record-list">
                  {records.map((r, i) => (
                    <div className="record-row" key={r.nombre}>
                      <span className="exercise-num">{String(i + 1).padStart(2, '0')}</span>
                      <span className="record-copy">
                        <strong>{r.nombre}</strong>
                        <small>{r.musculo}</small>
                      </span>
                      <span className="record-value">{numero(r.max_peso)} <small>kg</small></span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="panel">
              <div className="panel-head">
                <h3>Últimas rutinas</h3>
                <Link className="panel-link" to="/progreso">Ver progreso <Icon nombre="arrow-right" /></Link>
              </div>
              {ultimas.length === 0 ? (
                <p className="panel-loading">Sin sesiones todavía.</p>
              ) : (
                <div className="mini-history">
                  {ultimas.map((s) => (
                    <div className="mini-history-row mini-history-row--static" key={s.id}>
                      <span>
                        <strong>{s.rutina_nombre || 'Entrenamiento libre'}</strong>
                        <small>{fechaCorta(s.fecha)} · {formatearTiempo(s.duracion_minutos)}</small>
                      </span>
                      <span className="tag tag-green">Hecha</span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          <div className="side-stack">
            <section className="panel">
              <div className="panel-head"><h3>Tu cuenta</h3></div>
              <div className="account-stats">
                <div className="account-stat"><strong>{resumen.entrenamientos}</strong><span>Sesiones</span></div>
                <div className="account-stat"><strong>{resumen.rachaDiaria}</strong><span>Racha</span></div>
                <div className="account-stat"><strong>{resumen.rutinasCreadas}</strong><span>Rutinas</span></div>
              </div>
              <div className="more-list">
                <a className="more-row" href="#preferencias">
                  <Icon nombre="settings" /><span>Preferencias</span><Icon nombre="chevron-right" />
                </a>
                <Link className="more-row" to="/medidas">
                  <Icon nombre="ruler" /><span>Medidas corporales</span><Icon nombre="chevron-right" />
                </Link>
                <Link className="more-row" to="/fotos">
                  <Icon nombre="camera" /><span>Fotos de progreso</span><Icon nombre="chevron-right" />
                </Link>
                <button className="more-row" type="button" onClick={exportar}>
                  <Icon nombre="arrow-up-right" /><span>Exportar mis datos</span><Icon nombre="chevron-right" />
                </button>
                <button className="more-row danger" type="button" onClick={salir}>
                  <Icon nombre="logout" /><span>Cerrar sesión</span><Icon nombre="chevron-right" />
                </button>
              </div>
            </section>

            {corporal.peso && (
              <section className="panel">
                <div className="panel-head"><h3>Estado corporal</h3></div>
                <div className="body-measures">
                  <div className="body-measure"><span>Peso</span><strong>{numero(corporal.peso)} <small>kg</small></strong></div>
                  <div className="body-measure"><span>Altura</span><strong>{numero(corporal.altura)} <small>cm</small></strong></div>
                  <div className="body-measure"><span>IMC</span><strong>{corporal.imc} <small>{corporal.categoria}</small></strong></div>
                  <div className="body-measure">
                    <span>Cambio</span>
                    <strong style={{ color: Number(corporal.cambioPeso) > 0 ? 'var(--orange-ink)' : 'var(--green)' }}>
                      {Number(corporal.cambioPeso) > 0 ? '+' : ''}{corporal.cambioPeso} <small>kg</small>
                    </strong>
                  </div>
                </div>
                <div className="panel-foot">
                  <Link className="btn btn-ghost btn-sm" to="/medidas">Actualizar medidas <Icon nombre="arrow-right" /></Link>
                </div>
              </section>
            )}

            <section className="panel">
              <div className="panel-head"><h3>Ejercicios más trabajados</h3></div>
              {topEjercicios.length === 0 ? (
                <p className="panel-loading">Sin datos todavía.</p>
              ) : (
                <div className="record-list">
                  {topEjercicios.map((e, i) => (
                    <div className="record-row" key={e.nombre}>
                      <span className="exercise-num">{i + 1}</span>
                      <span className="record-copy">
                        <strong>{e.nombre}</strong>
                        <small>{e.series} series</small>
                      </span>
                      <span className="record-value">{numero(e.volumen / 1000)} <small>t</small></span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      )}

      <div className="settings-layout" id="preferencias">
        <FondoUsuario />
        <CambiarContrasena />
      </div>

      <aside className="side-note">
        <h4>Hecho para los tuyos</h4>
        <p>GymApp es privada: solo tú y tu familia tenéis acceso. Los datos se guardan en vuestro propio espacio.</p>
      </aside>
    </>
  )
}
