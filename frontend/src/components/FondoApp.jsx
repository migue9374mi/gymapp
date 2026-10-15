/**
 * Capa de fondo de la app.
 *
 * Se dibuja fija detras de todo, con un velo oscuro encima para que el
 * texto se lea siempre. Cuando hay una foto puesta se activa el modo
 * "cristal": las tarjetas se vuelven translucidas y el fondo se ve detras.
 *
 * Sin foto, la app queda exactamente como estaba: fondo gris y tarjetas
 * blancas.
 */
import { useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { urlFondo } from '../api/axios'

/** Aplica el fondo al documento y avisa al resto de la app. */
export function aplicarFondo(fondo, opacidad) {
  const cuerpo = document.body

  if (!fondo) {
    cuerpo.classList.remove('con-fondo')
    cuerpo.style.removeProperty('--fondo-opacidad')
    return
  }

  cuerpo.classList.add('con-fondo')
  // Acotado para que una opacidad rara no deje la app ilegible
  const valor = Math.min(0.95, Math.max(0.05, Number(opacidad) || 0.35))
  cuerpo.style.setProperty('--fondo-opacidad', String(valor))
}

export default function FondoApp() {
  const { user } = useAuth()
  const fondo = user?.fondo
  const opacidad = user?.fondo_opacidad

  useEffect(() => {
    aplicarFondo(fondo, opacidad)
  }, [fondo, opacidad])

  if (!fondo) return null

  return (
    <div className="fondo-capa" aria-hidden="true">
      <img
        src={urlFondo(fondo)}
        alt=""
        className="fondo-imagen"
        // Solo de adorno: si la imagen no carga, no hay que ensuciar la consola
        onError={(e) => { e.currentTarget.style.display = 'none' }}
      />
      <div className="fondo-velo"></div>
    </div>
  )
}