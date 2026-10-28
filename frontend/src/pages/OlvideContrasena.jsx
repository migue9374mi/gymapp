import { useState } from 'react'
import { Link } from 'react-router-dom'
import api, { mensajeDeError } from '../api/axios'
import AuthShell from '../components/AuthShell'
import Icon from '../components/Icon'
import { Avisos } from '../components/ui'

/**
 * Pedir el enlace para recuperar la contrasena.
 *
 * El backend responde siempre lo mismo, exista o no el correo. Aqui no hay
 * que comprobar nada: lo que se muestre es exactamente lo que vera
 * cualquiera, este registrado o no.
 */
export default function OlvideContrasena() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [exito, setExito] = useState('')
  const [loading, setLoading] = useState(false)

  const enviar = async (e) => {
    e.preventDefault()
    setError('')
    setExito('')
    setLoading(true)

    try {
      const res = await api.post('/recuperar/olvide-contrasena', { email })
      setExito(res.data.message)
    } catch (err) {
      setError(mensajeDeError(err, 'No se pudo enviar el correo'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell
      eyebrow="Recuperar acceso"
      titulo={<>Nueva<br />contraseña</>}
      intro="Escribe tu correo y te mandamos un enlace para poner una contraseña nueva."
    >
      <Avisos error={error} />

      {exito && (
        <div className="alert alert-success" role="status">
          <Icon nombre="check" />
          <span>{exito}</span>
        </div>
      )}

      {!exito ? (
        <form className="login-form" onSubmit={enviar}>
          <div className="field">
            <label htmlFor="email">Correo</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              autoComplete="email"
              required
            />
          </div>

          <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={loading}>
            {loading ? (
              <><span className="mini-spinner" /> Enviando…</>
            ) : (
              <>Enviarme el enlace <Icon nombre="arrow-right" /></>
            )}
          </button>
        </form>
      ) : (
        <p className="helper-copy">
          Revisa tu bandeja de entrada. El enlace dura una hora y solo se puede usar una vez.
        </p>
      )}

      <p className="auth-switch">
        <Link to="/login">Volver a iniciar sesión</Link>
      </p>
    </AuthShell>
  )
}
