import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import api, { mensajeDeError } from '../api/axios'
import useDescanso from '../hooks/useDescanso'
import {
  PRESETS,
  etiquetaRapida,
  formatearDescanso,
  parsearDescanso,
  porcentajeRestante,
} from '../nativa/descansoLogica'
import Icon from './Icon'

// --- Persistencia de la sesion activa ---
const CLAVE_SESION = 'gymapp_sesion_activa'

function leerSesionActiva() {
  try {
    const raw = localStorage.getItem(CLAVE_SESION)
    return raw ? JSON.parse(raw) : null
  } catch (e) {
    return null
  }
}

const ETIQUETA_ESTADO = {
  rojo: 'Sin iniciar',
  amarillo: 'En progreso',
  verde: 'Completado',
}

function formatearCronometro(segundos) {
  const h = Math.floor(segundos / 3600)
  const m = Math.floor((segundos % 3600) / 60)
  const s = segundos % 60
  const pad = (n) => String(n).padStart(2, '0')
  if (h > 0) return `${h}:${pad(m)}:${pad(s)}`
  return `${pad(m)}:${pad(s)}`
}

function numero(valor) {
  return Number(valor || 0).toLocaleString('es-ES', { maximumFractionDigits: 1 })
}

export default function SesionActiva({ sesion, onFinalizada, onSesionCambiada }) {
  const [ejercicioAbierto, setEjercicioAbierto] = useState(null)
  const [error, setError] = useState('')
  const [guardandoSerie, setGuardandoSerie] = useState(null)
  const [borradores, setBorradores] = useState({})

  const {
    estado: estadoDescanso,
    restanteMs,
    totalMs,
    duracionSeg,
    auto: autoDescanso,
    iniciar: iniciarDescanso,
    iniciarAutomatico,
    pausar: pausarDescanso,
    reanudar: reanudarDescanso,
    sumar: sumarDescanso,
    detener: detenerDescanso,
    cambiarDuracion,
    cambiarAuto,
  } = useDescanso(sesion.id)

  const [otroDescanso, setOtroDescanso] = useState('')
  const [errorDescanso, setErrorDescanso] = useState('')

  const [segundos, setSegundos] = useState(() => {
    const g = leerSesionActiva()
    return g?.inicioMs ? Math.floor((Date.now() - g.inicioMs) / 1000) : 0
  })

  useEffect(() => {
    const t = setInterval(() => {
      const g = leerSesionActiva()
      if (g?.inicioMs) setSegundos(Math.floor((Date.now() - g.inicioMs) / 1000))
    }, 1000)
    return () => clearInterval(t)
  }, [])

  const ejercicioSel = sesion.ejercicios.find((e) => e.id === ejercicioAbierto) || null

  const totalSeries = sesion.ejercicios.reduce((t, e) => t + Number(e.series || 0), 0)
  const hechasSeries = sesion.ejercicios.reduce((t, e) => t + (e.series_registradas?.length || 0), 0)
  const porcentaje = totalSeries ? Math.round((hechasSeries / totalSeries) * 100) : 0
  const volumen = sesion.ejercicios.reduce(
    (total, e) => total + (e.series_registradas || []).reduce((t, s) => t + Number(s.peso || 0) * Number(s.reps || e.reps || 0), 0),
    0
  )

  const aplicarOtroDescanso = () => {
    const texto = otroDescanso.trim()
    if (!texto) return
    const segundosNuevos = parsearDescanso(texto)
    if (!segundosNuevos) {
      setErrorDescanso('Escribe los segundos (90) o los minutos (1:30)')
      return
    }
    cambiarDuracion(segundosNuevos)
    setOtroDescanso('')
    setErrorDescanso('')
  }

  const valorBorrador = (ejercicio, numeroSerie, campo) => {
    const registrada = (ejercicio.series_registradas || []).find((s) => s.numero_serie === numeroSerie)
    if (registrada) return registrada[campo] ?? ''
    const clave = `${ejercicio.id}-${numeroSerie}`
    if (borradores[clave]?.[campo] !== undefined) return borradores[clave][campo]
    return campo === 'peso' ? (ejercicio.peso ?? '') : (ejercicio.reps ?? '')
  }

  const cambiarBorrador = (ejercicio, numeroSerie, campo, valor) => {
    const clave = `${ejercicio.id}-${numeroSerie}`
    setBorradores((prev) => ({
      ...prev,
      [clave]: { ...(prev[clave] || {}), [campo]: valor },
    }))
  }

  const registrarSerie = async (ejercicio, numeroSerie) => {
    const peso = valorBorrador(ejercicio, numeroSerie, 'peso')
    const reps = valorBorrador(ejercicio, numeroSerie, 'reps')

    if (peso === '' || peso === null) {
      setError('Escribe el peso de la serie')
      return
    }

    setGuardandoSerie(`${ejercicio.id}-${numeroSerie}`)
    setError('')
    try {
      await api.post(`/entrenamientos/sesiones/${sesion.id}/series`, {
        ejercicio_id: ejercicio.id,
        numero_serie: numeroSerie,
        peso: parseFloat(peso),
        reps: reps ? parseInt(reps) : null,
      })
      onSesionCambiada()
      iniciarAutomatico()
    } catch (err) {
      setError(mensajeDeError(err, 'Error al registrar la serie'))
    } finally {
      setGuardandoSerie(null)
    }
  }

  const borrarSerie = async (ejercicio, numeroSerie) => {
    setGuardandoSerie(`${ejercicio.id}-${numeroSerie}`)
    try {
      await api.delete(`/entrenamientos/sesiones/${sesion.id}/series/${ejercicio.id}/${numeroSerie}`)
      onSesionCambiada()
    } catch (err) {
      setError(mensajeDeError(err, 'Error al borrar la serie'))
    } finally {
      setGuardandoSerie(null)
    }
  }

  const alternarSerie = (ejercicio, numeroSerie, hecha) => {
    if (hecha) borrarSerie(ejercicio, numeroSerie)
    else registrarSerie(ejercicio, numeroSerie)
  }

  const finalizar = async () => {
    const fin = new Date()
    const horaFin = `${String(fin.getHours()).padStart(2, '0')}:${String(fin.getMinutes()).padStart(2, '0')}`

    const guardada = leerSesionActiva()
    const inicioMs = Number(guardada?.inicioMs)
    const duracionMinutos =
      guardada &&
      Number(guardada.id) === Number(sesion.id) &&
      Number.isFinite(inicioMs) &&
      inicioMs > 0
        ? Math.min(24 * 60, Math.max(1, Math.round((fin.getTime() - inicioMs) / 60000)))
        : undefined

    try {
      const res = await api.post(`/entrenamientos/sesiones/${sesion.id}/finalizar`, {
        hora_fin: horaFin,
        duracion_minutos: duracionMinutos,
      })

      let datosFinales = res.data
      if (duracionMinutos !== undefined && Number(res.data.duracion_minutos) !== duracionMinutos) {
        try {
          const inicioAjustado = new Date(fin.getTime() - duracionMinutos * 60000)
          const horaInicioAjustada = `${String(inicioAjustado.getHours()).padStart(2, '0')}:${String(inicioAjustado.getMinutes()).padStart(2, '0')}`
          const corregida = await api.put(`/entrenamientos/sesiones/${sesion.id}`, {
            hora_inicio: horaInicioAjustada,
            hora_fin: horaFin,
          })
          datosFinales = {
            ...res.data,
            duracion_minutos: corregida.data.sesion.duracion_minutos,
            hora_inicio: corregida.data.sesion.hora_inicio,
            hora_fin: corregida.data.sesion.hora_fin,
          }
        } catch (e) {
          // La rutina ya esta finalizada; si falla la correccion, se sigue.
        }
      }

      detenerDescanso()
      onFinalizada(datosFinales)
    } catch (err) {
      setError(mensajeDeError(err, 'Error al finalizar'))
    }
  }

  const incompletos = sesion.ejercicios.filter((e) => e.estado !== 'verde').length

  return (
    <div className={estadoDescanso !== 'inactivo' ? 'sesion-con-descanso' : undefined}>
      <div className="session-bar">
        <div className="session-progress">
          <div className="session-progress-top">
            <span>Progreso de la sesión</span>
            <span>{hechasSeries} / {totalSeries} series</span>
          </div>
          <div className="progress-track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={porcentaje}>
            <div className="progress-fill" style={{ width: `${porcentaje}%` }} />
          </div>
        </div>
        <div className="session-stat">
          <strong>{formatearCronometro(segundos)}</strong>
          <span>Tiempo</span>
        </div>
        <div className="session-stat">
          <strong>{hechasSeries}/{totalSeries}</strong>
          <span>Series</span>
        </div>
        <div className="session-stat">
          <strong>{numero(volumen)}</strong>
          <span>Kg movidos</span>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {incompletos > 0 && (
        <div className="session-alert">
          <Icon nombre="info" />
          <span>Te {incompletos === 1 ? 'falta 1 ejercicio' : `faltan ${incompletos} ejercicios`} por completar. Puedes finalizar igualmente.</span>
        </div>
      )}

      <div className="exercise-list">
        {sesion.ejercicios.map((ej, indice) => {
          const registradas = ej.series_registradas || []
          const hechas = registradas.length
          const completo = hechas >= ej.series
          const abierto = ejercicioAbierto === ej.id
          const estado = completo ? 'done' : abierto ? 'active' : ''

          return (
            <article className={`exercise ${abierto ? 'is-open' : ''}`} key={ej.id}>
              <button
                className="exercise-head"
                type="button"
                onClick={() => setEjercicioAbierto(abierto ? null : ej.id)}
                aria-expanded={abierto}
                aria-controls={`exercise-body-${ej.id}`}
              >
                <span className="exercise-num">{String(indice + 1).padStart(2, '0')}</span>
                <span className="exercise-info">
                  <strong>
                    {ej.nombre}
                    {ej.es_extra === 1 && <span className="mini-tag">EXTRA</span>}
                  </strong>
                  <small>{ej.series} series{ej.reps ? ` · ${ej.reps} reps` : ''} · {ej.musculo}</small>
                </span>
                <span className={`exercise-status ${estado}`}>
                  {completo ? 'Completado' : `${hechas}/${ej.series}`}
                </span>
                <Icon nombre="chevron-down" />
              </button>

              <div className="exercise-body" id={`exercise-body-${ej.id}`} inert={abierto ? undefined : ''}>
                <div className="exercise-body-inner">
                  <div className="set-table">
                    {Array.from({ length: ej.series }, (_, i) => i + 1).map((n) => {
                      const registrada = registradas.find((s) => s.numero_serie === n)
                      const clave = `${ej.id}-${n}`
                      const ocupada = guardandoSerie === clave
                      return (
                        <div className={`set-row ${registrada ? 'is-done' : ''}`} key={n}>
                          <span className="set-index">{String(n).padStart(2, '0')}</span>
                          <div className="set-field">
                            <label htmlFor={`kg-${ej.id}-${n}`}>KG</label>
                            <input
                              id={`kg-${ej.id}-${n}`}
                              type="number"
                              inputMode="decimal"
                              min="0"
                              step="0.5"
                              value={valorBorrador(ej, n, 'peso')}
                              onChange={(e) => cambiarBorrador(ej, n, 'peso', e.target.value)}
                              disabled={Boolean(registrada)}
                              aria-label={`Peso, ${ej.nombre}, serie ${n}`}
                            />
                          </div>
                          <div className="set-field">
                            <label htmlFor={`reps-${ej.id}-${n}`}>REPS</label>
                            <input
                              id={`reps-${ej.id}-${n}`}
                              type="number"
                              inputMode="numeric"
                              min="0"
                              step="1"
                              value={valorBorrador(ej, n, 'reps')}
                              onChange={(e) => cambiarBorrador(ej, n, 'reps', e.target.value)}
                              disabled={Boolean(registrada)}
                              aria-label={`Repeticiones, ${ej.nombre}, serie ${n}`}
                            />
                          </div>
                          <button
                            className="set-check"
                            type="button"
                            onClick={() => alternarSerie(ej, n, Boolean(registrada))}
                            disabled={ocupada}
                            aria-pressed={Boolean(registrada)}
                            aria-label={registrada ? `Borrar serie ${n} de ${ej.nombre}` : `Completar serie ${n} de ${ej.nombre}`}
                            title={registrada ? 'Pulsa para borrar esta serie' : 'Marcar serie como hecha'}
                          >
                            {ocupada ? <span className="mini-spinner" /> : <Icon nombre={registrada ? 'x' : 'check'} />}
                          </button>
                        </div>
                      )
                    })}
                  </div>

                  <div className="exercise-actions">
                    <span className="exercise-note">
                      {completo ? 'Todas las series apuntadas.' : 'Apunta peso y repeticiones al terminar cada serie.'}
                    </span>
                  </div>

                  <div className="descanso-ajustes">
                    <div className="rest-settings-head">
                      <span className="descanso-ajustes__titulo">
                        Descanso entre series
                        <span className="descanso-ajustes__valor"> · {etiquetaRapida(duracionSeg)}</span>
                      </span>
                      <button
                        type="button"
                        className="btn btn-sm btn-warning"
                        onClick={() => iniciarDescanso()}
                        disabled={estadoDescanso === 'corriendo'}
                      >
                        <Icon nombre="pause" />
                        {estadoDescanso === 'corriendo' ? 'En curso' : 'Empezar'}
                      </button>
                    </div>

                    <div className="preset-row">
                      {PRESETS.map((segundos) => (
                        <button
                          key={segundos}
                          type="button"
                          className={`btn btn-sm ${duracionSeg === segundos ? 'btn-ink' : 'btn-ghost'}`}
                          onClick={() => {
                            cambiarDuracion(segundos)
                            setOtroDescanso('')
                            setErrorDescanso('')
                          }}
                          aria-pressed={duracionSeg === segundos}
                        >
                          {etiquetaRapida(segundos)}
                        </button>
                      ))}
                    </div>

                    <div className="rest-custom">
                      <input
                        type="text"
                        inputMode="text"
                        className={`form-control form-control-sm descanso-otro ${errorDescanso ? 'is-invalid' : ''}`}
                        value={otroDescanso}
                        onChange={(e) => {
                          const texto = e.target.value
                          setOtroDescanso(texto)
                          if (errorDescanso) setErrorDescanso('')
                          const segundosNuevos = parsearDescanso(texto)
                          if (segundosNuevos) cambiarDuracion(segundosNuevos)
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            aplicarOtroDescanso()
                          }
                        }}
                        placeholder="Otro: 90 o 1:30"
                        aria-label="Otro tiempo de descanso"
                      />
                      <button type="button" className="btn btn-sm btn-ghost" onClick={aplicarOtroDescanso}>
                        Poner
                      </button>
                    </div>

                    {errorDescanso && <div className="field-error">{errorDescanso}</div>}

                    <label className="auto-rest">
                      <span className="switch">
                        <input
                          type="checkbox"
                          checked={autoDescanso}
                          onChange={(e) => cambiarAuto(e.target.checked)}
                          aria-label="Empezar el descanso al marcar una serie"
                        />
                        <span />
                      </span>
                      <span>Empezar solo al marcar una serie</span>
                    </label>
                  </div>
                </div>
              </div>
            </article>
          )
        })}
      </div>

      <div className="train-actions">
        <button className="btn btn-primary btn-lg" type="button" onClick={finalizar}>
          <Icon nombre="check" /> Finalizar rutina ({formatearCronometro(segundos)})
        </button>
        <span className="exercise-note">La sesión y el descanso siguen activos aunque cambies de pantalla.</span>
      </div>

      {/* Barra fija del descanso. Va en el body para que ningun contenedor
          con transformaciones o scroll la pueda recortar. */}
      {estadoDescanso !== 'inactivo' &&
        createPortal(
          <div
            className={`descanso-barra descanso-barra--${estadoDescanso}${
              estadoDescanso === 'corriendo' && restanteMs <= 10000 ? ' descanso-barra--urgente' : ''
            }`}
          >
            <div className="descanso-barra__fila">
              <div className="descanso-barra__texto">
                <span className="descanso-barra__titulo" role="status" aria-live="polite">
                  {estadoDescanso === 'terminado'
                    ? '¡A entrenar!'
                    : estadoDescanso === 'pausado'
                      ? 'Descanso en pausa'
                      : 'Descanso'}
                </span>
                <span className="descanso-barra__tiempo" aria-hidden="true">
                  {estadoDescanso === 'terminado'
                    ? 'LISTO'
                    : formatearDescanso(Math.ceil(restanteMs / 1000))}
                </span>
              </div>

              <div className="descanso-barra__acciones">
                {(estadoDescanso === 'corriendo' || estadoDescanso === 'pausado') && (
                  <button type="button" className="descanso-barra__btn" onClick={() => sumarDescanso(30)}>
                    +30 s
                  </button>
                )}

                {estadoDescanso === 'corriendo' && (
                  <button type="button" className="descanso-barra__btn" onClick={pausarDescanso} aria-label="Pausar el descanso">
                    <Icon nombre="pause" />
                    <span className="d-none d-sm-inline">Pausa</span>
                  </button>
                )}

                {estadoDescanso === 'pausado' && (
                  <button type="button" className="descanso-barra__btn" onClick={reanudarDescanso}>
                    <Icon nombre="play" />
                    <span>Seguir</span>
                  </button>
                )}

                <button type="button" className="descanso-barra__btn descanso-barra__btn--cerrar" onClick={detenerDescanso}>
                  {estadoDescanso === 'terminado' ? 'Hecho' : 'Saltar'}
                </button>
              </div>
            </div>

            <div className="descanso-barra__progreso" aria-hidden="true">
              <div
                style={{
                  width: `${estadoDescanso === 'terminado' ? 0 : porcentajeRestante(restanteMs, totalMs)}%`,
                }}
              />
            </div>
          </div>,
          document.body
        )}
    </div>
  )
}
