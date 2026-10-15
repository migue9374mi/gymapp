import { useState } from 'react'
import { Link } from 'react-router-dom'
import api, { mensajeDeError } from '../api/axios'

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
    <div className="auth-container">
      <div className="auth-card">
        <h2 className="text-center">Recuperar contraseña</h2>
        <p className="subtitle text-center">
          Escribe tu correo y te mandamos un enlace para poner una contraseña nueva
        </p>

        {error && (
          <div className="alert alert-danger" role="alert">{error}</div>
        )}

        {exito && (
          <div className="alert alert-success" role="alert">
            <i className="bi bi-check-circle me-2"></i>{exito}
          </div>
        )}

        {!exito && (
          <form onSubmit={enviar}>
            <div className="mb-4">
              <label htmlFor="email" className="form-label">Email</label>
              <input
                type="email"
                className="form-control"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                required
              />
            </div>

            <button type="submit" className="btn btn-primary w-100" disabled={loading}>
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2"></span>
                  Enviando...
                </>
              ) : (
                'Enviarme el enlace'
              )}
            </button>
          </form>
        )}

        <div className="text-center mt-4">
          <p className="mb-0">
            <Link to="/login" style={{ color: 'var(--rojo)', fontWeight: 600 }}>
              Volver a iniciar sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
