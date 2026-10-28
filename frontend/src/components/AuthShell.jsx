/**
 * Marco comun de las pantallas de acceso.
 *
 * La mitad izquierda mantiene la identidad de Gym Edition; la derecha
 * recibe el formulario de cada pagina. Mientras el acceso esta abierto se
 * marca el body para que el fondo y el armazon privado se escondan.
 */
import { useEffect } from 'react'
import { Link } from 'react-router-dom'

export default function AuthShell({ eyebrow, titulo, intro, children }) {
  useEffect(() => {
    document.body.classList.add('is-login')
    return () => document.body.classList.remove('is-login')
  }, [])

  return (
    <section className="login-shell">
      <div className="login-brand">
        <Link className="brand" to="/login" aria-label="GymApp, volver al acceso">
          <span className="brand-mark">GA</span>
          <span className="brand-copy"><strong>GYMAPP</strong><small>TRAINING CLUB</small></span>
        </Link>

        <div>
          <span className="eyebrow" style={{ color: '#8e887d' }}>Acceso privado</span>
          <h1>Sin excusas.<br /><em>Solo constancia.</em></h1>
          <p>
            Tu plan, tus marcas y tu progreso. Un sitio tranquilo para entrenar
            sin ruido y compartirlo con los tuyos.
          </p>
          <div className="login-stats">
            <div className="login-stat"><strong>01</strong><span>Plan semanal</span></div>
            <div className="login-stat"><strong>07</strong><span>Días de constancia</span></div>
            <div className="login-stat"><strong>100%</strong><span>Privado</span></div>
          </div>
        </div>

        <p className="login-foot">GymApp · Uso privado · 2026</p>
      </div>

      <div className="login-form-wrap">
        <div className="login-card">
          {eyebrow && <span className="eyebrow">{eyebrow}</span>}
          <h2>{titulo}</h2>
          {intro && <p>{intro}</p>}
          {children}
        </div>
      </div>
    </section>
  )
}
