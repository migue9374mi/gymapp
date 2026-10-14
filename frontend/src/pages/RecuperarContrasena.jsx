import { useState, useEffect } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import api, { mensajeDeError } from '../api/axios'

/**
 * Poner la contrasena nueva desde el enlace del correo.
 *
 * Al abrir la pagina se comprueba el enlace antes de mostrar el formulario,
 * para no preguntar por una contrasena nueva a alguien que llego con un
 * enlace caducado.
 */
export default function RecuperarContrasena() {
  const { token } = useParams()
  const navigate = useNavigate()

  const [estado, setEstado] = useState('cargando') // cargando | valido | invalido | hecho
  const [nombre, setNombre] = useState('')
  const [password, setPassword] = useState('')
  const [passwordRepetida, setPasswordRepetida] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancelado = false

    const comprobar = async () => {
      try {
        const res = await api.get(`/recuperar/recuperar/${token}`)
        if (cancelado) return
        setNombre(res.data.nombre || '')
        setEstado('valido')
      } catch (err) {
        if (cancelado) return
        setEstado('invalido')
      }
    }

    comprobar()
    return () => { cancelado = true }
  }, [token])

  const enviar = async (e) => {
    e.preventDefault()
    setError('')

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }
    if (password !== passwordRepetida) {
      setError('Las dos contraseñas no coinciden')
      return
    }

    setLoading(true)
    try {
      await api.post(`/recuperar/recuperar/${token}`, { password, passwordRepetida })
      setEstado('hecho')
      setTimeout(() => navigate('/login'), 3000)
    } catch (err) {
      // Si el token se caduca mientras escribe, se le avisa y listo
      const mensaje = mensajeDeError(err, 'No se pudo cambiar la contraseña')
      setError(mensaje)
      if (/caducado|no es válido/i.test(mensaje)) setEstado('invalido')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2 className="text-center">
          {estado === 'hecho' ? '¡Contraseña cambiada!' : 'Nueva contraseña'}
        </h2>

        {estado === 'cargando' && (
          <div className="text-center py-4">
            <div className="spinner-border text-danger" role="status"></div>
            <p className="text-muted mt-3 mb-0">Comprobando el enlace...</p>
          </div>
        )}

        {estado === 'invalido' && (
          <>
            <div className="alert alert-danger" role="alert">
              <i className="bi bi-exclamation-triangle me-2"></i>
              Este enlace no vale o se ha caducado.
            </div>
            <p className="text-muted small">
              Los enlaces duran una hora y solo se pueden usar una vez. Pide uno nuevo y te lo
              mandamos al instante.
            </p>
            <Link to="/olvide-contrasena" className="btn btn-primary w-100">
              Pedir un enlace nuevo
            </Link>
          </>
        )}

        {estado === 'hecho' && (
          <>
            <div className="alert alert-success" role="alert">
              <i className="bi bi-check-circle me-2"></i>
              Ya puedes entrar con tu contraseña nueva.
            </div>
            <p className="text-muted small mb-0">Te llevamos al inicio de sesión...</p>
          </>
        )}

        {estado === 'valido' && (
          <>
            <p className="subtitle text-center">
              {nombre ? `Hola ${nombre}, pon tu contraseña nueva` : 'Pon tu contraseña nueva'}
            </p>

            {error && <div className="alert alert-danger" role="alert">{error}</div>}

            <form onSubmit={enviar}>
              <div className="mb-3">
                <label htmlFor="password" className="form-label">Contraseña nueva</label>
                <input
                  type="password"
                  className="form-control"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={6}
                  autoComplete="new-password"
                  required
                />
              </div>

              <div className="mb-4">
                <label htmlFor="passwordRepetida" className="form-label">Repite la contraseña</label>
                <input
                  type="password"
                  className="form-control"
                  id="passwordRepetida"
                  value={passwordRepetida}
                  onChange={(e) => setPasswordRepetida(e.target.value)}
                  minLength={6}
                  autoComplete="new-password"
                  required
                />
                {passwordRepetida && password !== passwordRepetida && (
                  <small className="text-danger">No coinciden</small>
                )}
              </div>

              <button type="submit" className="btn btn-primary w-100" disabled={loading}>
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2"></span>
                    Guardando...
                  </>
                ) : (
                  'Guardar contraseña'
                )}
              </button>
            </form>
          </>
        )}

        <div className="text-center mt-4">
          <Link to="/login" style={{ color: '#e94560', fontWeight: 600 }}>
            Volver a iniciar sesión
          </Link>
        </div>
      </div>
    </div>
  )
}
