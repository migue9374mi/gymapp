import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import api, { mensajeDeError } from '../api/axios'
import Icon from '../components/Icon'
import {
  PageHead,
  TabsProgreso,
  StatCard,
  GraficaLinea,
  numero,
  fechaCorta,
} from '../components/ui'

function formatearTiempo(minutos) {
  const total = Number(minutos || 0)
  const h = Math.floor(total / 60)
  const m = total % 60
  if (h === 0) return `${m} min`
  return m === 0 ? `${h} h` : `${h} h ${m} min`
}

function csvSeguro(valor) {
  return `"${String(valor ?? '').replace(/"/g, '""')}"`
}

export default function Progreso() {
  const [stats, setStats] = useState(null)
  const [historial, setHistorial] = useState([])
  const [sesiones, setSesiones] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [metrica, setMetrica] = useState('sesiones')

  useEffect(() => {
    const cargar = async () => {
      try {
        const [s, h, e] = await Promise.all([
          api.get('/estadisticas'),
          api.get('/estadisticas/historial'),
          api.get('/entrenamientos/sesiones'),
        ])
        setStats(s.data)
        setHistorial(h.data.historial || [])
        setSesiones(e.data.sesiones || [])
      } catch (err) {
        setError(mensajeDeError(err, 'Error al cargar estadísticas'))
      } finally {
        setCargando(false)
      }
    }
    cargar()
  }, [])

  const volumenTotal = useMemo(
    () => (stats?.volumenPorMusculo || []).reduce((t, m) => t + Number(m.volumen || 0), 0),
    [stats]
  )

  const exportar = () => {
    if (!sesiones.length) return
    const filas = [
      ['Fecha', 'Rutina', 'Duración (min)', 'Inicio', 'Fin'],
      ...sesiones.map((s) => [
        s.fecha,
        s.rutina_nombre || 'Entrenamiento libre',
        s.duracion_minutos ?? '',
        s.hora_inicio || '',
        s.hora_fin || '',
      ]),
    ]
    const csv = filas.map((f) => f.map(csvSeguro).join(',')).join('\r\n')
    const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8' })
    const enlace = document.createElement('a')
    enlace.href = URL.createObjectURL(blob)
    enlace.download = 'gymapp-historial.csv'
    document.body.appendChild(enlace)
    enlace.click()
    enlace.remove()
    setTimeout(() => URL.revokeObjectURL(enlace.href), 1000)
  }

  if (cargando) {
    return (
      <>
        <PageHead eyebrow="Tus números" titulo="Mi progreso" />
        <div className="loading-panel" role="status"><span className="loading-dot" /><span>Reuniendo tus datos…</span></div>
      </>
    )
  }

  if (error) {
    return (
      <>
        <PageHead eyebrow="Tus números" titulo="Mi progreso" />
        <div className="alert alert-danger">{error}</div>
      </>
    )
  }

  const vacio = stats.totalEntrenamientos === 0

  if (vacio) {
    return (
      <>
        <PageHead eyebrow="Tus números" titulo="Mi progreso" sub="Cada serie cuenta. Aquí verás lo que has construido.">
          <button className="btn btn-ink" type="button" disabled><Icon nombre="arrow-up-right" /> Exportar</button>
        </PageHead>
        <TabsProgreso activo="progreso" />
        <div className="empty-state">
          <span className="empty-icon"><Icon nombre="chart" /></span>
          <h3>Todavía no hay datos</h3>
          <p>Termina tu primer entrenamiento y aquí aparecerán tus rachas, volumen y evolución semanal.</p>
          <Link className="btn btn-primary" to="/entrenar"><Icon nombre="play" /> Ir a entrenar</Link>
        </div>
      </>
    )
  }

  const maxDia = Math.max(...stats.diasSemana, 1)
  const maxVolumen = Math.max(...stats.volumenPorMusculo.map((m) => Number(m.volumen)), 1)
  const semanaActual = historial[historial.length - 1]
  const valores = historial.map((s) => (metrica === 'sesiones' ? s.entrenamientos : s.minutos))
  const etiquetas = historial.map((s) => s.semana)

  return (
    <>
      <PageHead
        eyebrow="Tus números"
        titulo="Mi progreso"
        sub="Cada serie cuenta. Aquí ves lo que has construido en las últimas semanas."
      >
        <button className="btn btn-ink" type="button" onClick={exportar} disabled={!sesiones.length}>
          <Icon nombre="arrow-up-right" /> Exportar
        </button>
      </PageHead>

      <TabsProgreso activo="progreso" />

      <div className="progress-stats">
        <StatCard icono="trophy" valor={stats.totalEntrenamientos} etiqueta="Entrenamientos totales" />
        <StatCard icono="flame" valor={stats.rachas.rachaDiaria} etiqueta="Días de racha" />
        <StatCard icono="clock" valor={formatearTiempo(stats.tiempoTotal)} etiqueta="Tiempo entrenado" />
        <StatCard icono="target" valor={stats.rachas.mejorRachaDiaria} etiqueta="Mejor racha diaria" />
      </div>

      <div className="chart-grid">
        <section className="panel chart-card">
          <div className="chart-head">
            <div>
              <h3>Actividad de las últimas 8 semanas</h3>
              <p>{metrica === 'sesiones' ? 'Sesiones terminadas por semana' : 'Minutos entrenados por semana'}</p>
            </div>
            <div className="chart-total">
              <strong>{metrica === 'sesiones' ? (semanaActual?.entrenamientos ?? 0) : formatearTiempo(semanaActual?.minutos)}</strong>
              <span>esta semana</span>
            </div>
          </div>
          <div className="period-switch" style={{ marginBottom: 10 }}>
            <button type="button" className={metrica === 'sesiones' ? 'is-active' : ''} onClick={() => setMetrica('sesiones')}>Sesiones</button>
            <button type="button" className={metrica === 'minutos' ? 'is-active' : ''} onClick={() => setMetrica('minutos')}>Minutos</button>
          </div>
          <GraficaLinea
            valores={valores}
            etiquetas={etiquetas}
            unidad={metrica === 'sesiones' ? 'sesiones' : 'min'}
            descripcion={metrica === 'sesiones' ? 'Sesiones por semana' : 'Minutos por semana'}
          />
          <div className="legend"><span><i />{metrica === 'sesiones' ? 'Sesiones' : 'Minutos'} por semana</span></div>
        </section>

        <section className="panel chart-card">
          <div className="chart-head">
            <div>
              <h3>Reparto muscular</h3>
              <p>Volumen registrado por grupo</p>
            </div>
            <div className="chart-total">
              <strong>{numero(volumenTotal / 1000)} t</strong>
              <span>total</span>
            </div>
          </div>
          <div className="muscle-bars">
            {stats.volumenPorMusculo.map((m) => {
              const kg = Number(m.volumen || 0)
              const pct = volumenTotal ? Math.round((kg / volumenTotal) * 100) : 0
              return (
                <div className="muscle-row" key={m.musculo} title={`${numero(kg)} kg · ${m.series} series`}>
                  <span>{m.musculo}</span>
                  <span className="muscle-track"><span className="muscle-fill" style={{ width: `${(kg / maxVolumen) * 100}%` }} /></span>
                  <span>{pct}%</span>
                </div>
              )
            })}
          </div>
          <div className="side-note" style={{ marginTop: 16 }}>
            <h4>Lectura rápida</h4>
            <p>El porcentaje es sobre el volumen total registrado. Sirve para ver qué grupos estás trabajando más, no para comparar semanas distintas.</p>
          </div>
        </section>
      </div>

      <div className="chart-grid">
        <section className="panel chart-card">
          <div className="chart-head">
            <div>
              <h3>Entrenamientos por día</h3>
              <p>Desde que empezaste</p>
            </div>
            <span className="tag tag-ink">{stats.totalEntrenamientos} total</span>
          </div>
          <div className="muscle-bars">
            {stats.diasSemana.map((count, i) => (
              <div className="muscle-row" key={stats.nombresDias[i]}>
                <span>{stats.nombresDias[i].slice(0, 3)}</span>
                <span className="muscle-track"><span className="muscle-fill" style={{ width: `${(count / maxDia) * 100}%` }} /></span>
                <span>{count}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="panel">
          <div className="panel-head"><h3>Resumen general</h3></div>
          <div className="settings-list">
            <div className="setting-row">
              <span className="setting-icon"><Icon nombre="clock" /></span>
              <div className="setting-copy"><strong>{formatearTiempo(stats.tiempoTotal)}</strong><small>Tiempo total entrenado</small></div>
            </div>
            <div className="setting-row">
              <span className="setting-icon"><Icon nombre="calendar" /></span>
              <div className="setting-copy"><strong>{stats.rachas.semanasCompletadas} semanas</strong><small>Con al menos una sesión</small></div>
            </div>
            <div className="setting-row">
              <span className="setting-icon"><Icon nombre="rotate" /></span>
              <div className="setting-copy"><strong>{stats.descansos.promedio} días</strong><small>Descanso medio entre sesiones</small></div>
            </div>
            <div className="setting-row">
              <span className="setting-icon"><Icon nombre="flame" /></span>
              <div className="setting-copy"><strong>{stats.rachas.mejorRacha} semanas</strong><small>Mejor racha semanal</small></div>
            </div>
          </div>
        </section>
      </div>

      <section className="panel">
        <div className="panel-head">
          <h3>Historial reciente</h3>
          <button className="panel-link" type="button" onClick={exportar} disabled={!sesiones.length}>
            Descargar CSV <Icon nombre="arrow-right" />
          </button>
        </div>
        {sesiones.length === 0 ? (
          <p className="panel-loading">Todavía no hay sesiones terminadas.</p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>Fecha</th><th>Rutina</th><th>Duración</th><th>Horario</th><th>Estado</th></tr>
              </thead>
              <tbody>
                {sesiones.slice(0, 12).map((s) => (
                  <tr key={s.id}>
                    <td><strong>{fechaCorta(s.fecha)}</strong></td>
                    <td>{s.rutina_nombre || 'Entrenamiento libre'}</td>
                    <td>{formatearTiempo(s.duracion_minutos)}</td>
                    <td className="muted-cell">{s.hora_inicio && s.hora_fin ? `${s.hora_inicio} – ${s.hora_fin}` : '—'}</td>
                    <td>
                      <span className={`tag ${s.finalizada ? 'tag-green' : 'tag-yellow'}`}>
                        {s.finalizada ? 'Finalizada' : 'En curso'}
                      </span>
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
