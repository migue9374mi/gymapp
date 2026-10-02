import { useState, useEffect, useRef } from 'react'
import api, { urlImagen, mensajeDeError } from '../api/axios'
import { MUSCULOS } from './Rutinas'

export default function Fotos() {
  const [fotos, setFotos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [exito, setExito] = useState('')
  const [subiendo, setSubiendo] = useState(false)

  const [archivo, setArchivo] = useState(null)
  const [vistaPrevia, setVistaPrevia] = useState('')
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10))
  const [nota, setNota] = useState('')
  const [musculo, setMusculo] = useState('general')

  const [vista, setVista] = useState(null) // foto abierta en grande
  const inputRef = useRef(null)

  const cargar = async () => {
    try {
      const res = await api.get('/fotos')
      setFotos(res.data.fotos)
    } catch (err) {
      setError(mensajeDeError(err, 'Error al cargar las fotos'))
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    cargar()
  }, [])

  const elegirArchivo = (e) => {
    const f = e.target.files?.[0]
    if (!f) return

    // Comprobamos el tipo antes de subir para dar feedback inmediato
    if (!f.type.startsWith('image/')) {
      setError('Solo se permiten imagenes')
      return
    }
    if (f.size > 8 * 1024 * 1024) {
      setError('La imagen no puede pesar mas de 8 MB')
      return
    }

    setError('')
    setArchivo(f)
    setVistaPrevia(URL.createObjectURL(f))
  }

  const subir = async (e) => {
    e.preventDefault()
    if (!archivo) {
      setError('Elige una imagen primero')
      return
    }

    setSubiendo(true)
    setError('')

    const datos = new FormData()
    datos.append('foto', archivo)
    datos.append('fecha', fecha)
    datos.append('nota', nota)
    datos.append('musculo', musculo)

    try {
      const res = await api.post('/fotos', datos, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setExito(res.data.message)
      setTimeout(() => setExito(''), 3000)

      setArchivo(null)
      setVistaPrevia('')
      setNota('')
      if (inputRef.current) inputRef.current.value = ''
      cargar()
    } catch (err) {
      setError(mensajeDeError(err, 'Error al subir la foto'))
    } finally {
      setSubiendo(false)
    }
  }

  const eliminar = async (foto) => {
    if (!window.confirm('¿Eliminar esta foto?')) return
    try {
      await api.delete(`/fotos/${foto.id}`)
      cargar()
    } catch (err) {
      setError(mensajeDeError(err, 'Error al eliminar'))
    }
  }

  // Navegar entre fotos con las flechas del teclado
  const mover = (paso) => {
    const i = fotos.findIndex((f) => f.id === vista.id)
    const siguiente = fotos[(i + paso + fotos.length) % fotos.length]
    setVista(siguiente)
  }

  return (
    <div className="container py-4">
      <div className="mb-4">
        <h1 className="fw-bold" style={{ color: '#1a1a2e' }}>Fotos de progreso</h1>
        <p className="text-muted">Sube tus fotos para ver los cambios con el tiempo</p>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {exito && <div className="alert alert-success"><i className="bi bi-check-circle me-2"></i>{exito}</div>}

      <div className="row g-4">
        {/* Subir */}
        <div className="col-lg-4">
          <div className="dashboard-card">
            <h5 className="fw-bold mb-3"><i className="bi bi-camera me-2"></i>Subir foto</h5>

            <form onSubmit={subir}>
              <div className="mb-3">
                <label className="form-label">Imagen</label>
                <input
                  ref={inputRef}
                  type="file"
                  className="form-control"
                  accept="image/*"
                  onChange={elegirArchivo}
                />
                <small className="text-muted">jpg, png, webp o gif. Maximo 8 MB.</small>
              </div>

              {vistaPrevia && (
                <div className="mb-3">
                  <img
                    src={vistaPrevia}
                    alt="Vista previa"
                    className="img-fluid rounded w-100"
                    style={{ maxHeight: '220px', objectFit: 'cover' }}
                  />
                </div>
              )}

              <div className="mb-3">
                <label className="form-label">Fecha</label>
                <input type="date" className="form-control" value={fecha}
                  onChange={(e) => setFecha(e.target.value)} />
              </div>

              <div className="mb-3">
                <label className="form-label">Grupo muscular</label>
                <select className="form-select" value={musculo}
                  onChange={(e) => setMusculo(e.target.value)}>
                  <option value="general">General / cuerpo entero</option>
                  {MUSCULOS.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>

              <div className="mb-3">
                <label className="form-label">Nota</label>
                <textarea
                  className="form-control"
                  rows="2"
                  value={nota}
                  onChange={(e) => setNota(e.target.value)}
                  placeholder="Ej: 70kg, primer mes con esta rutina"
                />
              </div>

              <button type="submit" className="btn btn-primary w-100" disabled={subiendo}>
                {subiendo ? (
                  <><span className="spinner-border spinner-border-sm me-2"></span>Subiendo...</>
                ) : (
                  <><i className="bi bi-upload me-2"></i>Subir foto</>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Galeria */}
        <div className="col-lg-8">
          {cargando ? (
            <div className="text-center py-5">
              <div className="spinner-border text-danger" role="status"></div>
            </div>
          ) : fotos.length === 0 ? (
            <div className="dashboard-card text-center py-5">
              <p className="fs-1 mb-2">📷</p>
              <h5 className="fw-bold">Aun no tienes fotos</h5>
              <p className="text-muted mb-0">
                Sube tu primera foto y empieza a documentar tu progreso
              </p>
            </div>
          ) : (
            <div className="row g-3">
              {fotos.map((f) => (
                <div className="col-md-6 col-xl-4" key={f.id}>
                  <div className="card h-100">
                    <div
                      className="position-relative"
                      style={{ height: '180px', overflow: 'hidden', cursor: 'pointer' }}
                      onClick={() => setVista(f)}
                    >
                      <img
                        src={urlImagen(f.archivo)}
                        alt={f.nota || f.nombre}
                        className="w-100 h-100"
                        style={{ objectFit: 'cover' }}
                      />
                      <span className="badge bg-dark position-absolute bottom-0 start-0 m-2">
                        {f.fecha}
                      </span>
                    </div>
                    <div className="card-body py-2">
                      <div className="d-flex justify-content-between align-items-start">
                        <div className="flex-grow-1">
                          {f.nota && <div className="small fw-semibold">{f.nota}</div>}
                          {f.musculo && f.musculo !== 'general' && (
                            <span className="badge bg-light text-dark border text-capitalize">{f.musculo}</span>
                          )}
                        </div>
                        <button
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => eliminar(f)}
                          title="Eliminar"
                        >
                          <i className="bi bi-trash"></i>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Visor de imagen */}
      {vista && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
          style={{ background: 'rgba(0,0,0,0.92)', zIndex: 1050 }}
          onClick={() => setVista(null)}
        >
          <button
            className="btn btn-light position-absolute top-0 end-0 m-3"
          >
            <i className="bi bi-x-lg"></i>
          </button>

          {fotos.length > 1 && (
            <>
              <button
                className="btn btn-light position-absolute start-0 m-3"
                style={{ fontSize: '1.5rem' }}
                onClick={(e) => { e.stopPropagation(); mover(-1) }}
              >
                <i className="bi bi-chevron-left"></i>
              </button>
              <button
                className="btn btn-light position-absolute end-0 m-3 me-5"
                style={{ fontSize: '1.5rem' }}
                onClick={(e) => { e.stopPropagation(); mover(1) }}
              >
                <i className="bi bi-chevron-right"></i>
              </button>
            </>
          )}

          <div className="text-center" style={{ maxWidth: '90vw' }} onClick={(e) => e.stopPropagation()}>
            <img
              src={urlImagen(vista.archivo)}
              alt={vista.nota}
              className="img-fluid rounded"
              style={{ maxHeight: '75vh' }}
            />
            <div className="text-white mt-3">
              <div className="fw-bold">{vista.nota || vista.nombre}</div>
              <small className="opacity-75">
                {vista.fecha}
                {vista.musculo && vista.musculo !== 'general' && ` · ${vista.musculo}`}
              </small>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}