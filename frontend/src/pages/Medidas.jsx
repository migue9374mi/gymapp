import { useEffect, useMemo, useRef, useState } from 'react'
import api, { mensajeDeError } from '../api/axios'
import Icon from '../components/Icon'
import {
  PageHead,
  TabsProgreso,
  GraficaLinea,
  Sparkline,
  Avisos,
  fechaCorta,
  fechaHoyLocal,
} from '../components/ui'

const MUSCULOS = [
  { id: 'brazo', label: 'Brazo' },
  { id: 'antebrazo', label: 'Antebrazo' },
  { id: 'pecho', label: 'Pecho' },
  { id: 'cintura', label: 'Cintura' },
  { id: 'cadera', label: 'Cadera' },
  { id: 'muslo', label: 'Muslo' },
  { id: 'gemelo', label: 'Gemelo' },
  { id: 'pierna', label: 'Pierna' },
  { id: 'clavicular', label: 'Clavicular' },
  { id: 'hombro', label: 'Hombro' },
  { id: 'espalda', label: 'Espalda' },
  { id: 'cuello', label: 'Cuello' },
]

function decimal(valor) {
  if (valor === null || valor === undefined || valor === '') return '—'
  return Number(valor).toLocaleString('es-ES', { maximumFractionDigits: 1 })
}

function diferencia(serie) {
  if (serie.length < 2) return null
  const d = serie[serie.length - 1] - serie[0]
  const signo = d > 0 ? '+' : d < 0 ? '−' : ''
  return `${signo}${Math.abs(d).toFixed(1).replace('.', ',')}`
}

function TarjetaMedida({ etiqueta, valor, unidad, delta, serie }) {
  return (
    <article className="measure-card">
      <span>{etiqueta}</span>
      <strong>{valor} <small>{unidad}</small></strong>
      {delta && <span className="delta">{delta}</span>}
      <Sparkline valores={serie} />
    </article>
  )
}

