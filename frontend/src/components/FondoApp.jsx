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

const CLAVE_AJUSTE = 'gymapp_ajuste_fondo'

/**
 * Como se ajusta la foto al hueco de la pantalla.
 *
 *  - 'entera'   la foto se ve COMPLETA, sin recortar. Lo que sobra de los
 *               lados se tapa con una copia suya ampliada y desenfocada.
 *  - 'cubrir'   la foto llena toda la pantalla y se recorta por los lados.
 */
export function ajusteFondo() {
  return localStorage.getItem(CLAVE_AJUSTE) === 'cubrir' ? 'cubrir' : 'entera'
}

export function guardarAjusteFondo(valor) {
  localStorage.setItem(CLAVE_AJUSTE, valor)
  aplicarFondo(document.body.dataset.fondo, document.body.dataset.fondoOpacidad)
}

/** Aplica el fondo al documento. */
export function aplicarFondo(fondo, opacidad) {
  const cuerpo = document.body
  const ajuste = ajusteFondo()

  if (!fondo) {
    cuerpo.classList.remove('con-fondo')
    cuerpo.style.removeProperty('--fondo-opacidad')
    cuerpo.removeAttribute('data-fondo')
    return
  }

  cuerpo.classList.add('con-fondo')
  if (ajuste === 'cubrir') cuerpo.classList.add('fondo-cubrir')
  else cuerpo.classList.remove('fondo-cubrir')

  // Acotado para que una opacidad rara no deje la app ilegible
  const valor = Math.min(0.95, Math.max(0.05, Number(opacidad) || 0.35))
  cuerpo.style.setProperty('--fondo-opacidad', String(valor))

  // Se guardan aqui para que guardarAjusteFondo() sepa que repintar
  cuerpo.dataset.fondo = fondo
  cuerpo.dataset.fondoOpacidad = String(valor)
}

export default function FondoApp() {
  const { user } = useAuth()
  const fondo = user?.fondo
  const opacidad = user?.fondo_opacidad

  useEffect(() => {
    aplicarFondo(fondo, opacidad)
  }, [fondo, opacidad])

  if (!fondo) return null

  const src = urlFondo(fondo)

  return (
    <div className="fondo-capa" aria-hidden="true">
      {/*
        Copia ampliada y desenfocada. Solo se ve en los huecos que deja la
        foto real, y sirve para que la pantalla no se quede con partes
        vacias. En modo "cubrir" se oculta.
      */}
      <img src={src} alt="" className="fondo-relleno" onError={(e) => { e.currentTarget.style.display = 'none' }} />
      {/* La foto de verdad, entera */}
      <img src={src} alt="" className="fondo-imagen" onError={(e) => { e.currentTarget.style.display = 'none' }} />
      <div className="fondo-velo"></div>
    </div>
  )
}