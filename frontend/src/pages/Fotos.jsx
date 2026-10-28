import { useEffect, useRef, useState } from 'react'
import api, { urlImagen, mensajeDeError } from '../api/axios'
import { MUSCULOS } from './Rutinas'
import { esAppNativa, hacerFoto, validarImagen } from '../nativa/camara'
import Icon from '../components/Icon'
import { PageHead, TabsProgreso, Avisos, fechaCorta, fechaHoyLocal } from '../components/ui'

export default function Fotos() {
  const [fotos, setFotos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [exito, setExito] = useState('')
  const [subiendo, setSubiendo] = useState(false)

  const [archivo, setArchivo] = useState(null)
  const [vistaPrevia, setVistaPrevia] = useState('')
  const [fecha, setFecha] = useState(fechaHoyLocal())
  const [nota, setNota] = useState('')
  const [musculo, setMusculo] = useState('general')

  const [vista, setVista] = useState(null)
  const inputRef = useRef(null)
  const formRef = useRef(null)
  const nativa = esAppNativa()

  const cargar = async () => {
    try {
      const res = await api.get('/fotos')
      setFotos(res.data.fotos || [])
    } catch (err) {
      setError(mensajeDeError(err, 'Error al cargar las fotos'))
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    cargar()
  }, [])

  useEffect(() => {
    if (!vista) return
    const alPulsar = (e) => {
      if (e.key === 'Escape') setVista(null)
      if (e.key === 'ArrowLeft') mover(-1)
      if (e.key === 'ArrowRight') mover(1)
    }
    window.addEventListener('keydown', alPulsar)
    return () => window.removeEventListener('keydown', alPulsar)
  }, [vista, fotos])

  const elegirArchivo = (e) => {
    const f = e.target.files?.[0]
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

  const abrirCamara = async () => {
    try {
      setError('')
      const f = await hacerFoto()
      if (!f) return
      const problema = validarImagen(f)
      if (problema) {
        setError(problema)
        return
      }
      setArchivo(f)
      setVistaPrevia(URL.createObjectURL(f))
    } catch (err) {
      if (/cancel/i.test(String(err?.message || ''))) return
      setError(err?.message || 'No se pudo abrir la cámara')
    }
  }

  const abrirSelector = () => {
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    if (nativa) {
      abrirCamara()
    } else {
      setTimeout(() => inputRef.current?.click(), 250)
    }
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
      setTimeout(() => setExito(''), 3500)
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
      if (vista?.id === foto.id) setVista(null)
      cargar()
    } catch (err) {
      setError(mensajeDeError(err, 'Error al eliminar'))
    }
  }

  const mover = (paso) => {
    if (!vista || fotos.length < 2) return
    const i = fotos.findIndex((f) => f.id === vista.id)
    setVista(fotos[(i + paso + fotos.length) % fotos.length])
  }

  if (cargando) {
    return (
      <>
        <PageHead eyebrow="Progreso · evolución visual" titulo="Tus fotos" />
        <div className="loading-panel" role="status"><span className="loading-dot" /><span>Cargando tus fotos…</span></div>
      </>
    )
  }

  return (
    <>
      <PageHead
        eyebrow="Progreso · evolución visual"
        titulo="Tus fotos"
        sub="La mejor forma de ver el cambio. Misma luz, misma postura, misma hora del día."
      >
        <button className="btn btn-primary" type="button" onClick={abrirSelector}>
          <Icon nombre="camera" /> Añadir foto
        </button>
      </PageHead>

      <TabsProgreso activo="fotos" />
      <Avisos error={error} exito={exito} />

      <div className="photo-layout">
        <aside className="panel photo-form" ref={formRef}>
          <div className="panel-head">
            <h3>Subir foto</h3>
            <span className="tag tag-ink">Nueva</span>
          </div>

          <form onSubmit={subir}>
            <div className="field">
              <label htmlFor="foto-archivo">Imagen</label>
              <input
                id="foto-archivo"
                ref={inputRef}
                type="file"
                className="form-control"
                accept="image/*"
                onChange={elegirArchivo}
              />
              {nativa && (
                <button type="button" className="btn btn-ghost btn-block" style={{ marginTop: 8 }} onClick={abrirCamara}>
                  <Icon nombre="camera" /> Hacer una foto nueva
                </button>
              )}
              <small className="helper-copy">jpg, png, webp o gif. Máximo 8 MB.</small>
            </div>

            {vistaPrevia && (
              <div className="photo-preview">
                <img src={vistaPrevia} alt="Vista previa de la foto" />
              </div>
            )}

            <div className="field">
              <label htmlFor="foto-fecha">Fecha</label>
              <input id="foto-fecha" type="date" className="form-control" value={fecha} onChange={(e) => setFecha(e.target.value)} />
            </div>

            <div className="field">
              <label htmlFor="foto-musculo">Grupo muscular</label>
              <select id="foto-musculo" className="form-select" value={musculo} onChange={(e) => setMusculo(e.target.value)}>
                <option value="general">General / cuerpo entero</option>
                {MUSCULOS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>

            <div className="field">
              <label htmlFor="foto-nota">Nota</label>
              <textarea id="foto-nota" className="form-control" rows="2" value={nota}
                onChange={(e) => setNota(e.target.value)} placeholder="Ej: 70 kg, primer mes con esta rutina" />
            </div>

            <button type="submit" className="btn btn-primary btn-block" disabled={subiendo}>
              {subiendo ? <><span className="mini-spinner" /> Subiendo…</> : <><Icon nombre="upload" /> Subir foto</>}
            </button>
          </form>
        </aside>

        <div>
          <div className="photo-grid">
            <button className="photo-card is-add" type="button" onClick={abrirSelector}>
              <span className="photo-add">
                <Icon nombre="camera" />
                Añadir foto de progreso
              </span>
            </button>

            {fotos.map((f, i) => (
              <figure className={`photo-card photo-tone-${['a', 'b', 'c', 'd', 'e'][i % 5]}`} key={f.id}>
                <img
                  src={urlImagen(f.archivo)}
                  alt={f.nota || `Foto de progreso del ${f.fecha}`}
                  onClick={() => setVista(f)}
                  style={{ cursor: 'pointer' }}
                />
                <figcaption className="photo-label">{f.nota || f.musculo || 'Progreso'}</figcaption>
                <span className="photo-date">{fechaCorta(f.fecha)}</span>
                <button
                  className="photo-delete"
                  type="button"
                  onClick={() => eliminar(f)}
                  aria-label={`Eliminar foto del ${f.fecha}`}
                >
                  <Icon nombre="x" />
                </button>
              </figure>
            ))}
          </div>

          {fotos.length === 0 && (
            <div className="empty-state" style={{ marginTop: 16 }}>
              <span className="empty-icon"><Icon nombre="camera" /></span>
              <h3>Aún no tienes fotos</h3>
              <p>Sube la primera y empieza a documentar tu progreso.</p>
            </div>
          )}
        </div>
      </div>

      <aside className="side-note" style={{ marginTop: 16 }}>
        <h4>Consejo para comparar</h4>
        <p>Hazlas siempre en el mismo sitio y con la misma postura. Una foto cada cuatro semanas es suficiente para ver cambios reales.</p>
      </aside>

      {vista && (
        <div className="lightbox" role="dialog" aria-modal="true" aria-label="Visor de fotos">
          <button className="lightbox-close" type="button" onClick={() => setVista(null)} aria-label="Cerrar">
            <Icon nombre="x" />
          </button>

          {fotos.length > 1 && (
            <>
              <button className="lightbox-nav lightbox-nav--prev" type="button" onClick={() => mover(-1)} aria-label="Foto anterior">
                <Icon nombre="chevron-left" />
              </button>
              <button className="lightbox-nav lightbox-nav--next" type="button" onClick={() => mover(1)} aria-label="Foto siguiente">
                <Icon nombre="chevron-right" />
              </button>
            </>
          )}

          <figure className="lightbox-figure">
            <img src={urlImagen(vista.archivo)} alt={vista.nota || 'Foto de progreso'} />
            <figcaption>
              <strong>{vista.nota || vista.musculo || 'Foto de progreso'}</strong>
              <span>
                {fechaCorta(vista.fecha)}
                {vista.musculo && vista.musculo !== 'general' && ` · ${vista.musculo}`}
              </span>
            </figcaption>
          </figure>
        </div>
      )}
    </>
  )
}