export default function Medidas() {
  const [medidas, setMedidas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [exito, setExito] = useState('')
  const [guardando, setGuardando] = useState(false)

  const [fecha, setFecha] = useState(fechaHoyLocal())
  const [peso, setPeso] = useState('')
  const [altura, setAltura] = useState('')
  const [medidasMusculo, setMedidasMusculo] = useState({})
  const formRef = useRef(null)

  useEffect(() => {
    cargarMedidas()
  }, [])

  const cargarMedidas = async () => {
    try {
      const res = await api.get('/medidas')
      setMedidas(res.data.medidas || [])
    } catch (err) {
      setError(mensajeDeError(err, 'Error al cargar medidas'))
    } finally {
      setCargando(false)
    }
  }

  const handleGuardar = async (e) => {
    e.preventDefault()
    setError('')
    setExito('')
    setGuardando(true)

    try {
      const res = await api.post('/medidas', {
        fecha,
        peso: parseFloat(peso),
        altura: parseFloat(altura),
        medidas: medidasMusculo,
      })
      setExito(`Medidas guardadas. Tu IMC es ${res.data.imc} (${res.data.categoria.categoria})`)
      setPeso('')
      setAltura('')
      setMedidasMusculo({})
      cargarMedidas()
    } catch (err) {
      setError(mensajeDeError(err, 'Error al guardar medidas'))
    } finally {
      setGuardando(false)
    }
  }

  const handleEliminar = async (id) => {
    if (!window.confirm('¿Eliminar este registro de medidas?')) return
    try {
      await api.delete(`/medidas/${id}`)
      cargarMedidas()
    } catch (err) {
      setError(mensajeDeError(err, 'Error al eliminar'))
    }
  }

  const cronologico = useMemo(() => [...medidas].reverse(), [medidas])
  const ultima = medidas[0]
  const anterior = medidas[1]

  const seriePeso = cronologico.slice(-8).map((m) => Number(m.peso))
  const etiquetasPeso = cronologico.slice(-8).map((m) => fechaCorta(m.fecha))

  const cintura = cronologico
    .map((m) => ({ fecha: m.fecha, valor: m.medidas?.find((x) => x.musculo === 'cintura')?.valor }))
    .filter((x) => x.valor != null)

  const brazo = cronologico
    .map((m) => ({ fecha: m.fecha, valor: m.medidas?.find((x) => x.musculo === 'brazo')?.valor }))
    .filter((x) => x.valor != null)

  const medidaExtra = cintura.length
    ? { etiqueta: 'Cintura', unidad: 'cm', serie: cintura.slice(-8).map((x) => Number(x.valor)), actual: cintura[cintura.length - 1].valor }
    : brazo.length
      ? { etiqueta: 'Brazo', unidad: 'cm', serie: brazo.slice(-8).map((x) => Number(x.valor)), actual: brazo[brazo.length - 1].valor }
      : null

  const compararMusculo = (musculo) => {
    if (!ultima || !anterior) return null
    const actual = ultima.medidas.find((m) => m.musculo === musculo)
    const prev = anterior.medidas.find((m) => m.musculo === musculo)
    if (!actual || !prev) return null
    const diff = actual.valor - prev.valor
    return { diff: diff.toFixed(1), color: diff > 0 ? 'var(--green)' : diff < 0 ? 'var(--red)' : 'var(--muted)' }
  }

  if (cargando) {
    return (
      <>
        <PageHead eyebrow="Progreso · composición corporal" titulo="Tus medidas" />
        <div className="loading-panel" role="status"><span className="loading-dot" /><span>Leyendo tus medidas…</span></div>
      </>
    )
  }

  return (
    <>
      <PageHead
        eyebrow="Progreso · composición corporal"
        titulo="Tus medidas"
        sub="Mide siempre en las mismas condiciones: por la mañana, en ayunas y después de ir al baño."
      >
        <button className="btn btn-primary" type="button" onClick={() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
          <Icon nombre="plus" /> Añadir medida
        </button>
      </PageHead>

      <TabsProgreso activo="medidas" />
      <Avisos error={error} exito={exito} />

      <div className="measure-grid">
        <TarjetaMedida
          etiqueta="Peso"
          valor={ultima ? decimal(ultima.peso) : '—'}
          unidad="kg"
          delta={seriePeso.length > 1 ? `${diferencia(seriePeso)} kg en ${seriePeso.length} registros` : null}
          serie={seriePeso}
        />
        <TarjetaMedida
          etiqueta="Altura"
          valor={ultima ? decimal(ultima.altura) : '—'}
          unidad="cm"
          delta={ultima ? 'Medida estable' : null}
          serie={cronologico.slice(-8).map((m) => Number(m.altura))}
        />
        <TarjetaMedida
          etiqueta="IMC"
          valor={ultima ? decimal(ultima.imc) : '—'}
          unidad=""
          delta={ultima?.categoria?.categoria || null}
          serie={cronologico.slice(-8).map((m) => Number(m.imc))}
        />
        {medidaExtra ? (
          <TarjetaMedida
            etiqueta={medidaExtra.etiqueta}
            valor={decimal(medidaExtra.actual)}
            unidad={medidaExtra.unidad}
            delta={medidaExtra.serie.length > 1 ? `${diferencia(medidaExtra.serie)} ${medidaExtra.unidad}` : null}
            serie={medidaExtra.serie}
          />
        ) : (
          <TarjetaMedida etiqueta="Cintura" valor="—" unidad="cm" serie={[]} />
        )}
      </div>

      <div className="chart-grid">
        <section className="panel chart-card">
          <div className="chart-head">
            <div>
              <h3>Evolución del peso</h3>
              <p>Últimas {Math.min(medidas.length, 8)} mediciones</p>
            </div>
            <div className="chart-total">
              <strong>{ultima ? `${decimal(ultima.peso)} kg` : '—'}</strong>
              <span>{seriePeso.length > 1 ? `${diferencia(seriePeso)} kg` : 'sin comparación'}</span>
            </div>
          </div>
          <GraficaLinea
            valores={seriePeso}
            etiquetas={etiquetasPeso}
            unidad="kg"
            descripcion="Evolución del peso corporal"
          />
          <div className="legend"><span><i />Peso corporal (kg)</span></div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <h3>Historial de medidas</h3>
            <span className="tag tag-ink">{medidas.length} registros</span>
          </div>
          {medidas.length === 0 ? (
            <p className="panel-loading">Aún no hay medidas. Registra la primera abajo.</p>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Fecha</th><th>Peso</th><th>Altura</th><th>IMC</th><th>Categoría</th><th></th></tr></thead>
                <tbody>
                  {medidas.map((m) => (
                    <tr key={m.id}>
                      <td><strong>{fechaCorta(m.fecha)}</strong></td>
                      <td>{decimal(m.peso)} kg</td>
                      <td>{decimal(m.altura)} cm</td>
                      <td><strong>{decimal(m.imc)}</strong></td>
                      <td>
                        <span className="tag" style={{ background: m.categoria?.color, color: '#fff' }}>
                          {m.categoria?.categoria || '—'}
                        </span>
                      </td>
                      <td>
                        <button className="icon-btn icon-btn--danger" type="button" onClick={() => handleEliminar(m.id)} title="Eliminar registro">
                          <Icon nombre="trash" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {ultima?.medidas?.length > 0 && (
        <section className="panel">
          <div className="panel-head">
            <h3>Medidas corporales</h3>
            <span className="tag tag-ink">Actualizado {fechaCorta(ultima.fecha)}</span>
          </div>
          <div className="body-measures">
            {ultima.medidas.map((m) => {
              const cambio = compararMusculo(m.musculo)
              const label = MUSCULOS.find((x) => x.id === m.musculo)?.label || m.musculo
              return (
                <div className="body-measure" key={m.musculo}>
                  <span>{label}</span>
                  <strong>{decimal(m.valor)} <small>cm</small></strong>
                  {cambio && cambio.diff !== '0.0' && (
                    <small style={{ color: cambio.color }}>{Number(cambio.diff) > 0 ? '+' : ''}{cambio.diff}</small>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      )}

      <section className="panel measure-form-panel" ref={formRef}>
        <div className="panel-head">
          <h3>Registrar medidas</h3>
          <span className="tag tag-lime">Nuevo registro</span>
        </div>
        <form className="measure-form" onSubmit={handleGuardar}>
          <div className="inline-form">
            <div className="field">
              <label htmlFor="medida-fecha">Fecha</label>
              <input id="medida-fecha" type="date" className="form-control" value={fecha} onChange={(e) => setFecha(e.target.value)} required />
            </div>
            <div className="field">
              <label htmlFor="medida-peso">Peso (kg)</label>
              <input id="medida-peso" type="number" step="0.1" min="1" className="form-control" value={peso}
                onChange={(e) => setPeso(e.target.value)} placeholder="70.5" required />
            </div>
            <div className="field">
              <label htmlFor="medida-altura">Altura (cm)</label>
              <input id="medida-altura" type="number" step="0.1" min="50" className="form-control" value={altura}
                onChange={(e) => setAltura(e.target.value)} placeholder="175" required />
            </div>
          </div>

          <div className="form-section">
            <span className="field-label">Medidas corporales (cm) <span className="optional">opcional</span></span>
            <div className="measure-input-grid">
              {MUSCULOS.map((m) => (
                <label className="measure-input" key={m.id}>
                  <span>{m.label}</span>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    className="form-control"
                    value={medidasMusculo[m.id] || ''}
                    onChange={(e) => setMedidasMusculo({ ...medidasMusculo, [m.id]: e.target.value })}
                    placeholder="—"
                  />
                </label>
              ))}
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={guardando}>
              {guardando ? <><span className="mini-spinner" /> Guardando…</> : <><Icon nombre="check" /> Guardar medidas</>}
            </button>
            <span className="helper-copy">Puedes dejar en blanco las medidas que no hayas tomado.</span>
          </div>
        </form>
      </section>

      <aside className="side-note">
        <h4>La báscula no lo cuenta todo</h4>
        <p>El peso puede subir sin que ganes grasa. Fíjate en la tendencia de cuatro semanas y en cómo te queda la ropa, no en el número de un día suelto.</p>
      </aside>
    </>
  )
}
