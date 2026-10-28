import { useState, useRef } from 'react'
import api, { mensajeDeError, urlImagen, urlFondo } from '../api/axios'
import { esAppNativa, hacerFoto, validarImagen } from '../nativa/camara'
import { aplicarFondo, ajusteFondo, guardarAjusteFondo } from './FondoApp'
import { useAuth } from '../context/AuthContext'
import Icon from './Icon'
import { Avisos } from './ui'

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
    <section className="panel settings-panel">
      <div className="panel-head">
        <div>
          <h3>Fondo de la app</h3>
          <p className="helper-copy">Cada persona ve el suyo, también en el móvil.</p>
        </div>
        <span className="tag tag-ink"><Icon nombre="image" /> Fondo</span>
      </div>

      <div className="panel-body">
        <Avisos error={error} exito={exito} />

        <div className="fondo-layout">
          {/* Vista previa */}
          <div>
            <div className="fondo-preview">
              {vistaPrevia || fondoActual ? (
                <img
                  src={vistaPrevia || urlFondo(fondoActual)}
                  alt="Vista previa del fondo"
                />
              ) : (
                <Icon nombre="image" />
              )}
              {fondoActual && !vistaPrevia && (
                <span className="fondo-preview-label">Actual</span>
              )}
            </div>

            {fondoActual && (
              <div className="fondo-actions">
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={quitar}
                  disabled={ocupado}
                >
                  <Icon nombre="trash" /> Quitar el fondo
                </button>
              </div>
            )}
          </div>

          {/* Elegir y ajustar */}
          <div>
            <form onSubmit={subir}>
              <div className="field">
                {/*
                  El selector de archivos abre la galeria del telefono tambien
                  dentro de la app, y devuelve un File de verdad. Por eso
                  "Elegir" es exactamente igual en web y en movil.
                */}
                <label htmlFor="fondo-archivo">Elige una imagen</label>
                <input
                  id="fondo-archivo"
                  ref={inputRef}
                  type="file"
                  className="form-control fondo-file"
                  accept="image/*"
                  onChange={elegirArchivo}
                />
                <span className="helper-copy">jpg, png o webp. Hasta 12 MB.</span>
              </div>

              {nativa && (
                <button
                  type="button"
                  className="btn btn-ghost btn-block"
                  onClick={abrirCamara}
                >
                  <Icon nombre="camera" /> Hacer una foto nueva
                </button>
              )}

              <div className="field" style={{ marginTop: 14 }}>
                <div className="fondo-opacity-head">
                  <span>Cuánto se ve</span>
                  <strong>{Math.round(opacidad * 100)}%</strong>
                </div>
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
                <span className="helper-copy">
                  Con menos se ve mejor el texto. Si no se lee, bájalo.
                </span>
              </div>

              {vistaPrevia && (
                <button type="submit" className="btn btn-primary btn-block" disabled={ocupado}>
                  {ocupado ? (
                    <><span className="mini-spinner" /> Guardando…</>
                  ) : (
                    <><Icon nombre="check" /> Usar esta imagen</>
                  )}
                </button>
              )}
            </form>

            {fondoActual && (
              <div className="form-section">
                <span className="field-label">Cómo se ajusta</span>
                <div className="btn-group" role="group">
                  <button
                    type="button"
                    className={`btn btn-sm ${ajuste === 'entera' ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => cambiarAjuste('entera')}
                  >
                    Verla entera
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm ${ajuste === 'cubrir' ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => cambiarAjuste('cubrir')}
                  >
                    Cubrir pantalla
                  </button>
                </div>
                <span className="helper-copy" style={{ marginTop: 8 }}>
                  «Verla entera» no recorta nada. «Cubrir pantalla» recorta por los
                  lados hasta llenar el hueco.
                </span>
              </div>
            )}
          </div>
        </div>

        {fondoActual && (
          <p className="helper-copy" style={{ marginTop: 14 }}>
            Imagen actual: <code>{urlImagen(fondoActual).split('/').pop()}</code>
          </p>
        )}
      </div>
    </section>
  )
}
