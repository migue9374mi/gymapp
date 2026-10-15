import { useState, useRef } from 'react'
import api, { mensajeDeError, urlImagen, urlFondo } from '../api/axios'
import { esAppNativa, hacerFoto, validarImagen } from '../nativa/camara'
import { aplicarFondo, ajusteFondo, guardarAjusteFondo } from './FondoApp'
import { useAuth } from '../context/AuthContext'

/**
 * Permite elegir la imagen de fondo de la app.
 *
 * En el movil se abre la camara; en la web, el selector de archivos de
 * siempre. El deslizador controla cuanta se ve, que hace falta porque hay
 * fotos con las que el texto no se lee.
 */
export default function FondoUsuario() {
  const { user, actualizarUsuario } = useAuth()

  const [archivo, setArchivo] = useState(null)
  const [vistaPrevia, setVistaPrevia] = useState('')
  const [opacidad, setOpacidad] = useState(user?.fondo_opacidad ?? 0.35)
  const [error, setError] = useState('')
  const [exito, setExito] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [ajuste, setAjuste] = useState(ajusteFondo())
  const inputRef = useRef(null)

  const fondoActual = user?.fondo
  const nativa = esAppNativa()

  const fin = () => {
    setArchivo(null)
    setVistaPrevia('')
    if (inputRef.current) inputRef.current.value = ''
  }

  const mostrar = (mensaje) => {
    setExito(mensaje)
    setTimeout(() => setExito(''), 4000)
  }

  const preparar = (f) => {
    if (!f) return
    const problema = validarImagen(f)
    if (problema) {
      setError(problema)
      return
    }
    setError('')
    setArchivo(f)
    setVistaPrevia(URL.createObjectURL(f))
  }

  const elegirArchivo = (e) => preparar(e.target.files?.[0])

  const abrirCamara = async () => {
    try {
      setError('')
      // El fondo se ve a pantalla completa, asi que sobra con 1920 px
      const f = await hacerFoto({ anchoMaximo: 1920 })
      if (f) preparar(f)
    } catch (err) {
      if (cancelado(err)) return
      setError(err?.message || 'No se pudo abrir la camara')
    }
  }

  /** Si el usuario cierra la pantalla sin elegir, no es un error que contar. */
  const cancelado = (err) => /cancel/i.test(String(err?.message || ''))

  const subir = async (e) => {
    e.preventDefault()
    if (!archivo) {
      setError('Elige una imagen primero')
      return
    }

    setOcupado(true)
    setError('')

    const datos = new FormData()
    datos.append('fondo', archivo)
    datos.append('opacidad', String(opacidad))

    try {
      const res = await api.post('/fondo', datos, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      // Se aplica al momento, sin esperar a recargar
      actualizarUsuario({ fondo: res.data.fondo, fondo_opacidad: res.data.fondo_opacidad })
      aplicarFondo(res.data.fondo, res.data.fondo_opacidad)
      mostrar('Fondo cambiado')
      fin()
    } catch (err) {
      setError(mensajeDeError(err, 'Error al subir el fondo'))
    } finally {
      setOcupado(false)
    }
  }

  // El deslizador va directo a la base de datos: asi la preferencia vale
  // tambien en el movil y en cualquier navegador donde entres
  const cambiarOpacidad = async (valor) => {
    setOpacidad(valor)
    aplicarFondo(fondoActual, valor)
    if (!fondoActual) return

    try {
      const res = await api.put('/fondo/opacidad', { opacidad: valor })
      actualizarUsuario({ fondo_opacidad: res.data.fondo_opacidad })
    } catch (err) {
      setError(mensajeDeError(err, 'No se pudo guardar la intensidad'))
    }
  }

  const cambiarAjuste = (valor) => {
    setAjuste(valor)
    guardarAjusteFondo(valor)
  }

  const quitar = async () => {
    if (!window.confirm('¿Quitar la imagen de fondo?')) return
    setOcupado(true)
    setError('')
    try {
      await api.delete('/fondo')
      actualizarUsuario({ fondo: null, fondo_opacidad: 0.35 })
      aplicarFondo(null)
      fin()
      setOpacidad(0.35)
      mostrar('Fondo quitado')
    } catch (err) {
      setError(mensajeDeError(err, 'Error al quitar el fondo'))
    } finally {
      setOcupado(false)
    }
  }

  return (
    <div className="dashboard-card mb-4">
      <h5 className="fw-bold mb-1">
        <i className="bi bi-image me-2"></i>Fondo de la app
      </h5>
      <p className="text-muted small mb-3">
        Elige la imagen que quieras ver de fondo. Cada persona ve la suya.
      </p>

      {error && <div className="alert alert-danger py-2">{error}</div>}
      {exito && (
        <div className="alert alert-success py-2">
          <i className="bi bi-check-circle me-2"></i>{exito}
        </div>
      )}

      <div className="row g-3">
        {/* Vista previa */}
        <div className="col-md-5">
          <div
            className="rounded overflow-hidden border d-flex align-items-center justify-content-center"
            style={{
              height: '160px',
              background: fondoActual || vistaPrevia ? '#1a1a2e' : '#f1f3f5',
            }}
          >
            {vistaPrevia || fondoActual ? (
              <img
                src={vistaPrevia || urlFondo(fondoActual)}
                alt="Vista previa del fondo"
                className="w-100 h-100"
                style={{ objectFit: 'cover', opacity: 0.9 }}
              />
            ) : (
              <i className="bi bi-image text-muted" style={{ fontSize: '2rem' }}></i>
            )}
          </div>
          {fondoActual && (
            <button
              className="btn btn-sm btn-outline-danger mt-2 w-100"
              onClick={quitar}
              disabled={ocupado}
            >
              <i className="bi bi-trash me-1"></i>Quitar el fondo
            </button>
          )}
        </div>

        {/* Elegir y ajustar */}
        <div className="col-md-7">
          <form onSubmit={subir}>
            <div className="mb-3">
              {/*
                El selector de archivos abre la galeria del telefono tambien
                dentro de la app, y devuelve un File de verdad. Por eso
                "Elegir" es exactamente igual en web y en movil.
              */}
              <label className="form-label small text-muted">Elige una imagen</label>
              <input
                ref={inputRef}
                type="file"
                className="form-control"
                accept="image/*"
                onChange={elegirArchivo}
              />

              {nativa && (
                <button
                  type="button"
                  className="btn btn-outline-primary w-100 mt-2"
                  onClick={abrirCamara}
                >
                  <i className="bi bi-camera me-2"></i>Hacer una foto nueva
                </button>
              )}

              <small className="text-muted">jpg, png o webp. Hasta 12 MB.</small>
            </div>

            <div className="mb-3">
              <label className="form-label small text-muted d-flex justify-content-between">
                <span>Cuanto se ve</span>
                <span>{Math.round(opacidad * 100)}%</span>
              </label>
              <input
                type="range"
                className="form-range"
                min="0.05"
                max="0.95"
                step="0.05"
                value={opacidad}
                onChange={(e) => setOpacidad(parseFloat(e.target.value))}
                onMouseUp={(e) => cambiarOpacidad(parseFloat(e.target.value))}
                onTouchEnd={(e) => cambiarOpacidad(parseFloat(e.target.value))}
                disabled={!fondoActual && !vistaPrevia}
              />
              <small className="text-muted">
                Con menos se ve mejor el texto. Si no se lee, bajalo.
              </small>
            </div>

            {vistaPrevia && (
              <button type="submit" className="btn btn-primary w-100" disabled={ocupado}>
                {ocupado ? (
                  <><span className="spinner-border spinner-border-sm me-2"></span>Guardando...</>
                ) : (
                  <><i className="bi bi-check-lg me-2"></i>Usar esta imagen</>
                )}
              </button>
            )}
          </form>

          {fondoActual && (
            <div className="mt-3 pt-3 border-top">
              <label className="form-label small text-muted">Como se ajusta</label>
              <div className="btn-group w-100" role="group">
                <button
                  type="button"
                  className={`btn btn-sm ${ajuste === 'entera' ? 'btn-primary' : 'btn-outline-secondary'}`}
                  onClick={() => cambiarAjuste('entera')}
                >
                  Verla entera
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${ajuste === 'cubrir' ? 'btn-primary' : 'btn-outline-secondary'}`}
                  onClick={() => cambiarAjuste('cubrir')}
                >
                  Cubrir pantalla
                </button>
              </div>
              <small className="text-muted">
                "Verla entera" no recorta nada. "Cubrir pantalla" recorta por los
                lados hasta llenar el hueco.
              </small>
            </div>
          )}
        </div>
      </div>

      {fondoActual && (
        <small className="text-muted d-block mt-3">
          Imagen actual: <code>{urlImagen(fondoActual).split('/').pop()}</code>
        </small>
      )}
    </div>
  )
}
