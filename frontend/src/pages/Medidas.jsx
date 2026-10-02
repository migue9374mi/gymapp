import { useState, useEffect } from 'react'
import api, { mensajeDeError } from '../api/axios'

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

export default function Medidas() {
  const [medidas, setMedidas] = useState([])
  const [musculos, setMusculos] = useState(MUSCULOS.map((m) => m.id))
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [exito, setExito] = useState('')
  const [guardando, setGuardando] = useState(false)

  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0])
  const [peso, setPeso] = useState('')
  const [altura, setAltura] = useState('')
  const [medidasMusculo, setMedidasMusculo] = useState({})

  useEffect(() => {
    cargarMedidas()
  }, [])

  const cargarMedidas = async () => {
    try {
      const res = await api.get('/medidas')
      setMedidas(res.data.medidas)
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

  if (cargando) {
    return (
      <div className="container py-5 text-center">
        <div className="spinner-border text-danger" role="status"></div>
      </div>
    )
  }

  const ultima = medidas[0]
  const anterior = medidas[1]

  // Comparar musculos con la medida anterior
  const compararMusculo = (musculo) => {
    if (!ultima || !anterior) return null
    const actual = ultima.medidas.find((m) => m.musculo === musculo)
    const prev = anterior.medidas.find((m) => m.musculo === musculo)
    if (!actual || !prev) return null
    const diff = actual.valor - prev.valor
    return { diff: diff.toFixed(1), color: diff > 0 ? '#00b894' : diff < 0 ? '#e94560' : '#6c757d' }
  }

  return (
    <div className="container py-4">
      <div className="mb-4">
        <h1 className="fw-bold" style={{ color: '#1a1a2e' }}>Medidas e IMC</h1>
        <p className="text-muted">Registra tu peso, altura y medidas corporales para ver tu evolucion</p>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {exito && <div className="alert alert-success"><i className="bi bi-check-circle me-2"></i>{exito}</div>}

      {ultima && (
        <div className="dashboard-card mb-4">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h5 className="fw-bold mb-0">Tu estado actual</h5>
            <small className="text-muted">Actualizado: {ultima.fecha}</small>
          </div>

          <div className="row g-3">
            <div className="col-md-3 col-6">
              <div className="text-center p-3 rounded" style={{ background: '#f8f9fa' }}>
                <div className="fs-3 fw-bold text-primary">{ultima.peso} kg</div>
                <small className="text-muted">Peso</small>
              </div>
            </div>
            <div className="col-md-3 col-6">
              <div className="text-center p-3 rounded" style={{ background: '#f8f9fa' }}>
                <div className="fs-3 fw-bold text-info">{ultima.altura} cm</div>
                <small className="text-muted">Altura</small>
              </div>
            </div>
            <div className="col-md-3 col-6">
              <div className="text-center p-3 rounded" style={{ background: '#f8f9fa' }}>
                <div className="fs-3 fw-bold" style={{ color: ultima.categoria.color }}>
                  {ultima.imc}
                </div>
                <small className="text-muted">IMC</small>
              </div>
            </div>
            <div className="col-md-3 col-6">
              <div className="text-center p-3 rounded" style={{ background: ultima.categoria.color + '20' }}>
                <div className="fs-6 fw-bold" style={{ color: ultima.categoria.color }}>
                  {ultima.categoria.categoria}
                </div>
                <small className="text-muted">Categoria</small>
              </div>
            </div>
          </div>

          {ultima.medidas.length > 0 && (
            <div className="mt-4 pt-3 border-top">
              <h6 className="fw-bold mb-3">Medidas corporales</h6>
              <div className="row g-2">
                {ultima.medidas.map((m) => {
                  const cambio = compararMusculo(m.musculo)
                  const label = MUSCULOS.find((x) => x.id === m.musculo)?.label || m.musculo
                  return (
                    <div key={m.id} className="col-md-3 col-6">
                      <div className="d-flex justify-content-between p-2 rounded" style={{ background: '#f8f9fa' }}>
                        <span className="text-muted">{label}</span>
                        <span className="fw-semibold">
                          {m.valor} cm
                          {cambio && cambio.diff !== '0.0' && (
                            <small style={{ color: cambio.color, marginLeft: '4px' }}>
                              ({cambio.diff > 0 ? '+' : ''}{cambio.diff})
                            </small>
                          )}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="dashboard-card mb-4">
        <h5 className="fw-bold mb-3"><i className="bi bi-plus-circle me-2"></i>Registrar medidas</h5>
        <form onSubmit={handleGuardar}>
          <div className="row g-3 mb-3">
            <div className="col-md-4">
              <label className="form-label">Fecha</label>
              <input type="date" className="form-control" value={fecha} onChange={(e) => setFecha(e.target.value)} required />
            </div>
            <div className="col-md-4">
              <label className="form-label">Peso (kg)</label>
              <input type="number" step="0.1" min="1" className="form-control" value={peso}
                onChange={(e) => setPeso(e.target.value)} placeholder="70.5" required />
            </div>
            <div className="col-md-4">
              <label className="form-label">Altura (cm)</label>
              <input type="number" step="0.1" min="50" className="form-control" value={altura}
                onChange={(e) => setAltura(e.target.value)} placeholder="175" required />
            </div>
          </div>

          <div className="mb-3">
            <label className="form-label fw-semibold">Medidas corporales (cm) <small className="text-muted">(opcional)</small></label>
            <div className="row g-2">
              {MUSCULOS.map((m) => (
                <div key={m.id} className="col-md-3 col-6">
                  <div className="input-group input-group-sm">
                    <span className="input-group-text">{m.label}</span>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      className="form-control"
                      value={medidasMusculo[m.id] || ''}
                      onChange={(e) => setMedidasMusculo({ ...medidasMusculo, [m.id]: e.target.value })}
                      placeholder="--"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button type="submit" className="btn btn-primary" disabled={guardando}>
            {guardando ? (
              <><span className="spinner-border spinner-border-sm me-2"></span>Guardando...</>
            ) : (
              <><i className="bi bi-check-lg me-2"></i>Guardar medidas</>
            )}
          </button>
        </form>
      </div>

      {medidas.length > 0 && (
        <div className="dashboard-card">
          <h5 className="fw-bold mb-3">Historial</h5>
          <div className="table-responsive">
            <table className="table align-middle">
              <thead>
                <tr className="text-muted">
                  <th>Fecha</th>
                  <th>Peso</th>
                  <th>Altura</th>
                  <th>IMC</th>
                  <th>Categoria</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {medidas.map((m) => (
                  <tr key={m.id}>
                    <td>{m.fecha}</td>
                    <td>{m.peso} kg</td>
                    <td>{m.altura} cm</td>
                    <td className="fw-bold" style={{ color: m.categoria.color }}>{m.imc}</td>
                    <td>
                      <span className="badge" style={{ background: m.categoria.color, color: 'white' }}>
                        {m.categoria.categoria}
                      </span>
                    </td>
                    <td className="text-end">
                      <button className="btn btn-sm btn-outline-danger" onClick={() => handleEliminar(m.id)}>
                        <i className="bi bi-trash"></i>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}